export interface TheoryMove {
  uci: string
  san: string
  total: number
  w_pct: number // Win percentage (0-100)
  d_pct: number // Draw percentage (0-100)
  l_pct: number // Loss percentage (0-100)
  perf: number  // Performance rating
}

export interface SessionMove {
  fen: string
  moveUci: string
  san: string
  phase: 'theory' | 'playout'

  // PGN Context
  ply?: number
  turn?: 'w' | 'b'
  moveNumber?: number

  stats?: TheoryMove

  // Session metrics
  accuracy?: number
  winRate?: number
  popularity?: number
  rating?: number

  // Client-side move assessment
  quality?: 'blunder' | 'mistake' | 'inaccuracy' | 'good' | 'great' | 'best' | 'brilliant' | 'interesting'
  nag?: string
  tags?: string[]

  // Playout evaluation (New Mozer API)
  evaluation?: {
    score_cp: number
    win_prob: number
    wdl?: number[] // [win, draw, loss]
    best_move?: string
    best_move_san?: string
    pv_uci?: string[]
    pv_san?: string
    depth: number
    lines?: Array<{
      pv: string
      pv_san: string
      cp: number
      win_prob: number
      wdl?: number[]
    }>
  }
}
