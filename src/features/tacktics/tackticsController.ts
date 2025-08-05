// src/features/tacktics/tackticsController.ts
import type { Key, MoveMetadata, Color as ChessgroundColor } from 'chessground/types';
import { BoardHandler, type AttemptMoveResult } from '../../core/boardHandler';
import type { AppServices, GameControlsState } from '../../AppController';
import type { AnalysisController } from '../analysis/analysisController';
import { InsufficientFunCoinsError } from '../../core/webhook.service';
import type { AppTacticalPuzzle, SubmitTacticalResultDto, TacticalTrainerStats } from '../../core/api.types';
import logger from '../../utils/logger';
import { t } from '../../core/i18n.service';
import { SoundService } from '../../core/sound.service';
import { parseFen } from 'chessops/fen';

const BOT_MOVE_DELAY_MS = 300;
const AUTO_NEXT_PUZZLE_DELAY_MS = 300;

type GamePhase = 'IDLE' | 'LOADING' | 'TACTICAL' | 'GAMEOVER';

export interface TackticsControllerState {
  gamePhase: GamePhase;
  feedbackMessage: string;
  gameOverMessage: string | null;
  activePuzzle: AppTacticalPuzzle | null;
  solutionMoves: string[];
  currentSolutionMoveIndex: number;
  tacticalStats: TacticalTrainerStats | null;
}

export class TackticsController {
  public state: TackticsControllerState;
  public boardHandler: BoardHandler;
  public services: AppServices;
  public analysisController: AnalysisController;
  private requestGlobalRedraw: () => void;

  private unsubscribeFromMoveMade: (() => void) | null = null;
  private unsubscribeFromPgnNavigated: (() => void) | null = null;

  constructor(
    boardHandler: BoardHandler,
    analysisController: AnalysisController,
    services: AppServices,
    requestGlobalRedraw: () => void,
  ) {
    this.boardHandler = boardHandler;
    this.analysisController = analysisController;
    this.services = services;
    this.requestGlobalRedraw = requestGlobalRedraw;

    this.state = this._getInitialState();

    this.unsubscribeFromMoveMade = this.boardHandler.onMoveMade(() => this._updateAppControls());
    this.unsubscribeFromPgnNavigated = this.boardHandler.onPgnNavigated(() => this._updateAppControls());

    this._updateAppControls();
    logger.info('[TackticsController] Initialized.');
  }

  private _getControlsState(): GameControlsState {
    const { gamePhase, activePuzzle } = this.state;
    return {
      canRequestNew: gamePhase === 'IDLE' || gamePhase === 'GAMEOVER',
      onRequestNew: () => this.handleNewGame(),
      canRestart: (gamePhase === 'GAMEOVER' || gamePhase === 'IDLE') && !!activePuzzle,
      onRestart: () => this.handleRestartTask(),
      canResign: false,
      onResign: () => {},
      onShare: () => {
        const puzzleId = this.state.activePuzzle?.PuzzleId;
        if (!puzzleId) return;
  
        const baseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
        const shareUrl = `${baseUrl}/#/tacktics/PuzzleId/${puzzleId}`;
  
        this.services.appController.handleShare({
            url: shareUrl,
            title: t('common.shareTitle', { defaultValue: 'Chess Puzzle' }),
            text: t('common.shareText', { defaultValue: 'Check out this puzzle!' })
        });
      },
      onExit: () => this.services.appController.navigateTo('welcome'),
    };
  }

  private _updateAppControls(): void {
    this.services.appController.updateGameControls(this._getControlsState());
    this.requestGlobalRedraw();
  }

  private _getInitialState(): TackticsControllerState {
      return {
        gamePhase: 'IDLE',
        feedbackMessage: t('tacktics.feedback.getReady', { defaultValue: 'Press "New Game" to start.' }),
        gameOverMessage: null,
        activePuzzle: null,
        solutionMoves: [],
        currentSolutionMoveIndex: 0,
        tacticalStats: null,
      };
  }

  private _resetPuzzleState(): void {
      this.setState({
        gamePhase: 'IDLE',
        feedbackMessage: t('tacktics.feedback.getReady', { defaultValue: 'Press "New Game" to start.' }),
        gameOverMessage: null,
        activePuzzle: null,
        solutionMoves: [],
        currentSolutionMoveIndex: 0,
      });
  }

  public async initializeGame(puzzleId?: string | null): Promise<void> {
    if (this.analysisController.getPanelState().isAnalysisActive) {
        this.analysisController.toggleAnalysisEngine();
    }
    
    this._resetPuzzleState();
    this._loadUserStats();

    if (puzzleId) {
        await this._loadPuzzle(puzzleId);
    } else {
        this.boardHandler.setupPosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        this.setState({
            gamePhase: 'IDLE',
            feedbackMessage: t('tacktics.feedback.getReady', { defaultValue: 'Press "New Game" to start.' })
        });
    }
  }

  private async _loadUserStats(): Promise<void> {
    try {
        const stats = await this.services.webhookService.fetchTacticalStats();
        if (stats) {
            this.setState({ tacticalStats: stats });
            logger.info('[TackticsController] User tactical stats loaded.');
        } else {
            logger.warn('[TackticsController] fetchTacticalStats returned null.');
        }
    } catch (error) {
        logger.error('[TackticsController] Failed to load user tactical stats:', error);
    }
  }

  private async _loadPuzzle(puzzleId?: string | null): Promise<void> {
    this.setState({ gamePhase: 'LOADING', feedbackMessage: t('common.loading') });

    let puzzleData: AppTacticalPuzzle | null = null;

    try {
        if (puzzleId) {
            puzzleData = await this.services.webhookService.fetchTacticalPuzzleById(puzzleId);
        } else {
            puzzleData = await this.services.webhookService.fetchTacticalPuzzle();
            if (puzzleData) {
                const currentCoins = this.services.authService.getFunCoins();
                if (currentCoins !== null) {
                    const newBalance = currentCoins - 1;
                    this.services.authService.updateUserProfile({ FunCoins: newBalance });
                }
            }
        }

        if (!puzzleData) {
            throw new Error(t('tacktics.error.puzzleNotFound', { defaultValue: 'Could not load the puzzle.' }));
        }

        if (!puzzleId) {
            this.services.appController.updatePuzzleUrl(puzzleData.PuzzleId);
        }

        this.state.activePuzzle = puzzleData;
        this.state.solutionMoves = puzzleData.Moves ? puzzleData.Moves.split(' ') : [];
        this.state.currentSolutionMoveIndex = 0;

        const setup = parseFen(puzzleData.FEN_0).unwrap();
        const humanPlayerColor: ChessgroundColor = setup.turn === 'white' ? 'black' : 'white';
        this.boardHandler.setupPosition(puzzleData.FEN_0, humanPlayerColor, true);

        this.setState({
            gamePhase: 'TACTICAL',
            feedbackMessage: t('tacktics.feedback.findBestMove', { defaultValue: 'Find the best move!' }),
        });

        this._playNextSolutionMove();

    } catch (error: any) {
        if (error instanceof InsufficientFunCoinsError) {
            this.services.appController.showModal(error.message);
        } else if (this.services.appController.handleApiRateLimit(error)) {
            // Rate limit handled
        } else {
            logger.error('[TackticsController] Error fetching puzzle:', error);
            this.setState({ 
                feedbackMessage: t('tacktics.error.loadFailed', { defaultValue: 'Failed to load puzzle.' })
            });
        }
        this.setState({ gamePhase: 'IDLE' });
    }
  }

  private _playNextSolutionMove(): void {
      if (this.state.gamePhase !== 'TACTICAL') return;

      const uciMove = this.state.solutionMoves[this.state.currentSolutionMoveIndex];
      if (!uciMove) {
          logger.error("[TackticsController] _playNextSolutionMove called with no more moves.");
          return;
      }
      
      setTimeout(() => {
          const moveResult = this.boardHandler.applySystemMove(uciMove);
          if (moveResult.success) {
              this.state.currentSolutionMoveIndex++;
              if (this._checkGameOver()) return;
              this.setState({ feedbackMessage: t('tacktics.feedback.yourTurn', { defaultValue: 'Your turn.' }) });
          } else {
              logger.error(`[TackticsController] Failed to apply solution move ${uciMove}.`);
              this._handleGameOver(false);
          }
      }, BOT_MOVE_DELAY_MS);
  }

  public async handleUserMove(orig: Key, dest: Key, metadata?: MoveMetadata): Promise<void> {
    if (this.analysisController.getPanelState().isAnalysisActive) {
        const moveResult: AttemptMoveResult = await this.boardHandler.attemptUserMove(orig, dest);
        if (moveResult.success && moveResult.sanMove) {
            this.setState({ feedbackMessage: t('puzzle.feedback.analysisMoveMade', { san: moveResult.sanMove, fen: this.boardHandler.getFen() }) });
        } else if (moveResult.isIllegal) {
            this.setState({ feedbackMessage: t('puzzle.feedback.illegalMoveAnalysis') });
        }
        return;
    }

    if (this.state.gamePhase !== 'TACTICAL' || (metadata && metadata.premove)) return;

    const moveResult = await this.boardHandler.attemptUserMove(orig, dest);
    if (!moveResult.success || !moveResult.uciMove) return;

    const gameStatus = this.boardHandler.getGameStatus();
    const humanColor = this.boardHandler.getHumanPlayerColor();

    if (gameStatus.isGameOver && gameStatus.outcome?.reason === 'checkmate' && gameStatus.outcome?.winner === humanColor) {
        logger.info('[TackticsController] User delivered a checkmate. Counting as a win.');
        this._handleGameOver(true, { playSound: false });
        return;
    }

    const expectedMove = this.state.solutionMoves[this.state.currentSolutionMoveIndex];
    if (moveResult.uciMove === expectedMove) {
        this.state.currentSolutionMoveIndex++;
        const isPuzzleComplete = this.state.currentSolutionMoveIndex >= this.state.solutionMoves.length;

        if (isPuzzleComplete) {
            this._handleGameOver(true);
        } else {
            if (this._checkGameOver()) return;
            this._playNextSolutionMove();
        }
    } else {
        this._handleIncorrectUserMove();
    }
  }

  private _handleIncorrectUserMove(): void {
    SoundService.playSoundEvent({ parallel: ['tacktics_puzzle_loss'] });
    this._sendResult(false);

    this.boardHandler.undoLastMove();
    
    this.setState({
        gamePhase: 'GAMEOVER',
        gameOverMessage: t('tacktics.feedback.wrongMoveAnalysis', {defaultValue: 'Wrong move! Analysis is now active.'}),
        feedbackMessage: t('tacktics.feedback.wrongMoveAnalysis', {defaultValue: 'Wrong move! Analysis is now active.'}),
    });
    
    if (!this.analysisController.getPanelState().isAnalysisActive) {
        this.analysisController.toggleAnalysisEngine();
    }
  }

  private _checkGameOver(): boolean {
      const gameStatus = this.boardHandler.getGameStatus();
      if (gameStatus.isGameOver) {
          this._handleGameOver(false);
          return true;
      }
      return false;
  }

  private _handleGameOver(success: boolean, options: { playSound?: boolean, customMessage?: string } = {}): void {
    if (this.state.gamePhase === 'GAMEOVER') return;

    const { playSound = true, customMessage } = options;

    let message = customMessage;
    if (!customMessage) {
        message = success 
            ? t('tacktics.feedback.success', { defaultValue: 'Puzzle solved!' })
            : t('tacktics.feedback.failure', { defaultValue: 'Puzzle failed.' });
    }
    
    if (success) {
        if (playSound) {
            SoundService.playSoundEvent({ sequential: ['user_won_playout'] });
        }
        setTimeout(() => {
            if (this.state.gamePhase === 'GAMEOVER') {
                this.handleNewGame();
            }
        }, AUTO_NEXT_PUZZLE_DELAY_MS);
    }

    this.setState({
        gamePhase: 'GAMEOVER',
        gameOverMessage: message,
        feedbackMessage: message,
    });
    
    this._sendResult(success);
    
    if (!success) {
        this.boardHandler.configureBoardForAnalysis(true);
    }
  }

  private async _sendResult(success: boolean): Promise<void> {
    const puzzle = this.state.activePuzzle;
    if (!puzzle) {
        logger.warn('[TackticsController] Cannot send result: no active puzzle.');
        return;
    }

    const dto: SubmitTacticalResultDto = {
        PuzzleId: puzzle.PuzzleId,
        Rating: puzzle.Rating,
        Themes_PG: puzzle.Themes_PG,
        success: success,
    };

    logger.info('[TackticsController] Sending tactical result:', dto);
    try {
        const updatedStats = await this.services.webhookService.submitTacticalResult(dto);
        if (updatedStats) {
            logger.info('[TackticsController] Tactical stats updated successfully.');
            this.setState({ tacticalStats: updatedStats });
        } else {
            logger.warn('[TackticsController] Submitting tactical result did not return updated stats.');
        }
    } catch (error) {
        logger.error('[TackticsController] Failed to send tactical result:', error);
    }
  }

  public handleNewGame(): void {
    if (!(this.state.gamePhase === 'IDLE' || this.state.gamePhase === 'GAMEOVER')) return;

    if (this.analysisController.getPanelState().isAnalysisActive) {
        this.analysisController.toggleAnalysisEngine();
    }

    this._loadPuzzle();
  }

  public handleRestartTask(): void {
      if (!((this.state.gamePhase === 'GAMEOVER' || this.state.gamePhase === 'IDLE') && !!this.state.activePuzzle)) return;
      this.initializeGame(this.state.activePuzzle.PuzzleId);
  }

  private setState(newState: Partial<TackticsControllerState>): void {
    Object.assign(this.state, newState);
    this._updateAppControls();
  }

  public destroy(): void {
    this.services.appController.clearGameControls();
    if (this.unsubscribeFromMoveMade) this.unsubscribeFromMoveMade();
    if (this.unsubscribeFromPgnNavigated) this.unsubscribeFromPgnNavigated();
    logger.info('[TackticsController] Destroyed.');
  }
}
