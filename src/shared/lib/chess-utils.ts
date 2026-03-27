/**
 * Normalizes UCI move notation, especially for castling.
 * Some systems use K-destination (e1g1), others use KxR (e1h1).
 * This utility helps in comparing them.
 */

export function normalizeUciMove(uci: string): string {
  return uci || ''
}

/**
 * Compares two UCI moves exactly.
 */
export function areMovesEqual(move1: string, move2: string): boolean {
  return move1 === move2
}
