// src/core/lichess-api.service.ts
import logger from '../utils/logger';
import { CacheService } from './cache.service';

// --- ИЗМЕНЕНО: Чтение TTL из переменных окружения с фолбэком ---
const CACHE_LICHESS_ACTIVITY_TTL_MS = parseInt(import.meta.env.VITE_CACHE_LICHESS_ACTIVITY_TTL_MS || '3600000', 10);

const LICHESS_API_BASE = 'https://lichess.org/api';

// --- Interfaces for Lichess Activity API Response ---

interface RatingProgression {
  before: number;
  after: number;
}

interface GameStats {
  win: number;
  loss: number;
  draw: number;
  rp: RatingProgression;
}

interface PuzzleStats {
    score: GameStats;
}

interface TournamentBest {
    tournament: {
        id: string;
        name: string;
    };
    nbGames: number;
    score: number;
    rank: number;
    rankPercent: number;
}

interface Tournaments {
    nb: number;
    best: TournamentBest[];
}

interface CorrespondenceEnds {
    correspondence: {
        score: GameStats;
        games: {
            id: string;
            color: 'white' | 'black';
            url: string;
            opponent: {
                aiLevel?: number;
                name?: string;
            };
        }[];
    };
}

interface Follows {
    in?: { ids: string[] };
    out?: { ids: string[] };
}

export interface LichessActivityEntry {
  interval: {
    start: number;
    end: number;
  };
  games?: {
    [gameType: string]: GameStats; // e.g., blitz, rapid, classical
  };
  puzzles?: PuzzleStats;
  tournaments?: Tournaments;
  correspondenceEnds?: CorrespondenceEnds;
  follows?: Follows;
}

export type LichessActivityResponse = LichessActivityEntry[];


class LichessApiServiceController {
  
  /**
   * Fetches user activity from the Lichess API.
   * The response is cached for 1 hour to avoid excessive requests.
   * @param username - The Lichess username.
   * @returns An array of activity entries, or null if an error occurs.
   */
  public async fetchUserActivity(username: string): Promise<LichessActivityResponse | null> {
    const cacheKey = `lichess_activity_${username}`;
    // --- ИЗМЕНЕНО: Использование переменной TTL ---
    const cachedData = CacheService.get<LichessActivityResponse>(cacheKey, CACHE_LICHESS_ACTIVITY_TTL_MS);

    if (cachedData) {
      logger.info(`[LichessApiService] Returning cached activity data for user: ${username}`);
      return cachedData;
    }

    logger.info(`[LichessApiService] Fetching new activity data for user: ${username}`);
    const url = `${LICHESS_API_BASE}/user/${username}/activity`;

    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Lichess API returned an error: ${response.status} ${response.statusText}`);
      }

      const data: LichessActivityResponse = await response.json();
      
      CacheService.set(cacheKey, data);
      logger.info(`[LichessApiService] Successfully fetched and cached activity for ${username}.`);
      
      return data;

    } catch (error: any) {
      logger.error(`[LichessApiService] Failed to fetch activity for user ${username}:`, error);
      return null;
    }
  }
}

export const LichessApiService = new LichessApiServiceController();
