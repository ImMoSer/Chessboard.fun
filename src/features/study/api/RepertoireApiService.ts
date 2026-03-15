// src/services/RepertoireApiService.ts
import logger from '@/shared/lib/logger'

export type RepertoireStyle = 'grossmaster' | 'hustler' | 'schuler'
export type OpponentData = 'MASTERS' | 'PL1000' | 'PL1500' | 'PL1800'

export interface RepertoireRequest {
  start_pgn: string
  color: 'white' | 'black'
  style: RepertoireStyle
  min_games: number
  opponent_coverage: number
  max_depth: number
  opponent_data: OpponentData
}

class RepertoireApiService {
  private readonly BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3000/api'

  async generateRepertoire(request: RepertoireRequest): Promise<string | null> {
    try {
      logger.info(`[RepertoireApiService] Ordering ${request.style} repertoire:`, request)

      const response = await fetch(`${this.BACKEND_URL}/opening/repertoire`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Repertoire API Error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.pgn
    } catch (error) {
      logger.error(`[RepertoireApiService] Error generating repertoire:`, error)
      throw error // Let the component handle the error message
    }
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.BACKEND_URL}/health`)
      return await response.json()
    } catch (error) {
      return { status: 'error', error }
    }
  }
}

export const repertoireApiService = new RepertoireApiService()
