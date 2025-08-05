// src/features/finishHim/finishHimController.ts
import type { Key, Color as ChessgroundColor, MoveMetadata } from 'chessground/types';
import type { ChessboardService } from '../../core/chessboard.service';
import { type WebhookServiceController, InsufficientFunCoinsError } from '../../core/webhook.service';
import { type UpdateFinishHimStatsDto, type AppPuzzle, type PuzzleResultEntry, type FinishHimStats } from '../../core/api.types';
import { BoardHandler } from '../../core/boardHandler';
import type { GameStatus, GameEndOutcome, AttemptMoveResult } from '../../core/boardHandler';
import type { AnalysisController } from '../analysis/analysisController';
import logger from '../../utils/logger';
import { SoundService } from '../../core/sound.service';
import { t } from '../../core/i18n.service';
import { AuthService } from '../../core/auth.service';
import type { AppServices, GameControlsState } from '../../AppController';
import { PuzzleStorageService } from '../../core/puzzle-storage.service';

const BOT_MOVE_DELAY_MS = 100;
const PREMOVE_EXECUTION_DELAY_MS = 100;
const PLAYOUT_TIMER_INTERVAL_MS = 1000;

type GamePhase = 'IDLE' | 'TACTICAL' | 'PLAYOUT' | 'GAMEOVER';

export function formatPlayoutTimer(ms: number | null): string {
  if (ms === null || ms < 0) return "00:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

interface FinishHimControllerState {
  activePuzzle: AppPuzzle | null;
  puzzleResults: PuzzleResultEntry[] | null;
  interactiveSetupMoves: string[];
  currentInteractiveSetupMoveIndex: number;
  userStats: FinishHimStats | null;
  userFunCoins: number | null;
  feedbackMessage: string;
  isStockfishThinking: boolean;
  gameOverMessage: string | null;
  currentPgnString: string;
  currentPuzzleSolveTime?: number;
  outplayTimerId: number | null;
  outplayTimeRemainingMs: number | null;
  tacticalRatingDelta: number | null;
  finishHimRatingDelta: number | null;
  isCurrentPuzzleSolved: boolean;
  isCurrentPuzzleFavorite: boolean;
  gamePhase: GamePhase;
  tenSecondsWarningPlayed: boolean;
  sevenSecondsWarningPlayed: boolean;
}

export class FinishHimController {
  public state: FinishHimControllerState;
  public boardHandler: BoardHandler;
  public analysisController: AnalysisController;
  public services: AppServices;
  private authService: typeof AuthService;
  private webhookService: WebhookServiceController;
  private puzzleStorageService: typeof PuzzleStorageService;

  private readonly defaultUserTacticalRating = 1200;
  private readonly defaultUserFinishHimRating = 1200;

  private unsubscribeFromMoveMade: (() => void) | null = null;
  private unsubscribeFromPgnNavigated: (() => void) | null = null;

  constructor(
    public chessboardService: ChessboardService,
    boardHandler: BoardHandler,
    authService: typeof AuthService,
    webhookService: WebhookServiceController,
    analysisController: AnalysisController,
    services: AppServices,
    public requestRedraw: () => void,
  ) {
    this.boardHandler = boardHandler;
    this.authService = authService;
    this.webhookService = webhookService;
    this.analysisController = analysisController;
    this.services = services;
    this.puzzleStorageService = PuzzleStorageService;

    const initialStats = this.authService.getFinishHimStats();
    const initialFunCoins = this.authService.getFunCoins();

    this.state = {
      activePuzzle: null,
      puzzleResults: null,
      interactiveSetupMoves: [],
      currentInteractiveSetupMoveIndex: 0,
      userStats: initialStats,
      userFunCoins: initialFunCoins,
      feedbackMessage: t('finishHim.feedback.getReady'),
      isStockfishThinking: false,
      gameOverMessage: null,
      currentPgnString: "",
      currentPuzzleSolveTime: undefined,
      outplayTimerId: null,
      outplayTimeRemainingMs: null,
      tacticalRatingDelta: null,
      finishHimRatingDelta: null,
      isCurrentPuzzleSolved: false,
      isCurrentPuzzleFavorite: false,
      gamePhase: 'IDLE',
      tenSecondsWarningPlayed: false,
      sevenSecondsWarningPlayed: false,
    };

    this.unsubscribeFromMoveMade = this.boardHandler.onMoveMade(() => {
        this._updatePgnDisplay();
        this._updateAppControls(); 
        this.requestRedraw();
    });
    this.unsubscribeFromPgnNavigated = this.boardHandler.onPgnNavigated(() => {
        this._updatePgnDisplay();
        this._updateAppControls(); 
        this.requestRedraw();
    });

    logger.info('[FinishHimController] Initialized.');
  }

  private _getControlsState(): GameControlsState {
    const { gamePhase, activePuzzle } = this.state;
    return {
      canRequestNew: gamePhase === 'IDLE' || gamePhase === 'GAMEOVER',
      onRequestNew: () => this.handleRequestNextTask(),
      canRestart: (gamePhase === 'GAMEOVER' || gamePhase === 'IDLE') && !!activePuzzle,
      onRestart: () => this.handleRestartTask(),
      canResign: gamePhase === 'TACTICAL' || gamePhase === 'PLAYOUT',
      onResign: () => this.handleResignGame(),
      onShare: () => {
        const puzzleId = this.state.activePuzzle?.PuzzleId;
        if (!puzzleId) return;
  
        const baseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
        const shareUrl = `${baseUrl}/#/finishHim/PuzzleId/${puzzleId}`;
  
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
    if ((this.state.gamePhase === 'TACTICAL' || this.state.gamePhase === 'PLAYOUT') && this.analysisController.getPanelState().isAnalysisActive) {
        this.analysisController.toggleAnalysisEngine();
    }
  }

  private _clearOutplayTimer(): void {
    if (this.state.outplayTimerId) {
      clearTimeout(this.state.outplayTimerId);
      this.state.outplayTimerId = null;
    }
  }

  private _resetPuzzleState(): void {
    this.state.activePuzzle = null;
    this.state.puzzleResults = null;
    this.state.interactiveSetupMoves = [];
    this.state.currentInteractiveSetupMoveIndex = 0;
    this.state.isStockfishThinking = false;
    this.state.gameOverMessage = null;
    this.state.currentPgnString = "";
    this.state.currentPuzzleSolveTime = undefined;
    this.state.outplayTimeRemainingMs = null;
    this.state.tacticalRatingDelta = null;
    this.state.finishHimRatingDelta = null;
    this.state.isCurrentPuzzleSolved = false;
    this.state.isCurrentPuzzleFavorite = false;
    this.state.gamePhase = 'IDLE';
    this.state.tenSecondsWarningPlayed = false;
    this.state.sevenSecondsWarningPlayed = false;
    this._clearOutplayTimer();
  }

  public initializeGame(puzzleId?: string | null): void {
    const currentAuthStats = this.authService.getFinishHimStats();
    const currentFunCoins = this.authService.getFunCoins();

    if (currentAuthStats) {
        if (JSON.stringify(this.state.userStats) !== JSON.stringify(currentAuthStats)) {
            this.state.userStats = currentAuthStats;
        }
    } else if (this.authService.getIsAuthenticated()) {
        this.state.userStats = {
            gamesPlayed: 0, tacticalRating: this.defaultUserTacticalRating, tacticalWins: 0, tacticalLosses: 0,
            finishHimRating: this.defaultUserFinishHimRating, playoutWins: 0, playoutDraws: 0, playoutLosses: 0,
        };
    }
    if (currentFunCoins !== null && this.state.userFunCoins !== currentFunCoins) {
        this.state.userFunCoins = currentFunCoins;
    }

    this._resetPuzzleState();
    
    if (puzzleId) {
        this.loadAndStartFinishHimPuzzle(puzzleId);
    } else {
        this.boardHandler.setupPosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        this.state.feedbackMessage = t('finishHim.feedback.pressNext');
        this._updatePgnDisplay();
        this._updateAppControls(); 
        this.requestRedraw();
    }
  }

  private async _sendStatsToBackend(options: { solvedInSeconds?: number } = {}): Promise<void> {
    if (this.authService.getIsAuthenticated() && this.state.userStats && this.state.userFunCoins !== null) {
        const dto: UpdateFinishHimStatsDto = {
            FunCoins: this.state.userFunCoins,
            finishHimStats: { ...this.state.userStats },
        };
        if (options.solvedInSeconds !== undefined) {
            dto.solved_in_seconds = options.solvedInSeconds;
        }
        if (this.state.activePuzzle) {
            dto.PuzzleId = this.state.activePuzzle.PuzzleId;
        }

        logger.info(`[FinishHimController] Sending updated stats to backend.`, dto);
        try {
            const success = await this.webhookService.sendFinishHimStatsUpdate(dto);
            if (success) {
                logger.info('[FinishHimController] Stats successfully sent to backend.');
            } else {
                logger.warn('[FinishHimController] Failed to send stats to backend (webhookService returned false).');
            }
        } catch (error: any) {
            if (this.services.appController.handleApiRateLimit(error)) return;
            logger.error('[FinishHimController] Error sending stats to backend:', error);
        }
    } else {
        logger.warn('[FinishHimController _sendStatsToBackend] Cannot send stats: user not authenticated or stats missing.');
    }
  }

  public async loadAndStartFinishHimPuzzle(puzzleSource?: string | AppPuzzle): Promise<void> {
    if (this.boardHandler.promotionCtrl.isActive()) this.boardHandler.promotionCtrl.cancel();
    if (this.analysisController.getPanelState().isAnalysisActive) {
        this.analysisController.toggleAnalysisEngine();
    }
    
    this._resetPuzzleState();
    this.state.feedbackMessage = t('common.loading');
    this.requestRedraw();

    let puzzleDataToProcess: AppPuzzle | null = null;
    const userId = this.authService.getUserProfile()?.id;

    try {
        if (typeof puzzleSource === 'object' && puzzleSource !== null) {
            puzzleDataToProcess = puzzleSource;
        } else if (typeof puzzleSource === 'string') {
             puzzleDataToProcess = await this.webhookService.fetchPuzzleById(puzzleSource);
        } else {
            puzzleDataToProcess = await this.webhookService.fetchPuzzle();
            if (puzzleDataToProcess) {
                const currentCoins = this.authService.getFunCoins();
                if (currentCoins !== null) {
                    const newBalance = currentCoins - 5;
                    this.authService.updateUserProfile({ FunCoins: newBalance });
                }
            }
        }

        if (!puzzleDataToProcess) {
            this.services.appController.showModal(t('finishHim.error.puzzleNotFound', { puzzleId: typeof puzzleSource === 'string' ? puzzleSource : '' }));
            this.state.gamePhase = 'IDLE';
            this.state.feedbackMessage = t('finishHim.feedback.pressNext');
            this._updateAppControls(); 
            this.requestRedraw();
            return;
        }

        if (!puzzleSource || typeof puzzleSource !== 'object') {
            this.services.appController.updatePuzzleUrl(puzzleDataToProcess.PuzzleId);
        }
    } catch (error: any) {
        if (error instanceof InsufficientFunCoinsError) {
            this.services.appController.showModal(error.message);
        } else if (this.services.appController.handleApiRateLimit(error)) {
            // Rate limit is handled, do nothing more here
        } else {
            logger.error('[FinishHimController] Error fetching puzzle:', error);
            this.state.feedbackMessage = t('puzzle.feedback.loadFailed');
        }
        this.state.gamePhase = 'IDLE';
        this._updateAppControls(); 
        this.requestRedraw();
        return;
    }

    if (puzzleDataToProcess && userId) { 
      SoundService.playBackgroundSound('game_entry');
      this.state.activePuzzle = puzzleDataToProcess;
      this.state.puzzleResults = puzzleDataToProcess.endgame_results || null;
      this.state.isCurrentPuzzleSolved = this.puzzleStorageService.isPuzzleSolved(userId, puzzleDataToProcess.PuzzleId);
      this.state.isCurrentPuzzleFavorite = this.puzzleStorageService.isPuzzleFavorite(userId, puzzleDataToProcess.PuzzleId);
      
      this.state.interactiveSetupMoves = puzzleDataToProcess.Moves ? puzzleDataToProcess.Moves.split(' ') : [];
      this.state.currentInteractiveSetupMoveIndex = 0;
      this.state.currentPuzzleSolveTime = puzzleDataToProcess.solve_time;

      const humanPlayerActualColor: ChessgroundColor = puzzleDataToProcess.bot_color === 'w' ? 'black' : 'white';
      this.boardHandler.setupPosition(puzzleDataToProcess.FEN_0, humanPlayerActualColor, true);

      const playerColorName = t(humanPlayerActualColor === 'white' ? 'puzzle.colors.white' : 'puzzle.colors.black');
      let loadedMessage = t('finishHim.feedback.loadedSimple', { puzzleId: puzzleDataToProcess.PuzzleId, color: playerColorName });
      if (this.state.isCurrentPuzzleSolved) {
        loadedMessage += ` (${t('finishHim.feedback.alreadySolved')})`;
      }
      this.state.feedbackMessage = loadedMessage;
      this.state.gamePhase = 'TACTICAL';

      if (this.checkAndSetGameOver()) return;

      if (this.state.interactiveSetupMoves.length > 0) {
        const boardTurn = this.boardHandler.getBoardTurnColor();
        if (boardTurn !== humanPlayerActualColor) {
          setTimeout(() => this._playNextInteractiveSetupMoveSystem(false), BOT_MOVE_DELAY_MS);
        } else {
          this.state.feedbackMessage = t('puzzle.feedback.yourTurn');
        }
      } else {
        this._handleTacticalSuccess(); 
        this._enterPlayoutMode();
      }
    } else {
      logger.error("[FinishHimController] Failed to load puzzle or user not authenticated.");
      this.state.feedbackMessage = t('puzzle.feedback.loadFailed');
      this.state.gamePhase = 'IDLE';
    }
    this._updateAppControls(); 
    this.requestRedraw();
  }
  
  public handleRequestNextTask(): void {
    if (!this._getControlsState().canRequestNew) return; 
    this.loadAndStartFinishHimPuzzle();
  }
  
  public handleRestartTask(): void {
    if (!this._getControlsState().canRestart) return; 
    if (this.analysisController.getPanelState().isAnalysisActive) {
        this.analysisController.toggleAnalysisEngine();
    }
    if (this.state.activePuzzle) {
      this.loadAndStartFinishHimPuzzle(this.state.activePuzzle);
    } else {
      this.loadAndStartFinishHimPuzzle();
    }
  }

  public destroy(): void {
    logger.info('[FinishHimController] Destroying FinishHimController instance.');
    this._clearOutplayTimer();
    this.services.appController.clearGameControls(); 

    if (this.unsubscribeFromMoveMade) {
      this.unsubscribeFromMoveMade();
      this.unsubscribeFromMoveMade = null;
    }
    if (this.unsubscribeFromPgnNavigated) {
      this.unsubscribeFromPgnNavigated();
      this.unsubscribeFromPgnNavigated = null;
    }
  }

  private _stopCurrentGameActivity(resign: boolean = false): void {
    const wasGameActive = this.state.gamePhase === 'TACTICAL' || this.state.gamePhase === 'PLAYOUT';
    this.state.isStockfishThinking = false;
    this._clearOutplayTimer();
    this.state.outplayTimeRemainingMs = null;
    if (resign) {
        this.state.gamePhase = 'GAMEOVER';
        this.state.gameOverMessage = t('finishHim.feedback.resigned');
        this.state.feedbackMessage = this.state.gameOverMessage;
        if (this.state.activePuzzle && this.state.userStats && !this.state.isCurrentPuzzleSolved) {
            this._updatePlayoutResult('loss', null);
            this.puzzleStorageService.markPuzzleAsSolved(this.authService.getUserProfile()!.id, this.state.activePuzzle.PuzzleId);
        }
    } else if (this.state.gameOverMessage === null && wasGameActive) {
        this.state.gamePhase = 'IDLE';
        this.state.feedbackMessage = t('finishHim.feedback.gameStopped');
    }
    this._updateAppControls(); 
    this.requestRedraw();
  }
  private formatGameEndMessage(outcome: GameEndOutcome | undefined): string | null {
    if (!outcome) return null;
    if (outcome.winner) {
      const winnerColor = t(outcome.winner === 'white' ? 'puzzle.colors.white' : 'puzzle.colors.black');
      return t('puzzle.gameOver.checkmateWinner', { winner: winnerColor, reason: outcome.reason || t('puzzle.gameOver.reasons.checkmate') });
    }
    switch (outcome.reason) {
      case 'stalemate': return t('puzzle.gameOver.stalemate');
      case 'insufficient_material': return t('puzzle.gameOver.insufficientMaterial');
      case 'draw': return t('puzzle.gameOver.draw');
      default: return t('puzzle.gameOver.drawReason', { reason: outcome.reason || t('puzzle.gameOver.reasons.unknown') });
    }
  }
  private _updatePgnDisplay(): void {
    const showResultInPgn = this.state.gamePhase === 'GAMEOVER' && !this.analysisController.getPanelState().isAnalysisActive;
    this.state.currentPgnString = this.boardHandler.getPgn({
        showResult: showResultInPgn,
        showVariations: this.analysisController.getPanelState().isAnalysisActive
    });
  }
  private _incrementGamesPlayed(): void {
    if (this.state.userStats) {
      this.state.userStats.gamesPlayed += 1;
    }
  }
  private _handleTacticalFailure(): void {
    const userId = this.authService.getUserProfile()?.id;
    if (!this.state.userStats || !this.state.activePuzzle || !userId) return;
    if (!this.state.isCurrentPuzzleSolved) {
        const oldTacticalRating = this.state.userStats.tacticalRating;
        this.state.userStats.tacticalRating -= 10;
        this.state.userStats.tacticalLosses += 1;
        this.state.tacticalRatingDelta = this.state.userStats.tacticalRating - oldTacticalRating;
        this._incrementGamesPlayed();
        this._sendStatsToBackend();
        this.puzzleStorageService.markPuzzleAsSolved(userId, this.state.activePuzzle.PuzzleId);
    }
  }
  private _handleTacticalSuccess(): void {
    if (!this.state.userStats || !this.state.activePuzzle) return;
    if (!this.state.isCurrentPuzzleSolved) {
        const oldTacticalRating = this.state.userStats.tacticalRating;
        this.state.userStats.tacticalRating += 10;
        this.state.userStats.tacticalWins += 1;
        this.state.tacticalRatingDelta = this.state.userStats.tacticalRating - oldTacticalRating;
    }
  }
  private _updatePlayoutResult(outcome: 'win' | 'loss' | 'draw', remainingTimeMs: number | null): void {
    const userId = this.authService.getUserProfile()?.id;
    if (this.state.userStats && this.state.userFunCoins !== null && this.state.activePuzzle && userId) {
        if (!this.state.isCurrentPuzzleSolved) {
            const oldFinishHimRating = this.state.userStats.finishHimRating;
            let solvedInSeconds: number | undefined = undefined;

            this._incrementGamesPlayed();

            if (outcome === 'win') {
                this.state.userStats.finishHimRating += 10;
                this.state.userStats.playoutWins += 1;
                if (this.state.currentPuzzleSolveTime && remainingTimeMs !== null) {
                    const timeSpentMs = (this.state.currentPuzzleSolveTime * 1000) - remainingTimeMs;
                    solvedInSeconds = Math.round(timeSpentMs / 1000);
                }
            } else {
                this.state.userStats.finishHimRating -= 10;
                if (outcome === 'loss') this.state.userStats.playoutLosses += 1;
                else this.state.userStats.playoutDraws += 1;
            }
            this.state.finishHimRatingDelta = this.state.userStats.finishHimRating - oldFinishHimRating;
            
            this._sendStatsToBackend({ solvedInSeconds });
            this.puzzleStorageService.markPuzzleAsSolved(userId, this.state.activePuzzle.PuzzleId);
        }
    }
  }
  private checkAndSetGameOver(): boolean {
    const gameStatus: GameStatus = this.boardHandler.getGameStatus();
    if (gameStatus.isGameOver) {
      const phaseWhenGameOver = this.state.gamePhase;
      const finalRemainingTimeMs = this.state.outplayTimeRemainingMs;
      
      this.state.gamePhase = 'GAMEOVER';
      this.state.gameOverMessage = this.formatGameEndMessage(gameStatus.outcome);
      this.state.feedbackMessage = this.state.gameOverMessage || t('puzzle.feedback.gameOver');
      this._clearOutplayTimer();
      this.state.outplayTimeRemainingMs = null;
      
      if (this.state.activePuzzle) { 
        if (phaseWhenGameOver === 'PLAYOUT') {
            const humanColor = this.boardHandler.getHumanPlayerColor();
            let playoutOutcome: 'win' | 'loss' | 'draw' = 'draw';
            if (gameStatus.outcome?.winner === humanColor) playoutOutcome = 'win';
            else if (gameStatus.outcome?.winner) playoutOutcome = 'loss';
            this._updatePlayoutResult(playoutOutcome, finalRemainingTimeMs); 
        }
      }
      
      this._updatePgnDisplay();
      this._updateAppControls(); 
      this.requestRedraw();
      return true;
    }
    this.state.gameOverMessage = null;
    this._updateAppControls(); 
    return false;
  }
  private _playNextInteractiveSetupMoveSystem(isContinuation: boolean = false): void {
    if (this.state.gamePhase !== 'TACTICAL' || this.boardHandler.promotionCtrl.isActive() || this.analysisController.getPanelState().isAnalysisActive) {
        this._updateAppControls(); 
        return;
    }
    if (!this.state.activePuzzle || this.state.currentInteractiveSetupMoveIndex >= this.state.interactiveSetupMoves.length) {
      if (this.state.activePuzzle) {
        if (this.state.currentInteractiveSetupMoveIndex > 0 && this.state.interactiveSetupMoves.length > 0) {
            this._handleTacticalSuccess();
        }
        this._enterPlayoutMode();
      } else {
        this.requestRedraw();
      }
      return;
    }
    const uciSetupMove = this.state.interactiveSetupMoves[this.state.currentInteractiveSetupMoveIndex];
    this.state.feedbackMessage = isContinuation ? t('puzzle.feedback.systemResponse', { move: uciSetupMove }) : t('puzzle.feedback.systemFirstMove', { move: uciSetupMove });
    const moveResult: AttemptMoveResult = this.boardHandler.applySystemMove(uciSetupMove);
    if (moveResult.success) {
      this.state.currentInteractiveSetupMoveIndex++;
      if (this.checkAndSetGameOver()) return;
      setTimeout(() => {
          if (this.chessboardService.playPremove()) {
          }
      }, PREMOVE_EXECUTION_DELAY_MS);
      if (this.state.currentInteractiveSetupMoveIndex >= this.state.interactiveSetupMoves.length) {
        this._handleTacticalSuccess();
        this._enterPlayoutMode();
      } else {
        this.state.feedbackMessage = t('puzzle.feedback.yourTurn');
      }
    } else {
      this.state.feedbackMessage = t('puzzle.feedback.puzzleDataError');
    }
    this._updateAppControls(); 
    this.requestRedraw();
  }
  private _tickOutplayTimer(): void {
    if (this.state.gamePhase !== 'PLAYOUT') {
        this._clearOutplayTimer();
        this.state.outplayTimeRemainingMs = null;
        this._updateAppControls(); 
        return;
    }
    if (this.state.outplayTimeRemainingMs !== null) {
        this.state.outplayTimeRemainingMs -= PLAYOUT_TIMER_INTERVAL_MS;
        
        if (this.state.outplayTimeRemainingMs <= 10000 && !this.state.tenSecondsWarningPlayed) {
            SoundService.playSoundEvent({ parallel: ['timer_10_seconds_left'] });
            this.setState({ tenSecondsWarningPlayed: true });
        }
        if (this.state.outplayTimeRemainingMs <= 8000 && !this.state.sevenSecondsWarningPlayed) {
            SoundService.playSoundEvent({ parallel: ['timer_7_seconds_left'] });
            this.setState({ sevenSecondsWarningPlayed: true });
        }

        const timerEl = document.getElementById('finish-him-timer-display');
        if (timerEl) {
            timerEl.textContent = formatPlayoutTimer(this.state.outplayTimeRemainingMs);
        }
        if (this.state.outplayTimeRemainingMs <= 0) {
            this._clearOutplayTimer();
            const finalTime = 0;
            this.state.outplayTimeRemainingMs = finalTime;
            SoundService.playSoundEvent({ parallel: ['timer_times_up'], sequential: ['user_lost_playout'] });
            this._updatePlayoutResult('loss', finalTime); 
            this.state.gamePhase = 'GAMEOVER';
            this.state.gameOverMessage = t('finishHim.feedback.timeUp');
            this.state.feedbackMessage = this.state.gameOverMessage;
            this._updatePgnDisplay();
            this._updateAppControls(); 
            this.requestRedraw(); 
            return;
        }
    }
    this.state.outplayTimerId = window.setTimeout(() => this._tickOutplayTimer(), PLAYOUT_TIMER_INTERVAL_MS);
  }
  private _enterPlayoutMode(): void {
    SoundService.playSoundEvent({ parallel: ['playout_starts'] });
    this.state.gamePhase = 'PLAYOUT';
    this._clearOutplayTimer();
    const timerDurationMs = this.state.currentPuzzleSolveTime ? this.state.currentPuzzleSolveTime * 1000 : 60000;
    this.state.outplayTimeRemainingMs = timerDurationMs;
    this.triggerStockfishMoveInPlayoutIfNeeded();
    this._updateAppControls(); 
    this.requestRedraw();
  }
  private async triggerStockfishMoveInPlayoutIfNeeded(): Promise<void> {
    if (this.state.gamePhase !== 'PLAYOUT' || this.boardHandler.promotionCtrl.isActive() || this.analysisController.getPanelState().isAnalysisActive) {
      this._updateAppControls(); 
      return;
    }
    const currentBoardTurn = this.boardHandler.getBoardTurnColor();
    const humanColor = this.boardHandler.getHumanPlayerColor();
    if (currentBoardTurn !== humanColor && !this.state.isStockfishThinking) {
      this.state.isStockfishThinking = true;
      this.state.feedbackMessage = t('puzzle.feedback.stockfishThinking');
      this._updateAppControls(); 
      this.requestRedraw();
      if (this.state.outplayTimeRemainingMs !== null && this.state.outplayTimerId === null) {
        this.state.outplayTimerId = window.setTimeout(() => this._tickOutplayTimer(), PLAYOUT_TIMER_INTERVAL_MS);
      }
      try {
        const engineId = this.services.appController.state.selectedEngine;
        const botMoveUci = await this.services.gameplayService.getBestMove(engineId, this.boardHandler.getFen());
        if (this.state.gamePhase !== 'PLAYOUT' || !this.state.isStockfishThinking) {
            this.state.isStockfishThinking = false;
            this._updateAppControls(); 
            this.requestRedraw();
            return;
        }
        this.state.isStockfishThinking = false;
        if (botMoveUci) {
          const moveResult: AttemptMoveResult = this.boardHandler.applySystemMove(botMoveUci);
          if (moveResult.success) {
            if (!this.checkAndSetGameOver()) {
              this.state.feedbackMessage = t('finishHim.feedback.yourTurnPlayout');
              setTimeout(() => {
                if (this.chessboardService.playPremove()) {
                }
              }, PREMOVE_EXECUTION_DELAY_MS); 
            }
          } else {
            this.state.feedbackMessage = t('puzzle.feedback.stockfishError');
          }
        } else {
          if (!this.checkAndSetGameOver()) {
            this.state.feedbackMessage = t('puzzle.feedback.stockfishNoMove');
          }
        }
      } catch (error) {
        this.state.isStockfishThinking = false;
        if (!this.checkAndSetGameOver()) {
          this.state.feedbackMessage = t('puzzle.feedback.stockfishGetMoveError');
        }
      }
      this._updateAppControls(); 
      this.requestRedraw();
    } else if (currentBoardTurn === humanColor) {
        if (!this.state.gameOverMessage) this.state.feedbackMessage = t('finishHim.feedback.yourTurnPlayout');
        this._updateAppControls(); 
        this.requestRedraw();
    }
  }
  public async handleUserMove(orig: Key, dest: Key, metadata?: MoveMetadata): Promise<void> {
    if (this.analysisController.getPanelState().isAnalysisActive) {
        const moveResult: AttemptMoveResult = await this.boardHandler.attemptUserMove(orig, dest);
        if (moveResult.success && moveResult.uciMove) {
            this.state.feedbackMessage = t('puzzle.feedback.analysisMoveMade', { san: moveResult.sanMove || moveResult.uciMove, fen: this.boardHandler.getFen() });
        } else if (moveResult.promotionStarted && !moveResult.promotionCompleted) {
            this.state.feedbackMessage = t('puzzle.feedback.promotionCancelled');
        } else if (moveResult.isIllegal) {
            this.state.feedbackMessage = t('puzzle.feedback.illegalMoveAnalysis');
        } else {
            this.state.feedbackMessage = t('puzzle.feedback.moveErrorAnalysis');
        }
        this._updatePgnDisplay();
        this._updateAppControls(); 
        this.requestRedraw();
        return;
    }
    if (metadata?.premove) {
        return;
    }
    if (this.state.gamePhase === 'IDLE' || this.state.gamePhase === 'GAMEOVER') {
        return;
    }
    if (this.boardHandler.promotionCtrl.isActive()) {
        this.state.feedbackMessage = t('puzzle.feedback.selectPromotion');
        this.requestRedraw();
        return;
    }
    if (this.state.isStockfishThinking) {
        this.state.feedbackMessage = t('puzzle.feedback.stockfishThinkingWait');
        this.requestRedraw();
        return;
    }
    const isUserFenTurn = this.boardHandler.getBoardTurnColor() === this.boardHandler.getHumanPlayerColor();
    if (!isUserFenTurn) {
        this.state.feedbackMessage = t('puzzle.feedback.notYourTurn');
        this.requestRedraw();
        return;
    }
    const moveResult: AttemptMoveResult = await this.boardHandler.attemptUserMove(orig, dest);
    if (moveResult.success && moveResult.uciMove) {
      this._updatePgnDisplay();
      if (this.checkAndSetGameOver()) return;
      switch(this.state.gamePhase) {
        case 'TACTICAL':
          this.processUserMoveResultInInteractiveSetup(moveResult.uciMove);
          break;
        case 'PLAYOUT':
          if (this.state.outplayTimeRemainingMs !== null && this.state.outplayTimerId === null) {
              this.state.outplayTimerId = window.setTimeout(() => this._tickOutplayTimer(), PLAYOUT_TIMER_INTERVAL_MS);
          }
          this.triggerStockfishMoveInPlayoutIfNeeded();
          break;
      }
    } else if (moveResult.promotionStarted && !moveResult.success && !moveResult.promotionCompleted) {
      this.state.feedbackMessage = t('puzzle.feedback.promotionCancelled');
      this.requestRedraw();
    } else if (!moveResult.success) {
      this.state.feedbackMessage = moveResult.isIllegal ? t('puzzle.feedback.invalidMove') : t('puzzle.feedback.moveProcessingError');
      this.requestRedraw();
    }
    this._updateAppControls(); 
  }
  private processUserMoveResultInInteractiveSetup(uciUserMove: string): void {
    if (!this.state.activePuzzle) {
      this._handleTacticalSuccess();
      this._enterPlayoutMode();
      return;
    }
    const expectedSetupMove = this.state.interactiveSetupMoves[this.state.currentInteractiveSetupMoveIndex];
    if (uciUserMove === expectedSetupMove) {
      this.state.feedbackMessage = t('puzzle.feedback.correctMove');
      this.state.currentInteractiveSetupMoveIndex++;
      if (this.checkAndSetGameOver()) return;
      if (this.state.currentInteractiveSetupMoveIndex >= this.state.interactiveSetupMoves.length) {
        this._handleTacticalSuccess(); 
        this._enterPlayoutMode();
      } else {
        this.state.feedbackMessage = t('puzzle.feedback.systemMove');
        setTimeout(() => {
          if (this.state.gamePhase === 'TACTICAL') {
            this._playNextInteractiveSetupMoveSystem(true);
          }
        }, BOT_MOVE_DELAY_MS);
      }
    } else {
      this.state.feedbackMessage = t('finishHim.feedback.tacticalFail');
      this.state.gameOverMessage = t('finishHim.feedback.tacticalFailDetailed', {userMove: uciUserMove, expectedMove: expectedSetupMove});
      this.state.gamePhase = 'GAMEOVER';
      this._handleTacticalFailure();
      SoundService.playSoundEvent({ sequential: ['user_lost_playout'] });
      this._updatePgnDisplay();
    }
    this._updateAppControls(); 
    this.requestRedraw();
  }
  public handleResignGame(): void {
    if (!this._getControlsState().canResign) { 
        return;
    }
    this._stopCurrentGameActivity(true);
  }
  
  public toggleFavorite(): void {
    const userId = this.authService.getUserProfile()?.id;
    const puzzle = this.state.activePuzzle;
    if (userId && puzzle && puzzle.fen_final) {
        const isNowFavorite = this.puzzleStorageService.toggleFavorite(userId, {
            id: puzzle.PuzzleId,
            fen_final: puzzle.fen_final,
            bot_color: puzzle.bot_color,
        });
        this.state.isCurrentPuzzleFavorite = isNowFavorite;
        this.requestRedraw();
    } else {
        logger.warn('[FinishHimController] Could not toggle favorite: missing user, puzzle, or fen_final.');
    }
  }

  private setState(newState: Partial<FinishHimControllerState>): void {
    const currentState = { ...this.state };
    const updatedState = { ...currentState, ...newState };
  
    if (JSON.stringify(currentState) !== JSON.stringify(updatedState)) {
        this.state = updatedState;
        this.requestRedraw();
    }
  }
}
