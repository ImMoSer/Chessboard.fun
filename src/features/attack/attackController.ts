// src/features/attack/attackController.ts
import type { VNode, Hooks } from 'snabbdom';
import { h } from 'snabbdom';
import type { GameEndOutcome } from '../../core/boardHandler';
import { InsufficientFunCoinsError } from '../../core/webhook.service';
import type { AppAttackPuzzle, AttackRecordDto} from '../../core/api.types';
import logger from '../../utils/logger';
import { t } from '../../core/i18n.service';
import { SoundService } from '../../core/sound.service';
import type { AppServices, GameControlsState } from '../../AppController';
import { BaseGameController } from '../../core/controllers/base-game.controller';
import type { BoardHandler } from '../../core/boardHandler';
import type { AnalysisController } from '../analysis/analysisController';
import type { AttackControllerState } from './attack.types';
import { renderAttackUI } from './attackView';
import { renderControlPanel } from '../../shared/components/controlPanelView';
import { initializeResizer } from '../common/resizer';

const TIMER_INTERVAL_MS = 1000;
const PLAYOUT_TIME_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

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

export class AttackController extends BaseGameController<AttackControllerState> {
  private playoutStartTimeMs: number | null = null;

  constructor(
    boardHandler: BoardHandler,
    analysisController: AnalysisController,
    services: AppServices,
    requestPageRedraw: () => void,
  ) {
    const initialState: AttackControllerState = {
      gamePhase: 'IDLE',
      feedbackMessage: t('attack.feedback.getReady', { defaultValue: 'Press "New Game" to start.' }),
      gameOverMessage: null,
      activePuzzle: null,
      puzzleResults: null,
      solveStartTimeMs: null,
      playoutTimerId: null,
      elapsedPlayoutTimeMs: 0,
      tenSecondsWarningPlayed: false,
      sevenSecondsWarningPlayed: false,
    };

    super(initialState, boardHandler, analysisController, services, requestPageRedraw);
    logger.info('[AttackController] Initialized.');
  }

  public renderPage(): VNode {
    const layout = renderAttackUI(this);
    const appState = this.services.appController.state;
    const keyPrefix = 'attack';

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

  public async initializeGame(puzzleId?: string | null, forceLoadNew: boolean = false): Promise<void> {
    if (this.analysisController.getPanelState().isAnalysisActive) {
        this.analysisController.toggleAnalysisEngine();
    }
    this.boardHandler.configureBoardForAnalysis(false);

    this._resetPuzzleState();

    if (puzzleId) {
        await this._loadPuzzle(puzzleId);
    } else if (forceLoadNew) {
        await this._loadPuzzle(null);
    } else {
        this.boardHandler.setupPosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        this.setState({
            gamePhase: 'IDLE',
            feedbackMessage: t('attack.feedback.getReady', { defaultValue: 'Press "New Game" to start.' })
        });
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

  public handleNewGame(): void {
    if (!(this.state.gamePhase === 'IDLE' || this.state.gamePhase === 'GAMEOVER')) return;
    this.initializeGame(null, true);
  }

  public handleRestartTask(): void {
      if (!((this.state.gamePhase === 'GAMEOVER' || this.state.gamePhase === 'IDLE') && !!this.state.activePuzzle)) return;
      this.initializeGame(this.state.activePuzzle.PuzzleId);
  }

  public handleResign(): void {
    if (!(this.state.gamePhase === 'PLAYING')) return;
    this._handleGameOver(false);
  }

  protected _handleGameOver(isWin: boolean, outcome?: GameEndOutcome): void {
    if (this.state.gamePhase === 'GAMEOVER') return;

    this._clearPlayoutTimer();

    let message = isWin
        ? t('attack.feedback.win', { reason: outcome?.reason || 'checkmate' })
        : t('attack.feedback.loss', { reason: outcome?.reason || 'checkmate' });
    
    if (this.state.activePuzzle) {
        this._sendAttackResult(isWin);
    }

    this.setState({
        gamePhase: 'GAMEOVER',
        gameOverMessage: message,
        feedbackMessage: message,
    });
    
    this.boardHandler.configureBoardForAnalysis(true);
  }

  protected _onPlayoutStart(): void {
    SoundService.playSoundEvent({ parallel: ['playout_starts'] });
    this.setState({ feedbackMessage: t('attack.feedback.playoutStarted', {defaultValue: 'Playout begins!'}) });
    this.playoutStartTimeMs = Date.now();
    this._tickPlayoutTimer();
  }

  // --- Attack specific methods ---

  private _clearPlayoutTimer(): void {
    if (this.state.playoutTimerId) {
      clearTimeout(this.state.playoutTimerId);
      this.setState({ playoutTimerId: null });
    }
  }

  private _resetPuzzleState(): void {
      this._clearPlayoutTimer();
      this.playoutStartTimeMs = null;
      this.setState({
        gamePhase: 'IDLE',
        feedbackMessage: t('attack.feedback.getReady', { defaultValue: 'Press "New Game" to start.' }),
        gameOverMessage: null,
        activePuzzle: null,
        puzzleResults: null,
        solveStartTimeMs: null,
        playoutTimerId: null,
        elapsedPlayoutTimeMs: 0,
        tenSecondsWarningPlayed: false,
        sevenSecondsWarningPlayed: false,
      });
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
                    this.services.authService.updateUserProfile({ FunCoins: currentCoins - 5 });
                }
            }
        }

        if (!puzzleData) {
            throw new Error(t('attack.error.puzzleNotFound', { defaultValue: 'Could not load the puzzle.' }));
        }

        if (!puzzleSource) {
            this.services.appController.updatePuzzleUrl(puzzleData.PuzzleId);
        }
        
        this.setState({
            activePuzzle: puzzleData,
            puzzleResults: puzzleData.attack_results || null,
            solveStartTimeMs: Date.now(),
        });
        
        const scenario = puzzleData.Moves ? puzzleData.Moves.split(' ') : [];
        this._setupPuzzlePosition(puzzleData.FEN_0, scenario);

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
  
  private async _sendAttackResult(success: boolean): Promise<void> {
    const user = this.services.authService.getUserProfile();
    const puzzle = this.state.activePuzzle;
    const startTime = this.state.solveStartTimeMs;

    if (!user || !puzzle || startTime === null) {
        logger.warn('[AttackController] Cannot send attack result: missing user, puzzle, or start time.');
        return;
    }

    const timeInSeconds = Math.round((Date.now() - startTime) / 1000);

    const dto: AttackRecordDto = {
        username: user.username,
        PuzzleId: puzzle.PuzzleId,
        time_in_seconds: timeInSeconds,
        success: success,
        bw_value: puzzle.bw_value,
    };

    logger.info('[AttackController] Sending attack result:', dto);
    try {
        await this.services.webhookService.sendAttackRecord(dto);
        logger.info('[AttackController] Attack record sent successfully.');
    } catch (error) {
        logger.error('[AttackController] Failed to send attack record:', error);
    }
  }
  
  private _tickPlayoutTimer(): void {
    if (this.state.gamePhase !== 'PLAYING' || this.playoutStartTimeMs === null) {
        this._clearPlayoutTimer();
        return;
    }

    const elapsedTime = Date.now() - this.playoutStartTimeMs;
    this.setState({ elapsedPlayoutTimeMs: elapsedTime });

    const timeLeftMs = PLAYOUT_TIME_LIMIT_MS - elapsedTime;

    if (timeLeftMs <= 10000 && !this.state.tenSecondsWarningPlayed) {
        SoundService.playSoundEvent({ parallel: ['timer_10_seconds_left'] });
        this.setState({ tenSecondsWarningPlayed: true });
    }
    if (timeLeftMs <= 7000 && !this.state.sevenSecondsWarningPlayed) {
        SoundService.playSoundEvent({ parallel: ['timer_7_seconds_left'] });
        this.setState({ sevenSecondsWarningPlayed: true });
    }
    
    if (elapsedTime >= PLAYOUT_TIME_LIMIT_MS) {
        logger.info('[AttackController] Playout time limit reached.');
        this._clearPlayoutTimer();
        SoundService.playSoundEvent({ parallel: ['timer_times_up'] });
        this._handleGameOver(false);
        return;
    }

    this.setState({ playoutTimerId: window.setTimeout(() => this._tickPlayoutTimer(), TIMER_INTERVAL_MS) });
  }

  public destroy(): void {
    this._clearPlayoutTimer();
    if (this.analysisController.getPanelState().isAnalysisActive) {
        this.analysisController.toggleAnalysisEngine();
    }
    if (this.boardHandler.isBoardConfiguredForAnalysis()){
        this.boardHandler.configureBoardForAnalysis(false);
    }
    super.destroy();
  }
}
