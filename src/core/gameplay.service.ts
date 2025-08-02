// src/core/gameplay.service.ts
import logger from '../utils/logger';
import { StockfishService } from './stockfish.service';
import { serverEngineService } from './serverEngine.service';

// 1. Обновляем EngineId в соответствии с новыми серверными движками
export type EngineId =
  | 'SF_1600'
  | 'SF_1700'
  | 'SF_1900'
  | 'SF_2100'
  | 'SF_2200'
  | 'MOZER_1900+';

// 3. Добавляем внутренний ID для универсального fallback-движка
const FALLBACK_ENGINE_ID = 'FALLBACK_LOCAL_SF_10';
type InternalEngineId = EngineId | typeof FALLBACK_ENGINE_ID;

type EngineType = 'local' | 'server';

interface EngineConfig {
  type: EngineType;
  depth?: number; // для локального Stockfish
  model?: string; // для серверных движков
  fallback?: InternalEngineId; // движок на случай отказа сервера
}

const FALLBACK_TIMEOUT_MS = 1000;

// 2. Обновляем конфигурацию движков
const engineConfigs: Record<InternalEngineId, EngineConfig> = {
  // Новые серверные движки Stockfish
  'SF_1600': { type: 'server', model: 'sf1600', fallback: FALLBACK_ENGINE_ID },
  'SF_1700': { type: 'server', model: 'sf1700', fallback: FALLBACK_ENGINE_ID },
  'SF_1900': { type: 'server', model: 'sf1900', fallback: FALLBACK_ENGINE_ID },
  'SF_2100': { type: 'server', model: 'sf2100', fallback: FALLBACK_ENGINE_ID },
  'SF_2200': { type: 'server', model: 'sf2200', fallback: FALLBACK_ENGINE_ID },
  
  // ИЗМЕНЕНО: Модель для MOZER_1900+ теперь 'maia' в соответствии с документацией
  'MOZER_1900+': { type: 'server', model: 'maia', fallback: FALLBACK_ENGINE_ID },

  // 3. Универсальный локальный fallback-движок (не виден пользователю)
  [FALLBACK_ENGINE_ID]: { type: 'local', depth: 10 },
};

export class GameplayServiceController {
  private stockfishService: StockfishService;

  constructor() {
    // GameplayService использует существующий синглтон StockfishService для fallback'а
    this.stockfishService = new StockfishService();
    logger.info('[GameplayService] Initialized.');
  }

  public async getBestMove(engineId: EngineId, fen: string): Promise<string | null> {
    const config = engineConfigs[engineId];
    if (!config) {
      logger.error(`[GameplayService] Unknown engineId: ${engineId}.`);
      return null;
    }

    // 4. Логика теперь едина для всех серверных движков
    if (config.type === 'server' && config.model) {
      logger.info(`[GameplayService] Using server engine ${engineId} (model: ${config.model})`);
      return this.getMoveWithFallback(fen, config.model, config.fallback);
    }
    
    // Этот код больше не должен вызываться для движков, выбираемых пользователем,
    // а только для внутреннего fallback-механизма.
    if (config.type === 'local' && config.depth) {
      logger.warn(`[GameplayService] Directly calling local engine ${engineId} with depth ${config.depth}. Should only happen for fallback.`);
      return this.stockfishService.getBestMoveOnly(fen, { depth: config.depth });
    }

    logger.error(`[GameplayService] Invalid configuration for engineId: ${engineId}`);
    return null;
  }

  // 4. Метод getMoveWithFallback теперь универсален для всех серверных движков
  private async getMoveWithFallback(fen: string, modelId: string, fallbackId?: InternalEngineId): Promise<string | null> {
    const serverPromise = serverEngineService.getMoveFromServer(fen, modelId);
    
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), FALLBACK_TIMEOUT_MS);
    });

    const result = await Promise.race([serverPromise, timeoutPromise]);

    if (result !== null) {
      logger.info(`[GameplayService] Server engine responded in time with move: ${result}`);
      return result;
    }

    logger.warn(`[GameplayService] Server engine for model ${modelId} timed out. Using fallback.`);
    
    if (fallbackId) {
      const fallbackConfig = engineConfigs[fallbackId];
      if (fallbackConfig && fallbackConfig.type === 'local' && fallbackConfig.depth) {
        logger.info(`[GameplayService] Executing fallback engine ${fallbackId} with depth ${fallbackConfig.depth}`);
        return this.stockfishService.getBestMoveOnly(fen, { depth: fallbackConfig.depth });
      }
    }
    
    logger.error(`[GameplayService] Fallback failed: no valid fallbackId or config found for ${modelId}.`);
    return null;
  }
}

export const gameplayService = new GameplayServiceController();
