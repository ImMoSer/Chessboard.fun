// src/features/tacktics/tackticsController.ts
import type { Color as ChessgroundColor } from 'chessground/types';
import type { AttemptMoveResult } from '../../core/boardHandler';
import { InsufficientFunCoinsError } from '../../core/webhook.service';
import type { AppTacticalPuzzle, SubmitTacticalResultDto } from '../../core/api.types';
import logger from '../../utils/logger';
import { t } from '../../core/i18n.service';
import { SoundService } from '../../core/sound.service';
import { parseFen } from 'chessops/fen';
import type { AppServices, GameControlsState } from '../../AppController';
import { BaseGameController } from '../../core/controllers/base-game.controller';
import type { BoardHandler } from '../../core/boardHandler';
import type { AnalysisController } from '../analysis/analysisController';
import type { TackticsControllerState, TacticalLevel } from './tacktics.types';

const BOT_MOVE_DELAY_MS = 300;
const AUTO_NEXT_PUZZLE_DELAY_MS = 300;

export class TackticsController extends BaseGameController<TackticsControllerState> {
  constructor(
    boardHandler: BoardHandler,
    analysisController: AnalysisController,
    services: AppServices,
    requestGlobalRedraw: () => void,
  ) {
    const initialState: TackticsControllerState = {
      gamePhase: 'IDLE',
      feedbackMessage: t('tacktics.feedback.getReady', { defaultValue: 'Press "New Game" to start.' }),
      gameOverMessage: null,
      activePuzzle: null,
      solutionMoves: [],
      currentSolutionMoveIndex: 0,
      tacticalStats: null,
      // <<< ИЗМЕНЕНИЕ: Инициализация новых полей
      selectedLevel: 'normal', // Установка уровня по умолчанию на 'normal'
      isAutoLoadEnabled: true, // Включение автозагрузки по умолчанию
    };
    super(initialState, boardHandler, analysisController, services, requestGlobalRedraw);
    logger.info('[TackticsController] Initialized.');
  }

  // --- Implementation of abstract methods ---

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

  protected async _handleUserMoveInGame(moveResult: AttemptMoveResult): Promise<void> {
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

  public handleNewGame(): void {
    if (!(this.state.gamePhase === 'IDLE' || this.state.gamePhase === 'GAMEOVER')) return;

    if (this.analysisController.getPanelState().isAnalysisActive) {
        this.analysisController.toggleAnalysisEngine();
    }

    this._loadPuzzle(null);
  }

  public handleRestartTask(): void {
      if (!((this.state.gamePhase === 'GAMEOVER' || this.state.gamePhase === 'IDLE') && !!this.state.activePuzzle)) return;
      this.initializeGame(this.state.activePuzzle.PuzzleId);
  }
  
  public handleResign(): void {
      // Resign is not applicable in this mode.
  }

  // --- Tacktics specific methods ---

  // <<< ИЗМЕНЕНИЕ: Новый метод для обновления уровня сложности
  public setTacticalLevel(level: TacticalLevel): void {
      if (this.state.selectedLevel !== level) {
          this.setState({ selectedLevel: level });
          logger.info(`[TackticsController] Tactical level set to: ${level}`);
      }
  }
  
  // <<< ИЗМЕНЕНИЕ: Новый метод для переключения автозагрузки
  public toggleAutoLoad(): void {
      this.setState({ isAutoLoadEnabled: !this.state.isAutoLoadEnabled });
      logger.info(`[TackticsController] Auto-load toggled to: ${this.state.isAutoLoadEnabled}`);
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

  private async _loadPuzzle(puzzleId: string | null): Promise<void> {
    this.setState({ gamePhase: 'LOADING', feedbackMessage: t('common.loading') });

    let puzzleData: AppTacticalPuzzle | null = null;

    try {
        if (puzzleId) {
            puzzleData = await this.services.webhookService.fetchTacticalPuzzleById(puzzleId);
        } else {
            // <<< ИЗМЕНЕНИЕ: Теперь передаем DTO с уровнем сложности
            const dto = { tactical_level: this.state.selectedLevel };
            puzzleData = await this.services.webhookService.fetchTacticalPuzzle(dto);
            // <<< КОНЕЦ ИЗМЕНЕНИЯ
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

        const setup = parseFen(puzzleData.FEN_0).unwrap();
        const humanPlayerColor: ChessgroundColor = setup.turn === 'white' ? 'black' : 'white';
        this.boardHandler.setupPosition(puzzleData.FEN_0, humanPlayerColor, true);

        this.setState({
            activePuzzle: puzzleData,
            solutionMoves: puzzleData.Moves ? puzzleData.Moves.split(' ') : [],
            currentSolutionMoveIndex: 0,
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
        
        // <<< ИЗМЕНЕНИЕ: Логика автозагрузки
        if (this.state.isAutoLoadEnabled) {
            this.setState({
                gamePhase: 'GAMEOVER',
                gameOverMessage: message,
                feedbackMessage: message,
            });
            this._sendResult(success);
            setTimeout(() => this.handleNewGame(), AUTO_NEXT_PUZZLE_DELAY_MS);
            return;
        }
        // <<< КОНЕЦ ИЗМЕНЕНИЯ
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
}
