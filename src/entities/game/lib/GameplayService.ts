// src/services/GameplayService.ts
import { serverEngineService, singleThreadEngineManager } from '@/shared/lib/engine'
import logger from '@/shared/lib/logger'
import type { EngineId } from '@/shared/types/api.types'

type EngineType = 'local' | 'server'

interface EngineConfig {
  type: EngineType
  // Для локального движка
  depth?: number
  // Для серверного движка
  model?: string
  fallback?: boolean // Используем ли локальный движок как фолбэк
}

const FALLBACK_TIMEOUT_MS = 1500

// --- НОВАЯ КОНФИГУРАЦИЯ ДВИЖКОВ ---
export const engineConfigs: Record<EngineId, EngineConfig> = {
  'SF_2200': { type: 'local', depth: 10 },
  'maia-1900': { type: 'server', model: 'maia-1900', fallback: true },
  'maia-2200': { type: 'server', model: 'maia-2200', fallback: true },
  'maia-2400': { type: 'server', model: 'maia-2400', fallback: true },
}



class GameplayServiceController {
  constructor() {
    logger.info('[GameplayService] Initialized with new local engine configurations.')
    // Asynchronously pre-load the engine in the background to avoid delay during first fallback
    singleThreadEngineManager.ensureReady().catch((err) => {
      logger.warn('[GameplayService] Early engine pre-loading failed.', err)
    })
  }

  public async getBestMove(engineId: EngineId, fen: string): Promise<string | null> {
    const config = engineConfigs[engineId]
    if (!config) {
      logger.error(`[GameplayService] Unknown engineId: ${engineId}.`)
      return null
    }

    // --- ЛОГИКА ДЛЯ ЛОКАЛЬНЫХ ДВИЖКОВ ---
    if (config.type === 'local' && config.depth !== undefined) {
      logger.info(
        `[GameplayService] Using local engine for ${engineId} with depth ${config.depth}`
      )
      try {
        await singleThreadEngineManager.ensureReady()
        return await singleThreadEngineManager.getBestMoveOnly(fen, { depth: config.depth })
      } catch (error) {
        logger.error(`[GameplayService] Local engine failed for ${engineId}:`, error)
        return null // В случае ошибки локального движка, ход не будет сделан
      }
    }

    // --- ЛОГИКА ДЛЯ СЕРВЕРНОГО ДВИЖКА ---
    if (config.type === 'server' && config.model) {
      logger.info(`[GameplayService] Using server engine ${engineId} (model: ${config.model})`)
      return this.getMoveWithFallback(fen, config.model)
    }

    logger.error(`[GameplayService] Invalid configuration for engineId: ${engineId}`)
    return null
  }

  private async getMoveWithFallback(fen: string, modelId: string): Promise<string | null> {
    const controller = new AbortController()
    let fallbackTimer: number | null = null

    try {
      const serverPromise = serverEngineService.getMoveFromServer(fen, modelId, controller.signal)

      const timeoutPromise = new Promise<null>((resolve) => {
        fallbackTimer = window.setTimeout(() => resolve(null), FALLBACK_TIMEOUT_MS)
      })

      const result = await Promise.race([serverPromise, timeoutPromise])

      if (fallbackTimer) clearTimeout(fallbackTimer)

      if (result !== null) {
        logger.info(`[GameplayService] Server engine responded in time with move: ${result}`)
        return result
      }

      // If we are here, the timeoutPromise won. Cancel the server request.
      controller.abort()
      logger.warn(`[GameplayService] Server engine timed out after ${FALLBACK_TIMEOUT_MS}ms. Aborting request.`)

    } catch (error: unknown) {
      if (fallbackTimer) clearTimeout(fallbackTimer)

      if (error instanceof Error && error.name === 'AbortError') {
        // This was our own abort, we already logged the warning above.
      } else {
        logger.error(`[GameplayService] Server engine request for model ${modelId} failed:`, error)
      }
    }

    logger.warn(`[GameplayService] Falling back to local engine.`)
    // В качестве фолбэка используем среднюю силу
    await singleThreadEngineManager.ensureReady()
    return singleThreadEngineManager.getBestMoveOnly(fen, { depth: 8 })
  }
}

export const gameplayService = new GameplayServiceController()
