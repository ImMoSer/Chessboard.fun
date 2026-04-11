// src/types/api.types.ts

// --- Engine and Gameplay Types ---
export type EngineId = 'SF_2200' | 'maia-1900' | 'maia-2200' | 'badgyal-8' | 'elite_2400'

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


export interface TornadoSessionResult {
  puzzleId: string
  puzzleRating: number
  puzzleThemes: string[]
  isCorrect: boolean
}

export interface TornadoEndSessionDto {
  sessionId: string
  finalScore: number
  results: TornadoSessionResult[]
}

export interface TornadoStartResponse {
  puzzles: TornadoPuzzle[]
  sessionId: string
  sessionRating: number
  sessionTheme?: string
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

// --- FINISH HIM MODE ---

export const FINISH_HIM_THEMES = [
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

export type FinishHimTheme = (typeof FINISH_HIM_THEMES)[number]

export type FinishHimDifficulty = 'Novice' | 'Pro' | 'Master'

export interface FinishHimResultDto {
  puzzleId: string
  wasCorrect: boolean
}
// --- END FINISH HIM MODE ---
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
export interface TheoryEndingResultDto {
  puzzleId: string
  wasCorrect: boolean
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
export interface PracticalChessResultDto {
  puzzleId: string
  wasCorrect: boolean
}


// --- END PRACTICAL CHESS ---

export interface PuzzleResultEntry {
  username: string
  lichess_id: string
  time_in_seconds: number
  record_timestamp_ms: number
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
  rating?: number
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
  rating?: number
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
  themes?: string[]
  engm_type?: FinishHimTheme | null
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
  tactical_rating?: number
  winner?: string // for Practical
  weak_side?: string // for Theory
  result?: string // for Theory
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

export interface ThematicLeaderboardEntry {
  rank: number
  username: string
  lichess_id: string
  score: number
  days_old: number
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

interface WorktableLeaderboards {
  finishHimLeaderboard?: Record<string, FinishHimLeaderboardEntry[]>
  theoryLeaderboard?: Record<string, ThematicLeaderboardEntry[]>
  practicalLeaderboard?: Record<string, ThematicLeaderboardEntry[]>
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
  finish_him: number
  tornado: number
  theory: number
  'practical-chess': number
  tacticalTrainer?: number
  speedrun?: number
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

interface ActivityModeStats {
  puzzles_requested: number
  puzzles_solved: number
}

export interface ActivityPeriodStats {
  finish_him: ActivityModeStats
  tornado: ActivityModeStats
  theory: ActivityModeStats
  'practical-chess': ActivityModeStats
  rep_generator: ActivityModeStats
  'diamond-hunter': ActivityModeStats
  'opening-sparring': ActivityModeStats
  'study-reply'?: ActivityModeStats
  speedrun?: ActivityModeStats
}

export interface PersonalActivityStatsResponse {
  daily: ActivityPeriodStats
  weekly: ActivityPeriodStats
  monthly: ActivityPeriodStats
}

export type SubscriptionTier =
  | 'Pawn'
  | 'Knight'
  | 'Bishop'
  | 'Rook'
  | 'Queen'
  | 'King'
  | 'administrator'

interface LichessUserProfile {
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

interface PuzzlesSolvedToday {
  finish_him: number
  tornado: number
  theory: number
  'practical-chess': number
  tacticalTrainer?: number
  total: number
}

export interface TodayActivity {
  puzzles_solved_today: PuzzlesSolvedToday
}

export interface UserStatsUpdate {
  id?: string
  username?: string
  PawnCoins: number
  dailyLimit?: number
  spentToday?: number
  today_activity?: TodayActivity
  finish_him?: FinishHimProfileDto
  tornado?: TornadoProfileDto
  theory?: TheoryEndingProfileDto
  theory_win?: TheoryEndingProfileDto
  theory_draw?: TheoryEndingProfileDto
  practical?: PracticalChessProfileDto
  tornadoHighScores?: {
    blitz?: number
    rapid?: number
    bullet?: number
    classic?: number
  }
}

export interface GameResultResponse {
  success: boolean
  status?: string
  message?: string
  ratingDelta?: number
  newRating?: number
  attempts?: number
  info?: string
  userStatsUpdate?: UserStatsUpdate
}

export interface UserSessionProfile extends LichessUserProfile {
  PawnCoins: number
  dailyLimit: number
  spentToday: number
  base_puzzle_rating: number
  subscriptionTier: SubscriptionTier
  activeTier?: SubscriptionTier
  polarTier?: SubscriptionTier | null
  isPolarCustomer?: boolean
  polarStatus?: string | null
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

interface TornadoThemeStatDto {
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

interface FinishHimThemeStatDto {
  theme: string
  rating: number
  success: number
  requested: number
}

export interface FinishHimProfileDto {
  modes: {
    Novice: FinishHimThemeStatDto[]
    Pro: FinishHimThemeStatDto[]
    Master: FinishHimThemeStatDto[]
  }
}

// Old AdvantageProfileDto for reference warning or removal?
// User said "example new structure", implying replacement.
// Let's comment out or remove the old one to force errors where it's used so we fix them.
// export interface AdvantageProfileDto { ... }

export interface TheoryEndingProfileDto {
  modes: Record<string, FinishHimThemeStatDto[]>
}

export interface PracticalChessProfileDto {
  modes: Record<string, FinishHimThemeStatDto[]>
}

export interface UserProfileStatsDto {
  tornado: TornadoProfileDto
  finish_him: FinishHimProfileDto
  theory_win: TheoryEndingProfileDto
  theory_draw: TheoryEndingProfileDto
  practical: PracticalChessProfileDto
}

export interface GameLaunchOptions {
  mode: 'theory' | 'theory_win' | 'theory_draw' | 'finish_him' | 'practical' | 'tornado'
  theme: string
  difficulty?: string
  type?: 'win' | 'draw'
  subMode?: string // For tornado (bullet, blitz...) or finish_him (novice, pro...)
}
