// src/services/cache.service.ts

import logger from '@/utils/logger'

class CacheServiceController {
  /**
   * Retrieves an item from the cache. Caching is disabled.
   * @returns Always returns null as caching is disabled.
   */
  public get(): unknown {
    // Кэширование на стороне клиента полностью отключено.
    return null
  }

  /**
   * Stores an item in the cache. Caching is disabled.
   */
  public set(): void {
    // Кэширование на стороне клиента полностью отключено.
  }

  /**
   * Removes a specific item from the cache.
   * @param key The key of the item to remove.
   */
  public clear(key: string): void {
    try {
      localStorage.removeItem(key)
      logger.info(`[CacheService] Cleared item from localStorage for key: "${key}".`)
    } catch (error) {
      logger.error(`[CacheService] Error clearing item for key "${key}":`, error)
    }
  }
}

export const CacheService = new CacheServiceController()
