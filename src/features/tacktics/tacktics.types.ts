// src/features/tacktics/tacktics.types.ts
import type { AppTacticalPuzzle, TacticalTrainerStats } from '../../core/api.types';
import type { BaseGameState } from '../../core/controllers/base-game.types';

/**
 * Defines the state for the Tacktics mode controller, extending the base game state.
 */
export interface TackticsControllerState extends BaseGameState {
  activePuzzle: AppTacticalPuzzle | null;
  solutionMoves: string[];
  currentSolutionMoveIndex: number;
  tacticalStats: TacticalTrainerStats | null;
}
