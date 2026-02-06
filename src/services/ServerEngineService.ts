// src/services/ServerEngineService.ts
import logger from '../utils/logger'
import { authService } from './AuthService'

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL as string
const SERVER_ENGINE_ENDPOINT = `${BACKEND_API_URL}/bestmove`
const MOVE_TIMEOUT_MS = 15000

export interface CevaliteEvaluationResponse {
  evaluation: {
    score_cp: number
    wdl: { win: number; draw: number; loss: number }
    best_move: string
    best_move_san: string
    best_move_motifs?: string[]
    pv_uci: string[]
    pv_san: string // Formatted string from server
    depth: number
  }
  threats: {
    opponent_threat_move: string
    opponent_threat_san: string
    threat_description: string | null
    threat_severity_score: number
    threat_motifs: string[]
  }
  features: {
    mobility: { white: number; black: number }
    king_safety: {
      square: string
      open_files: string[]
      pawn_shield: boolean
      ring_attackers: number
      is_safe_heuristic: boolean
    }
    pawn_structure: {
      passed_pawns: string[]
      isolated_pawns: string[]
      doubled_pawns: boolean
      chain_count: number
    }
    tactics: {
      pins: { piece: string; type: string }[]
      hanging_pieces: string[]
      underdefended_pieces: string[]
    }
    ascii: string
  }
}

class ServerEngineServiceController {
  private isThinking = false

  constructor() {
    logger.info(
      `[ServerEngineService] Initialized to work with Backend at: ${SERVER_ENGINE_ENDPOINT}`,
    )
  }

  public async getMoveFromServer(fen: string, engine_name: string): Promise<string | null> {
    if (this.isThinking) {
      logger.warn(
        '[ServerEngineService] getMoveFromServer called while already thinking. Request rejected.',
      )
      return Promise.reject(new Error('ServerEngineService is already processing a request.'))
    }

    if (!authService.getIsAuthenticated()) {
      logger.error('[ServerEngineService] User is not authenticated. Request rejected.')
      return Promise.reject(new Error('User not authenticated'))
    }

    this.isThinking = true
    logger.info(
      `[ServerEngineService] Requesting move for FEN: ${fen} using engine: ${engine_name}`,
    )

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), MOVE_TIMEOUT_MS)

      const url = new URL(SERVER_ENGINE_ENDPOINT)
      url.searchParams.append('fen', fen)
      url.searchParams.append('engine_name', engine_name)

      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
        credentials: 'include',
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server engine returned an error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const bestMove = data.bestMove || null

      logger.info(`[ServerEngineService] Received best move: ${bestMove}`)
      return bestMove
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error(`[ServerEngineService] Request timed out after ${MOVE_TIMEOUT_MS}ms.`)
      } else {
        logger.error('[ServerEngineService] Failed to fetch move from server:', error)
      }
      throw error
    } finally {
      this.isThinking = false
    }
  }

  public async evaluateThreats(
    fen: string,
    depth: number = 10,
  ): Promise<CevaliteEvaluationResponse> {
    if (!authService.getIsAuthenticated()) {
      logger.error('[ServerEngineService] User is not authenticated. Request rejected.')
      return Promise.reject(new Error('User not authenticated'))
    }

    const url = `${BACKEND_API_URL}/bestmove/evaluate/threats`
    logger.debug(`[ServerEngineService] Requesting evaluation for FEN: ${fen}`)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fen, depth }),
        credentials: 'include',
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Evaluation service returned an error: ${response.status} - ${errorText}`,
        )
      }

      const data = await response.json()
      return Array.isArray(data) ? data[0] : data
    } catch (error) {
      logger.error('[ServerEngineService] Failed to fetch evaluation from server:', error)
      throw error
    }
  }

  public terminate(): void {
    logger.info('[ServerEngineService] Terminate called (no-op for server implementation).')
  }
}

export const serverEngineService = new ServerEngineServiceController()