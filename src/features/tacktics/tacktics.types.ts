// src/features/tacktics/tacktics.types.ts
import type { AppTacticalPuzzle, TacticalTrainerStats } from '../../core/api.types';
import type { BaseGameState } from '../../core/controllers/base-game.types';

export type TacticalLevel = 'easy' | 'normal' | 'hard';

/**
 * REFACTORED: Defines the state for the Tacktics mode controller.
 * Scenario-tracking properties are removed as they are now handled by the BaseGameController.
 */
export interface TackticsControllerState extends BaseGameState {
  activePuzzle: AppTacticalPuzzle | null;
  tacticalStats: TacticalTrainerStats | null;
  selectedLevel: TacticalLevel;
  isAutoLoadEnabled: boolean;
}
