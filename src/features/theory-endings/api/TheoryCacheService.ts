// src/services/TheoryCacheService.ts
import Dexie, { type Table } from 'dexie'

export interface TheoryStats {
  fen: string
  history: string[] // UCI moves
  data: unknown // Raw response from Lichess or backend
  timestamp: number
}

export type CacheSource = 'lichess' | 'masters' | 'lichessMasters' | 'mozerBook' | 'diamondGravity'

export class TheoryDatabase extends Dexie {
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

class TheoryCacheService {
  private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

  private getTable(source: CacheSource): Table<TheoryStats> {
    if (source === 'lichessMasters') return theoryDb.lichessMasters
    if (source === 'mozerBook') return theoryDb.mozerBook
    if (source === 'diamondGravity') return theoryDb.diamondGravity
    return theoryDb.openings
  }

  async getCachedStats<T = unknown>(fen: string, source: CacheSource = 'lichess'): Promise<T | null> {
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
      console.error(`[TheoryCacheService] Error reading from cache (${source}):`, error)
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
      console.error(`[TheoryCacheService] Error writing to cache (${source}):`, error)
    }
  }

  async clearCache(): Promise<void> {
    await theoryDb.openings.clear()
    await theoryDb.lichessMasters.clear()
    await theoryDb.mozerBook.clear()
    await theoryDb.diamondGravity.clear()
  }
}

export const theoryCacheService = new TheoryCacheService()
