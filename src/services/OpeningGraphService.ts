// src/services/OpeningGraphService.ts
import logger from '../utils/logger';
import { slugify } from '../utils/slugify';

interface GraphMoveData {
  n?: string; // Name
  c?: string; // ECO Code
  next: string; // Target Clean FEN
}

// Key is Clean FEN
type OpeningBook = Record<string, Record<string, GraphMoveData>>;

export interface MajorOpening {
  name: string;
  eco?: string;
  moves: string[];
  slug: string;
}

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

  private simplifyName(name: string): string {
    return name.split(':')[0]!.trim();
  }

  getMajorOpenings(): MajorOpening[] {
    if (!this.book) return [];

    const openingsMap = new Map<string, MajorOpening>();
    const rootFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';

    // Helper to process a move
    const processMove = (name: string, eco: string | undefined, moves: string[]) => {
      const simpleName = this.simplifyName(name);
      
      // If we haven't seen this opening group yet, add it.
      // Since we traverse depth 1 then depth 2, we naturally prefer shorter paths (parents).
      // e.g. "English Opening" (Depth 1) will be added first.
      // "English Opening: Agincourt" (Depth 2) simplifies to "English Opening" and is skipped.
      if (!openingsMap.has(simpleName)) {
        openingsMap.set(simpleName, {
          name: simpleName, 
          eco,
          moves,
          slug: slugify(simpleName)
        });
      }
    };

    // Depth 1 (White's first move)
    const rootMoves = this.book[rootFen];
    if (rootMoves) {
      for (const [move1, data1] of Object.entries(rootMoves)) {
        if (data1.n) {
          processMove(data1.n, data1.c, [move1]);
        }

        // Depth 2 (Black's response)
        if (data1.next) {
          const nextMoves = this.book[data1.next];
          if (nextMoves) {
            for (const [move2, data2] of Object.entries(nextMoves)) {
              if (data2.n) {
                processMove(data2.n, data2.c, [move1, move2]);
              }
            }
          }
        }
      }
    }

    // Sort alphabetically by name
    return Array.from(openingsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  findOpeningBySlug(slug: string): MajorOpening | undefined {
    return this.getMajorOpenings().find(op => op.slug === slug);
  }
}

export const openingGraphService = new OpeningGraphService();
