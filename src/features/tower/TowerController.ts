// src/features/tower/TowerController.ts
import type { Color as ChessgroundColor } from 'chessground/types';
import type { GameEndReason, AttemptMoveResult } from '../../core/boardHandler';
import logger from '../../utils/logger';
import { SoundService } from '../../core/sound.service';
import { t } from '../../core/i18n.service';
import { PgnService } from '../../core/pgn.service';
import { TOWER_DEFINITIONS, type TowerControllerState, type ActiveTowerState } from './tower.types';
import type { TowerId, TowerTheme, TowerData, GetNewTowerDto, SaveTowerRecordDto } from '../../core/api.types';
import type { AppServices, GameControlsState } from '../../AppController';
import { InsufficientFunCoinsError } from '../../core/webhook.service';
import { BaseGameController } from '../../core/controllers/base-game.controller';
import type { BoardHandler } from '../../core/boardHandler';
import type { AnalysisController } from '../analysis/analysisController';

const BOT_MOVE_DELAY_MS = 100;
const PREMOVE_EXECUTION_DELAY_MS = 100;
const TIMER_INTERVAL_MS = 1000;
const INITIAL_LIVES = 3;

export class TowerController extends BaseGameController<TowerControllerState> {
  private pgnService: typeof PgnService;
  private timerIntervalId: number | null = null;
  private currentLevelStartTimeMs: number | null = null;
  private solutionMovesForCurrentPosition: string[] = [];
  private currentSolutionMoveIndex: number = 0;
  private isScenarioActive: boolean = true;

  constructor(
    boardHandler: BoardHandler,
    analysisController: AnalysisController,
    services: AppServices,
    requestGlobalRedraw: () => void,
  ) {
    const initialState: TowerControllerState = {
      availableTowers: TOWER_DEFINITIONS,
      availableThemes: services.themeService.getAvailableThemes(),
      selectedTowerId: null,
      selectedTheme: 'mix',
      activeTowerState: null,
      feedbackMessage: t('tower.feedback.selectTowerAndStart', {defaultValue: 'Select a Tower and press Start.'}),
      gameOverMessage: null,
      gamePhase: 'IDLE',
    };

    super(initialState, boardHandler, analysisController, services, requestGlobalRedraw);
    this.pgnService = services.pgnServiceInstance;

    this._updateAppControls();
    logger.info('[TowerController] Initialized.');
  }

  // --- Implementation of abstract methods ---

  public async initializeGame(towerId: string | null = null): Promise<void> {
    logger.info(`[TowerController] initializeGame called with towerId: ${towerId}`);
    if (this.analysisController.getPanelState().isAnalysisActive) {
        this.analysisController.toggleAnalysisEngine();
    }
    this.boardHandler.configureBoardForAnalysis(false);

    this._stopTimer();
    this.currentLevelStartTimeMs = null;
    
    this.setState({
        activeTowerState: null,
        gameOverMessage: null,
        gamePhase: 'IDLE',
    });

    if (towerId) {
      this.state.selectedTowerId = null; 
      await this._startTowerById(towerId);
    } else {
      this.boardHandler.setupPosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
      this.setState({
          feedbackMessage: t('tower.feedback.selectTowerAndStart', {defaultValue: 'Select a Tower and press Start.'}),
          selectedTowerId: null,
      });
    }
  }

  protected _getControlsState(): GameControlsState {
    const { gamePhase } = this.state;
    const isTowerActive = gamePhase !== 'IDLE' && gamePhase !== 'LOADING';

    return {
      canRequestNew: false,
      onRequestNew: () => this.handleNewGame(),
      canRestart: isTowerActive,
      onRestart: () => this.handleRestartTask(),
      canResign: this.state.gamePhase === 'PLAYING',
      onResign: () => this.handleResign(),
      onShare: () => this.handleShareTower(),
      onExit: () => this.handleExitTower(),
    };
  }

  protected async _handleUserMoveInGame(moveResult: AttemptMoveResult): Promise<void> {
    if (!moveResult.success) {
        this.setState({feedbackMessage: moveResult.isIllegal ? t('tower.feedback.illegalMove') : t('tower.error.moveFailed')});
        return;
    }

    if (this.isScenarioActive) {
      const expectedMove = this.solutionMovesForCurrentPosition[this.currentSolutionMoveIndex];
      if (moveResult.uciMove === expectedMove) {
        this.currentSolutionMoveIndex++;
      } else {
        this.isScenarioActive = false;
      }
    }
    
    const gameStatus = this.boardHandler.getGameStatus();
    if (gameStatus.isGameOver) {
      const humanColor = this.boardHandler.getHumanPlayerColor();
      this._handlePositionOutcome(gameStatus.outcome?.winner === humanColor, gameStatus.outcome?.reason);
    } else {
      this._triggerBotMove();
    }
  }
  
  public handleNewGame(): void {
      logger.warn('[TowerController] handleNewGame called, but this mode requires selection. Resetting to idle.');
      this.initializeGame(null);
  }

  public handleRestartTask(): void {
    if (!this._getControlsState().canRestart) return;
    
    if (this.analysisController.getPanelState().isAnalysisActive) {
        this.analysisController.toggleAnalysisEngine();
    }
    this.boardHandler.configureBoardForAnalysis(false);

    const activeTower = this.state.activeTowerState;
    if (!activeTower) {
      this.setState({feedbackMessage: t('tower.error.noTowerToRestart')});
      return;
    }

    this.boardHandler.clearAllDrawings();
    activeTower.currentPositionIndex = 0;
    activeTower.startTimeMs = null;
    activeTower.elapsedTimeMs = 0;
    activeTower.levelCompletionTimes.fill(null);
    activeTower.lives = INITIAL_LIVES;
    this.currentLevelStartTimeMs = null;
    
    this.setState({
      gameOverMessage: null,
      gamePhase: 'PLAYING',
    });

    SoundService.playBackgroundSound('game_entry');
    this._loadCurrentTowerPosition();
    this._startTimer();
  }
  
  public handleResign(): void {
    if (!this._getControlsState().canResign) return;

    this._stopTimer();
    this.setState({
      gamePhase: 'LEVEL_RESIGNED',
      feedbackMessage: t('tower.feedback.resigned', { defaultValue: 'You resigned. Analysis is now available.' }),
    });
    
    this.boardHandler.configureBoardForAnalysis(true);
  }

  // --- Tower specific methods ---

  public async selectTower(towerType: TowerId): Promise<void> {
    if (this.state.gamePhase !== 'IDLE') return;
    this.setState({ selectedTowerId: towerType });
    logger.info(`[TowerController] Tower selected: ${towerType}. Initiating start...`);
    await this._startTowerByType(towerType);
  }

  public selectTheme(theme: TowerTheme): void {
    if (this.state.gamePhase === 'IDLE') {
      this.setState({ selectedTheme: theme });
      logger.info(`[TowerController] Theme selected: ${theme}.`);
    }
  }

  public handleShareTower(): void {
    const towerId = this.state.activeTowerState?.id;
    if (!towerId) return;

    const baseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
    const shareUrl = `${baseUrl}/#/tower/${towerId}`;
    
    this.services.appController.handleShare({
        url: shareUrl,
        title: t('common.shareTitle', { defaultValue: 'Chess Puzzle' }),
        text: t('common.shareText', { defaultValue: 'Check out this puzzle!' })
    });
  }
  
  public handleExitTower(): void {
    this.services.appController.navigateTo('welcome');
  }

  private async _startTowerById(towerId: string): Promise<void> {
    logger.info(`[TowerController] Starting tower by ID: ${towerId}`);
    this.setState({
      gamePhase: 'LOADING',
      feedbackMessage: t('tower.feedback.loadingTower', { towerName: towerId }),
    });
    
    try {
        const towerData = await this.services.webhookService.fetchTowerById(towerId);
        this._processFetchedTowerData(towerData);
    } catch (error: any) {
        this._handleFetchError(error);
    }
  }

  private async _startTowerByType(towerType: TowerId): Promise<void> {
    logger.info(`[TowerController] Starting tower by type: ${towerType}`);
    const selectedDefinition = TOWER_DEFINITIONS.find(def => def.id === towerType);
    if (!selectedDefinition) {
      logger.error(`[TowerController] Cannot start tower by type: definition not found for ${towerType}`);
      return;
    }
    this.setState({
      gamePhase: 'LOADING',
      feedbackMessage: t('tower.feedback.loadingTower', { towerName: t(selectedDefinition.nameKey) }),
    });

    try {
        const dto: GetNewTowerDto = { 
          tower_type: towerType,
          tower_theme: this.state.selectedTheme
        };
        const towerData = await this.services.webhookService.fetchNewTower(dto);
        if (towerData) {
            const currentCoins = this.services.authService.getFunCoins();
            if (currentCoins !== null) {
                const newBalance = currentCoins - 10;
                this.services.authService.updateUserProfile({ FunCoins: newBalance });
            }
        }
        this._processFetchedTowerData(towerData);
    } catch (error: any) {
        if (error instanceof InsufficientFunCoinsError) {
            this.services.appController.showModal(error.message);
            this.setState({ gamePhase: 'IDLE' });
        } else {
            this._handleFetchError(error);
        }
    }
  }
  
  private _handleFetchError(error: any): void {
      if (this.services.appController.handleApiRateLimit(error)) {
        this.setState({ gamePhase: 'IDLE', selectedTowerId: null });
      } else {
        logger.error('[TowerController] Error fetching tower data:', error.message);
        this.services.appController.showModal(t('tower.error.towerNotFound', { defaultValue: 'The requested tower could not be found.'}));
        this.setState({
          gamePhase: 'IDLE',
          feedbackMessage: error.message,
          selectedTowerId: null,
        });
      }
  }

  private _processFetchedTowerData(towerData: TowerData | null): void {
      logger.debug('[TowerController] Received tower data from backend:', towerData);

      if (towerData && towerData.positions && towerData.positions.length > 0 && towerData.tower_id && towerData.tower_type && towerData.tower_theme) {
        const definition = TOWER_DEFINITIONS.find(def => def.id === towerData.tower_type);

        if (!definition) {
            logger.error(`[TowerController] Could not determine tower definition from response. Type received: ${towerData.tower_type}`);
            this._handleFetchError(new Error(t('tower.error.definitionNotFound', {towerId: towerData.tower_id})));
            return;
        }

        if (this.state.selectedTowerId) {
            this.services.appController.updateTowerUrl(towerData.tower_id);
        }

        const newActiveTowerState: ActiveTowerState = {
          id: towerData.tower_id,
          definition,
          theme: towerData.tower_theme,
          averageRating: towerData.average_rating,
          bwValueTotal: towerData.bw_value_total,
          positions: towerData.positions,
          towerResults: towerData.tower_results || [],
          currentPositionIndex: 0,
          startTimeMs: null,
          elapsedTimeMs: 0,
          levelCompletionTimes: new Array(towerData.positions.length).fill(null),
          lives: INITIAL_LIVES,
        };
        this.setState({ 
            activeTowerState: newActiveTowerState, 
            gamePhase: 'PLAYING' 
        });
        SoundService.playBackgroundSound('game_entry');
        this._loadCurrentTowerPosition();
        this._startTimer();
      } else {
        this._handleFetchError(new Error(t('tower.error.noPositionsInTower', { towerName: this.state.selectedTowerId || 'requested tower' })));
      }
  }

  private _loadCurrentTowerPosition(): void {
    const activeTower = this.state.activeTowerState;
    if (!activeTower || (this.state.gamePhase !== 'PLAYING' && this.state.gamePhase !== 'LEVEL_RESIGNED')) {
      logger.error(`[TowerController] _loadCurrentTowerPosition: called in invalid state. Phase: ${this.state.gamePhase}`);
      this.setState({ feedbackMessage: t('tower.error.internalErrorLoadingPosition'), gamePhase: 'IDLE' });
      return;
    }

    const { currentPositionIndex, positions } = activeTower;
    if (currentPositionIndex >= positions.length) {
      this._handleTowerCompletion();
      return;
    }
    
    const currentPosition = positions[currentPositionIndex];
    
    this.solutionMovesForCurrentPosition = currentPosition.solution_moves ? currentPosition.solution_moves.split(' ').filter(m => m) : [];
    this.currentSolutionMoveIndex = 0;
    this.isScenarioActive = this.solutionMovesForCurrentPosition.length > 0;
    
    this.currentLevelStartTimeMs = activeTower.elapsedTimeMs;
    const humanPlayerColor: ChessgroundColor = currentPosition.bot_color === 'w' ? 'black' : 'white';

    this.pgnService.reset(currentPosition.FEN_0);
    this.boardHandler.setupPosition(currentPosition.FEN_0, humanPlayerColor, false);

    const towerDisplayName = t(activeTower.definition.nameKey, {defaultValue: activeTower.definition.defaultName});
    this.setState({
        feedbackMessage: t('tower.feedback.positionLoaded', {
            current: currentPositionIndex + 1,
            total: positions.length,
            towerName: towerDisplayName
        })
    });

    const gameStatus = this.boardHandler.getGameStatus();
    if (gameStatus.isGameOver) {
        this._handlePositionOutcome(false, gameStatus.outcome?.reason);
        return;
    }

    const boardTurn = this.boardHandler.getBoardTurnColor();
    const botColorChessground: ChessgroundColor = currentPosition.bot_color === 'w' ? 'white' : 'black';

    if (boardTurn === botColorChessground) {
        setTimeout(() => this._triggerBotMove(), BOT_MOVE_DELAY_MS);
    } else {
        this.setState({feedbackMessage: t('tower.feedback.yourTurn')});
    }
  }

  private async _triggerBotMove(): Promise<void> {
    if (this.state.gamePhase !== 'PLAYING') return;
    
    this.setState({feedbackMessage: t('tower.feedback.botThinking')});

    let botMoveUci: string | null = null;
    
    if (this.isScenarioActive && this.currentSolutionMoveIndex < this.solutionMovesForCurrentPosition.length) {
        botMoveUci = this.solutionMovesForCurrentPosition[this.currentSolutionMoveIndex];
        this.currentSolutionMoveIndex++;
        await new Promise(resolve => setTimeout(resolve, BOT_MOVE_DELAY_MS));
    } else {
        if (this.isScenarioActive) this.isScenarioActive = false;
        try {
            const engineId = this.services.appController.state.selectedEngine;
            botMoveUci = await this.services.gameplayService.getBestMove(engineId, this.boardHandler.getFen());
        } catch (error) {
            this.setState({feedbackMessage: t('tower.error.botMoveFailed')});
            this._handlePositionOutcome(false);
            return;
        }
    }

    if (this.state.gamePhase !== 'PLAYING') return;

    if (botMoveUci) {
      const moveResult = this.boardHandler.applySystemMove(botMoveUci);
      if (moveResult.success) {
        const gameStatus = this.boardHandler.getGameStatus();
        if (gameStatus.isGameOver) {
          const humanColor = this.boardHandler.getHumanPlayerColor();
          this._handlePositionOutcome(gameStatus.outcome?.winner === humanColor, gameStatus.outcome?.reason);
        } else {
          this.setState({feedbackMessage: t('tower.feedback.yourTurn')});
          setTimeout(() => {
              if (this.services.chessboardService.playPremove()) {
                  // Premove played
              }
          }, PREMOVE_EXECUTION_DELAY_MS);
        }
      } else {
        this.setState({feedbackMessage: t('tower.error.botIllegalMove')});
        this._handlePositionOutcome(false);
      }
    } else {
        const gameStatus = this.boardHandler.getGameStatus();
        if (gameStatus.isGameOver) {
            const humanColor = this.boardHandler.getHumanPlayerColor();
            this._handlePositionOutcome(gameStatus.outcome?.winner === humanColor, gameStatus.outcome?.reason);
        } else {
            this.setState({feedbackMessage: t('tower.error.botNoMove')});
            this._handlePositionOutcome(false);
        }
    }
  }

  private _handlePositionOutcome(isWin: boolean, _reason?: GameEndReason): void {
    const activeTower = this.state.activeTowerState;
    if (!activeTower) return;
    
    if (this.currentLevelStartTimeMs !== null) {
        const levelTimeMs = activeTower.elapsedTimeMs - this.currentLevelStartTimeMs;
        activeTower.levelCompletionTimes[activeTower.currentPositionIndex] = levelTimeMs;
    }

    if (isWin) {
      activeTower.currentPositionIndex++;
      const isLastPosition = activeTower.currentPositionIndex >= activeTower.positions.length;
      
      if (isLastPosition) {
        this._handleTowerCompletion();
      } else {
        this.setState({feedbackMessage: t('tower.feedback.positionWon')});
        this._loadCurrentTowerPosition();
      }
    } else {
      activeTower.lives--;

      if (activeTower.lives > 0) {
        this.setState({
          feedbackMessage: t('tower.feedback.positionFailedWithLives', {
            lives: activeTower.lives
          })
        });
        setTimeout(() => this._loadCurrentTowerPosition(), 1500);
      } else {
        this._handleGameOver();
      }
    }
  }

  private _handleGameOver(): void {
    const activeTower = this.state.activeTowerState;
    if (!activeTower) return;

    this.setState({
      gamePhase: 'GAMEOVER',
      gameOverMessage: t('tower.feedback.gameOver', {
        defaultValue: 'Game Over. You have no lives left.'
      }),
    });
    
    this.boardHandler.configureBoardForAnalysis(true);
  }

  private _handleTowerCompletion(): void {
    this._stopTimer();
    const activeTower = this.state.activeTowerState;
    const elapsedTimeSec = activeTower ? Math.round(activeTower.elapsedTimeMs / 1000) : 0;
    const towerName = activeTower ? t(activeTower.definition.nameKey, {defaultValue: activeTower.definition.defaultName}) : "Tower";

    this.setState({
      gamePhase: 'TOWER_COMPLETE',
      gameOverMessage: t('tower.feedback.towerCompleted', {
          towerName: towerName,
          time: this.formatTime(elapsedTimeSec)
      }),
    });
    SoundService.playBackgroundSound('tower_series_win');
    this.boardHandler.configureBoardForAnalysis(true);
    this._sendTowerRecordToBackend();
  }
  
  private async _sendTowerRecordToBackend(): Promise<void> {
    const user = this.services.authService.getUserProfile();
    const activeTower = this.state.activeTowerState;

    if (!user || !user.username) {
      logger.warn('[TowerController] User profile or username missing, cannot send tower record.');
      return;
    }

    if (!activeTower || !activeTower.id || !activeTower.definition) {
      logger.warn('[TowerController] Active tower state or definition missing, cannot send tower record.');
      return;
    }

    const newTime = Math.round(activeTower.elapsedTimeMs / 1000);
    
    try {
      const dto: SaveTowerRecordDto = {
        username: user.username,
        tower_id: activeTower.id,
        tower_type: activeTower.definition.id,
        time_in_seconds: newTime,
        success: true, // <<< ИЗМЕНЕНО
        bw_value_total: activeTower.bwValueTotal, // <<< ИЗМЕНЕНО
      };
      await this.services.webhookService.sendTowerRecord(dto);
      logger.info('[TowerController] Tower record sent to backend successfully.');
    } catch (error) {
      logger.error('[TowerController] Failed to send tower record to backend:', error);
    }
  }

  private _startTimer(): void {
    this._stopTimer();
    const activeTower = this.state.activeTowerState;
    if (activeTower) {
      activeTower.startTimeMs = Date.now() - activeTower.elapsedTimeMs;
      this.timerIntervalId = window.setInterval(() => {
        const currentActiveTower = this.state.activeTowerState;
        if (currentActiveTower && currentActiveTower.startTimeMs !== null && this.state.gamePhase === 'PLAYING') {
          currentActiveTower.elapsedTimeMs = Date.now() - currentActiveTower.startTimeMs;
          
          const timerEl = document.getElementById('tower-timer-display');
          if (timerEl) {
              timerEl.textContent = this.formatTime(Math.round(currentActiveTower.elapsedTimeMs / 1000));
          }

        } else {
            this._stopTimer();
        }
      }, TIMER_INTERVAL_MS);
    }
  }

  private _stopTimer(): void {
    if (this.timerIntervalId !== null) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
    const activeTower = this.state.activeTowerState;
    if (activeTower && activeTower.startTimeMs !== null) {
        activeTower.elapsedTimeMs = Date.now() - activeTower.startTimeMs;
        this.requestGlobalRedraw();
    }
  }

  public formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  public destroy(): void {
    this._stopTimer();
    if (this.analysisController?.getPanelState().isAnalysisActive) {
        this.analysisController.toggleAnalysisEngine();
    }
    if (this.boardHandler) {
        this.boardHandler.configureBoardForAnalysis(false);
    }
    super.destroy(); // Call base class destroy
  }
}
