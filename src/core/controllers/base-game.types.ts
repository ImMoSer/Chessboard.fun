// src/core/controllers/base-game.types.ts

/**
 * Defines all possible game phases across different game modes.
 * This creates a finite state machine, preventing impossible state combinations.
 */
export type GamePhase =
  | 'IDLE'          // Waiting for user to start a game
  | 'LOADING'       // Loading puzzle data from the server
  | 'PLAYING'       // User is actively solving the puzzle (scenario or playout)
  | 'GAMEOVER'      // The puzzle/game has ended (win, loss, resign)
  | 'TOWER_COMPLETE' // Special state for successfully completing a tower
  | 'LEVEL_FAILED'  // Specific to Tower: user failed a level but has lives left
  | 'LEVEL_RESIGNED'; // Specific to Tower: user resigned a level

/**
 * Defines the base structure for the state of any game controller.
 * Each specific game controller's state (FinishHim, Tower, etc.) must extend this interface.
 */
export interface BaseGameState {
  gamePhase: GamePhase;
  feedbackMessage: string;
  gameOverMessage: string | null;
}
