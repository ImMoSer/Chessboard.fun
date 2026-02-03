import logger from '../utils/logger'
import { theoryCacheService } from './TheoryCacheService'

export interface GravityMove {
  uci: string
  san: string
  weight: number
  rating: number
  dist: number
  nag: number
  nag_str: string
}

export interface GravityResponse {
  moves: GravityMove[]
}

class DiamondApiService {
  private readonly BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3000/api'

  private toCleanFen(fen: string): string {
    return fen.split(' ').slice(0, 4).join(' ')
  }

  async getWhiteGravity(fen: string): Promise<GravityResponse | null> {
    return this.fetchGravity('white', fen)
  }

  async getBlackGravity(fen: string): Promise<GravityResponse | null> {
    return this.fetchGravity('black', fen)
  }

  private async fetchGravity(color: 'white' | 'black', fen: string): Promise<GravityResponse | null> {
    const cleanFen = this.toCleanFen(fen)

    // 1. Check Cache
    // We use a composite key "color:cleanFen" because the DB structure in backend is separate,
    // although technically FEN should be unique enough, but better safe if we ever mix.
    // Actually, OpeningCacheService expects just a FEN key.
    // But since White and Black databases are totally different,
    // we should include color in the key passed to cache, or assume the FEN dictates whose turn it is?
    // Wait, FEN includes turn color ("w" or "b").
    // BUT here we force-query a specific DB (White or Black) regardless of turn.
    // So "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -" queried against Black DB
    // gives different result (if valid) than White DB.
    // So we MUST prefix the key.
    const cacheKey = `gravity:${color}:${cleanFen}`

    const cached = await theoryCacheService.getCachedStats<GravityResponse>(cacheKey, 'diamondGravity')
    if (cached) {
        return cached
    }

    try {
      const response = await fetch(`${this.BACKEND_URL}/diamond/${color}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ fen: cleanFen }),
      })

      if (!response.ok) throw new Error(`Diamond Gravity API Error: ${response.statusText}`)
      const data = await response.json()

      // 2. Save to Cache
      await theoryCacheService.cacheStats(cacheKey, [], data, 'diamondGravity')

      return data
    } catch (error) {
      logger.error(`[DiamondApiService] Error fetching ${color} gravity:`, error)
      return null
    }
  }
}

export const diamondApiService = new DiamondApiService()
