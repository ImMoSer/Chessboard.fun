// src/types/api.types.ts

// --- Engine and Gameplay Types ---
export type EngineId =
  | 'SF_2200'
  | 'MOZER_1900'
  | 'MOZER_2000'
  | 'maia_2200'

export type Color = 'white' | 'black'



// --- TORNADO MODE ---
export type TornadoMode = 'bullet' | 'blitz' | 'rapid' | 'classic'

export const TORNADO_THEMES = [
  'fork',
  'pin',
  'attraction',
  'discoveredAttack',
  'deflection',
  'skewer',
  'promotion',
  'trappedPiece',
  'quietMove',
  'clearance',
  'capturingDefender',
  'backRankMate',
  'interference',
  'xRayAttack',
  'doubleCheck',
] as const

export type TornadoTheme = (typeof TORNADO_THEMES)[number]

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
  sessionRating: number
  ratingDelta: number
  nextPuzzle: GamePuzzle
  updatedThemeRatings?: Record<string, ThemeRating>
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

// --- ADVANTAGE MODE (Finish Him) ---
export type AdvantageMode = TornadoMode // Reuse TornadoMode as they share the same 'time control' concept

export const ADVANTAGE_THEMES = [
  'pawn',
  'queen',
  'bishop',
  'knight',
  'rookPawn',
  'rookPieces',
  'queenPieces',
  'knightBishop',
  'expert',
] as const

export type AdvantageTheme = (typeof ADVANTAGE_THEMES)[number]

export type AdvantageDifficulty = 'Novice' | 'Pro' | 'Master'

export interface AdvantageResultDto {
  puzzleId: string
  wasCorrect: boolean
}
// --- END ADVANTAGE MODE ---
// --- THEORY ENDINGS MODE ---
export const THEORY_ENDING_CATEGORIES = [
  'bishop',
  'knight',
  'knightBishop',
  'pawn',
  'queen',
  'rookPawn',
  'rookPieces',
] as const

export type TheoryEndingCategory = (typeof THEORY_ENDING_CATEGORIES)[number]

export type TheoryEndingDifficulty = 'Novice' | 'Pro' | 'Master'

export type TheoryEndingType = 'win' | 'draw'

export interface TheoryEndingPuzzle extends GamePuzzle {
  id: string
  fen: string
  bw_value: number
  category: TheoryEndingCategory
  difficulty: TheoryEndingDifficulty
  side_to_move: 'white' | 'black'
  weak_side: 'white' | 'black' | 'even'
  only_move: boolean
  type: TheoryEndingType
}

export interface TheoryEndingResultDto {
  puzzleId: string
  wasCorrect: boolean
}

export interface TheoryEndingStatItem {
  requested: number
  success: number
}

export interface UserTheoryEndingStatsDto {
  userId: string
  stats: Record<string, TheoryEndingStatItem>
  history: string[]
}
// --- END THEORY ENDINGS ---

// --- PRACTICAL CHESS MODE ---
export const PRACTICAL_CHESS_CATEGORIES = [
  'extra_pawn',
  'material_equality',
] as const

export type PracticalChessCategory = (typeof PRACTICAL_CHESS_CATEGORIES)[number]

export type PracticalChessDifficulty = 'Novice' | 'Pro' | 'Master'

export interface PracticalChessPuzzle extends GamePuzzle {
  puzzle_id: string
  fen_0: string
  winner: 'white' | 'black'
  difficulty: PracticalChessDifficulty
  bw_value?: number
  count_pieces?: number
  eval?: number
  category: PracticalChessCategory
}

export interface PracticalChessResultDto {
  puzzleId: string
  wasCorrect: boolean
}

export interface PracticalChessStatItem {
  puzzles_attempted: number
  puzzles_solved: number
  category: PracticalChessCategory
}
// --- END PRACTICAL CHESS ---



export type WebhookSuccessResponse<T> = T | null

export interface PuzzleResultEntry {
  username: string
  lichess_id: string
  time_in_seconds: number
  record_timestamp_ms: number
}



export interface UpdateFinishHimStatsDto {
  PuzzleId: string
  success: boolean
  solved_in_seconds?: number
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

export interface AdvantageLeaderboardEntry {
  rank: number
  username: string
  lichess_id: string
  score: number
  days_old: number
  subscriptionTier?: string
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
  engm_type?: AdvantageTheme | null
  difficulty_level?: string | null
  engmRating?: number
  EngmThemes_PG?: string
  difficulty?: string
  engmMap?: string
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



export interface TornadoLeaderboardEntry {
  rank: number
  username: string
  lichess_id: string
  highScore: number
  days_old: number
  subscriptionTier?: string
}

export interface WorktableLeaderboards {
  finishHimLeaderboard: FinishHimLeaderboardEntry[]
  advantageLeaderboard?: Record<string, AdvantageLeaderboardEntry[]>
  theoryLeaderboard?: Record<string, AdvantageLeaderboardEntry[]>
  practicalLeaderboard?: Record<string, AdvantageLeaderboardEntry[]>
}

export type SkillPeriod = '7' | '14' | '21' | '30'

export interface LeaderboardApiResponse extends WorktableLeaderboards {
  overallSkillLeaderboard: OverallSolvedLeaderboardEntry[]
  skillStreakLeaderboard: SolveStreakLeaderboardEntry[]
  skillStreakMegaLeaderboard: SolveStreakLeaderboardEntry[]
  topTodayLeaderboard: OverallSolvedLeaderboardEntry[]
  tornadoLeaderboard?: { [key in TornadoMode]?: TornadoLeaderboardEntry[] }
}

export interface SolvedByMode {
  advantage: number
  tacticalTrainer: number
  tornado: number
  theory: number
  'practical-chess': number
}

export interface OverallSolvedLeaderboardEntry {
  lichess_id: string
  username: string
  subscriptionTier: string
  total_solved: number
  total_score?: number
  solved_by_mode: SolvedByMode
}

export interface SolveStreakLeaderboardEntry {
  lichess_id: string
  username: string
  current_streak: number
  subscriptionTier: string
  total_solved: number
  total_score?: number
  solved_by_mode: SolvedByMode
}

export interface PersonalOverallSolvedPeriod {
  lichess_id: string
  username: string
  subscriptionTier: string
  total_solved: number
  solved_by_mode: SolvedByMode
}

export type PersonalOverallSolvedResponse = Record<
  '7_days' | '14_days' | '21_days' | '30_days',
  PersonalOverallSolvedPeriod
>

export interface DailySolvedSummary {
  date: string // "YYYY-MM-DD"
  total_solved: number
  solved_by_mode: SolvedByMode
}

export interface PersonalSolveStreakResponse {
  lichess_id: string
  username: string
  current_streak: number
  daily_summary: DailySolvedSummary[]
}

export interface TelegramBindingUrlResponse {
  bindingUrl: string
}

export interface ActivityModeStats {
  puzzles_requested: number
  puzzles_solved: number
}

export interface ActivityPeriodStats {
  advantage: ActivityModeStats
  tornado: ActivityModeStats
  theory: ActivityModeStats
  'practical-chess': ActivityModeStats
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



export interface PuzzlesSolvedToday {
  advantage: number
  tacticalTrainer: number
  tornado: number
  theory: number
  'practical-chess': number
  total: number
}

export interface TodayActivity {
  puzzles_solved_today: PuzzlesSolvedToday
}

export interface UserStatsUpdate {
  id: string
  username: string
  FunCoins: number
  today_activity?: TodayActivity
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

export interface TornadoThemeStatDto {
  theme: string
  success: number
  requested: number
  rating: number
}

export interface TornadoProfileDto {
  highScores: {
    bullet: number
    blitz: number
    rapid: number
    classic: number
  }
  modes: {
    bullet: TornadoThemeStatDto[]
    blitz: TornadoThemeStatDto[]
    rapid: TornadoThemeStatDto[]
    classic: TornadoThemeStatDto[]
  }
}

export interface AdvantageThemeStatDto {
  theme: string
  rating: number
  success: number
  requested: number
}

export interface AdvantageProfileDto {
  themes: AdvantageThemeStatDto[]
  stats: Record<string, { requested: number; success: number }>
}

export interface TheoryEndingProfileDto {
  stats: Record<string, { requested: number; success: number }>
}

export interface PracticalChessProfileDto {
  stats: PracticalChessStatItem[]
}



export interface UserProfileStatsDto {
  tornado: TornadoProfileDto
  advantage: AdvantageProfileDto
  theory: TheoryEndingProfileDto
  practical: PracticalChessProfileDto
}
