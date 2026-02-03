// src/services/MozerBookService.ts
import logger from '../utils/logger'
import { theoryCacheService } from './TheoryCacheService'

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
  wt?: number
  bt?: number
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

class MozerBookService {
  private readonly BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3000/api'

  private toCleanFen(fen: string): string {
    return fen.split(' ').slice(0, 4).join(' ')
  }

  async getStats(fen: string): Promise<MozerBookResponse | null> {
    const cleanFen = this.toCleanFen(fen)

    // 1. Check persistent cache
    const cached = await theoryCacheService.getCachedStats(cleanFen, 'mozerBook')
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
      await theoryCacheService.cacheStats(cleanFen, [], data, 'mozerBook')

      return data
    } catch (error) {
      logger.error(`[MozerBookService] Error:`, error)
      return null
    }
  }
}

export const mozerBookService = new MozerBookService()
