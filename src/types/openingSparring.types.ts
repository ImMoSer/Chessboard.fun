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
  quality?: 'blunder' | 'mistake' | 'inaccuracy' | 'good' | 'best' | 'brilliant'

  // Playout evaluation (Cevallite API)
  evaluation?: {
    score_cp: number
    wdl: {
      win: number
      draw: number
      loss: number
    }
    best_move: string
    best_move_san: string
    best_move_motifs?: string[]
    pv_uci: string[]
    pv_san: string // Formatted string from server
    depth: number
  }
  threats?: {
    opponent_threat_move: string
    opponent_threat_san: string
    threat_description: string | null
    threat_severity_score: number
    threat_motifs: string[]
  }
  features?: {
    mobility: {
      white: number
      black: number
    }
    king_safety: {
      square: string
      open_files: string[]
      pawn_shield: boolean
      ring_attackers: number
      is_safe_heuristic: boolean
    }
    pawn_structure: {
      passed_pawns: string[]
      isolated_pawns: string[]
      doubled_pawns: boolean
      chain_count: number
    }
    tactics: {
      pins: { piece: string; type: string }[]
      hanging_pieces: string[]
      underdefended_pieces: string[]
    }
    ascii: string
  }
}