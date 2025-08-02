// src/features/tower/tower.types.ts

/**
 * Defines the possible tower identifiers based on chess titles.
 */
export const TOWER_IDS = ["CM", "FM", "IM", "GM"] as const;
export type TowerId = typeof TOWER_IDS[number];

/**
 * ADDED: Defines the possible tower themes.
 */
// ИЗМЕНЕНО: Обновлен список тем в соответствии с новыми требованиями
export const TOWER_THEMES = [
    "mix",
    "rook_endgame",
    "pawn_endgame",
    "queens_vs_rooks",
    "knight_endgame",
    "bishop_endgame",
    "rooks_vs_minors",
    "queens_vs_minors",
    "queen_endgame",
    "knights_vs_bishops",
    "bishops_vs_knights",
    "minors_vs_rooks",
    "opposite_color_bishops"
] as const;
export type TowerTheme = typeof TOWER_THEMES[number];


/**
 * Defines the possible phases of the Tower game mode.
 */
export type TowerGamePhase = 'IDLE' | 'LOADING' | 'PLAYING' | 'LEVEL_FAILED' | 'LEVEL_RESIGNED' | 'TOWER_COMPLETE' | 'GAME_OVER';

/**
 * MODIFIED: This interface is now defined in webhook.service.ts to avoid duplication.
 * We keep it here for reference in other tower-specific files if needed, but the source of truth is the service.
 */
export interface TowerRequestParams {
  tower_type: TowerId;
  tower_theme: TowerTheme;
}

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
 * Represents a single position (level) in a tower, as it comes from the backend.
 * MODIFIED: Added fen_final back as it is now used.
 */
export interface TowerPositionEntry {
  FEN_0: string; // Начальная FEN
  rating: number;
  bot_color: 'w' | 'b';
  solution_moves: string;
  absoluteIndex?: number;
  fen_final?: string; // <-- Возвращено поле fen_final
  avg_rating?: number; // Дополнительные поля, которые могут приходить с бэкенда
  engm_rating?: number;
  puzzle_theme?: string;
}

/**
 * MODIFIED: Represents a single record in the tower's leaderboard results.
 * Aligned with the new data structure from the backend.
 */
export interface TowerResultEntry {
    date?: string; // Optional, as it might not be used directly
    username: string;
    time_in_seconds: number; // Changed from best_time
    lichess_id: string;
    record_timestamp_ms?: number; // Added new field
}

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
