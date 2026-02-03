// src/services/LichessApiService.ts
import logger from '../utils/logger'
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

export interface LichessTopGame {
  uci: string
  id: string
  winner: 'white' | 'black' | 'draw' | null
  white: { name: string; rating: number }
  black: { name: string; rating: number }
  year: number
  month: string
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
  topGames?: LichessTopGame[]
}

export interface LichessParams {
  ratings: number[]
  speeds: string[]
}

export interface LichessMastersParams {
  since?: number
  until?: number
  moves?: number
  topGames?: number
}

interface LichessRawMove {
  uci: string
  san: string
  white: number
  draws: number
  black: number
  averageRating?: number
}

const SPEED_ORDER = ['bullet', 'blitz', 'rapid', 'classical']

class LichessApiService {
  private readonly LICHESS_URL = 'https://explorer.lichess.ovh/lichess'
  private readonly LICHESS_MASTERS_URL = 'https://explorer.lichess.ovh/masters'

  private activeRequests = new Map<string, Promise<LichessOpeningResponse | null>>()

  private toCleanFen(fen: string): string {
    return fen.split(' ').slice(0, 4).join(' ')
  }

  private getCacheKey(
    cleanFen: string,
    source: 'lichess' | 'masters',
    params?: LichessParams | LichessMastersParams,
  ): string {
    if (source === 'masters') {
      const p = params as LichessMastersParams
      const mastersKey = `masters:${p?.since || 'default'}-${p?.until || 'default'}:${p?.moves || '12'}`
      return `${mastersKey}:${cleanFen}`
    }

    const p = params as LichessParams
    const ratingsKey = p?.ratings.join(',') || 'default'
    const speedsKey = p?.speeds.join(',') || 'default'
    return `lichess:${ratingsKey}|${speedsKey}:${cleanFen}`
  }

  async getStats(
    fen: string,
    source: 'lichess' | 'masters' = 'masters',
    params?: LichessParams | LichessMastersParams,
    options: { onlyCache?: boolean } = {},
  ): Promise<LichessOpeningResponse | null> {
    const cleanFen = this.toCleanFen(fen)

    if (params && source === 'lichess') {
      const p = params as LichessParams
      p.ratings.sort((a, b) => a - b)
      p.speeds.sort((a, b) => SPEED_ORDER.indexOf(a) - SPEED_ORDER.indexOf(b))
    }

    const cacheKey = this.getCacheKey(cleanFen, source, params)
    const cacheSource = source === 'masters' ? 'lichessMasters' : 'lichess'

    if (this.activeRequests.has(cacheKey)) {
      return this.activeRequests.get(cacheKey)!
    }

    const cached = await theoryCacheService.getCachedStats<LichessOpeningResponse>(cacheKey, cacheSource)
    if (cached) {
      return source === 'lichess' ? this.normalizeLichessData(cached) : cached
    }

    if (options.onlyCache) return null

    const requestPromise = (async () => {
      try {
        let result: LichessOpeningResponse | null = null

        if (source === 'masters') {
          result = await this.fetchFromLichessMasters(cleanFen, params as LichessMastersParams)
        } else {
          await new Promise((resolve) => setTimeout(resolve, 300))
          result = await this.fetchFromLichess(cleanFen, params as LichessParams)
        }

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

  private async fetchFromLichessMasters(
    cleanFen: string,
    params?: LichessMastersParams,
  ): Promise<LichessOpeningResponse | null> {
    const url = new URL(this.LICHESS_MASTERS_URL)
    url.searchParams.append('fen', cleanFen)
    url.searchParams.append('moves', (params?.moves || 12).toString())
    url.searchParams.append('topGames', (params?.topGames || 15).toString())
    if (params?.since) url.searchParams.append('since', params.since.toString())
    if (params?.until) url.searchParams.append('until', params.until.toString())

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    })

    if (response.status === 429) throw new Error('429')
    if (!response.ok) throw new Error(`Lichess Masters API Error: ${response.statusText}`)

    const data = await response.json()

    const result: LichessOpeningResponse = {
      white: data.white,
      draws: data.draws,
      black: data.black,
      moves: data.moves.map((m: LichessRawMove) => ({
        uci: m.uci,
        san: m.san,
        white: m.white,
        draws: m.draws,
        black: m.black,
        averageRating: m.averageRating || 0,
      })),
      topGames: data.topGames,
    }

    if (data.opening) result.opening = data.opening

    return this.normalizeLichessData(result)
  }

  private async fetchFromLichess(
    cleanFen: string,
    params?: LichessParams,
  ): Promise<LichessOpeningResponse | null> {
    const url = new URL(this.LICHESS_URL)
    url.searchParams.append('variant', 'standard')
    url.searchParams.append('fen', cleanFen)
    url.searchParams.append('moves', '20')
    url.searchParams.append('topGames', '0')
    url.searchParams.append('recentGames', '0')
    url.searchParams.append('history', 'false')

    const ratings = params?.ratings.join(',') || '1000,1200,1400,1600,1800,2000,2200,2500'
    const speeds = params?.speeds.join(',') || 'bullet,blitz,rapid,classical'

    url.searchParams.append('ratings', ratings)
    url.searchParams.append('speeds', speeds)

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    })

    if (response.status === 429) throw new Error('429')
    if (!response.ok) throw new Error(`Lichess API Error: ${response.statusText}`)

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
