// src/utils/theme-mapper.ts

export const THEME_KEY_MAP: Record<string, string> = {
  // --- Special ---
  auto: 'auto',

  // --- Tactical (15) ---
  fork: 'fork',
  pin: 'pin',
  attraction: 'attraction',
  discoveredAttack: 'discovered_attack',
  deflection: 'deflection',
  skewer: 'skewer',
  promotion: 'promotion',
  trappedPiece: 'trapped_piece',
  quietMove: 'quiet_move',
  clearance: 'clearance',
  capturingDefender: 'capturing_defender',
  backRankMate: 'back_rank_mate',
  interference: 'interference',
  xRayAttack: 'x_ray_attack',
  doubleCheck: 'double_check',

  // --- Advanced/Endgame Unified ---
  pawn_endgame: 'pawn_endgame',
  knight_endgame: 'knight_endgame',
  bishop_endgame: 'bishop_endgame',
  rook_endgame: 'rook_endgame',
  queen_endgame: 'queen_endgame',
  knight_vs_bishop: 'knight_vs_bishop',
  rook_pawn_endgame: 'rook_pawn_endgame',
  rook_pieces_endgame: 'rook_pieces_endgame',
  queen_pieces_endgame: 'queen_pieces_endgame',
  expert_endgame: 'expert_endgame',

  // --- Practical ---
  extra_pawn: 'extra_pawn',
  material_equality: 'material_equality',
  exchange: 'exchange',

  // --- Legacy Mappings (Backward Compatibility) ---
  pawn: 'pawn_endgame',
  knight: 'knight_endgame',
  bishop: 'bishop_endgame',
  rookPawn: 'rook_pawn_endgame',
  queen: 'queen_endgame',
  knightBishop: 'knight_vs_bishop',
  rookPieces: 'rook_pieces_endgame',
  queenPieces: 'queen_pieces_endgame',
  expert: 'expert_endgame',
  pawnEndgame: 'pawn_endgame',
  knightEndgame: 'knight_endgame',
  bishopEndgame: 'bishop_endgame',
  rookEndgame: 'rook_endgame',
  queenEndgame: 'queen_endgame',
}

export const getThemeTranslationKey = (theme: string): string => {
  return THEME_KEY_MAP[theme] || theme
}
