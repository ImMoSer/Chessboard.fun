// src/features/tower/tower.types.ts
import type { TowerId, TowerTheme, TowerPositionEntry, TowerResultEntry } from '../../core/api.types';

/**
 * Defines the possible phases of the Tower game mode.
 */
export type TowerGamePhase = 'IDLE' | 'LOADING' | 'PLAYING' | 'LEVEL_FAILED' | 'LEVEL_RESIGNED' | 'TOWER_COMPLETE' | 'GAME_OVER';

/**
 * Defines the configuration for each tower: its ID, request parameters, and display properties.
 */
export interface TowerDefinition {
  id: TowerId;
  nameKey: string;
  defaultName: string;
  requestParams: { tower_type: TowerId };
  displayLevels: number;
  color: string;
}

/**
 * Array with configurations for all available towers.
 */
export const TOWER_DEFINITIONS: TowerDefinition[] = [
  { id: "CM", nameKey: "tower.names.CM", defaultName: "CM Tower", requestParams: { tower_type: "CM" }, displayLevels: 5, color: "var(--color-accent-primary)" },
  { id: "FM", nameKey: "tower.names.FM", defaultName: "FM Tower", requestParams: { tower_type: "FM" }, displayLevels: 6, color: "var(--color-accent-success)" },
  { id: "IM", nameKey: "tower.names.IM", defaultName: "IM Tower", requestParams: { tower_type: "IM" }, displayLevels: 7, color: "var(--color-accent-warning)" },
  { id: "GM", nameKey: "tower.names.GM", defaultName: "GM Tower", requestParams: { tower_type: "GM" }, displayLevels: 8, color: "var(--color-accent-error)" },
];

/**
 * MODIFIED: State of the currently active tower in the controller.
 */
export interface ActiveTowerState {
  id: string;
  definition: TowerDefinition;
  theme: TowerTheme;
  averageRating: number;
  bwValueTotal: number;
  positions: TowerPositionEntry[];
  towerResults: TowerResultEntry[];
  currentPositionIndex: number;
  startTimeMs: number | null;
  elapsedTimeMs: number;
  levelCompletionTimes: Array<number | null>;
  lives: number;
}

/**
 * MODIFIED: State of the "Tower" mode controller.
 */
export interface TowerControllerState {
  availableTowers: TowerDefinition[];
  availableThemes: readonly TowerTheme[];
  selectedTowerId: TowerId | null;
  selectedTheme: TowerTheme;
  activeTowerState: ActiveTowerState | null;
  feedbackMessage: string;
  gameOverMessage: string | null;
  gamePhase: TowerGamePhase;
}
