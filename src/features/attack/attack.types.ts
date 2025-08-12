// src/features/attack/attack.types.ts
import type { AppAttackPuzzle, PuzzleResultEntry } from '../../core/api.types';
import type { BaseGameState } from '../../core/controllers/base-game.types';

/**
 * REFACTORED: Defines the state for the Attack mode controller.
 * Scenario-tracking properties have been removed as they are now handled by the BaseGameController.
 */
export interface AttackControllerState extends BaseGameState {
  activePuzzle: AppAttackPuzzle | null;
  puzzleResults: PuzzleResultEntry[] | null;
  isBotThinking: boolean;
  solveStartTimeMs: number | null;
  playoutTimerId: number | null;
  elapsedPlayoutTimeMs: number;
  tenSecondsWarningPlayed: boolean;
  sevenSecondsWarningPlayed: boolean;
}
