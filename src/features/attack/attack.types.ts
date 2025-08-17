// src/features/attack/attack.types.ts
import type { AppAttackPuzzle, PuzzleResultEntry } from '../../core/api.types';
import type { BaseGameState } from '../../core/controllers/base-game.types';

/**
 * Defines the state for the Attack mode controller.
 * Inherits the `gamePhase` state machine from BaseGameState.
 */
export interface AttackControllerState extends BaseGameState {
  activePuzzle: AppAttackPuzzle | null;
  puzzleResults: PuzzleResultEntry[] | null;
  solveStartTimeMs: number | null;
  playoutTimerId: number | null;
  elapsedPlayoutTimeMs: number;
  tenSecondsWarningPlayed: boolean;
  sevenSecondsWarningPlayed: boolean;
}
