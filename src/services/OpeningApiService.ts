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

    async fetchOpeningStats(fen: string, history: string[]): Promise<LichessOpeningResponse | null> {
        // 1. Try Cache
        const cached = await openingCacheService.getCachedStats(fen);
        if (cached) {
            logger.info(`[OpeningApiService] Cache hit for FEN: ${fen}`);
            return cached;
        }

        // 2. Build URL
        const url = new URL(this.BASE_URL);
        url.searchParams.append('variant', 'standard');
        url.searchParams.append('speeds', 'bullet,blitz,rapid,classical');
        url.searchParams.append('ratings', '1600,1800,2000,2200,2500');
        url.searchParams.append('moves', '20');
        url.searchParams.append('topGames', '0');
        url.searchParams.append('recentGames', '0');
        url.searchParams.append('history', 'false');
        url.searchParams.append('fen', fen);

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

            // 3. Cache Result
            await openingCacheService.cacheStats(fen, history, data);

            return data;
        } catch (error) {
            logger.error('[OpeningApiService] Error fetching from Lichess:', error);
            throw error;
        }
    }
}

export const openingApiService = new OpeningApiService();
