// src/services/cache.service.ts

import logger from '../utils/logger';

/**
 * Defines the structure for an item stored in the cache.
 * @template T The type of the data being stored.
 */
interface CachedItem<T> {
  data: T;
  timestamp: number; // The Unix timestamp (in milliseconds) when the item was stored.
}

const BERLIN_TIMEZONE = 'Europe/Berlin';
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

class CacheServiceController {

  /**
   * Retrieves an item from the cache, but only if it has not expired.
   * For items with a TTL of 24 hours or more, it also checks if the cache date
   * is the same as the current date in Berlin time.
   * @param key The unique key for the cache item.
   * @param ttl The Time-To-Live in milliseconds.
   * @returns The cached data if it exists and is not expired, otherwise null.
   * @template T The expected type of the data.
   */
  public get<T>(key: string, ttl: number): T | null {
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) {
        logger.debug(`[CacheService] Cache miss for key: "${key}"`);
        return null;
      }

      const item: CachedItem<T> = JSON.parse(itemStr);
      const now = Date.now();

      // Midnight reset logic for long-lived caches (>= 24h)
      if (ttl >= ONE_DAY_IN_MS) {
        const todayInBerlin = new Date(now).toLocaleDateString('sv-SE', { timeZone: BERLIN_TIMEZONE });
        const cacheDateInBerlin = new Date(item.timestamp).toLocaleDateString('sv-SE', { timeZone: BERLIN_TIMEZONE });

        if (todayInBerlin !== cacheDateInBerlin) {
          logger.info(`[CacheService] Midnight reset: cache for key "${key}" is from a previous day in Berlin. Removing.`);
          localStorage.removeItem(key);
          return null;
        }
      }

      // Standard TTL expiration check
      if (now - item.timestamp > ttl) {
        logger.info(`[CacheService] Cache expired (TTL) for key: "${key}". Removing from localStorage.`);
        localStorage.removeItem(key);
        return null;
      }

      logger.debug(`[CacheService] Cache hit for key: "${key}".`);
      return item.data;
    } catch (error) {
      logger.error(`[CacheService] Error getting item for key "${key}":`, error);
      this.clear(key);
      return null;
    }
  }

  /**
   * Stores an item in the cache with the current timestamp.
   * @param key The unique key for the cache item.
   * @param data The data to be stored. It must be JSON-serializable.
   * @template T The type of the data being stored.
   */
  public set<T>(key: string, data: T): void {
    try {
      const item: CachedItem<T> = {
        data: data,
        timestamp: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(item));
      logger.info(`[CacheService] Item set for key: "${key}".`);
    } catch (error) {
      logger.error(`[CacheService] Error setting item for key "${key}":`, error);
      if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22)) {
        logger.warn('[CacheService] LocalStorage quota exceeded. Consider clearing old cache.');
      }
    }
  }

  /**
   * Removes a specific item from the cache.
   * @param key The key of the item to remove.
   */
  public clear(key: string): void {
    try {
      localStorage.removeItem(key);
      logger.info(`[CacheService] Cleared item for key: "${key}".`);
    } catch (error) {
      logger.error(`[CacheService] Error clearing item for key "${key}":`, error);
    }
  }
}

export const CacheService = new CacheServiceController();
