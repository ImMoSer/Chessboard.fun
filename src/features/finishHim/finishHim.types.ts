// src/features/finishHim/finishHim.types.ts
import type { AppPuzzle, PuzzleResultEntry, FinishHimStats } from '../../core/api.types';
import type { BaseGameState } from '../../core/controllers/base-game.types';

/**
 * Defines the state for the Finish Him mode controller.
 * Inherits the `gamePhase` state machine from BaseGameState.
 */
export interface FinishHimControllerState extends BaseGameState {
  activePuzzle: AppPuzzle | null;
  puzzleResults: PuzzleResultEntry[] | null;
  userStats: FinishHimStats | null;
  userFunCoins: number | null;
  currentPgnString: string;
  outplayTimerId: number | null;
  outplayTimeRemainingMs: number | null;
  isCurrentPuzzleSolved: boolean;
  isCurrentPuzzleFavorite: boolean;
  tenSecondsWarningPlayed: boolean;
  sevenSecondsWarningPlayed: boolean;
}
