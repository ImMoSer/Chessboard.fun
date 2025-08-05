// src/core/controllers/base-game.types.ts

/**
 * Defines all possible game phases across different game modes.
 */
export type GamePhase =
  | 'IDLE'
  | 'LOADING'
  | 'TACTICAL'
  | 'PLAYING' // <<< ДОБАВЛЕНО
  | 'PLAYOUT'
  | 'GAMEOVER'
  | 'LEVEL_FAILED'
  | 'LEVEL_RESIGNED'
  | 'TOWER_COMPLETE';

/**
 * Defines the base structure for the state of any game controller.
 * Each specific game controller's state should extend this interface.
 */
export interface BaseGameState {
  gamePhase: GamePhase;
  feedbackMessage: string;
  gameOverMessage: string | null;
}
