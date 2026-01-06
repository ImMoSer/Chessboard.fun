// src/services/OpeningApiService.ts
import { openingCacheService } from './OpeningCacheService';
import logger from '../utils/logger';

export type OpeningDatabaseSource = 'lichess' | 'masters';

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

export interface LichessParams {
  ratings: number[];
  speeds: string[];
}

interface MastersBackendMove {
  uci: string;
  san: string;
  stats: {
    white: number;
    draws: number;
    black: number;
  };
  avgElo?: number;
}

const SPEED_ORDER = ['bullet', 'blitz', 'rapid', 'classical'];

class OpeningApiService {
  private readonly LICHESS_URL = 'https://explorer.lichess.ovh/lichess';
  private readonly BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3000/api';

  // Stores in-flight requests to prevent duplicate network calls
  private activeRequests = new Map<string, Promise<LichessOpeningResponse | null>>();

  private toCleanFen(fen: string): string {
    return fen.split(' ').slice(0, 4).join(' ');
  }

  private getCacheKey(cleanFen: string, source: OpeningDatabaseSource, params?: LichessParams): string {
    if (source === 'masters') {
      return `masters:${cleanFen}`;
    }
    // Params are assumed to be sorted by getStats before calling this
    const ratingsKey = params?.ratings.join(',') || 'default';
    const speedsKey = params?.speeds.join(',') || 'default';
    return `lichess:${ratingsKey}|${speedsKey}:${cleanFen}`;
  }

  async getStats(
    fen: string,
    source: OpeningDatabaseSource = 'masters',
    params?: LichessParams,
    options: { onlyCache?: boolean } = {}
  ): Promise<LichessOpeningResponse | null> {
    const cleanFen = this.toCleanFen(fen);

    // Sort params strictly to ensure consistent Cache Keys and URL order
    if (params && source === 'lichess') {
      params.ratings.sort((a, b) => a - b);
      params.speeds.sort((a, b) => SPEED_ORDER.indexOf(a) - SPEED_ORDER.indexOf(b));
    }

    const cacheKey = this.getCacheKey(cleanFen, source, params);

    // 1. Check Memory Cache (In-flight requests)
    if (this.activeRequests.has(cacheKey)) {
      logger.info(`[OpeningApiService] [DEDUPLICATED] Request already in flight for: ${cacheKey}`);
      return this.activeRequests.get(cacheKey)!;
    }

    // 2. Check Persistent Cache (IndexedDB)
    const cached = await openingCacheService.getCachedStats(cacheKey);
    if (cached) {
      logger.info(`[OpeningApiService] [CACHE HIT] Found data for: ${cacheKey}`);
      return source === 'lichess' ? this.normalizeLichessData(cached) : cached;
    }

    // Stop here if only cache is requested
    if (options.onlyCache) {
      logger.info(`[OpeningApiService] [CACHE MISS] onlyCache=true, skipping network for: ${cacheKey}`);
      return null;
    }

    // 3. Execute Network Request (wrapped in a Promise tracker)
    const requestPromise = (async () => {
      try {
        let result: LichessOpeningResponse | null = null;

        if (source === 'masters') {
          logger.info(`[OpeningApiService] [NETWORK] Fetching Masters for FEN: ${cleanFen}`);
          result = await this.fetchFromMasters(cleanFen);
        } else {
          await new Promise(resolve => setTimeout(resolve, 300));
          result = await this.fetchFromLichess(cleanFen, params);
        }

        if (result) {
          await openingCacheService.cacheStats(cacheKey, [], result);
          logger.info(`[OpeningApiService] [NETWORK SUCCESS] Cached new data for: ${cacheKey}`);
        }

        return result;
      } catch (error) {
        logger.error(`[OpeningApiService] [NETWORK ERROR] for ${source}:`, error);
        throw error;
      } finally {
        // Remove from active requests when done (success or fail)
        this.activeRequests.delete(cacheKey);
      }
    })();

    this.activeRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  private async fetchFromMasters(cleanFen: string): Promise<LichessOpeningResponse | null> {
    const response = await fetch(`${this.BACKEND_URL}/opening/masters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ fen: cleanFen })
    });

    if (!response.ok) {
      throw new Error(`Masters API Error: ${response.statusText}`);
    }

    const rawMoves = (await response.json()) as MastersBackendMove[];

    const moves: LichessMove[] = rawMoves.map(m => ({
      uci: m.uci,
      san: m.san,
      white: m.stats.white,
      draws: m.stats.draws,
      black: m.stats.black,
      averageRating: m.avgElo || 2500
    }));

    const totalWhite = moves.reduce((sum, m) => sum + m.white, 0);
    const totalDraws = moves.reduce((sum, m) => sum + m.draws, 0);
    const totalBlack = moves.reduce((sum, m) => sum + m.black, 0);

    return {
      white: totalWhite,
      draws: totalDraws,
      black: totalBlack,
      moves: moves
    };
  }

  private async fetchFromLichess(cleanFen: string, params?: LichessParams): Promise<LichessOpeningResponse | null> {
    const url = new URL(this.LICHESS_URL);
    url.searchParams.append('variant', 'standard');
    url.searchParams.append('fen', cleanFen);
    url.searchParams.append('moves', '20');
    url.searchParams.append('topGames', '0');
    url.searchParams.append('recentGames', '0');
    url.searchParams.append('history', 'false');

    // Params are already sorted in getStats
    const ratings = params?.ratings.join(',') || '1000,1200,1400,1600,1800,2000,2200,2500';
    const speeds = params?.speeds.join(',') || 'bullet,blitz,rapid,classical';

    url.searchParams.append('ratings', ratings);
    url.searchParams.append('speeds', speeds);

    logger.info(`[OpeningApiService] [NETWORK] Requesting Lichess URL: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' }
    });

    if (response.status === 429) {
      logger.warn('[OpeningApiService] [LICHESS 429] Rate limited');
      throw new Error('429');
    }

    if (!response.ok) throw new Error(`Lichess API Error: ${response.statusText}`);

    const data: LichessOpeningResponse = await response.json();
    return this.normalizeLichessData(data);
  }

  private normalizeLichessData(data: LichessOpeningResponse): LichessOpeningResponse {
    if (!data || !data.moves) return data;

    const CASTLING_MAP: Record<string, string> = {
      'e1h1': 'e1g1',
      'e1a1': 'e1c1',
      'e8h8': 'e8g8',
      'e8a8': 'e8c8'
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
