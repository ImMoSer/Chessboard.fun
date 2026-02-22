// src/services/GameplayService.ts
import { serverEngineService, singleThreadEngineManager } from '@/entities/engine'
import logger from '@/shared/lib/logger'
import type { EngineId } from '@/shared/types/api.types'

type EngineType = 'local' | 'server'

interface EngineConfig {
  type: EngineType
  // Для локального движка
  depth?: number
  contempt?: number
  // Для серверного движка
  model?: string
  fallback?: boolean // Используем ли локальный движок как фолбэк
}

const FALLBACK_TIMEOUT_MS = 1500

// --- НОВАЯ КОНФИГУРАЦИЯ ДВИЖКОВ ---
export const engineConfigs: Record<EngineId, EngineConfig> = {
  SF_2200: { type: 'local', depth: 10, contempt: 100 },
  MOZER_1900: { type: 'server', model: 'maia_1900', fallback: true },
  MOZER_2000: { type: 'server', model: 'mozer_2000', fallback: true },
  maia_2200: { type: 'server', model: 'maia_2200', fallback: true },
}

export function isServerEngine(engineId: EngineId): boolean {
  return engineConfigs[engineId]?.type === 'server'
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
    if (config.type === 'local' && config.depth !== undefined && config.contempt !== undefined) {
      logger.info(
        `[GameplayService] Using local engine for ${engineId} with depth ${config.depth} and contempt ${config.contempt}`,
      )
      try {
        // Устанавливаем "агрессивность" перед каждым ходом
        await singleThreadEngineManager.setOption('Contempt', config.contempt)
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
