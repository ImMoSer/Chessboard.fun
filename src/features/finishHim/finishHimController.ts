// src/features/finishHim/finishHimController.ts
import type { Color as ChessgroundColor } from 'chessground/types';
import { type WebhookServiceController, InsufficientFunCoinsError } from '../../core/webhook.service';
import { type UpdateFinishHimStatsDto, type AppPuzzle, type PuzzleResultEntry, type FinishHimStats } from '../../core/api.types';
import type { GameEndOutcome, AttemptMoveResult } from '../../core/boardHandler';
import logger from '../../utils/logger';
import { SoundService } from '../../core/sound.service';
import { t } from '../../core/i18n.service';
import { AuthService } from '../../core/auth.service';
import type { AppServices, GameControlsState } from '../../AppController';
import { PuzzleStorageService } from '../../core/puzzle-storage.service';
import { BaseGameController } from '../../core/controllers/base-game.controller';
import { BaseGameState } from '../../core/controllers/base-game.types';
import type { BoardHandler } from '../../core/boardHandler';
import type { AnalysisController } from '../analysis/analysisController';

const BOT_MOVE_DELAY_MS = 100;
const PREMOVE_EXECUTION_DELAY_MS = 100;
const PLAYOUT_TIMER_INTERVAL_MS = 1000;

export function formatPlayoutTimer(ms: number | null): string {
  if (ms === null || ms < 0) return "00:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export interface FinishHimControllerState extends BaseGameState {
  activePuzzle: AppPuzzle | null;
  puzzleResults: PuzzleResultEntry[] | null;
  interactiveSetupMoves: string[];
  currentInteractiveSetupMoveIndex: number;
  userStats: FinishHimStats | null;
  userFunCoins: number | null;
  isStockfishThinking: boolean;
  currentPgnString: string;
  currentPuzzleSolveTime?: number;
  outplayTimerId: number | null;
  outplayTimeRemainingMs: number | null;
  tacticalRatingDelta: number | null;
  finishHimRatingDelta: number | null;
  isCurrentPuzzleSolved: boolean;
  isCurrentPuzzleFavorite: boolean;
  tenSecondsWarningPlayed: boolean;
  sevenSecondsWarningPlayed: boolean;
}

export class FinishHimController extends BaseGameController<FinishHimControllerState> {
  private authService: typeof AuthService;
  private webhookService: WebhookServiceController;
  private puzzleStorageService: typeof PuzzleStorageService;

  private readonly defaultUserTacticalRating = 1200;
  private readonly defaultUserFinishHimRating = 1200;

  constructor(
    boardHandler: BoardHandler,
    analysisController: AnalysisController,
    services: AppServices,
    requestGlobalRedraw: () => void,
  ) {
    const initialAuthStats = services.authService.getFinishHimStats();
    const initialFunCoins = services.authService.getFunCoins();

    const initialState: FinishHimControllerState = {
      activePuzzle: null,
      puzzleResults: null,
      interactiveSetupMoves: [],
      currentInteractiveSetupMoveIndex: 0,
      userStats: initialAuthStats,
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

    super(initialState, boardHandler, analysisController, services, requestGlobalRedraw);

    this.authService = services.authService;
    this.webhookService = services.webhookService;
    this.puzzleStorageService = PuzzleStorageService;

    logger.info('[FinishHimController] Initialized.');
  }

  // --- Implementation of abstract methods ---

  public async initializeGame(puzzleId?: string | null): Promise<void> {
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
        this.setState({ feedbackMessage: t('finishHim.feedback.pressNext') });
        this._updatePgnDisplay();
    }
  }

  protected _getControlsState(): GameControlsState {
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

  protected async _handleUserMoveInGame(moveResult: AttemptMoveResult): Promise<void> {
    this._updatePgnDisplay();
    if (this.checkAndSetGameOver()) return;

    switch(this.state.gamePhase) {
      case 'TACTICAL':
        this.processUserMoveResultInInteractiveSetup(moveResult.uciMove!);
        break;
      case 'PLAYOUT':
        if (this.state.outplayTimeRemainingMs !== null && this.state.outplayTimerId === null) {
            this.state.outplayTimerId = window.setTimeout(() => this._tickOutplayTimer(), PLAYOUT_TIMER_INTERVAL_MS);
        }
        this.triggerStockfishMoveInPlayoutIfNeeded();
        break;
    }
  }

  public handleNewGame(): void {
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

  public handleResign(): void {
    if (!this._getControlsState().canResign) { 
        return;
    }
    this._stopCurrentGameActivity(true);
  }

  // --- FinishHim specific methods ---

  private _clearOutplayTimer(): void {
    if (this.state.outplayTimerId) {
      clearTimeout(this.state.outplayTimerId);
      this.setState({ outplayTimerId: null });
    }
  }

  private _resetPuzzleState(): void {
    this._clearOutplayTimer();
    this.setState({
      activePuzzle: null,
      puzzleResults: null,
      interactiveSetupMoves: [],
      currentInteractiveSetupMoveIndex: 0,
      isStockfishThinking: false,
      gameOverMessage: null,
      currentPgnString: "",
      currentPuzzleSolveTime: undefined,
      outplayTimeRemainingMs: null,
      tacticalRatingDelta: null,
      finishHimRatingDelta: null,
      isCurrentPuzzleSolved: false,
      isCurrentPuzzleFavorite: false,
      gamePhase: 'IDLE',
      tenSecondsWarningPlayed: false,
      sevenSecondsWarningPlayed: false,
    });
  }

  private async _sendStatsToBackend(options: { solvedInSeconds?: number, success: boolean }): Promise<void> {
    if (this.authService.getIsAuthenticated() && this.state.userStats && this.state.userFunCoins !== null) {
        const dto: UpdateFinishHimStatsDto = {
            FunCoins: this.state.userFunCoins,
            finishHimStats: { ...this.state.userStats },
            success: options.success, // <<< ИЗМЕНЕНО
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
    this.setState({ feedbackMessage: t('common.loading') });

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
            this.setState({
                gamePhase: 'IDLE',
                feedbackMessage: t('finishHim.feedback.pressNext')
            });
            return;
        }

        if (!puzzleSource || typeof puzzleSource !== 'object') {
            this.services.appController.updatePuzzleUrl(puzzleDataToProcess.PuzzleId);
        }
    } catch (error: any) {
        if (error instanceof InsufficientFunCoinsError) {
            this.services.appController.showModal(error.message);
        } else if (this.services.appController.handleApiRateLimit(error)) {
            // Rate limit is handled
        } else {
            logger.error('[FinishHimController] Error fetching puzzle:', error);
            this.setState({ feedbackMessage: t('puzzle.feedback.loadFailed') });
        }
        this.setState({ gamePhase: 'IDLE' });
        return;
    }

    if (puzzleDataToProcess && userId) { 
      SoundService.playBackgroundSound('game_entry');
      
      const humanPlayerActualColor: ChessgroundColor = puzzleDataToProcess.bot_color === 'w' ? 'black' : 'white';
      this.boardHandler.setupPosition(puzzleDataToProcess.FEN_0, humanPlayerActualColor, true);

      const isSolved = this.puzzleStorageService.isPuzzleSolved(userId, puzzleDataToProcess.PuzzleId);
      let loadedMessage = t('finishHim.feedback.loadedSimple', { puzzleId: puzzleDataToProcess.PuzzleId, color: t(humanPlayerActualColor) });
      if (isSolved) {
        loadedMessage += ` (${t('finishHim.feedback.alreadySolved')})`;
      }

      this.setState({
        activePuzzle: puzzleDataToProcess,
        puzzleResults: puzzleDataToProcess.endgame_results || null,
        isCurrentPuzzleSolved: isSolved,
        isCurrentPuzzleFavorite: this.puzzleStorageService.isPuzzleFavorite(userId, puzzleDataToProcess.PuzzleId),
        interactiveSetupMoves: puzzleDataToProcess.Moves ? puzzleDataToProcess.Moves.split(' ') : [],
        currentInteractiveSetupMoveIndex: 0,
        currentPuzzleSolveTime: puzzleDataToProcess.solve_time,
        feedbackMessage: loadedMessage,
        gamePhase: 'TACTICAL'
      });

      if (this.checkAndSetGameOver()) return;

      if (this.state.interactiveSetupMoves.length > 0) {
        if (this.boardHandler.getBoardTurnColor() !== humanPlayerActualColor) {
          setTimeout(() => this._playNextInteractiveSetupMoveSystem(false), BOT_MOVE_DELAY_MS);
        } else {
          this.setState({ feedbackMessage: t('puzzle.feedback.yourTurn') });
        }
      } else {
        this._handleTacticalSuccess(); 
        this._enterPlayoutMode();
      }
    } else {
      logger.error("[FinishHimController] Failed to load puzzle or user not authenticated.");
      this.setState({ feedbackMessage: t('puzzle.feedback.loadFailed'), gamePhase: 'IDLE' });
    }
  }

  private _stopCurrentGameActivity(resign: boolean = false): void {
    const wasGameActive = this.state.gamePhase === 'TACTICAL' || this.state.gamePhase === 'PLAYOUT';
    this._clearOutplayTimer();

    const newState: Partial<FinishHimControllerState> = {
        isStockfishThinking: false,
        outplayTimeRemainingMs: null,
    };

    if (resign) {
        newState.gamePhase = 'GAMEOVER';
        newState.gameOverMessage = t('finishHim.feedback.resigned');
        newState.feedbackMessage = newState.gameOverMessage;
        if (this.state.activePuzzle && this.state.userStats && !this.state.isCurrentPuzzleSolved) {
            this._updatePlayoutResult('loss', null);
            this.puzzleStorageService.markPuzzleAsSolved(this.authService.getUserProfile()!.id, this.state.activePuzzle.PuzzleId);
        }
    } else if (this.state.gameOverMessage === null && wasGameActive) {
        newState.gamePhase = 'IDLE';
        newState.feedbackMessage = t('finishHim.feedback.gameStopped');
    }
    
    this.setState(newState);
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
    this.setState({
        currentPgnString: this.boardHandler.getPgn({
            showResult: showResultInPgn,
            showVariations: this.analysisController.getPanelState().isAnalysisActive
        })
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
        this.setState({ tacticalRatingDelta: this.state.userStats.tacticalRating - oldTacticalRating });
        this._incrementGamesPlayed();
        this._sendStatsToBackend({ success: false }); // <<< ИЗМЕНЕНО
        this.puzzleStorageService.markPuzzleAsSolved(userId, this.state.activePuzzle.PuzzleId);
    }
  }

  private _handleTacticalSuccess(): void {
    if (!this.state.userStats || !this.state.activePuzzle) return;
    if (!this.state.isCurrentPuzzleSolved) {
        const oldTacticalRating = this.state.userStats.tacticalRating;
        this.state.userStats.tacticalRating += 10;
        this.state.userStats.tacticalWins += 1;
        this.setState({ tacticalRatingDelta: this.state.userStats.tacticalRating - oldTacticalRating });
    }
  }

  private _updatePlayoutResult(outcome: 'win' | 'loss' | 'draw', remainingTimeMs: number | null): void {
    const userId = this.authService.getUserProfile()?.id;
    if (this.state.userStats && this.state.userFunCoins !== null && this.state.activePuzzle && userId) {
        if (!this.state.isCurrentPuzzleSolved) {
            const oldFinishHimRating = this.state.userStats.finishHimRating;
            let solvedInSeconds: number | undefined = undefined;
            const success = outcome === 'win'; // <<< ИЗМЕНЕНО

            this._incrementGamesPlayed();

            if (success) { // <<< ИЗМЕНЕНО
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
            this.setState({ finishHimRatingDelta: this.state.userStats.finishHimRating - oldFinishHimRating });
            
            this._sendStatsToBackend({ solvedInSeconds, success }); // <<< ИЗМЕНЕНО
            this.puzzleStorageService.markPuzzleAsSolved(userId, this.state.activePuzzle.PuzzleId);
        }
    }
  }

  private checkAndSetGameOver(): boolean {
    const gameStatus = this.boardHandler.getGameStatus();
    if (gameStatus.isGameOver) {
      const phaseWhenGameOver = this.state.gamePhase;
      const finalRemainingTimeMs = this.state.outplayTimeRemainingMs;
      
      this._clearOutplayTimer();
      
      this.setState({
          gamePhase: 'GAMEOVER',
          gameOverMessage: this.formatGameEndMessage(gameStatus.outcome),
          feedbackMessage: this.formatGameEndMessage(gameStatus.outcome) || t('puzzle.feedback.gameOver'),
          outplayTimeRemainingMs: null,
      });
      
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
      return true;
    }
    this.setState({ gameOverMessage: null });
    return false;
  }

  private _playNextInteractiveSetupMoveSystem(isContinuation: boolean = false): void {
    if (this.state.gamePhase !== 'TACTICAL' || this.boardHandler.promotionCtrl.isActive() || this.analysisController.getPanelState().isAnalysisActive) {
        return;
    }
    if (!this.state.activePuzzle || this.state.currentInteractiveSetupMoveIndex >= this.state.interactiveSetupMoves.length) {
      if (this.state.activePuzzle) {
        if (this.state.currentInteractiveSetupMoveIndex > 0 && this.state.interactiveSetupMoves.length > 0) {
            this._handleTacticalSuccess();
        }
        this._enterPlayoutMode();
      }
      return;
    }
    const uciSetupMove = this.state.interactiveSetupMoves[this.state.currentInteractiveSetupMoveIndex];
    this.setState({ feedbackMessage: isContinuation ? t('puzzle.feedback.systemResponse', { move: uciSetupMove }) : t('puzzle.feedback.systemFirstMove', { move: uciSetupMove }) });
    const moveResult = this.boardHandler.applySystemMove(uciSetupMove);
    if (moveResult.success) {
      this.state.currentInteractiveSetupMoveIndex++;
      if (this.checkAndSetGameOver()) return;
      setTimeout(() => { this.services.chessboardService.playPremove(); }, PREMOVE_EXECUTION_DELAY_MS);
      if (this.state.currentInteractiveSetupMoveIndex >= this.state.interactiveSetupMoves.length) {
        this._handleTacticalSuccess();
        this._enterPlayoutMode();
      } else {
        this.setState({ feedbackMessage: t('puzzle.feedback.yourTurn') });
      }
    } else {
      this.setState({ feedbackMessage: t('puzzle.feedback.puzzleDataError') });
    }
  }

  private _tickOutplayTimer(): void {
    if (this.state.gamePhase !== 'PLAYOUT') {
        this._clearOutplayTimer();
        this.setState({ outplayTimeRemainingMs: null });
        return;
    }
    if (this.state.outplayTimeRemainingMs !== null) {
        const newTime = this.state.outplayTimeRemainingMs - PLAYOUT_TIMER_INTERVAL_MS;
        
        if (newTime <= 10000 && !this.state.tenSecondsWarningPlayed) {
            SoundService.playSoundEvent({ parallel: ['timer_10_seconds_left'] });
            this.setState({ tenSecondsWarningPlayed: true });
        }
        if (newTime <= 8000 && !this.state.sevenSecondsWarningPlayed) {
            SoundService.playSoundEvent({ parallel: ['timer_7_seconds_left'] });
            this.setState({ sevenSecondsWarningPlayed: true });
        }

        const timerEl = document.getElementById('finish-him-timer-display');
        if (timerEl) {
            timerEl.textContent = formatPlayoutTimer(newTime);
        }

        if (newTime <= 0) {
            this._clearOutplayTimer();
            SoundService.playSoundEvent({ parallel: ['timer_times_up'], sequential: ['user_lost_playout'] });
            this._updatePlayoutResult('loss', 0); 
            this.setState({
                outplayTimeRemainingMs: 0,
                gamePhase: 'GAMEOVER',
                gameOverMessage: t('finishHim.feedback.timeUp'),
                feedbackMessage: t('finishHim.feedback.timeUp'),
            });
            this._updatePgnDisplay();
            return;
        }
        this.setState({ outplayTimeRemainingMs: newTime });
    }
    this.state.outplayTimerId = window.setTimeout(() => this._tickOutplayTimer(), PLAYOUT_TIMER_INTERVAL_MS);
  }

  private _enterPlayoutMode(): void {
    SoundService.playSoundEvent({ parallel: ['playout_starts'] });
    this._clearOutplayTimer();
    const timerDurationMs = this.state.currentPuzzleSolveTime ? this.state.currentPuzzleSolveTime * 1000 : 60000;
    this.setState({
        gamePhase: 'PLAYOUT',
        outplayTimeRemainingMs: timerDurationMs,
    });
    this.triggerStockfishMoveInPlayoutIfNeeded();
  }

  private async triggerStockfishMoveInPlayoutIfNeeded(): Promise<void> {
    if (this.state.gamePhase !== 'PLAYOUT' || this.boardHandler.promotionCtrl.isActive() || this.analysisController.getPanelState().isAnalysisActive) {
      return;
    }
    const currentBoardTurn = this.boardHandler.getBoardTurnColor();
    const humanColor = this.boardHandler.getHumanPlayerColor();
    if (currentBoardTurn !== humanColor && !this.state.isStockfishThinking) {
      this.setState({ isStockfishThinking: true, feedbackMessage: t('puzzle.feedback.stockfishThinking') });
      if (this.state.outplayTimeRemainingMs !== null && this.state.outplayTimerId === null) {
        this.state.outplayTimerId = window.setTimeout(() => this._tickOutplayTimer(), PLAYOUT_TIMER_INTERVAL_MS);
      }
      try {
        const engineId = this.services.appController.state.selectedEngine;
        const botMoveUci = await this.services.gameplayService.getBestMove(engineId, this.boardHandler.getFen());
        if (this.state.gamePhase !== 'PLAYOUT' || !this.state.isStockfishThinking) {
            this.setState({ isStockfishThinking: false });
            return;
        }
        if (botMoveUci) {
          this.boardHandler.applySystemMove(botMoveUci);
          if (!this.checkAndSetGameOver()) {
            this.setState({ feedbackMessage: t('finishHim.feedback.yourTurnPlayout') });
            setTimeout(() => { this.services.chessboardService.playPremove(); }, PREMOVE_EXECUTION_DELAY_MS); 
          }
        } else if (!this.checkAndSetGameOver()) {
          this.setState({ feedbackMessage: t('puzzle.feedback.stockfishNoMove') });
        }
      } catch (error) {
        if (!this.checkAndSetGameOver()) {
          this.setState({ feedbackMessage: t('puzzle.feedback.stockfishGetMoveError') });
        }
      } finally {
          this.setState({ isStockfishThinking: false });
      }
    } else if (currentBoardTurn === humanColor) {
        if (!this.state.gameOverMessage) this.setState({ feedbackMessage: t('finishHim.feedback.yourTurnPlayout') });
    }
  }

  private processUserMoveResultInInteractiveSetup(uciUserMove: string): void {
    if (!this.state.activePuzzle) {
      this._handleTacticalSuccess();
      this._enterPlayoutMode();
      return;
    }
    const expectedSetupMove = this.state.interactiveSetupMoves[this.state.currentInteractiveSetupMoveIndex];
    if (uciUserMove === expectedSetupMove) {
      this.setState({ feedbackMessage: t('puzzle.feedback.correctMove') });
      this.state.currentInteractiveSetupMoveIndex++;
      if (this.checkAndSetGameOver()) return;
      if (this.state.currentInteractiveSetupMoveIndex >= this.state.interactiveSetupMoves.length) {
        this._handleTacticalSuccess(); 
        this._enterPlayoutMode();
      } else {
        this.setState({ feedbackMessage: t('puzzle.feedback.systemMove') });
        setTimeout(() => {
          if (this.state.gamePhase === 'TACTICAL') {
            this._playNextInteractiveSetupMoveSystem(true);
          }
        }, BOT_MOVE_DELAY_MS);
      }
    } else {
      this.setState({
          feedbackMessage: t('finishHim.feedback.tacticalFail'),
          gameOverMessage: t('finishHim.feedback.tacticalFailDetailed', {userMove: uciUserMove, expectedMove: expectedSetupMove}),
          gamePhase: 'GAMEOVER'
      });
      this._handleTacticalFailure();
      SoundService.playSoundEvent({ sequential: ['user_lost_playout'] });
      this._updatePgnDisplay();
    }
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
        this.setState({ isCurrentPuzzleFavorite: isNowFavorite });
    } else {
        logger.warn('[FinishHimController] Could not toggle favorite: missing user, puzzle, or fen_final.');
    }
  }
}
