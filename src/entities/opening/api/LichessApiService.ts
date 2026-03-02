// src/services/LichessApiService.ts
import logger from '@/shared/lib/logger'

export interface LichessMove {
  uci: string
  san: string
  total: number
  win_p: number
  draw_p: number
  loss_p: number
  averageRating: number
  w_trap?: number
  b_trap?: number
  nag?: number
}

export interface LichessOpeningResponse {
  total: number
  win_p: number
  draw_p: number
  loss_p: number
  moves: LichessMove[]
  avgElo?: number
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

  async fetchStats(
    cleanFen: string,
    params?: LichessParams,
  ): Promise<LichessOpeningResponse | null> {
    try {
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
    } catch (error) {
      logger.error(`[LichessApiService] Error:`, error)
      return null
    }
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
