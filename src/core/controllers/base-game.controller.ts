// src/core/controllers/base-game.controller.ts
import type { Key, Color as ChessgroundColor } from 'chessground/types';
import type { VNode } from 'snabbdom';
import type { BoardHandler, GameEndOutcome } from '../boardHandler';
import type { AnalysisController } from '../../features/analysis/analysisController';
import type { AppServices, GameControlsState } from '../../AppController';
import type { BaseGameState } from './base-game.types';
import logger from '../../utils/logger';
import { t } from '../i18n.service';
import { parseFen } from 'chessops/fen';
import { BoardView } from '../../shared/components/boardView';

const BOT_MOVE_DELAY_MS = 5000;

/**
 * An abstract base class for game controllers (FinishHim, Tower, Attack).
 * It encapsulates common logic for handling user moves, managing game state,
 * and interacting with shared services like the board and analysis engine.
 *
 * @template S The specific state interface for the extending controller, which must extend BaseGameState.
 */
export abstract class BaseGameController<S extends BaseGameState> {
  public state: S;
  public boardHandler: BoardHandler;
  public analysisController: AnalysisController;
  public services: AppServices;
  protected requestPageRedraw: () => void;
  public boardView: BoardView;

  protected scenarioMoves: string[] = [];
  protected currentScenarioMoveIndex: number = 0;
  protected isScenarioActive: boolean = false;

  private unsubscribeFromMoveMade: (() => void) | null = null;
  private unsubscribeFromPgnNavigated: (() => void) | null = null;

  constructor(
    initialState: S,
    boardHandler: BoardHandler,
    analysisController: AnalysisController,
    services: AppServices,
    requestPageRedraw: () => void
  ) {
    this.state = initialState;
    this.boardHandler = boardHandler;
    this.analysisController = analysisController;
    this.services = services;
    this.requestPageRedraw = requestPageRedraw;

    this.boardView = new BoardView(
      this.boardHandler,
      this.services.chessboardService,
      this.handleUserMove.bind(this)
    );

    this.unsubscribeFromMoveMade = this.boardHandler.onMoveMade(() => this._updateAppControls());
    this.unsubscribeFromPgnNavigated = this.boardHandler.onPgnNavigated(() => this._updateAppControls());
  }

  // --- Abstract methods to be implemented by child controllers ---

  public abstract initializeGame(entityId?: string | null, forceLoadNew?: boolean): Promise<void>;
  public abstract renderPage(): VNode | null;
  protected abstract _getControlsState(): GameControlsState;
  protected abstract _handleGameOver(isWin: boolean, outcome?: GameEndOutcome): void;
  
  public abstract handleNewGame(): void;
  public abstract handleRestartTask(): void;
  public abstract handleResign(): void;

  /**
   * A hook for child controllers to react when the scenario phase ends and free playout begins.
   * This is where timers should be started, sounds played, etc.
   */
  protected _onPlayoutStart(): void {}

  // --- Unified setup and bot logic ---

  protected _setupPuzzlePosition(fen: string, scenarioMoves: string[]): void {
    try {
      const setup = parseFen(fen).unwrap();
      const botTurnColor = setup.turn;
      const humanPlayerColor: ChessgroundColor = botTurnColor === 'white' ? 'black' : 'white';

      this.boardHandler.setupPosition(fen, humanPlayerColor, true);
      
      this.scenarioMoves = scenarioMoves;
      this.currentScenarioMoveIndex = 0;
      this.isScenarioActive = this.scenarioMoves.length > 0;

      this.setState({ gamePhase: 'PLAYING' } as Partial<S>);
      
      this._triggerBotMove();

    } catch (e) {
      logger.error('[BaseGameController] Invalid FEN provided for setup:', fen, e);
      this.setState({
        gamePhase: 'GAMEOVER',
        feedbackMessage: t('puzzle.feedback.loadFailed'),
        gameOverMessage: 'Invalid FEN data.'
      } as Partial<S>);
    }
  }

  /**
   * REFACTORED: This method now has a unified delay for both scenario and engine moves.
   * The delay is applied *after* the move is determined, ensuring a consistent cosmetic effect.
   */
  protected async _triggerBotMove(): Promise<void> {
    if (this.state.gamePhase !== 'PLAYING') return;

    const gameStatus = this.boardHandler.getGameStatus();
    if (gameStatus.isGameOver) {
      this._handleGameOver(this._checkWinCondition(gameStatus.outcome), gameStatus.outcome);
      return;
    }

    this.setState({ feedbackMessage: t('puzzle.feedback.stockfishThinking') } as Partial<S>);

    let botMoveUci: string | null = null;

    if (this.isScenarioActive && this.currentScenarioMoveIndex < this.scenarioMoves.length) {
      botMoveUci = this.scenarioMoves[this.currentScenarioMoveIndex];
      this.currentScenarioMoveIndex++;
    } else {
      if (this.isScenarioActive) {
        this.isScenarioActive = false;
        this._onPlayoutStart();
      }
      try {
        const engineId = this.services.appController.state.selectedEngine;
        botMoveUci = await this.services.gameplayService.getBestMove(engineId, this.boardHandler.getFen());
      } catch (error) {
        logger.error('[BaseGameController] Error getting move from gameplayService:', error);
        this._handleGameOver(false);
        return;
      }
    }

    // Apply the cosmetic delay AFTER getting the move
    setTimeout(() => {
      if (this.state.gamePhase !== 'PLAYING') return;

      if (botMoveUci) {
        const moveResult = this.boardHandler.applySystemMove(botMoveUci);
        if (moveResult.success) {
          const newGameStatus = this.boardHandler.getGameStatus();
          if (newGameStatus.isGameOver) {
            this._handleGameOver(this._checkWinCondition(newGameStatus.outcome), newGameStatus.outcome);
          } else {
            this.setState({ feedbackMessage: t('puzzle.feedback.yourTurn') } as Partial<S>);
            requestAnimationFrame(() => {
              this.services.chessboardService.playPremove();
            });
          }
        } else {
          logger.error(`[BaseGameController] Bot tried to make an illegal move: ${botMoveUci}`);
          this._handleGameOver(true);
        }
      } else {
        const finalStatus = this.boardHandler.getGameStatus();
        this._handleGameOver(this._checkWinCondition(finalStatus.outcome), finalStatus.outcome);
      }
    }, BOT_MOVE_DELAY_MS);
  }
  
  protected _checkWinCondition(outcome?: GameEndOutcome): boolean {
    if (!outcome) return false;
    const humanColor = this.boardHandler.getHumanPlayerColor();
    return outcome.reason === 'checkmate' && outcome.winner === humanColor;
  }

  public async handleUserMove(orig: Key, dest: Key): Promise<void> {
    if (this.analysisController.getPanelState().isAnalysisActive) {
      const moveResult = await this.boardHandler.attemptUserMove(orig, dest);
      if (moveResult.success && moveResult.sanMove) {
        this.setState({ feedbackMessage: t('puzzle.feedback.analysisMoveMade', { san: moveResult.sanMove }) } as Partial<S>);
      } else if (moveResult.isIllegal) {
        this.setState({ feedbackMessage: t('puzzle.feedback.illegalMoveAnalysis') } as Partial<S>);
      }
      return;
    }

    // <<< ИЗМЕНЕНИЕ: Убрана проверка `metadata && metadata.premove`
    // Теперь premove обрабатывается как обычный ход, что исправляет рассинхронизацию.
    if (this.state.gamePhase !== 'PLAYING') {
      logger.warn(`[BaseGameController] handleUserMove called in non-playing phase: ${this.state.gamePhase}. Ignoring move.`);
      return;
    }

    const moveResult = await this.boardHandler.attemptUserMove(orig, dest);
    if (moveResult.success && moveResult.uciMove) {
      await this._handleUserMoveInGame(moveResult.uciMove);
    }
  }

  protected async _handleUserMoveInGame(userUciMove: string): Promise<void> {
    if (this.isScenarioActive) {
      const expectedMove = this.scenarioMoves[this.currentScenarioMoveIndex];
      if (userUciMove === expectedMove) {
        this.currentScenarioMoveIndex++;
      } else {
        this.isScenarioActive = false;
        this._onPlayoutStart();
      }
    }

    const gameStatus = this.boardHandler.getGameStatus();
    if (gameStatus.isGameOver) {
      this._handleGameOver(this._checkWinCondition(gameStatus.outcome), gameStatus.outcome);
    } else {
      this._triggerBotMove();
    }
  }

  protected _updateAppControls(): void {
    this.services.appController.updateGameControls(this._getControlsState());
    this.requestPageRedraw();
  }

  protected setState(newState: Partial<S>): void {
    Object.assign(this.state, newState);
    this._updateAppControls();
  }

  public destroy(): void {
    this.services.appController.clearGameControls();
    if (this.unsubscribeFromMoveMade) this.unsubscribeFromMoveMade();
    if (this.unsubscribeFromPgnNavigated) this.unsubscribeFromPgnNavigated();
    if (this.boardView) this.boardView.destroy();
    logger.info(`[${this.constructor.name}] Destroyed.`);
  }
}
