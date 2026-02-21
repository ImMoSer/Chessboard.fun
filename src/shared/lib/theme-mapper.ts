export const getThemeTranslationKey = (theme: string): string => {
  // Aliases for cleaner keys or legacy support
  const aliases: Record<string, string> = {
    // Basic Endgames - mapping legacy or variant names to standard keys
    'knightEndgame': 'knight',
    'bishopEndgame': 'bishop',
    'rookEndgame': 'rook',
    'queenEndgame': 'queen',
    'knightVsBishop': 'knightBishop',
    'rookVsPawn': 'rookVsPawns', // Support legacy backend singular
  }

  return aliases[theme] || theme
}
