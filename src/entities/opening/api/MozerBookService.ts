// src/services/MozerBookService.ts
import logger from '@/shared/lib/logger'

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

  async fetchStats(cleanFen: string): Promise<MozerBookResponse | null> {
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
      return await response.json()
    } catch (error) {
      logger.error(`[MozerBookService] Error:`, error)
      return null
    }
  }
}

export const mozerBookService = new MozerBookService()
