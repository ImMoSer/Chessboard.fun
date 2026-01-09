// src/utils/theme-mapper.ts

export const THEME_KEY_MAP: Record<string, string> = {
  // --- Special ---
  auto: 'auto',

  // --- Tornado Themes (15) ---
  fork: 'fork',
  pin: 'pin',
  attraction: 'attraction',
  discoveredAttack: 'discoveredAttack',
  deflection: 'deflection',
  skewer: 'skewer',
  promotion: 'promotion',
  trappedPiece: 'trappedPiece',
  quietMove: 'quietMove',
  clearance: 'clearance',
  capturingDefender: 'capturingDefender',
  backRankMate: 'backRankMate',
  interference: 'interference',
  xRayAttack: 'xRayAttack',
  doubleCheck: 'doubleCheck',

  // --- Advantage Themes (20) ---
  opColBishopPlus: 'opColBishopPlus',
  twoMinorsVsRook: 'twoMinorsVsRook',
  queenVsBishop: 'queenVsBishop',
  queenVsKnight: 'queenVsKnight',
  queenVsQueen: 'queenVsQueen',
  queenVsPawns: 'queenVsPawns',
  rookVsKnight: 'rookVsKnight',
  queenVsRook: 'queenVsRook',
  knightVsKnight: 'knightVsKnight',
  opColBishop: 'opColBishop',
  rookVsRook: 'rookVsRook',
  bishopVsBishop: 'bishopVsBishop',
  bishopVsPawns: 'bishopVsPawns',
  complexEndgame: 'complexEndgame',
  rookVsBishop: 'rookVsBishop',
  knightVsPawns: 'knightVsPawns',
  knightVsBishop: 'knightVsBishop',
  pawnEndgame: 'pawnEndgame',
  bishopVsKnight: 'bishopVsKnight',
  rookVsPawns: 'rookVsPawns',
  pawn: 'pawn',
  queen: 'queen',
  bishop: 'bishop',
  knight: 'knight',
  rookPawn: 'rookPawn',
  rookPieces: 'rookPieces',
  queenPieces: 'queenPieces',
  knightBishop: 'knightBishop',
  expert: 'expert',
}

export const getThemeTranslationKey = (theme: string): string => {
  return THEME_KEY_MAP[theme] || theme
}
