// src/services/OpeningApiService.ts
import logger from '../utils/logger'
import { openingCacheService, type CacheSource } from './OpeningCacheService'

export type OpeningDatabaseSource = 'lichess' | 'masters' | 'backend'

export interface LichessMove {
  uci: string
  san: string
  white: number
  draws: number
  black: number
  averageRating: number
  // Diamond Hunter Extensions
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

// MozerBook Specific Types
export interface MozerBookTheoryItem {
  san: string
  uci: string
  name: string
  eco: string
}

export interface MozerBookMove extends MozerBookTheoryItem {
  total: number
  w_pct: number
  d_pct: number
  l_pct: number
  perf: number
  nag: number
  children?: MozerBookTheoryItem[]
}

export interface MozerBookResponse {
  summary: {
    w: number
    d: number
    l: number
    av: number
    perf: number
  } | null
  moves: MozerBookMove[]
  theory?: MozerBookTheoryItem[]
}

interface MastersMove {
  san: string
  uci: string
  total: number
  w_pct: number
  d_pct: number
  l_pct: number
  perf: number
  nag: number
}

interface MastersResponse {
  summary: {
    w: number
    d: number
    l: number
    av: number
    perf: number
  } | null
  moves: MastersMove[]
}

const SPEED_ORDER = ['bullet', 'blitz', 'rapid', 'classical']

class OpeningApiService {
  private readonly LICHESS_URL = 'https://explorer.lichess.ovh/lichess'
  private readonly LICHESS_MASTERS_URL = 'https://explorer.lichess.ovh/masters'
  private readonly BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3000/api'

  // Stores in-flight requests to prevent duplicate network calls
  private activeRequests = new Map<string, Promise<LichessOpeningResponse | null>>()

  private toCleanFen(fen: string): string {
    return fen.split(' ').slice(0, 4).join(' ')
  }

  private getCacheKey(
    cleanFen: string,
    source: OpeningDatabaseSource,
    params?: LichessParams | LichessMastersParams,
  ): string {
    if (source === 'masters') {
      const p = params as LichessMastersParams
      const mastersKey = `masters:${p?.since || 'default'}-${p?.until || 'default'}:${p?.moves || '12'}`
      return `${mastersKey}:${cleanFen}`
    }
    if (source === 'backend') {
      return `backend:${cleanFen}`
    }

    // Default Lichess Amateur
    const p = params as LichessParams
    const ratingsKey = p?.ratings.join(',') || 'default'
    const speedsKey = p?.speeds.join(',') || 'default'
    return `lichess:${ratingsKey}|${speedsKey}:${cleanFen}`
  }

  async getStats(
    fen: string,
    source: OpeningDatabaseSource = 'masters',
    params?: LichessParams | LichessMastersParams,
    options: { onlyCache?: boolean } = {},
  ): Promise<LichessOpeningResponse | null> {
    const cleanFen = this.toCleanFen(fen)

    // Sort params strictly to ensure consistent Cache Keys and URL order
    if (params && source === 'lichess') {
      const p = params as LichessParams
      p.ratings.sort((a, b) => a - b)
      p.speeds.sort((a, b) => SPEED_ORDER.indexOf(a) - SPEED_ORDER.indexOf(b))
    }

    const cacheKey = this.getCacheKey(cleanFen, source, params)
    const cacheSource: CacheSource = source === 'masters' ? 'lichessMasters' : 'lichess'

    // 1. Check Memory Cache (In-flight requests)
    if (this.activeRequests.has(cacheKey)) {
      logger.info(`[OpeningApiService] [DEDUPLICATED] Request already in flight for: ${cacheKey}`)
      return this.activeRequests.get(cacheKey)!
    }

    // 2. Check Persistent Cache (IndexedDB)
    const cached = await openingCacheService.getCachedStats(cacheKey, cacheSource)
    if (cached) {
      logger.info(`[OpeningApiService] [CACHE HIT] Found data for: ${cacheKey} in ${cacheSource}`)
      return source === 'lichess' ? this.normalizeLichessData(cached) : cached
    }

    // Stop here if only cache is requested
    if (options.onlyCache) {
      logger.info(
        `[OpeningApiService] [CACHE MISS] onlyCache=true, skipping network for: ${cacheKey}`,
      )
      return null
    }

    // 3. Execute Network Request (wrapped in a Promise tracker)
    const requestPromise = (async () => {
      try {
        let result: LichessOpeningResponse | null = null

        if (source === 'masters') {
          logger.info(`[OpeningApiService] [NETWORK] Fetching Lichess Masters for FEN: ${cleanFen}`)
          result = await this.fetchFromLichessMasters(cleanFen, params as LichessMastersParams)
        } else if (source === 'backend') {
          logger.info(`[OpeningApiService] [NETWORK] Fetching Backend Masters for FEN: ${cleanFen}`)
          result = await this.fetchFromBackendMasters(cleanFen)
        } else {
          await new Promise((resolve) => setTimeout(resolve, 300))
          result = await this.fetchFromLichess(cleanFen, params as LichessParams)
        }

        if (result) {
          await openingCacheService.cacheStats(cacheKey, [], result, cacheSource)
          logger.info(
            `[OpeningApiService] [NETWORK SUCCESS] Cached new data for: ${cacheKey} in ${cacheSource}`,
          )
        }

        return result
      } catch (error) {
        logger.error(`[OpeningApiService] [NETWORK ERROR] for ${source}:`, error)
        throw error
      } finally {
        // Remove from active requests when done (success or fail)
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

    // Normalize format
    const result: LichessOpeningResponse = {
      white: data.white,
      draws: data.draws,
      black: data.black,
      moves: data.moves.map((m: { uci: string; san: string; white: number; draws: number; black: number; averageRating?: number }) => ({
        uci: m.uci,
        san: m.san,
        white: m.white,
        draws: m.draws,
        black: m.black,
        averageRating: m.averageRating || 0,
      })),
      topGames: data.topGames,
    }

    if (data.opening) {
      result.opening = data.opening
    }

    return this.normalizeLichessData(result)
  }

  private async fetchFromBackendMasters(cleanFen: string): Promise<LichessOpeningResponse | null> {
    const response = await fetch(`${this.BACKEND_URL}/opening/masters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ fen: cleanFen }),
    })

    if (!response.ok) throw new Error(`Backend Masters API Error: ${response.statusText}`)
    const data = (await response.json()) as MastersResponse

    const moves: LichessMove[] = data.moves.map((m) => {
      // Reconstruct absolutes for LichessMove compatibility
      // m.total, m.w_pct, m.d_pct
      const total = m.total
      const w = Math.round(total * (m.w_pct / 100))
      const d = Math.round(total * (m.d_pct / 100))
      const b = total - w - d

      return {
        uci: m.uci,
        san: m.san,
        white: w,
        draws: d,
        black: b,
        averageRating: m.perf, // Use perf as average rating proxy
        nag: m.nag
      }
    })

    const summary = data.summary || { w: 0, d: 0, l: 0, av: 0, perf: 0 }

    return {
      white: summary.w,
      draws: summary.d,
      black: summary.l,
      moves: moves,
      avgElo: summary.av,
      avgDraw: 0, // Not available
      avgScore: 0, // Not available
    }
  }

  async getMozerBookStats(fen: string): Promise<MozerBookResponse | null> {
    const cleanFen = this.toCleanFen(fen)

    // 1. Check persistent cache
    const cached = await openingCacheService.getCachedStats(cleanFen, 'mozerBook')
    if (cached) {
      return cached
    }

    try {
      const response = await fetch(`${this.BACKEND_URL}/opening/masters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ fen: cleanFen }),
      })

      if (!response.ok) throw new Error(`MozerBook API Error: ${response.statusText}`)
      const data = await response.json()

      // 2. Save to cache
      await openingCacheService.cacheStats(cleanFen, [], data, 'mozerBook')

      return data
    } catch (error) {
      logger.error(`[OpeningApiService] MozerBook error:`, error)
      return null
    }
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

export const openingApiService = new OpeningApiService()
