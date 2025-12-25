// src/services/OpeningGraphService.ts
import logger from '../utils/logger';

interface GraphMoveData {
  n?: string; // Name
  c?: string; // ECO Code
  next: string; // Target Clean FEN
}

// Key is Clean FEN
type OpeningBook = Record<string, Record<string, GraphMoveData>>;

class OpeningGraphService {
  private book: OpeningBook | null = null;
  private isLoading = false;
  private loadingPromise: Promise<void> | null = null;

  async loadBook(): Promise<void> {
    if (this.book) return;
    if (this.isLoading && this.loadingPromise) return this.loadingPromise;

    this.isLoading = true;
    this.loadingPromise = (async () => {
      try {
        const res = await fetch('/openings_full_graph/openings_full_graph.json');
        if (!res.ok) throw new Error(`Failed to load opening graph: ${res.statusText}`);
        this.book = await res.json();
        logger.info('[OpeningGraphService] Book loaded successfully.');
      } catch (err) {
        logger.error('[OpeningGraphService] Error loading book:', err);
        this.book = null;
      } finally {
        this.isLoading = false;
        this.loadingPromise = null;
      }
    })();

    return this.loadingPromise;
  }

  getMoves(fen: string): { uci: string, name?: string, eco?: string, nextFen: string }[] {
    if (!this.book) return [];

    const cleanFen = this.toCleanFen(fen);
    const movesData = this.book[cleanFen];

    if (!movesData) return [];

    return Object.entries(movesData).map(([uci, data]) => ({
      uci,
      name: data.n,
      eco: data.c,
      nextFen: data.next
    }));
  }

  /**
   * Converts a standard FEN to the "Clean FEN" format used as keys in the graph.
   * Removes halfmove and fullmove counters.
   * Example: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
   *       -> "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -"
   */
  private toCleanFen(fen: string): string {
    return fen.split(' ').slice(0, 4).join(' ');
  }

  isBookLoaded(): boolean {
    return !!this.book;
  }
}

export const openingGraphService = new OpeningGraphService();
