// src/types/api.types.ts

// --- Engine and Gameplay Types ---
export type EngineId =
  | 'SF_2200'
  | 'MOZER_1900'
  | 'MOZER_2000'
  | 'maia_2200'

export type Color = 'white' | 'black'

// --- Types from LichessApiService ---
interface RatingProgression {
  before: number
  after: number
}
interface GameStats {
  win: number
  loss: number
  draw: number
  rp: RatingProgression
}
interface PuzzleStats {
  score: GameStats
}
interface TournamentBest {
  tournament: {
    id: string
    name: string
  }
  nbGames: number
  score: number
  rank: number
  rankPercent: number
}
interface Tournaments {
  nb: number
  best: TournamentBest[]
}
interface CorrespondenceEnds {
  correspondence: {
    score: GameStats
    games: {
      id: string
      color: 'white' | 'black'
      url: string
      opponent: {
        aiLevel?: number
        name?: string
      }
    }[]
  }
}
interface Follows {
  in?: { ids: string[] }
  out?: { ids: string[] }
}
export interface LichessActivityEntry {
  interval: {
    start: number
    end: number
  }
  games?: {
    [gameType: string]: GameStats
  }
  puzzles?: PuzzleStats
  tournaments?: Tournaments
  correspondenceEnds?: CorrespondenceEnds
  follows?: Follows
}
export type LichessActivityResponse = LichessActivityEntry[]

// --- Original types from api.types.ts ---
export const TOWER_IDS = ['CM', 'FM', 'IM', 'GM'] as const
export type TowerId = (typeof TOWER_IDS)[number]

export const TOWER_THEMES = [
  'mix',
  'rook_and_minor_vs_rook',
  'rook_endgame',
  'pawn_endgame',
  'queens_vs_rooks',
  'knight_endgame',
  'bishop_endgame',
  'rooks_vs_minors',
  'opposite_color_bishops',
  'two_rooks_endgame',
  'queens_vs_minors',
  'queen_endgame',
  'knights_vs_bishops',
  'bishops_vs_knights',
  'minors_vs_rooks',
  'vs_queen_disadvantage',
  'mixed_balanced',
  'tactical_mixed',
] as const
export type TowerTheme = (typeof TOWER_THEMES)[number]

// --- TORNADO MODE ---
export type TornadoMode = 'bullet' | 'blitz' | 'rapid' | 'classic'

export interface ThemeRating {
  rating: number
  rating_deviation: number
  volatility: number
}

export interface TornadoNextPuzzleDto {
  sessionId: string
  lastPuzzleId: string
  lastPuzzleRating: number
  lastPuzzleThemes: string[]
  wasCorrect: boolean
}

export interface TornadoEndSessionDto {
  sessionId: string
  finalScore: number
}

export interface TornadoStartResponse {
  puzzle: GamePuzzle
  sessionId: string
  sessionRating: number
  sessionTheme?: string
}

export interface TornadoNextResponse {
  newSessionRating: number
  nextPuzzle: GamePuzzle
  updatedThemeRatings: Record<string, ThemeRating>
  userStatsUpdate?: UserStatsUpdate
}

export interface TornadoRecord {
  id: string
  userId: string
  username: string
  mode: TornadoMode
  highScore: number
  achievedAt: string
}

export interface TornadoEndResponse {
  record: TornadoRecord
  userStatsUpdate?: UserStatsUpdate
}

// --- END TORNADO --

export interface TowerPositionEntry {
  FEN_0: string
  rating: number
  bot_color: 'w' | 'b'
  solution_moves: string
  Moves?: string
  absoluteIndex?: number
  fen_final?: string
  avg_rating?: number
  engm_rating?: number
  puzzle_theme?: string
  engm_type?: string
}

export interface TowerResultEntry {
  date?: string
  username: string
  time_in_seconds: number
  lichess_id: string
  record_timestamp_ms?: number
}

export type WebhookSuccessResponse<T> = T | null

export interface PuzzleResultEntry {
  username: string
  lichess_id: string
  time_in_seconds: number
  record_timestamp_ms: number
}

export interface GetFinishHimPuzzleDto {
  engm_type?: TowerTheme
}

export interface UpdateFinishHimStatsDto {
  PuzzleId: string
  success: boolean
  solved_in_seconds?: number
  bw_value: number
}

export type TowerMode = 'tactical' | 'positional'

export interface GetNewTowerDto {
  tower_type: TowerId
  tower_theme: TowerTheme
  tower_mode?: TowerMode
}
export interface SaveTowerRecordDto {
  username: string
  tower_id: string
  tower_type: TowerId
  time_in_seconds: number
  isNewRecord?: boolean
  success: boolean
  bw_value_total: number
}

export interface SubmitTacticalResultDto {
  PuzzleId: string
  Rating: number
  Themes_PG: string[]
  success: boolean
}

export type TacticalLevel = 'easy' | 'normal' | 'hard'
export interface GetTacticalPuzzleDto {
  tactical_level: TacticalLevel
}

export interface GamePuzzle {
  PuzzleId: string
  FEN_0: string
  Moves: string
  Rating: number
  rating?: number
  Themes?: string
  puzzle_theme?: string
  solve_time?: number
  bw_value?: number
  mc_value?: number
  num_pieces?: number
  eval?: number
  EndgameType?: string
  fen_final?: string
  endgame_results?: PuzzleResultEntry[]
  Themes_PG?: string[]
  engm_type?: TowerTheme | null
  difficulty_level?: string | null
}

export interface TacticalThemeStat {
  rating: number
  total_attempts: number
  solved: number
  failed: number
  last_activity: string | null
}

export interface TacticalTrainerStats {
  global_rating: number
  theme_stats: Record<string, TacticalThemeStat>
  UserStatsUpdate?: UserStatsUpdate
}

export interface TowerData {
  tower_id: string
  tower_type: TowerId
  tower_theme: TowerTheme
  tower_mode?: TowerMode
  bw_value_total: number
  average_rating: number
  positions: TowerPositionEntry[]
  tower_results: TowerResultEntry[] | null
}
export interface TournamentInfo {
  name: string
  url: string
  date: string
}
export interface MedalDetail {
  count: number
  tournaments: TournamentInfo[]
}
export interface Medals {
  gold: MedalDetail
  silver: MedalDetail
  bronze: MedalDetail
}

export interface ClubLeader {
  id: string
  name: string
  flair?: string
  title?: string
}

export interface FinishHimLeaderboardEntry {
  rank: number
  username: string
  lichess_id: string
  best_time: number
  days_old: number
  puzzle_id: string
  subscriptionTier?: string
}

export interface TowerLeaderboardEntry {
  rank: number
  tower_id: string
  username: string
  best_time: number
  days_old: number
  lichess_id: string
  subscriptionTier?: string
}

export interface TornadoLeaderboardEntry {
  rank: number
  username: string
  lichess_id: string
  highScore: number
  days_old: number
  subscriptionTier?: string
}

export interface WorktableLeaderboards {
  towerLeaderboards: { [key in TowerId]?: TowerLeaderboardEntry[] }
  finishHimLeaderboard: FinishHimLeaderboardEntry[]
}

export type SkillPeriod = '7' | '14' | '21' | '30'

export interface LeaderboardApiResponse extends WorktableLeaderboards {
  overallSkillLeaderboard: OverallSkillLeaderboardEntry[]
  skillStreakLeaderboard: SkillStreakLeaderboardEntry[]
  skillStreakMegaLeaderboard: SkillStreakLeaderboardEntry[]
  topTodayLeaderboard: OverallSkillLeaderboardEntry[]
  tornadoLeaderboard?: { [key in TornadoMode]?: TornadoLeaderboardEntry[] }
}

export interface SkillByMode {
  finishHim: number
  tower: number
  tacticalTrainer: number
  tornado: number
}

export interface OverallSkillLeaderboardEntry {
  lichess_id: string
  username: string
  subscriptionTier: string
  total_skill: number
  skill_by_mode: SkillByMode
}

export interface SkillStreakLeaderboardEntry {
  lichess_id: string
  username: string
  current_streak: number
  subscriptionTier: string
  total_skill: number
  skill_by_mode: SkillByMode
}

export interface PersonalOverallSkillPeriod {
  lichess_id: string
  username: string
  subscriptionTier: string
  total_skill: number
  skill_by_mode: SkillByMode
}

export type PersonalOverallSkillResponse = Record<
  '7_days' | '14_days' | '21_days' | '30_days',
  PersonalOverallSkillPeriod
>

export interface DailySkillSummary {
  date: string // "YYYY-MM-DD"
  total_skill: number
  skill_by_mode: SkillByMode
}

export interface PersonalSkillStreakResponse {
  lichess_id: string
  username: string
  current_streak: number
  daily_summary: DailySkillSummary[]
}

export interface TelegramBindingUrlResponse {
  bindingUrl: string
}

export interface ActivityModeStats {
  puzzles_requested: number
  puzzles_solved: number
  skill_value: number
}

export interface ActivityPeriodStats {
  tower: ActivityModeStats
  finishHim: ActivityModeStats
  tornado: ActivityModeStats
}

export interface PersonalActivityStatsResponse {
  daily: ActivityPeriodStats
  weekly: ActivityPeriodStats
  monthly: ActivityPeriodStats
}

export type SubscriptionTier =
  | 'none'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'administrator'

export interface LichessUserProfile {
  id: string
  username: string
  email?: string
  perfs?: Record<string, { rating: number; prog: number; games: number }>
  createdAt?: number
  profile?: {
    firstName?: string
    lastName?: string
    bio?: string
    country?: string
    location?: string
  }
}

export interface TowerAttempt {
  versuch: number
  tower_id: string
  best_time: number
}
export type TowerStats = { [key: string]: TowerAttempt[] }

export interface PuzzlesSolvedToday {
  tower: number
  finishHim: number
  tacticalTrainer: number
  tornado: number
  total: number
}

export interface SkillEarnedToday {
  tower: number
  finishHim: number
  tacticalTrainer: number
  tornado: number
  total: number
}

export interface TodayActivity {
  puzzles_solved_today: PuzzlesSolvedToday
  skill_earned_today: SkillEarnedToday
}

export interface UserStatsUpdate {
  id: string
  username: string
  FunCoins: number
  tornadoHighScores?: {
    blitz?: number
    rapid?: number
    bullet?: number
    classic?: number
  }
}

export interface GameResultResponse {
  status: string
  message?: string
  UserStatsUpdate?: UserStatsUpdate
}

export interface UserSessionProfile extends LichessUserProfile {
  FunCoins: number
  subscriptionTier: SubscriptionTier
  validatedAt?: number
  telegram_id?: string | null
  TierExpire?: string | null
  endgame_skill: number
  today_activity?: TodayActivity
  finishHimRating?: { rating: number }
  tornadoHighScores?: {
    blitz?: number
    rapid?: number
    bullet?: number
    classic?: number
  }
}

export interface AuthState {
  isAuthenticated: boolean
  userProfile: UserSessionProfile | null
  isProcessing: boolean
  error: string | null
}

// --- Funclub API Types ---
export interface FunclubLeader {
  id: string
  name: string
  flair?: string
  title?: string
}

export interface FunclubMeta {
  clubId: string
  name: string
  flair: string
  description: string
  leader: FunclubLeader
  leaders: FunclubLeader[]
  nbMembers: number
  reportPeriodStart: string
  reportPeriodEnd: string
}

export interface TeamBattlePlayerSummary {
  lichess_id: string
  username: string
  tournaments_played: number
  total_score: number
  total_games_played: number
  total_wins: number
  total_losses: number
  total_draws: number
  total_berserk_wins: number
  max_longest_win_streak_ever: number
  medals_in_team: Medals
  medals_in_arena: Medals
  win_rate: number
  vector: number
  flair?: string
  arenas_report?: ArenaReport[]
}

export interface ArenaReport {
  startsAt: string
  win_streak: number
  rank_in_club: number
  points_scored: number
  rank_in_arena: number
  tournament_url: string
  berserks_scored: number
  tournament_name: string
}

export interface CalculatedPlayerStats {
  gamesPlayed: number
  pointsTotal: number
  wins: number
  losses: number
  draws: number
  berserkWins: number
  longestWinStreak: number
}

export interface TournamentPlayer {
  rank_in_club: number
  rank_in_arena: number
  username: string
  lichess_id: string
  rating: number
  performance: number
  scores: string
  isScoringPlayer: boolean
  flair?: string
  calculatedStats: CalculatedPlayerStats
}

export interface TeamBattlePlayedArena {
  arena_id: string
  tournament_name: string
  tournament_url: string
  startsAt: string
  club_in_arena_rank: number
  players_in_arena: TournamentPlayer[]
}

export interface MedalsReportUser {
  username: string
  medals: Medals
}

export interface TeamBattleReport {
  players_summary: TeamBattlePlayerSummary[]
  played_arenas: TeamBattlePlayedArena[]
  medals_report: {
    user_in_arena_medals: MedalsReportUser[]
    user_in_club_medals: MedalsReportUser[]
  }
}

// --- НАЧАЛО ИЗМЕНЕНИЙ ---
// Types for the latest battle report
export interface LatestBattleMedals {
  gold: string
  silver: string
  bronze: string
}

export interface LatestBattleTeamStats {
  total_games: number
  total_score: number
  players_count: number
  win_rate_percent: number
  rank_in_tournament: number
}

export interface LatestBattleNomination {
  value: number
  username: string
}

export interface LatestBattleNominations {
  berserker: LatestBattleNomination
  performer: LatestBattleNomination
  workhorse: LatestBattleNomination
  win_streaker: LatestBattleNomination
}

export interface LatestBattlePlayer {
  rank: number
  games: number
  score: number
  username: string
  performance: number
}

export interface LatestBattleTournamentInfo {
  url: string
  name: string
}

export interface LatestTeamBattleReport {
  medals: LatestBattleMedals
  team_stats: LatestBattleTeamStats
  nominations: LatestBattleNominations
  players_table: LatestBattlePlayer[]
  tournament_info: LatestBattleTournamentInfo
}
// --- КОНЕЦ ИЗМЕНЕНИЙ ---

// --- Типы для детальной статистики в кабинете пользователя ---
export interface ThemeStatsDto {
  rating: number
  solved: number
  attempted: number
  accuracy: number
}

export type ModeStatsDto = Record<string, ThemeStatsDto> // Ключ - название темы
export type TimedModeStatsDto = Record<string, ModeStatsDto> // Ключ - bullet, blitz и т.д.

export type UntimedModeStatsDto = Record<string, ThemeStatsDto> // Ключ - название темы

export interface DetailedStatsResponse {
  tornadoStats: ModeStatsDto
  endgameStats: UntimedModeStatsDto
}