// src/features/attack/attackController.ts
import type { Key, MoveMetadata, Color as ChessgroundColor } from 'chessground/types';
import { BoardHandler, type GameEndOutcome, type AttemptMoveResult } from '../../core/boardHandler';
import type { AppServices, GameControlsState } from '../../AppController';
import type { AnalysisController } from '../analysis/analysisController';
import { InsufficientFunCoinsError } from '../../core/webhook.service';
import type { AppAttackPuzzle, AttackRecordDto, PuzzleResultEntry } from '../../core/api.types';
import logger from '../../utils/logger';
import { t } from '../../core/i18n.service';
import { SoundService } from '../../core/sound.service';
import { parseFen } from 'chessops/fen';

const BOT_MOVE_DELAY_MS = 300;
const PREMOVE_EXECUTION_DELAY_MS = 100;
const TIMER_INTERVAL_MS = 1000;
const PLAYOUT_TIME_LIMIT_MS = 10 * 60 * 1000; // 10 минут

type GamePhase = 'IDLE' | 'LOADING' | 'TACTICAL' | 'PLAYOUT' | 'GAMEOVER';

export function formatElapsedTime(ms: number | null): string {
  if (ms === null || ms < 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `00:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export interface AttackControllerState {
  gamePhase: GamePhase;
  feedbackMessage: string;
  gameOverMessage: string | null;
  activePuzzle: AppAttackPuzzle | null;
  puzzleResults: PuzzleResultEntry[] | null;
  solutionMoves: string[];
  currentSolutionMoveIndex: number;
  isBotThinking: boolean;
  solveStartTimeMs: number | null;
  playoutTimerId: number | null;
  elapsedPlayoutTimeMs: number;
  tenSecondsWarningPlayed: boolean;
  sevenSecondsWarningPlayed: boolean;
}

export class AttackController {
  public state: AttackControllerState;
  public boardHandler: BoardHandler;
  public services: AppServices;
  public analysisController: AnalysisController;
  private requestGlobalRedraw: () => void;
  private playoutStartTimeMs: number | null = null;

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
    logger.info('[AttackController] Initialized.');
  }

  private _getControlsState(): GameControlsState {
    const { gamePhase, activePuzzle } = this.state;
    return {
      canRequestNew: gamePhase === 'IDLE' || gamePhase === 'GAMEOVER',
      onRequestNew: () => this.handleNewGame(),
      canRestart: (gamePhase === 'GAMEOVER' || gamePhase === 'IDLE') && !!activePuzzle,
      onRestart: () => this.handleRestartTask(),
      canResign: gamePhase === 'TACTICAL' || gamePhase === 'PLAYOUT',
      onResign: () => this.handleResign(),
      onShare: () => {
        const puzzleId = this.state.activePuzzle?.PuzzleId;
        if (!puzzleId) return;
  
        const baseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
        const shareUrl = `${baseUrl}/#/attack/PuzzleId/${puzzleId}`;
  
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

  private _getInitialState(): AttackControllerState {
      return {
        gamePhase: 'IDLE',
        feedbackMessage: t('attack.feedback.getReady', { defaultValue: 'Press "New Game" to start.' }),
        gameOverMessage: null,
        activePuzzle: null,
        puzzleResults: null,
        solutionMoves: [],
        currentSolutionMoveIndex: 0,
        isBotThinking: false,
        solveStartTimeMs: null,
        playoutTimerId: null,
        elapsedPlayoutTimeMs: 0,
        tenSecondsWarningPlayed: false,
        sevenSecondsWarningPlayed: false,
      };
  }

  private _clearPlayoutTimer(): void {
    if (this.state.playoutTimerId) {
      clearInterval(this.state.playoutTimerId);
      this.state.playoutTimerId = null;
    }
  }

  private _resetPuzzleState(): void {
      this._clearPlayoutTimer();
      this.playoutStartTimeMs = null;
      this.setState(this._getInitialState());
  }

  public async initializeGame(puzzleId?: string | null): Promise<void> {
    if (this.analysisController.getPanelState().isAnalysisActive) {
        this.analysisController.toggleAnalysisEngine();
    }
    
    this._resetPuzzleState();

    if (puzzleId) {
        await this._loadPuzzle(puzzleId);
    } else {
        this.boardHandler.setupPosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        this.setState({
            gamePhase: 'IDLE',
            feedbackMessage: t('attack.feedback.getReady', { defaultValue: 'Press "New Game" to start.' })
        });
    }
  }

  private async _loadPuzzle(puzzleSource: string | null): Promise<void> {
    this.setState({ gamePhase: 'LOADING', feedbackMessage: t('common.loading') });

    let puzzleData: AppAttackPuzzle | null = null;

    try {
        if (puzzleSource) {
            logger.info(`[AttackController] Loading puzzle by ID: ${puzzleSource}`);
            puzzleData = await this.services.webhookService.fetchAttackPuzzleById(puzzleSource);
        } else {
            logger.info(`[AttackController] Loading new random Attack puzzle.`);
            puzzleData = await this.services.webhookService.fetchAttackPuzzle();
            if (puzzleData) {
                const currentCoins = this.services.authService.getFunCoins();
                if (currentCoins !== null) {
                    const newBalance = currentCoins - 5;
                    this.services.authService.updateUserProfile({ FunCoins: newBalance });
                }
            }
        }

        if (!puzzleData) {
            throw new Error(t('attack.error.puzzleNotFound', { defaultValue: 'Could not load the puzzle.' }));
        }

        if (!puzzleSource) {
            this.services.appController.updatePuzzleUrl(puzzleData.PuzzleId);
        }

        SoundService.playBackgroundSound('game_entry');
        this.state.activePuzzle = puzzleData;
        this.state.puzzleResults = puzzleData.attack_results || null;
        this.state.solutionMoves = puzzleData.Moves ? puzzleData.Moves.split(' ') : [];
        this.state.currentSolutionMoveIndex = 0;

        const setup = parseFen(puzzleData.FEN_0).unwrap();
        const humanPlayerColor: ChessgroundColor = setup.turn === 'white' ? 'black' : 'white';
        this.boardHandler.setupPosition(puzzleData.FEN_0, humanPlayerColor, true);

        this.setState({
            gamePhase: 'TACTICAL',
            feedbackMessage: t('attack.feedback.findBestMove', { defaultValue: 'Find the best move!' }),
            solveStartTimeMs: Date.now(),
        });

        this._playNextSolutionMove();

    } catch (error: any) {
        if (error instanceof InsufficientFunCoinsError) {
            this.services.appController.showModal(error.message);
        } else if (this.services.appController.handleApiRateLimit(error)) {
            // Rate limit handled
        } else {
            logger.error('[AttackController] Error fetching puzzle:', error);
            this.setState({ 
                feedbackMessage: t('attack.error.loadFailed', { defaultValue: 'Failed to load puzzle.' })
            });
        }
        this.setState({ gamePhase: 'IDLE' });
    }
  }

  private _playNextSolutionMove(): void {
      if (this.state.gamePhase !== 'TACTICAL') return;

      const uciMove = this.state.solutionMoves[this.state.currentSolutionMoveIndex];
      if (!uciMove) {
          logger.info("[AttackController] No more solution moves. Entering playout mode.");
          this._enterPlayoutMode();
          return;
      }

      logger.info(`[AttackController] Playing solution move ${this.state.currentSolutionMoveIndex + 1}/${this.state.solutionMoves.length}: ${uciMove}`);
      
      setTimeout(() => {
          const moveResult = this.boardHandler.applySystemMove(uciMove);
          if (moveResult.success) {
              this.state.currentSolutionMoveIndex++;
              if (this._checkGameOver()) return;
              this.setState({ feedbackMessage: t('attack.feedback.yourTurn', { defaultValue: 'Your turn.' }) });
          } else {
              logger.error(`[AttackController] Failed to apply solution move ${uciMove}.`);
              this._handleGameOver({ reason: 'variant_loss', winner: this.boardHandler.getBoardTurnColor() });
          }
      }, BOT_MOVE_DELAY_MS);
  }

  private _enterPlayoutMode(): void {
      logger.info("[AttackController] Entering playout mode.");
      SoundService.playSoundEvent({ parallel: ['playout_starts'] });
      this.playoutStartTimeMs = Date.now();
      this.setState({
          gamePhase: 'PLAYOUT',
          feedbackMessage: t('attack.feedback.playoutStarted', { defaultValue: 'Playout begins!' }),
          elapsedPlayoutTimeMs: 0,
      });
      this._tickPlayoutTimer();
      this._triggerBotMoveIfNeeded();
  }

  public async handleUserMove(orig: Key, dest: Key, metadata?: MoveMetadata): Promise<void> {
    if (this.analysisController.getPanelState().isAnalysisActive) {
        logger.info(`[AttackController] User interacting with board while analysis is active: ${orig}-${dest}. Forwarding to BoardHandler.`);
        const moveResult: AttemptMoveResult = await this.boardHandler.attemptUserMove(orig, dest);
        if (moveResult.success && moveResult.sanMove) {
            this.setState({ feedbackMessage: t('puzzle.feedback.analysisMoveMade', { san: moveResult.sanMove, fen: this.boardHandler.getFen() }) });
        } else if (moveResult.isIllegal) {
            this.setState({ feedbackMessage: t('puzzle.feedback.illegalMoveAnalysis') });
        }
        return;
    }

    if (this.state.gamePhase !== 'TACTICAL' && this.state.gamePhase !== 'PLAYOUT') return;
    if (this.state.isBotThinking || (metadata && metadata.premove)) return;

    const moveResult = await this.boardHandler.attemptUserMove(orig, dest);
    if (!moveResult.success || !moveResult.uciMove) return;
    if (this._checkGameOver()) return;

    if (this.state.gamePhase === 'TACTICAL') {
        const expectedMove = this.state.solutionMoves[this.state.currentSolutionMoveIndex];
        if (moveResult.uciMove === expectedMove) {
            this.state.currentSolutionMoveIndex++;
            this._playNextSolutionMove();
        } else {
            this._handleGameOver({ reason: 'variant_loss', winner: this.boardHandler.getBoardTurnColor() }, t('attack.feedback.wrongMove', {defaultValue: 'Wrong move!'}));
        }
    } else if (this.state.gamePhase === 'PLAYOUT') {
        this._triggerBotMoveIfNeeded();
    }
  }

  private async _triggerBotMoveIfNeeded(): Promise<void> {
    if (this.state.gamePhase !== 'PLAYOUT') return;
    const isBotTurn = this.boardHandler.getBoardTurnColor() !== this.boardHandler.getHumanPlayerColor();
    if (!isBotTurn) return;

    this.setState({ 
        isBotThinking: true,
        feedbackMessage: t('attack.feedback.botThinking', { defaultValue: 'Bot is thinking...' })
    });

    try {
      const engineId = this.services.appController.state.selectedEngine;
      const botMoveUci = await this.services.gameplayService.getBestMove(engineId, this.boardHandler.getFen());

      if (this.state.gamePhase !== 'PLAYOUT') return;

      if (botMoveUci) {
        this.boardHandler.applySystemMove(botMoveUci);
        if (!this._checkGameOver()) {
          this.setState({ feedbackMessage: t('attack.feedback.yourTurn', { defaultValue: 'Your turn.' }) });
           setTimeout(() => { this.services.chessboardService.playPremove(); }, PREMOVE_EXECUTION_DELAY_MS);
        }
      } else {
         this._handleGameOver(this.boardHandler.getGameStatus().outcome, t('attack.feedback.botError', { defaultValue: 'Bot could not make a move.' }));
      }
    } catch (error) {
      logger.error('[AttackController] Error getting move from bot:', error);
      this._handleGameOver(undefined, t('attack.feedback.botError', { defaultValue: 'An error occurred with the bot engine.' }));
    } finally {
      this.setState({ isBotThinking: false });
    }
  }

  private _checkGameOver(): boolean {
      const gameStatus = this.boardHandler.getGameStatus();
      if (gameStatus.isGameOver) {
          this._handleGameOver(gameStatus.outcome);
          return true;
      }
      return false;
  }

  private _handleGameOver(outcome?: GameEndOutcome, customMessage?: string): void {
    if (this.state.gamePhase === 'GAMEOVER') return;

    this._clearPlayoutTimer();

    let message = customMessage || t('attack.feedback.gameOver', { defaultValue: 'Game Over.' });
    if (!customMessage && outcome) {
        const winnerIsHuman = outcome.winner === this.boardHandler.getHumanPlayerColor();
        if (outcome.winner) {
            message = winnerIsHuman 
                ? t('attack.feedback.win', { reason: outcome.reason || 'checkmate' }) 
                : t('attack.feedback.loss', { reason: outcome.reason || 'checkmate' });
        } else {
            message = t('attack.feedback.draw', { reason: outcome.reason || 'draw' });
        }
        if (winnerIsHuman) {
            this._sendAttackWinRecord();
        }
    }

    this.setState({
        gamePhase: 'GAMEOVER',
        gameOverMessage: message,
        feedbackMessage: message,
        isBotThinking: false,
    });
    
    this.boardHandler.configureBoardForAnalysis(true);
  }

  private async _sendAttackWinRecord(): Promise<void> {
    const user = this.services.authService.getUserProfile();
    const puzzle = this.state.activePuzzle;
    const startTime = this.state.solveStartTimeMs;

    if (!user || !puzzle || startTime === null) {
        logger.warn('[AttackController] Cannot send win record: missing user, puzzle, or start time.');
        return;
    }

    const timeInSeconds = Math.round((Date.now() - startTime) / 1000);

    const dto: AttackRecordDto = {
        username: user.username,
        PuzzleId: puzzle.PuzzleId,
        time_in_seconds: timeInSeconds,
    };

    logger.info('[AttackController] Sending attack win record:', dto);
    try {
        await this.services.webhookService.sendAttackRecord(dto);
        logger.info('[AttackController] Attack record sent successfully.');
    } catch (error) {
        logger.error('[AttackController] Failed to send attack record:', error);
    }
  }

  public handleNewGame(): void {
    if (!(this.state.gamePhase === 'IDLE' || this.state.gamePhase === 'GAMEOVER')) return;

    if (this.analysisController.getPanelState().isAnalysisActive) {
        this.analysisController.toggleAnalysisEngine();
    }

    this._loadPuzzle(null);
  }

  public handleRestartTask(): void {
      if (!((this.state.gamePhase === 'GAMEOVER' || this.state.gamePhase === 'IDLE') && !!this.state.activePuzzle)) return;
      this._loadPuzzle(this.state.activePuzzle.PuzzleId);
  }

  public handleResign(): void {
    if (!(this.state.gamePhase === 'TACTICAL' || this.state.gamePhase === 'PLAYOUT')) return;
    this._handleGameOver({ reason: 'variant_loss', winner: this.boardHandler.getBoardTurnColor() }, t('attack.feedback.resigned', { defaultValue: 'You resigned.' }));
  }

  private _tickPlayoutTimer(): void {
    if (this.state.gamePhase !== 'PLAYOUT' || this.playoutStartTimeMs === null) {
        this._clearPlayoutTimer();
        return;
    }

    const elapsedTime = Date.now() - this.playoutStartTimeMs;
    this.state.elapsedPlayoutTimeMs = elapsedTime;

    const timeLeftMs = PLAYOUT_TIME_LIMIT_MS - elapsedTime;

    if (timeLeftMs <= 10000 && !this.state.tenSecondsWarningPlayed) {
        SoundService.playSoundEvent({ parallel: ['timer_10_seconds_left'] });
        this.setState({ tenSecondsWarningPlayed: true });
    }
    if (timeLeftMs <= 7000 && !this.state.sevenSecondsWarningPlayed) {
        SoundService.playSoundEvent({ parallel: ['timer_7_seconds_left'] });
        this.setState({ sevenSecondsWarningPlayed: true });
    }

    const timerEl = document.getElementById('attack-timer-display');
    if (timerEl) {
        timerEl.textContent = formatElapsedTime(elapsedTime);
    }
    
    if (elapsedTime >= PLAYOUT_TIME_LIMIT_MS) {
        logger.info('[AttackController] Playout time limit reached.');
        this._clearPlayoutTimer();
        SoundService.playSoundEvent({ parallel: ['timer_times_up'], sequential: ['user_lost_playout'] });
        this._handleGameOver({ reason: 'variant_loss', winner: this.boardHandler.getBoardTurnColor() }, t('attack.feedback.timeUp', {defaultValue: 'Time is up!'}));
        return;
    }

    this.state.playoutTimerId = window.setTimeout(() => this._tickPlayoutTimer(), TIMER_INTERVAL_MS);
  }

  private setState(newState: Partial<AttackControllerState>): void {
    Object.assign(this.state, newState);
    this._updateAppControls();
  }

  public destroy(): void {
    this._clearPlayoutTimer();
    this.services.appController.clearGameControls();
    if (this.unsubscribeFromMoveMade) this.unsubscribeFromMoveMade();
    if (this.unsubscribeFromPgnNavigated) this.unsubscribeFromPgnNavigated();
    logger.info('[AttackController] Destroyed.');
  }
}
