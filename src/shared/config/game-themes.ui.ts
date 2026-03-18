export interface ChessCategoryUi {
  icon?: string
  svg?: string
}

export const CHESS_CATEGORY_UI: Record<string, ChessCategoryUi> = {
  // Common Endgames
  pawn: { icon: '♔♟' },
  bishop: { icon: '♗♙' },
  knight: { icon: '♘♙' },
  queen: { icon: '♕♙' },
  rook: { icon: '♖' },
  rookPawn: { icon: '♖♙' },
  knightBishop: { icon: '♘♗' },
  rookPieces: { icon: '♖♘♗' },
  queenPieces: { icon: '♕♘♗' },

  // Practical Chess Specific
  extraPawn: { icon: '♟️' },
  materialEquality: { icon: '⚖️' },
  exchange: { icon: '🔄' },

  // Finish Him Specific
  auto: { icon: '✨' },
  expert: { svg: '/svg/crown-svgrepo-com.svg' },
}
