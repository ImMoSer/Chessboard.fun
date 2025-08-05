// src/features/attack/attack.types.ts
import type { AppAttackPuzzle, PuzzleResultEntry } from '../../core/api.types';
import type { BaseGameState } from '../../core/controllers/base-game.types';

/**
 * Defines the state for the Attack mode controller, extending the base game state.
 */
export interface AttackControllerState extends BaseGameState {
  activePuzzle: AppAttackPuzzle | null;
  puzzleResults: PuzzleResultEntry[] | null;
  solutionMoves: string[];
  currentSolutionMoveIndex: number;
  isBotThinking: boolean;
  solveStartTimeMs: number | null;
  playoutTimerId: number | null;
  elapsedPlayoutTimeMs: number;
  tenSecondsWarningPlayed: boolean;
  sevenSecondsWarningPlayed: boolean;
}
