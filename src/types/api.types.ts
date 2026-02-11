// src/types/api.types.ts

// --- Engine and Gameplay Types ---
export type EngineId = 'SF_2200' | 'MOZER_1900' | 'MOZER_2000' | 'maia_2200'

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
  puzzle: TornadoPuzzle
  sessionId: string
  sessionRating: number
  sessionTheme?: string
}

export interface TornadoNextResponse {
  sessionRating: number
  ratingDelta: number
  nextPuzzle: TornadoPuzzle
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
  'extraPawn',
  'materialEquality',
  'exchange',
  'rook',
  'pawn',
  'knightBishop',
  'bishop',
  'knight',
  'queen',
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

export interface PracticalStats {
  user_id: string
  category: PracticalChessCategory
  difficulty: PracticalChessDifficulty
  puzzles_solved: number
  puzzles_attempted: number
}
// --- END PRACTICAL CHESS ---

export type WebhookSuccessResponse<T> = T | null

export interface PuzzleResultEntry {
  username: string
  lichess_id: string
  time_in_seconds: number
  record_timestamp_ms: number
}



export interface AdvantageLeaderboardEntry {
  rank: number
  username: string
  lichess_id: string
  score: number
  days_old: number
  subscriptionTier?: string
}

export interface TornadoPuzzle {
  puzzle_id: string
  initial_fen: string
  tactical_solution: string
  tactical_rating: number
  themes: string[]
}

export interface FinishHimPuzzle {
  puzzle_id: string
  initial_fen: string
  tactical_solution: string
  eval: number
  material_count: number
  material_advantage: number
  pieces_count: number
  engm_rating: number
  difficulty: string
  tactical_rating: number
  category: string
  sub_category?: string
}

export interface PracticalPuzzle {
  puzzle_id: string
  initial_fen: string
  winner: string
  difficulty: string
  material_count: number
  pieces_count: number
  eval: number
  category: string
}

export interface TheoryPuzzle {
  puzzle_id: string
  initial_fen: string
  weak_side: string
  pieces_count: number
  material_count: number
  category: string
  only_move: boolean
  difficulty: string
  result: string
}

export interface GamePuzzle {
  PuzzleId: string
  id?: string
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
  theme_key?: string
  meta?: {
    theme_key: string
    [key: string]: unknown
  }
  // New unified fields (optional adapters for compatibility)
  puzzle_id?: string
  initial_fen?: string
  tactical_solution?: string
  winner?: string // for Practical
  weak_side?: string // for Theory
  result?: string // for Theory
}

export type PuzzleUnion = TornadoPuzzle | FinishHimPuzzle | PracticalPuzzle | TheoryPuzzle | GamePuzzle



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
  finishHimLeaderboard?: FinishHimLeaderboardEntry[]
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

export type SubscriptionTier = 'Pawn' | 'Knight' | 'Bishop' | 'Rook' | 'Queen' | 'King' | 'administrator'

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
  stats: Record<string, { requested: number; success: number }>
}

export interface UserProfileStatsDto {
  tornado: TornadoProfileDto
  advantage: AdvantageProfileDto
  theory: TheoryEndingProfileDto
  practical: PracticalChessProfileDto
}
