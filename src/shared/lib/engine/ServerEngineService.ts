// src/services/ServerEngineService.ts
import logger from '@/shared/lib/logger'

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL as string
const SERVER_ENGINE_ENDPOINT = `${BACKEND_API_URL}/bestmove`
const MOVE_TIMEOUT_MS = 15000



export interface AnalysisResponse {
  quality: {
    verbal_score: string
    nag: string
    accuracy: number
    tags: string[]
    best_sf_move: string
  }
  evaluation: {
    cp: number
    win_prob: number
    wdl: number[]
    depth: number
    lines: Array<{
      pv: string
      pv_san: string
      cp: number
      win_prob: number
      wdl?: number[]
    }>
  }
}

export class ServerEngineServiceController {
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

    this.isThinking = true
    logger.info(
      `[ServerEngineService] Requesting move for FEN: ${fen} using engine: ${engine_name}`,
    )

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), MOVE_TIMEOUT_MS)

      const params = new URLSearchParams({
        fen: fen,
        engine_name: engine_name,
      })
      const url = `${SERVER_ENGINE_ENDPOINT}?${params.toString()}`

      const response = await fetch(url, {
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

  public async analyzeMove(
    fen_before: string,
    move_uci: string,
    depth: number = 10,
    multipv: number = 2,
    time_limit: number = 200,
  ): Promise<AnalysisResponse> {
    const url = `${BACKEND_API_URL}/engine-eval/analyze`
    logger.debug(`[ServerEngineService] Requesting analysis for move: ${move_uci}`)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fen_before,
          move_uci,
          depth,
          multipv,
          time_limit,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Analysis service returned an error: ${response.status} - ${errorText}`)
      }

      return (await response.json()) as AnalysisResponse
    } catch (error) {
      logger.error('[ServerEngineService] Failed to fetch analysis from server:', error)
      throw error
    }
  }


  public terminate(): void {
    logger.info('[ServerEngineService] Terminate called (no-op for server implementation).')
  }
}

export const serverEngineService = new ServerEngineServiceController()
