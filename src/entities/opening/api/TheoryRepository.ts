
import { mozerBookService, type MozerBookResponse } from './MozerBookService'
import { lichessApiService, type LichessOpeningResponse, type LichessParams } from './LichessApiService'
import { globalCacheRepository } from '@/shared/api/storage/repositories/GlobalCacheRepository'

export interface TheoryStats {
  fen: string
  history: string[] // UCI moves
  data: unknown // Raw response
  timestamp: number
}

export type CacheSource = 'lichess' | 'masters' | 'lichessMasters' | 'mozerBook' | 'diamondGravity'

class TheoryRepository {
  private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

  private activeMozerRequests = new Map<string, Promise<MozerBookResponse | null>>()
  private activeLichessRequests = new Map<string, Promise<LichessOpeningResponse | null>>()

  async getCachedStats<T = unknown>(
    fen: string,
    source: CacheSource = 'lichess',
  ): Promise<T | null> {
    try {
      const record = await globalCacheRepository.getTheoryStat(fen, source);
      if (record) {
          return record.data as T;
      }
    } catch (error) {
      console.error(`[TheoryRepository] Error reading from cache (${source}):`, error)
    }
    return null
  }

  async cacheStats<T = unknown>(
    fen: string,
    _history: string[],
    data: T,
    source: CacheSource = 'lichess',
  ): Promise<void> {
    try {
      await globalCacheRepository.saveTheoryStat({
          fen_key: fen,
          source: source,
          data: data,
          expires: Date.now() + this.CACHE_TTL
      });
    } catch (error) {
      console.error(`[TheoryRepository] Error writing to cache (${source}):`, error)
    }
  }

  async clearCache(): Promise<void> {
      // Not implemented in repository yet, but could be added if needed
      // For now we don't clear global cache often
  }

  private toCleanFen(fen: string): string {
    return fen.split(' ').slice(0, 4).join(' ')
  }

  // --- Mozer Book ---
  async getMozerBookStats(fen: string): Promise<MozerBookResponse | null> {
    const cleanFen = this.toCleanFen(fen)
    const cacheSource = 'mozerBook'

    if (this.activeMozerRequests.has(cleanFen)) {
      return this.activeMozerRequests.get(cleanFen)!
    }

    const requestPromise = (async () => {
      try {
        const cached = await this.getCachedStats<MozerBookResponse>(cleanFen, cacheSource)
        if (cached) {
          this.activeMozerRequests.delete(cleanFen)
          return cached
        }

        const data = await mozerBookService.fetchStats(cleanFen)
        if (data) {
          await this.cacheStats(cleanFen, [], data, cacheSource)
          this.activeMozerRequests.delete(cleanFen)
          return data
        }
        
        this.activeMozerRequests.delete(cleanFen)
        return null
      } catch (error) {
        this.activeMozerRequests.delete(cleanFen)
        throw error
      }
    })()

    this.activeMozerRequests.set(cleanFen, requestPromise)
    return requestPromise
  }

  // --- Lichess ---
  private getLichessCacheKey(cleanFen: string, params?: LichessParams): string {
    const ratingsKey = params?.ratingRange || '0-1500'
    return `lichess_player:${ratingsKey}:${cleanFen}`
  }

  async getLichessStats(
    fen: string,
    params?: LichessParams,
    options: { onlyCache?: boolean } = {},
  ): Promise<LichessOpeningResponse | null> {
    const cleanFen = this.toCleanFen(fen)
    const cacheKey = this.getLichessCacheKey(cleanFen, params)
    const cacheSource = 'lichess'

    if (this.activeLichessRequests.has(cacheKey)) {
      return this.activeLichessRequests.get(cacheKey)!
    }

    const requestPromise = (async () => {
      try {
        const cached = await this.getCachedStats<LichessOpeningResponse>(cacheKey, cacheSource)
        if (cached) {
          this.activeLichessRequests.delete(cacheKey)
          return cached
        }

        if (options.onlyCache) {
          this.activeLichessRequests.delete(cacheKey)
          return null
        }

        const data = await lichessApiService.fetchStats(cleanFen, params)
        if (data) {
          await this.cacheStats(cacheKey, [], data, cacheSource)
          this.activeLichessRequests.delete(cacheKey)
          return data
        }
        
        this.activeLichessRequests.delete(cacheKey)
        return null
      } catch (error) {
        this.activeLichessRequests.delete(cacheKey)
        throw error
      }
    })()

    this.activeLichessRequests.set(cacheKey, requestPromise)
    return requestPromise
  }
}

export const theoryRepository = new TheoryRepository()
