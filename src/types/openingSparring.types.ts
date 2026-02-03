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
  stats?: TheoryMove
  
  // Session metrics
  accuracy?: number
  winRate?: number
  popularity?: number
}
