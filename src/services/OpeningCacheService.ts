// src/services/OpeningCacheService.ts
import Dexie, { type Table } from 'dexie'
import { type LichessOpeningResponse } from './OpeningApiService'

export interface OpeningStats {
  fen: string
  history: string[] // UCI moves
  data: LichessOpeningResponse | any // Raw response from Lichess or backend
  timestamp: number
}

export type CacheSource = 'lichess' | 'masters' | 'lichessMasters' | 'mozerBook' | 'diamondGravity'

export class OpeningDatabase extends Dexie {
  openings!: Table<OpeningStats>
  lichessMasters!: Table<OpeningStats>
  mozerBook!: Table<OpeningStats>
  diamondGravity!: Table<OpeningStats>

  constructor() {
    super('OpeningDatabase')
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

export const db = new OpeningDatabase()

class OpeningCacheService {
  private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

  private getTable(source: CacheSource): Table<OpeningStats> {
    if (source === 'lichessMasters') return db.lichessMasters
    if (source === 'mozerBook') return db.mozerBook
    if (source === 'diamondGravity') return db.diamondGravity
    return db.openings
  }

  async getCachedStats(fen: string, source: CacheSource = 'lichess'): Promise<any | null> {
    try {
      const table = this.getTable(source)
      const record = await table.get(fen)
      if (record) {
        const now = Date.now()
        if (now - record.timestamp < this.CACHE_TTL) {
          return record.data
        } else {
          await table.delete(fen)
        }
      }
    } catch (error) {
      console.error(`[OpeningCacheService] Error reading from cache (${source}):`, error)
    }
    return null
  }

  async cacheStats(
    fen: string,
    history: string[],
    data: any,
    source: CacheSource = 'lichess',
  ): Promise<void> {
    try {
      const table = this.getTable(source)
      await table.put({
        fen,
        history,
        data,
        timestamp: Date.now(),
      })
    } catch (error) {
      console.error(`[OpeningCacheService] Error writing to cache (${source}):`, error)
    }
  }

  async clearCache(): Promise<void> {
    await db.openings.clear()
    await db.lichessMasters.clear()
    await db.mozerBook.clear()
    await db.diamondGravity.clear()
  }
}

export const openingCacheService = new OpeningCacheService()
