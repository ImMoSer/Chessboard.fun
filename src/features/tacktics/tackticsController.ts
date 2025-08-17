// src/features/tacktics/tackticsController.ts
import type { VNode, Hooks } from 'snabbdom';
import { h } from 'snabbdom';
import type { GameEndOutcome } from '../../core/boardHandler';
import { InsufficientFunCoinsError } from '../../core/webhook.service';
import type { AppTacticalPuzzle, SubmitTacticalResultDto } from '../../core/api.types';
import logger from '../../utils/logger';
import { t } from '../../core/i18n.service';
import { SoundService } from '../../core/sound.service';
import type { AppServices, GameControlsState } from '../../AppController';
import { BaseGameController } from '../../core/controllers/base-game.controller';
import type { BoardHandler } from '../../core/boardHandler';
import type { AnalysisController } from '../analysis/analysisController';
import type { TackticsControllerState, TacticalLevel } from './tacktics.types';
import { renderTackticsUI } from './tackticsView';
import { renderControlPanel } from '../../shared/components/controlPanelView';
import { initializeResizer } from '../common/resizer';


const AUTO_NEXT_PUZZLE_DELAY_MS = 300;

export class TackticsController extends BaseGameController<TackticsControllerState> {
  private userAutoLoadPreference: boolean = true;

  constructor(
    boardHandler: BoardHandler,
    analysisController: AnalysisController,
    services: AppServices,
    requestPageRedraw: () => void,
  ) {
    const initialState: TackticsControllerState = {
      gamePhase: 'IDLE',
      feedbackMessage: t('tacktics.feedback.getReady', { defaultValue: 'Press "New Game" to start.' }),
      gameOverMessage: null,
      activePuzzle: null,
      tacticalStats: null,
      selectedLevel: 'normal',
      isAutoLoadEnabled: true,
    };
    super(initialState, boardHandler, analysisController, services, requestPageRedraw);
    this.userAutoLoadPreference = initialState.isAutoLoadEnabled;
    logger.info('[TackticsController] Initialized.');
  }

  public renderPage(): VNode {
    const layout = renderTackticsUI(this);
    const appState = this.services.appController.state;
    const keyPrefix = 'tacktics';

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

  // --- Implementation and Overrides of abstract methods ---

  public async initializeGame(puzzleId?: string | null, forceLoadNew: boolean = false): Promise<void> {
    this.setState({ isAutoLoadEnabled: this.userAutoLoadPreference });

    if (this.analysisController.getPanelState().isAnalysisActive) {
        this.analysisController.toggleAnalysisEngine();
    }
    this.boardHandler.configureBoardForAnalysis(false);
    
    this._resetPuzzleState();
    this._loadUserStats();

    if (puzzleId) {
        await this._loadPuzzle(puzzleId);
    } else if (forceLoadNew) {
        await this._loadPuzzle(null);
    } else {
        this.boardHandler.setupPosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        this.setState({
            gamePhase: 'IDLE',
            feedbackMessage: t('tacktics.feedback.getReady', { defaultValue: 'Press "New Game" to start.' })
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

  protected async _handleUserMoveInGame(userUciMove: string): Promise<void> {
    const gameStatus = this.boardHandler.getGameStatus();
    const humanColor = this.boardHandler.getHumanPlayerColor();

    if (gameStatus.isGameOver && gameStatus.outcome?.reason === 'checkmate' && gameStatus.outcome?.winner === humanColor) {
        logger.info('[TackticsController] User delivered a checkmate. Counting as a win.');
        this._handleGameOver(true, gameStatus.outcome);
        return;
    }

    const expectedMove = this.scenarioMoves[this.currentScenarioMoveIndex];
    if (userUciMove === expectedMove) {
        this.currentScenarioMoveIndex++;
        const isPuzzleComplete = this.currentScenarioMoveIndex >= this.scenarioMoves.length;

        if (isPuzzleComplete) {
            this._handleGameOver(true);
        } else {
            this._triggerBotMove();
        }
    } else {
        this._handleIncorrectUserMove();
    }
  }

  protected _handleGameOver(isWin: boolean, outcome?: GameEndOutcome): void {
    if (this.state.gamePhase === 'GAMEOVER') return;

    this._sendResult(isWin);
    this.setState({ gamePhase: 'GAMEOVER' });

    if (isWin) {
        // <<< НАЧАЛО ИЗМЕНЕНИЙ: Воспроизводим звук успеха, если это не мат (мат обработает boardHandler)
        if (outcome?.reason !== 'checkmate') {
            SoundService.playSoundEvent({ sequential: ['user_won_playout'] });
        }
        // <<< КОНЕЦ ИЗМЕНЕНИЙ
        
        const message = t('tacktics.feedback.success', { defaultValue: 'Puzzle solved!' });
        this.setState({ gameOverMessage: message, feedbackMessage: message });

        if (this.state.isAutoLoadEnabled) {
            setTimeout(() => this.handleNewGame(), AUTO_NEXT_PUZZLE_DELAY_MS);
        } else {
            this.boardHandler.configureBoardForAnalysis(true);
        }
    } else {
        SoundService.playSoundEvent({ parallel: ['tacktics_puzzle_loss'] });
        const message = t('tacktics.feedback.failure', { defaultValue: 'Puzzle failed.' });
        
        this.setState({ 
            gameOverMessage: message, 
            feedbackMessage: message,
        });
        
        this.boardHandler.configureBoardForAnalysis(true);
        
        if (!this.analysisController.getPanelState().isAnalysisActive) {
            this.analysisController.toggleAnalysisEngine();
        }
    }
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
      // Not applicable in this mode
  }

  // --- Tacktics specific methods ---

  public setTacticalLevel(level: TacticalLevel): void {
      if (this.state.selectedLevel !== level) {
          this.setState({ selectedLevel: level });
      }
  }
  
  public toggleAutoLoad(): void {
      this.userAutoLoadPreference = !this.userAutoLoadPreference;
      this.setState({ isAutoLoadEnabled: this.userAutoLoadPreference });
  }

  private _resetPuzzleState(): void {
      this.setState({
        gamePhase: 'IDLE',
        feedbackMessage: t('tacktics.feedback.getReady', { defaultValue: 'Press "New Game" to start.' }),
        gameOverMessage: null,
        activePuzzle: null,
      });
      this.scenarioMoves = [];
      this.currentScenarioMoveIndex = 0;
  }

  private async _loadUserStats(): Promise<void> {
    try {
        const stats = await this.services.webhookService.fetchTacticalStats();
        if (stats) {
            this.setState({ tacticalStats: stats });
        }
    } catch (error) {
        logger.error('[TackticsController] Failed to load user tactical stats:', error);
    }
  }

  private async _loadPuzzle(puzzleId: string | null): Promise<void> {
    this.setState({ gamePhase: 'LOADING', feedbackMessage: t('common.loading') });

    let puzzleData: AppTacticalPuzzle | null = null;

    try {
        if (puzzleId) {
            puzzleData = await this.services.webhookService.fetchTacticalPuzzleById(puzzleId);
        } else {
            const dto = { tactical_level: this.state.selectedLevel };
            puzzleData = await this.services.webhookService.fetchTacticalPuzzle(dto);
            if (puzzleData) {
                const currentCoins = this.services.authService.getFunCoins();
                if (currentCoins !== null) {
                    this.services.authService.updateUserProfile({ FunCoins: currentCoins - 1 });
                }
            }
        }

        if (!puzzleData) {
            throw new Error(t('tacktics.error.puzzleNotFound', { defaultValue: 'Could not load the puzzle.' }));
        }

        if (!puzzleId) {
            this.services.appController.updatePuzzleUrl(puzzleData.PuzzleId);
        }
        
        this.setState({
            activePuzzle: puzzleData,
            feedbackMessage: t('tacktics.feedback.findBestMove', { defaultValue: 'Find the best move!' }),
        });

        const scenario = puzzleData.Moves ? puzzleData.Moves.split(' ') : [];
        this._setupPuzzlePosition(puzzleData.FEN_0, scenario);

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

  private _handleIncorrectUserMove(): void {
    this.boardHandler.undoLastMove();
    this._handleGameOver(false);
  }

  private async _sendResult(success: boolean): Promise<void> {
    const puzzle = this.state.activePuzzle;
    if (!puzzle) return;

    const dto: SubmitTacticalResultDto = {
        PuzzleId: puzzle.PuzzleId,
        Rating: puzzle.Rating,
        Themes_PG: puzzle.Themes_PG,
        success: success,
    };

    try {
        const updatedStats = await this.services.webhookService.submitTacticalResult(dto);
        if (updatedStats) {
            this.setState({ tacticalStats: updatedStats });
        }
    } catch (error) {
        logger.error('[TackticsController] Failed to send tactical result:', error);
    }
  }

  public destroy(): void {
    if (this.analysisController.getPanelState().isAnalysisActive) {
        this.analysisController.toggleAnalysisEngine();
    }
    if (this.boardHandler.isBoardConfiguredForAnalysis()){
        this.boardHandler.configureBoardForAnalysis(false);
    }
    super.destroy();
  }
}
