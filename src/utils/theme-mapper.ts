// src/utils/theme-mapper.ts

/**
 * Returns the translation key for a given theme.
 * Handles mapping from backend/legacy keys to frontend localization keys.
 */
export const getThemeTranslationKey = (theme: string): string => {
  // Aliases for cleaner keys or legacy support
  const aliases: Record<string, string> = {
    // Basic Endgames
    'pawnEndgame': 'pawn',
    'knightEndgame': 'knight',
    'bishopEndgame': 'bishop',
    'rookEndgame': 'rook',
    'queenEndgame': 'queen',

    // Composite / Specific
    'knightVsBishop': 'knightBishop',
    'rookVsPawn': 'rookPawn',
    // Add more aliases here if backend sends different casing/naming
  }

  return aliases[theme] || theme
}
