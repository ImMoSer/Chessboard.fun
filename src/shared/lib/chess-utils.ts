/**
 * Normalizes UCI move notation, especially for castling.
 * Some systems use K-destination (e1g1), others use KxR (e1h1).
 * This utility helps in comparing them.
 */

export function normalizeUciMove(uci: string): string {
  if (!uci) return uci;

  // Standardize castling moves to KxR format if they match K-destination
  const castlingMap: Record<string, string> = {
    'e1g1': 'e1h1', // White kingside
    'e1c1': 'e1a1', // White queenside
    'e8g8': 'e8h8', // Black kingside
    'e8c8': 'e8a8', // Black queenside
  };

  return castlingMap[uci] || uci;
}

/**
 * Compares two UCI moves, taking into account different castling notations.
 */
export function areMovesEqual(move1: string, move2: string): boolean {
  return normalizeUciMove(move1) === normalizeUciMove(move2);
}
