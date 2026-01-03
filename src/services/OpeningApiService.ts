// src/services/OpeningApiService.ts
import { openingCacheService } from './OpeningCacheService';
import logger from '../utils/logger';

export interface LichessMove {
    uci: string;
    san: string;
    white: number;
    draws: number;
    black: number;
    averageRating: number;
}

export interface LichessOpeningResponse {
    white: number;
    draws: number;
    black: number;
    moves: LichessMove[];
    opening?: {
        eco: string;
        name: string;
    };
}

class OpeningApiService {
    private readonly BASE_URL = 'https://explorer.lichess.ovh/lichess';

    /**
     * Converts a standard FEN to the "Clean FEN" format used as keys in the graph and API.
     * Removes halfmove and fullmove counters.
     * Example: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
     *       -> "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -"
     */
    private toCleanFen(fen: string): string {
        return fen.split(' ').slice(0, 4).join(' ');
    }

    async fetchOpeningStats(fen: string, history: string[]): Promise<LichessOpeningResponse | null> {
        const cleanFen = this.toCleanFen(fen);

        // 1. Try Cache with clean FEN
        const cached = await openingCacheService.getCachedStats(cleanFen);
        if (cached) {
            logger.info(`[OpeningApiService] Cache hit for FEN: ${cleanFen}`);
            return this.normalizeData(cached);
        }

        // 2. Polite delay for Lichess API (300ms) - only on cache miss
        await new Promise(resolve => setTimeout(resolve, 300));

        // 3. Build URL using clean FEN
        const url = new URL(this.BASE_URL);
        url.searchParams.append('variant', 'standard');
        url.searchParams.append('speeds', 'bullet,blitz,rapid,classical');
        url.searchParams.append('ratings', '1600,1800,2000,2200,2500');
        url.searchParams.append('moves', '20');
        url.searchParams.append('topGames', '0');
        url.searchParams.append('recentGames', '0');
        url.searchParams.append('history', 'false');
        url.searchParams.append('fen', cleanFen);

        try {
            const response = await fetch(url.toString(), {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.status === 429) {
                logger.warn('[OpeningApiService] Rate limited (429)');
                throw new Error('429');
            }

            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.statusText}`);
            }

            const data: LichessOpeningResponse = await response.json();

            // 3. Cache Result using clean FEN
            await openingCacheService.cacheStats(cleanFen, history, data);

            return this.normalizeData(data);
        } catch (error) {
            logger.error('[OpeningApiService] Error fetching from Lichess:', error);
            throw error;
        }
    }

    async fetchMastersStats(fen: string): Promise<LichessOpeningResponse | null> {
        // Use clean FEN (remove counters) to improve cache hit rate
        const cleanFen = this.toCleanFen(fen);
        const cacheKey = `${cleanFen}_masters`;
        const baseUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3000/api';
        
        // 1. Try Cache
        const cached = await openingCacheService.getCachedStats(cacheKey);
        if (cached) {
            logger.info(`[OpeningApiService] Cache hit for Masters FEN: ${cleanFen}`);
            return cached; // Already normalized in cache? Actually we store raw data usually, but let's assume structure is kept
        }

        try {
            const response = await fetch(`${baseUrl}/opening/masters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ fen: cleanFen })
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch Masters stats: ${response.statusText}`);
            }

            const rawMoves: any[] = await response.json();

            // Adapt Backend Response to LichessOpeningResponse
            const moves: LichessMove[] = rawMoves.map(m => ({
                uci: m.uci,
                san: m.san,
                white: m.stats.white,
                draws: m.stats.draws,
                black: m.stats.black,
                averageRating: 2500 // Dummy value for masters
            }));

            // Calculate totals
            const totalWhite = moves.reduce((sum, m) => sum + m.white, 0);
            const totalDraws = moves.reduce((sum, m) => sum + m.draws, 0);
            const totalBlack = moves.reduce((sum, m) => sum + m.black, 0);

            const result: LichessOpeningResponse = {
                white: totalWhite,
                draws: totalDraws,
                black: totalBlack,
                moves: moves
            };

            // 2. Cache Result
            // Note: We pass empty history [] because it's not strictly needed for the key, 
            // and the cache service just stores it.
            await openingCacheService.cacheStats(cacheKey, [], result);

            return result;

        } catch (error) {
            logger.error('[OpeningApiService] Error fetching Masters stats:', error);
            return null;
        }
    }

    private normalizeData(data: LichessOpeningResponse): LichessOpeningResponse {
        if (!data || !data.moves) return data;

        const CASTLING_MAP: Record<string, string> = {
            'e1h1': 'e1g1', // White O-O
            'e1a1': 'e1c1', // White O-O-O
            'e8h8': 'e8g8', // Black O-O
            'e8a8': 'e8c8'  // Black O-O-O
        };

        data.moves.forEach(move => {
            const normalized = CASTLING_MAP[move.uci];
            if (normalized) {
                move.uci = normalized;
            }
        });
        return data;
    }
}

export const openingApiService = new OpeningApiService();
