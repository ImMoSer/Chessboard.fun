// src/services/LichessApiService.ts
import logger from '../utils/logger';
import { CacheService } from './cache.service';
import type { LichessActivityResponse } from '../types/api.types';

// --- НАЧАЛО ИЗМЕНЕНИЙ ---
const CACHE_LICHESS_ACTIVITY_TTL_MS = parseInt(import.meta.env.VITE_CACHE_LICHESS_ACTIVITY_TTL_MS || '1000', 10);
// --- КОНЕЦ ИЗМЕНЕНИЙ ---
const LICHESS_API_BASE = 'https://lichess.org/api';

class LichessApiServiceController {

  /**
   * Fetches user activity from the Lichess API.
   * The response is cached to avoid excessive requests.
   * @param username - The Lichess username.
   * @returns An array of activity entries, or null if an error occurs.
   */
  public async fetchUserActivity(username: string): Promise<LichessActivityResponse | null> {
    const cacheKey = `lichess_activity_${username}`;
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

export const lichessApiService = new LichessApiServiceController();
