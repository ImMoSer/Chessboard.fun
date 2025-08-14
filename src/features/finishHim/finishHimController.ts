// src/features/finishHim/finishHimController.ts
import type { VNode, Hooks } from 'snabbdom';
import { h } from 'snabbdom';
import type { GameEndOutcome } from '../../core/boardHandler';
import { type WebhookServiceController, InsufficientFunCoinsError } from '../../core/webhook.service';
import { type UpdateFinishHimStatsDto, type AppPuzzle, type PuzzleResultEntry, type FinishHimStats } from '../../core/api.types';
import logger from '../../utils/logger';
import { SoundService } from '../../core/sound.service';
import { t } from '../../core/i18n.service';
import { AuthService } from '../../core/auth.service';
import type { AppServices, GameControlsState } from '../../AppController';
import { PuzzleStorageService } from '../../core/puzzle-storage.service';
import { BaseGameController } from '../../core/controllers/base-game.controller';
import type { BaseGameState } from '../../core/controllers/base-game.types';
import type { BoardHandler } from '../../core/boardHandler';
import type { AnalysisController } from '../analysis/analysisController';
import { renderFinishHimUI } from './finishHimView';
import { renderControlPanel } from '../../shared/components/controlPanelView';
import { initializeResizer } from '../common/resizer';

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
  userStats: FinishHimStats | null;
  userFunCoins: number | null;
  isStockfishThinking: boolean;
  currentPgnString: string;
  outplayTimerId: number | null;
  outplayTimeRemainingMs: number | null;
  isCurrentPuzzleSolved: boolean;
  isCurrentPuzzleFavorite: boolean;
  tenSecondsWarningPlayed: boolean;
  sevenSecondsWarningPlayed: boolean;
}

export class FinishHimController extends BaseGameController<FinishHimControllerState> {
  private authService: typeof AuthService;
  private webhookService: WebhookServiceController;
  private puzzleStorageService: typeof PuzzleStorageService;

  constructor(
    boardHandler: BoardHandler,
    analysisController: AnalysisController,
    services: AppServices,
    requestPageRedraw: () => void,
  ) {
    const initialAuthStats = services.authService.getFinishHimStats();
    const initialFunCoins = services.authService.getFunCoins();

    const initialState: FinishHimControllerState = {
      activePuzzle: null,
      puzzleResults: null,
      userStats: initialAuthStats,
      userFunCoins: initialFunCoins,
      feedbackMessage: t('finishHim.feedback.getReady'),
      isStockfishThinking: false,
      gameOverMessage: null,
      currentPgnString: "",
      outplayTimerId: null,
      outplayTimeRemainingMs: null,
      isCurrentPuzzleSolved: false,
      isCurrentPuzzleFavorite: false,
      gamePhase: 'IDLE',
      tenSecondsWarningPlayed: false,
      sevenSecondsWarningPlayed: false,
    };

    super(initialState, boardHandler, analysisController, services, requestPageRedraw);

    this.authService = services.authService;
    this.webhookService = services.webhookService;
    this.puzzleStorageService = PuzzleStorageService;

    logger.info('[FinishHimController] Initialized.');
  }

  public renderPage(): VNode {
    const layout = renderFinishHimUI(this);
    const appState = this.services.appController.state;
    const keyPrefix = 'fh';

    const resizeHandleHook: Hooks = {
        insert: (vnode: VNode) => {
            const handleEl = vnode.elm as HTMLElement;
            const cleanup = initializeResizer(handleEl, this.services.appController);
            (vnode.data as any).cleanupResizer = cleanup;
        },
        destroy: (vnode: VNode) => {
            const cleanup = (vnode.data as any)?.cleanupResizer;
            if (typeof cleanup === 'function') {
                cleanup();
            }
        }
    };

    return h('div.three-column-layout', {
        key: `layout-${keyPrefix}`,
        class: {
            'portrait-mode-layout': appState.isPortraitMode,
            'no-left-panel': !layout.left && !appState.isPortraitMode,
            'no-right-panel': !layout.right && !appState.isPortraitMode,
        }
    }, [
        layout.left ? h('aside#left-panel', { class: { 'portrait-mode-layout': appState.isPortraitMode } }, [layout.left]) : null,
        h('div#center-panel-resizable-wrapper', {
            key: `center-wrapper-${keyPrefix}`,
            class: { 'portrait-mode-layout': appState.isPortraitMode }
        }, [
          h('div.top-board-panel', { key: `top-panel-${keyPrefix}` }, [layout.topPanelContent]),
          h('section#center-panel', [layout.center]),
          h('div.bottom-board-panel', { key: `bottom-panel-${keyPrefix}` }, [renderControlPanel(this.services.appController)]),
          appState.isPortraitMode ? null : h('div.resize-handle-center', { hook: resizeHandleHook, key: `center-resize-handle-${keyPrefix}` })
        ]),
        layout.right ? h('aside#right-panel', { class: { 'portrait-mode-layout': appState.isPortraitMode } }, [layout.right]) : null,
    ].filter(Boolean) as VNode[]);
  }

  // --- Implementation of abstract methods ---

  public async initializeGame(puzzleId?: string | null): Promise<void> {
    this._updateLocalStats();
    this._resetPuzzleState();
    
    if (puzzleId) {
        await this.loadAndStartFinishHimPuzzle(puzzleId);
    } else {
        this.boardHandler.setupPosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        this.setState({ feedbackMessage: t('finishHim.feedback.pressNext') });
    }
  }

  protected _getControlsState(): GameControlsState {
    const { gamePhase, activePuzzle } = this.state;
    return {
      canRequestNew: gamePhase === 'IDLE' || gamePhase === 'GAMEOVER',
      onRequestNew: () => this.handleNewGame(),
      canRestart: (gamePhase === 'GAMEOVER' || gamePhase === 'IDLE') && !!activePuzzle,
      onRestart: () => this.handleRestartTask(),
      canResign: gamePhase === 'PLAYING',
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
      onExit: () => this.handleExitRequest(),
    };
  }

  public handleNewGame(): void {
    if (!this._getControlsState().canRequestNew) return; 
    this.loadAndStartFinishHimPuzzle();
  }
  
  public handleRestartTask(): void {
    if (!this._getControlsState().canRestart || !this.state.activePuzzle) return; 
    this.loadAndStartFinishHimPuzzle(this.state.activePuzzle.PuzzleId);
  }

  public handleResign(): void {
    if (!this._getControlsState().canResign) return;
    this._handleGameOver(false); // Resigning is always a loss
  }

  // <<< НАЧАЛО ИЗМЕНЕНИЙ: Новый метод для обработки выхода
  public handleExitRequest(): void {
    if (this.state.gamePhase === 'PLAYING') {
      this.services.appController.showConfirmationModal(
        t('gameplay.confirmExit.message', { defaultValue: 'Are you sure you want to exit? The current game will be counted as a loss.' }),
        () => {
          this.handleResign(); // Засчитываем поражение
          this.services.appController.navigateTo('welcome'); // Переходим на главную
        },
        () => {}, // При отмене ничего не делаем
        t('gameplay.confirmExit.confirmButton', { defaultValue: 'Exit' }),
        t('gameplay.confirmExit.cancelButton', { defaultValue: 'Stay' })
      );
    } else {
      this.services.appController.navigateTo('welcome');
    }
  }
  // <<< КОНЕЦ ИЗМЕНЕНИЙ

  /**
   * REFACTORED: This is the central point for handling the end of a game.
   * It's called by the BaseGameController when a terminal state is reached.
   */
  protected _handleGameOver(isWin: boolean, _outcome?: GameEndOutcome): void {
    if (this.state.gamePhase === 'GAMEOVER') return;

    this._clearOutplayTimer();
    
    const message = isWin
      ? t('finishHim.feedback.win', { defaultValue: 'You won!' })
      : t('finishHim.feedback.loss', { defaultValue: 'You lost.' });

    this.setState({
      gamePhase: 'GAMEOVER',
      gameOverMessage: message,
      feedbackMessage: message,
    });
    
    this._updateAndSendStats(isWin);
    this.boardHandler.configureBoardForAnalysis(true);
  }

  /**
   * NEW: This method is a hook called by the BaseGameController when the scenario
   * phase ends and the free playout begins. It's responsible for starting the timer
   * and playing the transition sound.
   */
  protected _onPlayoutStart(): void {
    SoundService.playSoundEvent({ parallel: ['playout_starts'] });
    this.setState({ feedbackMessage: t('finishHim.feedback.yourTurnPlayout', {defaultValue: 'Your turn! Find the best moves to win.'}) });
    this._startTimer();
  }

  // --- FinishHim specific methods ---

  private _updateLocalStats(): void {
    const currentAuthStats = this.authService.getFinishHimStats();
    const currentFunCoins = this.authService.getFunCoins();
    if (currentAuthStats && JSON.stringify(this.state.userStats) !== JSON.stringify(currentAuthStats)) {
        this.setState({ userStats: currentAuthStats });
    }
    if (currentFunCoins !== null && this.state.userFunCoins !== currentFunCoins) {
        this.setState({ userFunCoins: currentFunCoins });
    }
  }

  private _clearOutplayTimer(): void {
    if (this.state.outplayTimerId) {
      clearInterval(this.state.outplayTimerId);
      this.setState({ outplayTimerId: null });
    }
  }

  private _resetPuzzleState(): void {
    this._clearOutplayTimer();
    this.setState({
      activePuzzle: null,
      puzzleResults: null,
      isStockfishThinking: false,
      gameOverMessage: null,
      currentPgnString: "",
      outplayTimeRemainingMs: null,
      isCurrentPuzzleSolved: false,
      isCurrentPuzzleFavorite: false,
      gamePhase: 'IDLE',
      tenSecondsWarningPlayed: false,
      sevenSecondsWarningPlayed: false,
    });
  }

  public async loadAndStartFinishHimPuzzle(puzzleSource?: string | AppPuzzle): Promise<void> {
    if (this.analysisController.getPanelState().isAnalysisActive) {
        this.analysisController.toggleAnalysisEngine();
    }
    
    this._resetPuzzleState();
    this.setState({ gamePhase: 'LOADING', feedbackMessage: t('common.loading') });

    let puzzleData: AppPuzzle | null = null;
    const userId = this.authService.getUserProfile()?.id;

    try {
        if (typeof puzzleSource === 'string') {
             puzzleData = await this.webhookService.fetchPuzzleById(puzzleSource);
        } else {
            puzzleData = await this.webhookService.fetchPuzzle();
            if (puzzleData) {
                const currentCoins = this.authService.getFunCoins();
                if (currentCoins !== null) {
                    this.authService.updateUserProfile({ FunCoins: currentCoins - 5 });
                }
            }
        }

        if (!puzzleData) {
            throw new Error(t('finishHim.error.puzzleNotFound'));
        }

        if (!puzzleSource || typeof puzzleSource !== 'string') {
            this.services.appController.updatePuzzleUrl(puzzleData.PuzzleId);
        }

        if (userId) {
            const isSolved = this.puzzleStorageService.isPuzzleSolved(userId, puzzleData.PuzzleId);
            this.setState({
              activePuzzle: puzzleData,
              puzzleResults: puzzleData.endgame_results || null,
              isCurrentPuzzleSolved: isSolved,
              isCurrentPuzzleFavorite: this.puzzleStorageService.isPuzzleFavorite(userId, puzzleData.PuzzleId),
              outplayTimeRemainingMs: puzzleData.solve_time ? puzzleData.solve_time * 1000 : 60000,
            });

            const scenario = puzzleData.Moves ? puzzleData.Moves.split(' ') : [];
            this._setupPuzzlePosition(puzzleData.FEN_0, scenario);
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
    }
  }

  private _startTimer(): void {
    this._clearOutplayTimer();
    if (this.state.outplayTimeRemainingMs === null) return;

    this.setState({
      tenSecondsWarningPlayed: false,
      sevenSecondsWarningPlayed: false,
      outplayTimerId: window.setInterval(() => this._tickOutplayTimer(), PLAYOUT_TIMER_INTERVAL_MS)
    });
  }

  private _tickOutplayTimer(): void {
    if (this.state.gamePhase !== 'PLAYING' || this.state.outplayTimeRemainingMs === null) {
        this._clearOutplayTimer();
        return;
    }
    
    const newTime = this.state.outplayTimeRemainingMs - PLAYOUT_TIMER_INTERVAL_MS;

    if (newTime <= 10000 && !this.state.tenSecondsWarningPlayed) {
        SoundService.playSoundEvent({ parallel: ['timer_10_seconds_left'] });
        this.setState({ tenSecondsWarningPlayed: true });
    }
    if (newTime <= 7000 && !this.state.sevenSecondsWarningPlayed) {
        SoundService.playSoundEvent({ parallel: ['timer_7_seconds_left'] });
        this.setState({ sevenSecondsWarningPlayed: true });
    }

    if (newTime <= 0) {
        this._clearOutplayTimer();
        SoundService.playSoundEvent({ parallel: ['timer_times_up'] });
        this._handleGameOver(false); // Time's up is a loss
        return;
    }

    this.setState({ outplayTimeRemainingMs: newTime });
  }

  private _updateAndSendStats(isWin: boolean): void {
    const user = this.authService.getUserProfile();
    const puzzle = this.state.activePuzzle;
    if (!user || !puzzle || this.state.isCurrentPuzzleSolved) {
      return;
    }

    const { userStats, userFunCoins, outplayTimeRemainingMs } = this.state;
    if (!userStats || userFunCoins === null) return;

    const newStats: FinishHimStats = JSON.parse(JSON.stringify(userStats));
    newStats.gamesPlayed += 1;

    let solvedInSeconds: number | undefined;

    if (isWin) {
      newStats.playoutWins += 1;
      if (puzzle.solve_time && outplayTimeRemainingMs !== null) {
        const timeSpentMs = (puzzle.solve_time * 1000) - outplayTimeRemainingMs;
        solvedInSeconds = Math.round(timeSpentMs / 1000);
      }
    } else {
      newStats.playoutLosses += 1;
    }

    this.setState({ userStats: newStats });
    this.puzzleStorageService.markPuzzleAsSolved(user.id, puzzle.PuzzleId);

    const dto: UpdateFinishHimStatsDto = {
        FunCoins: userFunCoins,
        finishHimStats: newStats,
        success: isWin,
        solved_in_seconds: solvedInSeconds,
        PuzzleId: puzzle.PuzzleId,
    };

    this.webhookService.sendFinishHimStatsUpdate(dto).catch(err => {
      logger.error('[FinishHimController] Failed to send stats update:', err);
    });
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

  public destroy(): void {
    this._clearOutplayTimer();
    if (this.analysisController.getPanelState().isAnalysisActive) {
        this.analysisController.toggleAnalysisEngine();
    }
    if (this.boardHandler.isBoardConfiguredForAnalysis()){
        this.boardHandler.configureBoardForAnalysis(false);
    }
    super.destroy();
  }
}
