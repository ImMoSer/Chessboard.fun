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

class CacheServiceController {
  /**
   * Retrieves an item from the cache. Caching is disabled.
   * @param key The unique key for the cache item.
   * @param ttl The Time-To-Live in milliseconds.
   * @returns Always returns null as caching is disabled.
   * @template T The expected type of the data.
   */
  public get<T>(_key: string, _ttl: number): T | null {
    // Кэширование на стороне клиента полностью отключено.
    return null;
  }

  /**
   * Stores an item in the cache. Caching is disabled.
   * @param key The unique key for the cache item.
   * @param data The data to be stored.
   * @template T The type of the data being stored.
   */
  public set<T>(_key: string, _data: T): void {
    // Кэширование на стороне клиента полностью отключено.
  }

  /**
   * Removes a specific item from the cache.
   * @param key The key of the item to remove.
   */
  public clear(key: string): void {
    try {
      localStorage.removeItem(key);
      logger.info(`[CacheService] Cleared item from localStorage for key: "${key}".`);
    } catch (error) {
      logger.error(`[CacheService] Error clearing item for key "${key}":`, error);
    }
  }
}

export const CacheService = new CacheServiceController();
