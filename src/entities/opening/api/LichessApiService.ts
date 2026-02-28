// src/services/LichessApiService.ts
import logger from '@/shared/lib/logger'
import { theoryCacheService } from './TheoryCacheService'

export interface LichessMove {
  uci: string
  san: string
  white: number
  draws: number
  black: number
  averageRating: number
  w_trap?: number
  b_trap?: number
  nag?: number
}

export interface LichessOpeningResponse {
  white: number
  draws: number
  black: number
  moves: LichessMove[]
  avgElo?: number
  avgDraw?: number
  avgScore?: number
  opening?: {
    eco: string
    name: string
  }
}

export interface LichessParams {
  ratingRange: '0-1500' | '1500-2000' | '2000+'
}

class LichessApiService {
  private readonly BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3000/api'

  private activeRequests = new Map<string, Promise<LichessOpeningResponse | null>>()

  private toCleanFen(fen: string): string {
    return fen.split(' ').slice(0, 4).join(' ')
  }

  private getCacheKey(cleanFen: string, params?: LichessParams): string {
    const ratingsKey = params?.ratingRange || '0-1500'
    return `lichess_player:${ratingsKey}:${cleanFen}`
  }

  async getStats(
    fen: string,
    params?: LichessParams,
    options: { onlyCache?: boolean } = {},
  ): Promise<LichessOpeningResponse | null> {
    const cleanFen = this.toCleanFen(fen)

    const cacheKey = this.getCacheKey(cleanFen, params)
    const cacheSource = 'lichess' // Keeps CacheService compatibility string

    if (this.activeRequests.has(cacheKey)) {
      return this.activeRequests.get(cacheKey)!
    }

    const cached = await theoryCacheService.getCachedStats<LichessOpeningResponse>(
      cacheKey,
      cacheSource,
    )
    if (cached) {
      return this.normalizeLichessData(cached)
    }

    if (options.onlyCache) return null

    const requestPromise = (async () => {
      try {
        const result = await this.fetchLocalPlayerStats(cleanFen, params)

        if (result) {
          await theoryCacheService.cacheStats(cacheKey, [], result, cacheSource)
        }

        return result
      } catch (error) {
        logger.error(`[LichessApiService] Error:`, error)
        throw error
      } finally {
        this.activeRequests.delete(cacheKey)
      }
    })()

    this.activeRequests.set(cacheKey, requestPromise)
    return requestPromise
  }

  private async fetchLocalPlayerStats(
    cleanFen: string,
    params?: LichessParams,
  ): Promise<LichessOpeningResponse | null> {
    const ratingRange = params?.ratingRange || '0-1500'

    const response = await fetch(`${this.BACKEND_URL}/opening/player`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ fen: cleanFen, rating_range: ratingRange }),
    })

    if (!response.ok) throw new Error(`Player API Error: ${response.statusText}`)

    const data: LichessOpeningResponse = await response.json()
    return this.normalizeLichessData(data)
  }

  private normalizeLichessData(data: LichessOpeningResponse): LichessOpeningResponse {
    if (!data || !data.moves) return data

    const CASTLING_MAP: Record<string, string> = {
      e1h1: 'e1g1',
      e1a1: 'e1c1',
      e8h8: 'e8g8',
      e8a8: 'e8c8',
    }

    data.moves.forEach((move) => {
      const normalized = CASTLING_MAP[move.uci]
      if (normalized) {
        move.uci = normalized
      }
    })
    return data
  }
}

export const lichessApiService = new LichessApiService()
