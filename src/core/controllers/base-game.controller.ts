// src/core/controllers/base-game.controller.ts
import type { Key, MoveMetadata } from 'chessground/types';
import type { BoardHandler, AttemptMoveResult } from '../boardHandler';
import type { AnalysisController } from '../../features/analysis/analysisController';
import type { AppServices, GameControlsState } from '../../AppController';
import type { BaseGameState } from './base-game.types';
import logger from '../../utils/logger';
import { t } from '../i18n.service';

/**
 * An abstract base class for game controllers (FinishHim, Tower, Attack, Tacktics).
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
  protected requestGlobalRedraw: () => void;

  private unsubscribeFromMoveMade: (() => void) | null = null;
  private unsubscribeFromPgnNavigated: (() => void) | null = null;

  constructor(
    initialState: S,
    boardHandler: BoardHandler,
    analysisController: AnalysisController,
    services: AppServices,
    requestGlobalRedraw: () => void
  ) {
    this.state = initialState;
    this.boardHandler = boardHandler;
    this.analysisController = analysisController;
    this.services = services;
    this.requestGlobalRedraw = requestGlobalRedraw;

    // Subscribe to board events to keep UI controls updated
    this.unsubscribeFromMoveMade = this.boardHandler.onMoveMade(() => this._updateAppControls());
    this.unsubscribeFromPgnNavigated = this.boardHandler.onPgnNavigated(() => this._updateAppControls());
  }

  // --- Abstract methods to be implemented by child controllers ---

  /**
   * Initializes the specific game mode, optionally loading a specific entity (puzzle, tower) by ID.
   * @param entityId - Optional ID of the puzzle or tower to load.
   */
  public abstract initializeGame(entityId?: string | null): Promise<void>;

  /**
   * Returns the configuration for the main game control buttons (New, Restart, Resign, etc.).
   */
  protected abstract _getControlsState(): GameControlsState;

  /**
   * Contains the core game logic for handling a user's move after it has been validated.
   * @param moveResult - The result of the user's move attempt from the BoardHandler.
   */
  protected abstract _handleUserMoveInGame(moveResult: AttemptMoveResult): Promise<void>;
  
  /**
   * Handles the "New Game" button click.
   */
  public abstract handleNewGame(): void;
  
  /**
   * Handles the "Restart" button click.
   */
  public abstract handleRestartTask(): void;
  
  /**
   * Handles the "Resign" button click.
   */
  public abstract handleResign(): void;


  // --- Common methods implemented in the base class ---

  /**
   * Generic handler for user moves from the board view. It manages analysis mode interaction
   * and delegates game-specific logic to the abstract _handleUserMoveInGame method.
   */
  public async handleUserMove(orig: Key, dest: Key, metadata?: MoveMetadata): Promise<void> {
    if (this.analysisController.getPanelState().isAnalysisActive) {
      const moveResult = await this.boardHandler.attemptUserMove(orig, dest);
      if (moveResult.success && moveResult.sanMove) {
        this.setState({ feedbackMessage: t('puzzle.feedback.analysisMoveMade', { san: moveResult.sanMove }) } as Partial<S>);
      } else if (moveResult.isIllegal) {
        this.setState({ feedbackMessage: t('puzzle.feedback.illegalMoveAnalysis') } as Partial<S>);
      }
      return;
    }

    if (this.state.gamePhase === 'IDLE' || this.state.gamePhase === 'GAMEOVER' || (metadata && metadata.premove)) {
      return;
    }

    const moveResult = await this.boardHandler.attemptUserMove(orig, dest);
    if (moveResult.success && moveResult.uciMove) {
      await this._handleUserMoveInGame(moveResult);
    }
  }

  /**
   * Updates the main application's game control buttons based on the current state.
   */
  protected _updateAppControls(): void {
    this.services.appController.updateGameControls(this._getControlsState());
    this.requestGlobalRedraw();
  }

  /**
   * A simple setState utility to merge new state and trigger a redraw.
   * @param newState - An object with properties to update in the controller's state.
   */
  protected setState(newState: Partial<S>): void {
    Object.assign(this.state, newState);
    this._updateAppControls(); // Ensures controls are always in sync with state changes
  }

  /**
   * Cleans up subscriptions and resources. Should be called when the controller is destroyed.
   */
  public destroy(): void {
    this.services.appController.clearGameControls();
    if (this.unsubscribeFromMoveMade) this.unsubscribeFromMoveMade();
    if (this.unsubscribeFromPgnNavigated) this.unsubscribeFromPgnNavigated();
    logger.info(`[${this.constructor.name}] Destroyed.`);
  }
}