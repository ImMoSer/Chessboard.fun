// src/core/api.types.ts

// Types from tower.types.ts
export const TOWER_IDS = ["CM", "FM", "IM", "GM"] as const;
export type TowerId = typeof TOWER_IDS[number];

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

export interface TowerPositionEntry {
  FEN_0: string;
  rating: number;
  bot_color: 'w' | 'b';
  solution_moves: string;
  absoluteIndex?: number;
  fen_final?: string;
  avg_rating?: number;
  engm_rating?: number;
  puzzle_theme?: string;
}

export interface TowerResultEntry {
    date?: string;
    username: string;
    time_in_seconds: number;
    lichess_id: string;
    record_timestamp_ms?: number;
}


// Types from webhook.service.ts
export type WebhookSuccessResponse<T> = T | null;

export interface PuzzleResultEntry {
  username: string;
  lichess_id: string;
  time_in_seconds: number;
  record_timestamp_ms: number;
}

export interface UpdateFinishHimStatsDto {
  FunCoins: number;
  finishHimStats: FinishHimStats;
  solved_in_seconds?: number;
  PuzzleId?: string;
  success: boolean;
}
export interface GetNewTowerDto { tower_type: TowerId; tower_theme: TowerTheme; }
export interface SaveTowerRecordDto {
  username: string;
  tower_id: string;
  tower_type: TowerId;
  time_in_seconds: number;
  isNewRecord?: boolean;
  success: boolean;
  bw_value_total: number;
}
export interface AttackRecordDto {
  username: string;
  PuzzleId: string;
  time_in_seconds: number;
  success: boolean;
  bw_value: number;
}
export interface FollowClubDto { club_id: string; club_name: string; action: 'follow' | 'unfollow'; }
export interface FounderActionDto { club_id: string; action: 'club_addToList' | 'club_delete'; }
export interface SubmitTacticalResultDto {
  PuzzleId: string;
  Rating: number;
  Themes_PG: string[];
  success: boolean;
}

export type TacticalLevel = 'easy' | 'normal' | 'hard';
export interface GetTacticalPuzzleDto {
  tactical_level: TacticalLevel;
}

export interface AppPuzzle {
  PuzzleId: string;
  FEN_0: string;
  Moves: string;
  bot_color: 'w' | 'b';
  solve_time?: number;
  fun_value?: number;
  Tactical_Rating?: number;
  PlayOut_Rating?: number;
  endgame_results?: PuzzleResultEntry[];
  fen_final?: string;
}

export interface AppAttackPuzzle {
  PuzzleId: string;
  FEN_0: string;
  Moves: string;
  Rating: number;
  attack_results?: PuzzleResultEntry[];
  bw_value: number;
}

export interface AppTacticalPuzzle {
  PuzzleId: string;
  FEN_0: string;
  Moves: string;
  Rating: number;
  Themes_PG: string[];
}

export interface TacticalThemeStat {
  rating: number;
  total_attempts: number;
  solved: number;
  failed: number;
  last_activity: string | null;
}

export interface TacticalTrainerStats {
  global_rating: number;
  theme_stats: Record<string, TacticalThemeStat>;
}

export interface TowerData {
  tower_id: string;
  tower_type: TowerId;
  tower_theme: TowerTheme;
  bw_value_total: number;
  average_rating: number;
  positions: TowerPositionEntry[];
  tower_results: TowerResultEntry[] | null;
}
export interface TournamentInfo { name: string; url: string; date: string; }
export interface MedalDetail { count: number; tournaments: TournamentInfo[]; }
export interface Medals { gold: MedalDetail; silver: MedalDetail; bronze: MedalDetail; }


// <<< НАЧАЛО ИЗМЕНЕНИЙ: Обновлены интерфейсы для API клубов

export interface ClubLeader {
    id: string;
    name: string;
    flair?: string;
    title?: string;
}

export interface ClubInfo {
    club_id: string;
    club_name: string;
    grunder: { id: string; name: string; };
    nb_members: number;
    leaders: ClubLeader[];
}

export interface PlayerData {
    lichess_id: string;
    username: string;
    flair: string | null;
    vector: number;
    tournaments_played: number;
    total_score: number;
    total_games_played: number;
    win_rate: number;
    total_berserk_wins: number;
    max_longest_win_streak_ever: number;
    rating_stats: { avg: number; min: number; max: number; };
    performance_stats: { avg: number; min: number; max: number; };
    medals_in_team: Medals;
    medals_in_arena: Medals;
}

export interface CalculatedPlayerStats {
    gamesPlayed: number;
    pointsTotal: number;
    wins: number;
    losses: number;
    draws: number;
    berserkWins: number;
    longestWinStreak: number;
}

export interface TournamentPlayer {
    username: string;
    lichess_id: string;
    user_score: number;
    user_rating: number;
    user_performance: number;
    user_inTeamRank: number;
    user_inArenaRank: number;
    user_flair?: string;
    crone?: boolean; // Добавлено новое поле
    calculatedStats: CalculatedPlayerStats;
}

export interface TournamentHistoryEntry {
    arena_id: string;
    arena_url: string;
    tournament_name: string;
    starts_at_date: string;
    team_score: number;
    players: TournamentPlayer[];
    club_in_arena_rank?: number; // Добавлено новое поле
    team_rank?: number; 
    team_full_stats?: any;
}

export interface ClubApiResponse {
    club_info: ClubInfo;
    players_data: PlayerData[];
    tournament_history: TournamentHistoryEntry[];
}
// <<< КОНЕЦ ИЗМЕНЕНИЙ


export interface ClubStatsSummary {
  total_score: number;
  average_score: number;
  tournaments_played: number;
  active_players_count: number;
}

export interface ClubMedalTournament {
  arena_id: string;
  tournament_url: string;
  tournament_name: string;
}

export interface ClubMedals {
  bronze: ClubMedalTournament[];
  silver: ClubMedalTournament[];
  gold: ClubMedalTournament[];
}

export interface TopPlayerByScore {
  username: string;
  lichess_id: string;
  total_score: number;
}

export interface TopPlayerByMedals {
  username: string;
  lichess_id: string;
  medals: {
    gold: number;
    silver: number;
    bronze: number;
  };
}

export interface TopPlayerByActivity {
  username: string;
  lichess_id: string;
  tournaments_played: number;
}

export interface ClubStatisticsPayload {
  summary: ClubStatsSummary;
  club_medals: ClubMedals;
  top_players_by_score: TopPlayerByScore[];
  top_players_by_medals: TopPlayerByMedals[];
  top_players_by_activity: TopPlayerByActivity[];
}

export interface ListedClub {
  club_id: string;
  club_name: string;
  club_flair: string | null;
  grunder?: string;
  nb_members?: number;
  jsonb_array_leader?: ClubLeader[];
  statistics_payload: ClubStatisticsPayload;
}

export interface LichessClubsApiResponse {
  stats: ListedClub[];
}


export interface FinishHimLeaderboardEntry {
  rank: number;
  username: string;
  lichess_id: string;
  best_time: number;
  days_old: number;
  puzzle_id: string;
  subscriptionTier?: string;
}

export interface TowerLeaderboardEntry {
  rank: number;
  tower_id: string;
  username: string;
  best_time: number;
  days_old: number;
  lichess_id: string;
  subscriptionTier?: string;
}
export interface AttackLeaderboardEntry {
  rank: number;
  username: string;
  best_time: number;
  days_old: number;
  puzzle_id: string;
  lichess_id: string;
  subscriptionTier?: string;
}

export interface WorktableLeaderboards {
  towerLeaderboards: { [key in TowerId]?: TowerLeaderboardEntry[] };
  finishHimLeaderboard: FinishHimLeaderboardEntry[];
  attackLeaderboard?: AttackLeaderboardEntry[];
}

export interface LeaderboardApiResponse extends WorktableLeaderboards {
  overallSkillLeaderboard: OverallSkillLeaderboardEntry[];
  skillStreakLeaderboard: SkillStreakLeaderboardEntry[];
}

export interface SkillByMode {
  finishHim: number;
  attack: number;
  tower: number;
  tacticalTrainer: number;
}

export interface OverallSkillLeaderboardEntry {
  lichess_id: string;
  username: string;
  subscriptionTier: string;
  total_skill: number;
  skill_by_mode: SkillByMode;
}

export interface SkillStreakLeaderboardEntry {
  lichess_id: string;
  username: string;
  current_streak: number;
  subscriptionTier: string;
  total_skill: number;
  skill_by_mode: SkillByMode;
}

export interface PersonalOverallSkillPeriod {
  lichess_id: string;
  username: string;
  subscriptionTier: string;
  total_skill: number;
  skill_by_mode: SkillByMode;
}

export type PersonalOverallSkillResponse = Record<'7_days' | '14_days' | '21_days' | '30_days', PersonalOverallSkillPeriod>;

export interface DailySkillSummary {
  date: string; // "YYYY-MM-DD"
  total_skill: number;
  skill_by_mode: SkillByMode;
}

export interface PersonalSkillStreakResponse {
  lichess_id: string;
  username: string;
  current_streak: number;
  daily_summary: DailySkillSummary[];
}

export interface TelegramBindingUrlResponse {
  bindingUrl: string;
}

export interface ActivityModeStats {
  puzzles_requested: number;
  puzzles_solved: number;
  skill_value: number;
}

export interface ActivityPeriodStats {
  tower: ActivityModeStats;
  attack: ActivityModeStats;
  finishHim: ActivityModeStats;
  tacticalTrainer: ActivityModeStats;
}

export interface PersonalActivityStatsResponse {
  daily: ActivityPeriodStats;
  weekly: ActivityPeriodStats;
  monthly: ActivityPeriodStats;
}

// Types from auth.service.ts
export type SubscriptionTier = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'administrator';

export interface ClubIdNamePair {
  club_id: string;
  club_name: string;
}

export interface LichessUserProfile {
  id: string;
  username: string;
  email?: string;
  perfs?: Record<string, { rating: number; prog: number; games: number }>;
  createdAt?: number;
  profile?: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    country?: string;
    location?: string;
  };
}

export interface FinishHimStats {
  gamesPlayed: number;
  tacticalRating: number;
  tacticalWins: number;
  tacticalLosses: number;
  finishHimRating: number;
  playoutWins: number;
  playoutDraws: number;
  playoutLosses: number;
}

export interface TowerAttempt {
  versuch: number;
  tower_id: string;
  best_time: number;
}
export type TowerStats = { [key: string]: TowerAttempt[] };
export interface AttackStat {
  PuzzleId: string;
  best_time: number;
}

export interface UserSessionProfile extends LichessUserProfile {
  FunCoins: number;
  subscriptionTier: SubscriptionTier;
  finishHimStats: FinishHimStats;
  tower_stats?: TowerStats;
  attack_stats?: AttackStat[];
  follow_clubs?: ClubIdNamePair[];
  club_founder?: ClubIdNamePair[];
  validatedAt?: number;
  telegram_id?: string | null;
  TierExpire?: string | null;
  endgame_skill: number;
  attack_skill: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  userProfile: UserSessionProfile | null;
  isProcessing: boolean;
  error: string | null;
}
