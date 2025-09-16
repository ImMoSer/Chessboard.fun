// src/types/api.types.ts

// --- Engine and Gameplay Types ---
export type EngineId =
  | 'SF_1600'
  | 'SF_1700'
  | 'SF_1900'
  | 'SF_2100'
  | 'SF_2200'
  | 'MOZER_1900+'

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

// --- END TORNADO ---

export interface TowerPositionEntry {
  FEN_0: string
  rating: number
  bot_color: 'w' | 'b'
  solution_moves: string
  absoluteIndex?: number
  fen_final?: string
  avg_rating?: number
  engm_rating?: number
  puzzle_theme?: string
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

export interface GetNewTowerDto {
  tower_type: TowerId
  tower_theme: TowerTheme
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
export interface AttackRecordDto {
  username: string
  PuzzleId: string
  time_in_seconds: number
  success: boolean
  bw_value: number
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
  solve_time?: number
  bw_value?: number
  fen_final?: string
  endgame_results?: PuzzleResultEntry[]
  attack_results?: PuzzleResultEntry[]
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
export interface AttackLeaderboardEntry {
  rank: number
  username: string
  best_time: number
  days_old: number
  puzzle_id: string
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
  attackLeaderboard?: AttackLeaderboardEntry[]
}

export type SkillPeriod = '7' | '14' | '21' | '30'

export interface LeaderboardApiResponse extends WorktableLeaderboards {
  overallSkillLeaderboard: OverallSkillLeaderboardEntry[]
  skillStreakLeaderboard: SkillStreakLeaderboardEntry[]
  topTodayLeaderboard: OverallSkillLeaderboardEntry[]
  tornadoLeaderboard?: { [key in TornadoMode]?: TornadoLeaderboardEntry[] }
}

export interface SkillByMode {
  finishHim: number
  attack: number
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
  attack: ActivityModeStats
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
export interface AttackStat {
  PuzzleId: string
  best_time: number
}

export interface PuzzlesSolvedToday {
  tower: number
  attack: number
  finishHim: number
  tacticalTrainer: number
  tornado: number
  total: number
}

export interface SkillEarnedToday {
  tower: number
  attack: number
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
  endgame_skill: number
  attack_skill: number
  today_activity: TodayActivity
  attackRating?: { rating: number }
  finishHimRating?: { rating: number }
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
  attack_skill: number
  today_activity?: TodayActivity
  attackRating?: { rating: number }
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

// --- НАЧАЛО ИЗМЕНЕНИЙ: Исправлен интерфейс TournamentPlayer ---
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
// --- КОНЕЦ ИЗМЕНЕНИЙ ---

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
