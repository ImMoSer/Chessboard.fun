import Dexie, { type Table } from 'dexie'
import { mozerBookService, type MozerBookResponse } from './MozerBookService'
import { lichessApiService, type LichessOpeningResponse, type LichessParams } from './LichessApiService'

export interface TheoryStats {
  fen: string
  history: string[] // UCI moves
  data: unknown // Raw response
  timestamp: number
}

export type CacheSource = 'lichess' | 'masters' | 'lichessMasters' | 'mozerBook' | 'diamondGravity'

class TheoryDatabase extends Dexie {
  openings!: Table<TheoryStats>
  lichessMasters!: Table<TheoryStats>
  mozerBook!: Table<TheoryStats>
  diamondGravity!: Table<TheoryStats>

  constructor() {
    super('OpeningDatabase') // Keep the same DB name to preserve data
    this.version(1).stores({
      openings: 'fen, timestamp',
    })
    this.version(2).stores({
      openings: 'fen, timestamp',
      lichessMasters: 'fen, timestamp',
    })
    this.version(3).stores({
      openings: 'fen, timestamp',
      lichessMasters: 'fen, timestamp',
      mozerBook: 'fen, timestamp',
    })
    this.version(4).stores({
      openings: 'fen, timestamp',
      lichessMasters: 'fen, timestamp',
      mozerBook: 'fen, timestamp',
      diamondGravity: 'fen, timestamp',
    })
  }
}

export const theoryDb = new TheoryDatabase()

class TheoryRepository {
  private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

  private activeMozerRequests = new Map<string, Promise<MozerBookResponse | null>>()
  private activeLichessRequests = new Map<string, Promise<LichessOpeningResponse | null>>()

  private getTable(source: CacheSource): Table<TheoryStats> {
    if (source === 'lichessMasters') return theoryDb.lichessMasters
    if (source === 'mozerBook') return theoryDb.mozerBook
    if (source === 'diamondGravity') return theoryDb.diamondGravity
    return theoryDb.openings
  }

  async getCachedStats<T = unknown>(
    fen: string,
    source: CacheSource = 'lichess',
  ): Promise<T | null> {
    try {
      const table = this.getTable(source)
      const record = await table.get(fen)
      if (record) {
        const now = Date.now()
        if (now - record.timestamp < this.CACHE_TTL) {
          return record.data as T
        } else {
          await table.delete(fen)
        }
      }
    } catch (error) {
      console.error(`[TheoryRepository] Error reading from cache (${source}):`, error)
    }
    return null
  }

  async cacheStats<T = unknown>(
    fen: string,
    history: string[],
    data: T,
    source: CacheSource = 'lichess',
  ): Promise<void> {
    try {
      const table = this.getTable(source)
      await table.put({
        fen,
        history,
        data: data as unknown,
        timestamp: Date.now(),
      })
    } catch (error) {
      console.error(`[TheoryRepository] Error writing to cache (${source}):`, error)
    }
  }

  async clearCache(): Promise<void> {
    await theoryDb.openings.clear()
    await theoryDb.lichessMasters.clear()
    await theoryDb.mozerBook.clear()
    await theoryDb.diamondGravity.clear()
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
        
        // If data is null/invalid, remove from cache map so we can try again later
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
          this.activeLichessRequests.delete(cacheKey) // Don't keep a null cache forever
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
