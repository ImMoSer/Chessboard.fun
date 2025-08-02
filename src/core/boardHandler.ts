// src/core/boardHandler.ts
import type {
  Key,
  Dests,
  Color as ChessgroundColor,
} from 'chessground/types';
import type { CustomDrawShape } from './chessboard.service';

import type {
  Role as ChessopsRole,
  Color as ChessopsColor,
  Outcome as ChessopsOutcome,
  Piece as ChessopsPiece,
  Move as ChessopsMove,
} from 'chessops/types';
import { isNormal } from 'chessops/types';
import type { Setup as ChessopsSetup } from 'chessops';

import { Chess } from 'chessops/chess';
import { parseFen, makeFen } from 'chessops/fen';
import { makeSan } from 'chessops/san';
import { parseSquare, makeUci, parseUci } from 'chessops/util';
import { chessgroundDests } from 'chessops/compat';

import type { ChessboardService } from './chessboard.service';

import { PromotionCtrl } from '../features/common/promotion/promotionCtrl';
import type { PromotingState } from '../features/common/promotion/promotionCtrl';
import logger from '../utils/logger';
import { SoundService, type SoundEvent } from './sound.service';
import { PgnService, type PgnNode, type NewNodeData } from './pgn.service';

export type GameEndReason =
  | 'checkmate'
  | 'stalemate'
  | 'insufficient_material'
  | 'draw'
  | 'threefold_repetition'
  | 'fifty_move_rule'
  | 'variant_win'
  | 'variant_loss'
  | 'variant_draw';

export interface GameEndOutcome {
  winner?: ChessopsColor;
  reason?: GameEndReason;
}

export interface GameStatus {
  isGameOver: boolean;
  outcome?: GameEndOutcome;
  isCheck: boolean;
  turn: ChessgroundColor;
}

export interface AttemptMoveResult {
  success: boolean;
  uciMove?: string;
  sanMove?: string;
  newFen?: string;
  outcome?: GameEndOutcome;
  promotionStarted?: boolean;
  promotionCompleted?: boolean;
  isIllegal?: boolean;
}

export interface MoveMadeEventData {
  newNodePath: string;
  newFen: string;
  uciMove: string;
  sanMove: string;
  isVariation: boolean;
}
export interface PgnNavigatedEventData {
  currentNodePath: string;
  currentFen: string;
  ply: number;
}

type MoveMadeSubscriber = (data: MoveMadeEventData) => void;
type PgnNavigatedSubscriber = (data: PgnNavigatedEventData) => void;

export class BoardHandler {
  private chessboardService: ChessboardService;
  public promotionCtrl: PromotionCtrl;
  private requestRedraw: () => void;
  public pgnService: typeof PgnService;

  private chessPosition!: Chess;
  public currentFen!: string;
  public boardTurnColor!: ChessgroundColor;
  public possibleMoves!: Dests;

  private humanPlayerColorInternal: ChessgroundColor = 'white';
  private isConfiguredForAnalysis: boolean = false;

  private onMoveMadeSubscribers: MoveMadeSubscriber[] = [];
  private onPgnNavigatedSubscribers: PgnNavigatedSubscriber[] = [];

  constructor(
    chessboardService: ChessboardService,
    requestRedraw: () => void,
  ) {
    this.chessboardService = chessboardService;
    this.requestRedraw = requestRedraw;
    this.promotionCtrl = new PromotionCtrl(this.requestRedraw);
    this.pgnService = PgnService;

    this._syncInternalStateWithPgnService();
    logger.info(`[BoardHandler] Initialized. Current FEN from PgnService: ${this.currentFen}`);
  }
  
  public getBoardElement(): HTMLElement | undefined {
    return this.chessboardService.ground?.state.dom.elements.board;
  }

  public onMoveMade(subscriber: MoveMadeSubscriber): () => void {
    this.onMoveMadeSubscribers.push(subscriber);
    return () => {
      this.onMoveMadeSubscribers = this.onMoveMadeSubscribers.filter(s => s !== subscriber);
    };
  }

  public onPgnNavigated(subscriber: PgnNavigatedSubscriber): () => void {
    this.onPgnNavigatedSubscribers.push(subscriber);
    return () => {
      this.onPgnNavigatedSubscribers = this.onPgnNavigatedSubscribers.filter(s => s !== subscriber);
    };
  }

  private _emitMoveMade(data: MoveMadeEventData): void {
    logger.debug('[BoardHandler] Emitting onMoveMade event:', data);
    this.onMoveMadeSubscribers.forEach(subscriber => {
      try {
        subscriber(data);
      } catch (error) {
        logger.error('[BoardHandler] Error in onMoveMade subscriber:', error);
      }
    });
  }

  private _emitPgnNavigated(data: PgnNavigatedEventData): void {
    logger.debug('[BoardHandler] Emitting onPgnNavigated event:', data);
    this.onPgnNavigatedSubscribers.forEach(subscriber => {
      try {
        subscriber(data);
      } catch (error) {
        logger.error('[BoardHandler] Error in onPgnNavigated subscriber:', error);
      }
    });
  }

  private _syncInternalStateWithPgnService(): void {
    const pgnCurrentNode = this.pgnService.getCurrentNode();
    const fenToLoad = pgnCurrentNode.fenAfter;

    try {
      const setup: ChessopsSetup = parseFen(fenToLoad).unwrap();
      this.chessPosition = Chess.fromSetup(setup).unwrap();
      this._updateBoardStateInternal();
    } catch (e: any) {
      logger.error(`[BoardHandler] Error syncing internal state with PGN FEN ${fenToLoad}:`, e.message, e);
      const defaultSetup: ChessopsSetup = parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1').unwrap();
      this.chessPosition = Chess.fromSetup(defaultSetup).unwrap();
      this._updateBoardStateInternal();
    }
  }

  private _updateBoardStateInternal(): void {
    this.currentFen = makeFen(this.chessPosition.toSetup());
    this.boardTurnColor = this.chessPosition.turn;
    this.possibleMoves = chessgroundDests(this.chessPosition);
  }

  public configureBoardForAnalysis(isAnalysis: boolean): void {
    this.isConfiguredForAnalysis = isAnalysis;
    logger.info(`[BoardHandler] Board configured for analysis: ${isAnalysis}`);
  }

  public isBoardConfiguredForAnalysis(): boolean {
    return this.isConfiguredForAnalysis;
  }

  public setupPosition(
    fen: string,
    humanPlayerColor?: ChessgroundColor,
    resetPgnHistory: boolean = true,
  ): boolean {
    if (this.isConfiguredForAnalysis && resetPgnHistory) {
      this.configureBoardForAnalysis(false);
    }

    try {
      if (resetPgnHistory) {
        this.pgnService.reset(fen);
      }
      this._syncInternalStateWithPgnService();

      if (humanPlayerColor) {
        this.humanPlayerColorInternal = humanPlayerColor;
      }
      
      logger.info(`[BoardHandler] Position setup with FEN: ${fen}. PGN reset: ${resetPgnHistory}`);
      
      SoundService.playSoundEvent({ parallel: ['position_loaded'] });

      this._emitPgnNavigated({
        currentNodePath: this.pgnService.getCurrentPath(),
        currentFen: this.currentFen,
        ply: this.pgnService.getCurrentPly()
      });
      return true;
    } catch (e: any) {
      logger.error('[BoardHandler] Failed to setup position from FEN:', fen, e.message);
      const defaultFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      if (resetPgnHistory) {
        this.pgnService.reset(defaultFen);
      }
      this._syncInternalStateWithPgnService();
      this._emitPgnNavigated({
        currentNodePath: this.pgnService.getCurrentPath(),
        currentFen: this.currentFen,
        ply: this.pgnService.getCurrentPly()
      });
      return false;
    }
  }

  public setOrientation(color: ChessgroundColor): void {
    this.humanPlayerColorInternal = color;
    this.chessboardService.setOrientation(color);
    logger.debug(`[BoardHandler] Orientation state set to: ${color}. View will be updated on next redraw.`);
  }

  private _playSoundsForMove(
    move: ChessopsMove,
    pieceOnDestBefore?: ChessopsPiece
  ): void {
    if (this.isConfiguredForAnalysis) return;

    const parallelSounds: SoundEvent[] = [];
    const sequentialSounds: SoundEvent[] = [];
    
    const gameStatus = this.getGameStatus();
    const wasPlayerTurn = this.chessPosition.turn !== this.humanPlayerColorInternal;

    if (gameStatus.isGameOver && gameStatus.outcome) {
      const { winner, reason } = gameStatus.outcome;
      
      switch (reason) {
        case 'checkmate':
          if (winner === this.humanPlayerColorInternal) {
            sequentialSounds.push('user_won_playout');
          } else {
            parallelSounds.push('bot_checkmates_player');
            sequentialSounds.push('user_lost_playout');
          }
          break;
        case 'stalemate':
          parallelSounds.push('draw_by_stalemate');
          sequentialSounds.push('user_lost_playout');
          break;
        case 'threefold_repetition':
          parallelSounds.push('draw_by_repetition');
          sequentialSounds.push('user_lost_playout');
          break;
        case 'fifty_move_rule':
          parallelSounds.push('draw_by_fifty_moves');
          sequentialSounds.push('user_lost_playout');
          break;
        case 'insufficient_material':
          parallelSounds.push('draw_by_insufficient_material');
          sequentialSounds.push('user_lost_playout');
          break;
        default: // variant_win, variant_loss, variant_draw, draw
          if (winner === this.humanPlayerColorInternal) {
            sequentialSounds.push('user_won_playout');
          } else {
            sequentialSounds.push('user_lost_playout');
          }
          break;
      }
    } else {
      // Game is not over, play regular move sounds
      if (gameStatus.isCheck) {
        parallelSounds.push(wasPlayerTurn ? 'user_checks_bot' : 'bot_checks_player');
      }

      if (isNormal(move) && move.promotion) {
        parallelSounds.push('promote');
      } else if (pieceOnDestBefore) {
        parallelSounds.push('capture');
      } else {
        parallelSounds.push('move');
      }
    }
    
    SoundService.playSoundEvent({
        parallel: parallelSounds,
        sequential: sequentialSounds,
    });
  }

  private _executeMove(
    chessopsMove: ChessopsMove,
  ): Omit<AttemptMoveResult, 'promotionStarted' | 'promotionCompleted'> {
    const fenBeforeAttempt = this.currentFen;
    const san = makeSan(this.chessPosition, chessopsMove);
    const pieceOnDestBefore: ChessopsPiece | undefined = isNormal(chessopsMove)
      ? this.chessPosition.board.get(chessopsMove.to)
      : undefined;

    this.chessPosition.play(chessopsMove);
    this._updateBoardStateInternal();
    
    const uciMove = makeUci(chessopsMove);
    const fenAfterAttempt = this.currentFen;

    const newNodeData: NewNodeData = {
        san,
        uci: uciMove,
        fenBefore: fenBeforeAttempt,
        fenAfter: fenAfterAttempt,
    };
    const addedPgnNode = this.pgnService.addNode(newNodeData);

    if (!addedPgnNode) {
        logger.error(`[BoardHandler] Failed to add node to PgnService for move ${uciMove}.`);
        this._syncInternalStateWithPgnService();
        return { success: false, uciMove, sanMove: san, isIllegal: true };
    }

    this._playSoundsForMove(chessopsMove, pieceOnDestBefore);
    
    const isVariation = addedPgnNode.parent ? addedPgnNode.parent.children.length > 1 && addedPgnNode.parent.children[0].id !== addedPgnNode.id : false;
    
    const gameStatusAfterMove = this.getGameStatus();
    if (gameStatusAfterMove.isGameOver && gameStatusAfterMove.outcome && !this.isConfiguredForAnalysis) {
        if (gameStatusAfterMove.outcome.winner === 'white') this.pgnService.setGameResult("1-0");
        else if (gameStatusAfterMove.outcome.winner === 'black') this.pgnService.setGameResult("0-1");
        else this.pgnService.setGameResult("1/2-1/2");
    }
    
    this._emitMoveMade({
      newNodePath: this.pgnService.getCurrentPath(),
      newFen: this.currentFen,
      uciMove: uciMove,
      sanMove: san,
      isVariation: isVariation
    });
    
    logger.debug(`[BoardHandler] Move ${uciMove} (SAN: ${san}) applied. New FEN: ${this.currentFen}. PGN Path: ${this.pgnService.getCurrentPath()}`);
    return { success: true, newFen: this.currentFen, outcome: gameStatusAfterMove.outcome, uciMove, sanMove: san, isIllegal: false };
  }

  public async attemptUserMove(orig: Key, dest: Key): Promise<AttemptMoveResult> {
    const gameStatusBeforeMove = this.getGameStatus();
    if (gameStatusBeforeMove.isGameOver && !this.isConfiguredForAnalysis) {
      logger.warn('[BoardHandler] Attempted move in a game over state (not configured for analysis).');
      this.chessboardService.setFen(this.currentFen.split(' ')[0]);
      this.requestRedraw();
      return { success: false, isIllegal: true };
    }

    const fromSq = parseSquare(orig);
    const toSq = parseSquare(dest);

    if (fromSq === undefined || toSq === undefined) {
      logger.warn(`[BoardHandler] Invalid square in user move: ${orig} or ${dest}`);
      return { success: false, isIllegal: true };
    }

    const promotionCheck = this._isPromotionAttempt(orig, dest);
    if (promotionCheck.isPromotion && promotionCheck.pieceColor) {
      return new Promise<AttemptMoveResult>((resolve) => {
        this.promotionCtrl.start(
          orig, dest, promotionCheck.pieceColor as ChessgroundColor,
          (selectedRole: ChessopsRole | null) => {
            if (!selectedRole) {
              logger.info('[BoardHandler] Promotion cancelled by user.');
              this.requestRedraw();
              resolve({ success: false, promotionStarted: true, promotionCompleted: false, isIllegal: true });
              return;
            }
            const moveWithPromotion: ChessopsMove = { from: fromSq, to: toSq, promotion: selectedRole };
            const result = this._executeMove(moveWithPromotion);
            resolve({ ...result, promotionStarted: true, promotionCompleted: result.success });
          },
        );
      });
    }

    const regularMove: ChessopsMove = { from: fromSq, to: toSq };
    const result = this._executeMove(regularMove);
    return Promise.resolve(result);
  }

  public applySystemMove(uciMove: string): AttemptMoveResult {
    const gameStatus = this.getGameStatus();
    if (gameStatus.isGameOver && !this.isConfiguredForAnalysis) {
      logger.warn('[BoardHandler] Attempted system move in a game over state (not configured for analysis).');
      return { success: false, isIllegal: true };
    }
    
    logger.info(`[BoardHandler] Applying system move: ${uciMove}`);

    const chessopsMove: ChessopsMove | undefined = parseUci(uciMove);
    if (!chessopsMove) {
      logger.warn(`[BoardHandler] Invalid system UCI move format: ${uciMove}`);
      this.requestRedraw();
      return { success: false, isIllegal: true, uciMove };
    }
    
    if (!this.chessPosition.isLegal(chessopsMove)) {
      const pieceTryingToMove = isNormal(chessopsMove) ? this.chessPosition.board.get(chessopsMove.from) : null;
      logger.warn(`[BoardHandler] Illegal system move: ${uciMove} on FEN ${this.currentFen}. Turn: ${this.chessPosition.turn}. Piece: ${pieceTryingToMove?.color}${pieceTryingToMove?.role}.`);
      this.requestRedraw();
      return { success: false, uciMove, isIllegal: true };
    }
    
    return this._executeMove(chessopsMove);
  }

  public getFen(): string {
    return this.currentFen;
  }

  public getPgn(options?: import('./pgn.service').PgnStringOptions): string {
    const showResult = this.getGameStatus().isGameOver && !this.isConfiguredForAnalysis;
    return this.pgnService.getCurrentPgnString({...options, showResult });
  }

  public getPossibleMoves(): Dests {
    return this.possibleMoves;
  }

  public getBoardTurnColor(): ChessgroundColor {
    return this.boardTurnColor;
  }

  public getHumanPlayerColor(): ChessgroundColor | undefined {
    return this.humanPlayerColorInternal;
  }

  private _getRepetitionFen(fen: string): string {
    return fen.split(' ').slice(0, 4).join(' ');
  }

  public getGameStatus(): GameStatus {
    const outcomeDetails: ChessopsOutcome | undefined = this.chessPosition.outcome();
    let isGameOver = !!outcomeDetails;
    let gameEndOutcome: GameEndOutcome | undefined;
    let gameEndReason: GameEndReason | undefined;

    if (outcomeDetails) {
        if (outcomeDetails.winner) {
            gameEndReason = this.chessPosition.isCheckmate() ? 'checkmate' : 'variant_win';
        } else {
            if (this.chessPosition.isStalemate()) gameEndReason = 'stalemate';
            else if (this.chessPosition.isInsufficientMaterial()) gameEndReason = 'insufficient_material';
            else gameEndReason = 'draw';
        }
        gameEndOutcome = {
            winner: outcomeDetails.winner,
            reason: gameEndReason,
        };
    }

    if (!isGameOver) {
        const fenHistory = this.pgnService.getFenHistoryForRepetition();
        const currentRepetitionFen = this._getRepetitionFen(this.currentFen);
        
        let repetitionCount = 0;
        for (const historicFen of fenHistory) {
            if (this._getRepetitionFen(historicFen) === currentRepetitionFen) {
                repetitionCount++;
            }
        }
        if (repetitionCount >= 3) {
            isGameOver = true;
            gameEndReason = 'threefold_repetition';
            gameEndOutcome = { winner: undefined, reason: gameEndReason };
            logger.info(`[BoardHandler] Threefold repetition detected (count: ${repetitionCount}). Game is a draw.`);
        }
    }

    if (!isGameOver) {
        if (this.chessPosition.halfmoves >= 100) {
            isGameOver = true;
            gameEndReason = 'fifty_move_rule';
            gameEndOutcome = { winner: undefined, reason: gameEndReason };
            logger.info(`[BoardHandler] 50-move rule detected (halfmoves: ${this.chessPosition.halfmoves}). Game is a draw.`);
        }
    }

    const isCheck = this.chessPosition.isCheck();
    return { isGameOver, outcome: gameEndOutcome, isCheck, turn: this.chessPosition.turn };
  }

  public isMoveLegal(uciMove: string): boolean {
    const move = parseUci(uciMove);
    if (!move) return false;
    return this.chessPosition.isLegal(move);
  }

  public getPromotionState(): PromotingState | null { return this.promotionCtrl?.promoting || null; }
  
  public setDrawableShapes(shapes: CustomDrawShape[]): void {
    if (!this.chessboardService.ground) {
        logger.warn('[BoardHandler setDrawableShapes] Chessground not initialized.');
        return;
    }
    this.chessboardService.drawShapes(shapes);
    logger.debug(`[BoardHandler setDrawableShapes] Set ${shapes.length} shapes.`);
  }

  public clearAllDrawings(): void {
    if (!this.chessboardService.ground) {
        logger.warn('[BoardHandler clearAllDrawings] Chessground not initialized.');
        return;
    }
    this.chessboardService.clearShapes();
    logger.debug(`[BoardHandler clearAllDrawings] All drawings cleared.`);
  }

  private _isPromotionAttempt(orig: Key, dest: Key): { isPromotion: boolean; pieceColor?: ChessopsColor } {
    const fromSq = parseSquare(orig);
    if (fromSq === undefined || !this.chessPosition) return { isPromotion: false };

    const piece = this.chessPosition.board.get(fromSq);
    if (!piece || piece.role !== 'pawn') {
      return { isPromotion: false };
    }

    const toRankChar = dest.charAt(1);
    const isPromotionRank = (piece.color === 'white' && toRankChar === '8') || (piece.color === 'black' && toRankChar === '1');

    if (isPromotionRank) {
      return { isPromotion: true, pieceColor: piece.color };
    }
    return { isPromotion: false };
  }

  public undoLastMove(): boolean {
    const undonePgnNode = this.pgnService.undoLastMove();
    if (undonePgnNode) {
      this._syncInternalStateWithPgnService();
      this.pgnService.setGameResult('*');
      logger.info(`[BoardHandler] Undid move. Current FEN on board: ${this.currentFen}. PGN Path: ${this.pgnService.getCurrentPath()}`);
      this._emitPgnNavigated({
        currentNodePath: this.pgnService.getCurrentPath(),
        currentFen: this.currentFen,
        ply: this.pgnService.getCurrentPly()
      });
      this.requestRedraw();
      return true;
    }
    logger.warn(`[BoardHandler] No moves in PGN history to undo.`);
    return false;
  }

  public getLastPgnMoveNode(): PgnNode | null {
    return this.pgnService.getCurrentNavigatedNode();
  }

  public handleNavigatePgnToPath(path: string): boolean {
    const success = this.pgnService.navigateToPath(path);
    if (success) {
      this._syncInternalStateWithPgnService();
      this._emitPgnNavigated({
        currentNodePath: this.pgnService.getCurrentPath(),
        currentFen: this.currentFen,
        ply: this.pgnService.getCurrentPly()
      });
      this.requestRedraw();
    } else {
        logger.warn(`[BoardHandler] Failed to navigate to PGN path: ${path}`);
    }
    return success;
  }

  public handleNavigatePgnToPly(ply: number): boolean {
    const success = this.pgnService.navigateToPly(ply);
    if (success) {
      this._syncInternalStateWithPgnService();
      this._emitPgnNavigated({
        currentNodePath: this.pgnService.getCurrentPath(),
        currentFen: this.currentFen,
        ply: this.pgnService.getCurrentPly()
      });
      this.requestRedraw();
    }
    return success;
  }

  public handleNavigatePgnBackward(): boolean {
    const success = this.pgnService.navigateBackward();
    if (success) {
      this._syncInternalStateWithPgnService();
      this._emitPgnNavigated({
        currentNodePath: this.pgnService.getCurrentPath(),
        currentFen: this.currentFen,
        ply: this.pgnService.getCurrentPly()
      });
      this.requestRedraw();
    }
    return success;
  }

  public handleNavigatePgnForward(variationIndex: number = 0): boolean {
    const success = this.pgnService.navigateForward(variationIndex);
    if (success) {
      this._syncInternalStateWithPgnService();
      this._emitPgnNavigated({
        currentNodePath: this.pgnService.getCurrentPath(),
        currentFen: this.currentFen,
        ply: this.pgnService.getCurrentPly()
      });
      this.requestRedraw();
    }
    return success;
  }

  public handleNavigatePgnToStart(): boolean {
    this.pgnService.navigateToStart();
    this._syncInternalStateWithPgnService();
    this._emitPgnNavigated({
      currentNodePath: this.pgnService.getCurrentPath(),
      currentFen: this.currentFen,
      ply: this.pgnService.getCurrentPly()
    });
    this.requestRedraw();
    return true;
  }

  public handleNavigatePgnToEnd(): boolean {
    this.pgnService.navigateToEnd();
    this._syncInternalStateWithPgnService();
    this._emitPgnNavigated({
      currentNodePath: this.pgnService.getCurrentPath(),
      currentFen: this.currentFen,
      ply: this.pgnService.getCurrentPly()
    });
    this.requestRedraw();
    return true;
  }

  public canPgnNavigateBackward(): boolean {
    return this.pgnService.canNavigateBackward();
  }

  public canPgnNavigateForward(variationIndex: number = 0): boolean {
    return this.pgnService.canNavigateForward(variationIndex);
  }

  public getCurrentPgnPath(): string {
    return this.pgnService.getCurrentPath();
  }

  public getCurrentPgnNodeVariations(): PgnNode[] {
    return this.pgnService.getVariationsForCurrentNode();
  }

  public promotePgnVariation(variationNodeId: string): boolean {
    const success = this.pgnService.promoteVariationToMainline(variationNodeId);
    if (success) {
        this._syncInternalStateWithPgnService();
        this._emitPgnNavigated({
            currentNodePath: this.pgnService.getCurrentPath(),
            currentFen: this.currentFen,
            ply: this.pgnService.getCurrentPly()
        });
        this.requestRedraw();
    }
    return success;
  }
}
