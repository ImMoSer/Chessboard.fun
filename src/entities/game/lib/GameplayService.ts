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
  'badgyal-8': { type: 'server', model: 'badgyal-8', fallback: true },
  'elite_2400': { type: 'server', model: 'elite_2400', fallback: true },
}



class GameplayServiceController {
  constructor() {
    logger.info('[GameplayService] Initialized with new local engine configurations.')
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
    let fallbackTimer: number | null = null

    try {
      const serverPromise = serverEngineService.getMoveFromServer(fen, modelId)

      const timeoutPromise = new Promise<null>((resolve) => {
        fallbackTimer = window.setTimeout(() => resolve(null), FALLBACK_TIMEOUT_MS)
      })

      const result = await Promise.race([serverPromise, timeoutPromise])

      if (fallbackTimer) clearTimeout(fallbackTimer)

      if (result !== null) {
        logger.info(`[GameplayService] Server engine responded in time with move: ${result}`)
        return result
      }
    } catch (error) {
      if (fallbackTimer) clearTimeout(fallbackTimer)
      logger.error(`[GameplayService] Server engine request for model ${modelId} failed:`, error)
    }

    logger.warn(`[GameplayService] Server engine failed or timed out. Using local fallback.`)
    // В качестве фолбэка используем среднюю силу
    return singleThreadEngineManager.getBestMoveOnly(fen, { depth: 8 })
  }
}

export const gameplayService = new GameplayServiceController()
