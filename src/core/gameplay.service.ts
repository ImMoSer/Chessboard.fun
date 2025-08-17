// src/core/gameplay.service.ts
import logger from '../utils/logger';
import { StockfishManager } from './stockfish-manager.service';
import { serverEngineService } from './serverEngine.service';

export type EngineId =
  | 'SF_1600'
  | 'SF_1700'
  | 'SF_1900'
  | 'SF_2100'
  | 'SF_2200'
  | 'MOZER_1900+';

const FALLBACK_ENGINE_ID = 'FALLBACK_LOCAL_SF_10';
type InternalEngineId = EngineId | typeof FALLBACK_ENGINE_ID;

type EngineType = 'local' | 'server';

interface EngineConfig {
  type: EngineType;
  depth?: number;
  model?: string;
  fallback?: InternalEngineId;
}

const FALLBACK_TIMEOUT_MS = 500;

const engineConfigs: Record<InternalEngineId, EngineConfig> = {
  'SF_1600': { type: 'server', model: 'sf1600', fallback: FALLBACK_ENGINE_ID },
  'SF_1700': { type: 'server', model: 'sf1700', fallback: FALLBACK_ENGINE_ID },
  'SF_1900': { type: 'server', model: 'sf1900', fallback: FALLBACK_ENGINE_ID },
  'SF_2100': { type: 'server', model: 'sf2100', fallback: FALLBACK_ENGINE_ID },
  'SF_2200': { type: 'server', model: 'sf2200', fallback: FALLBACK_ENGINE_ID },
  'MOZER_1900+': { type: 'server', model: 'maia', fallback: FALLBACK_ENGINE_ID },
  [FALLBACK_ENGINE_ID]: { type: 'local', depth: 5 },
};

export class GameplayServiceController {

  constructor() {
    logger.info('[GameplayService] Initialized. Now using StockfishManager for local fallback.');
  }

  public async getBestMove(engineId: EngineId, fen: string): Promise<string | null> {
    const config = engineConfigs[engineId];
    if (!config) {
      logger.error(`[GameplayService] Unknown engineId: ${engineId}.`);
      return null;
    }

    if (config.type === 'server' && config.model) {
      logger.info(`[GameplayService] Using server engine ${engineId} (model: ${config.model})`);
      return this.getMoveWithFallback(fen, config.model, config.fallback);
    }
    
    if (config.type === 'local' && config.depth) {
      logger.warn(`[GameplayService] Directly calling local engine ${engineId} with depth ${config.depth}. Should only happen for fallback.`);
      return StockfishManager.getBestMoveOnly(fen, { depth: config.depth });
    }

    logger.error(`[GameplayService] Invalid configuration for engineId: ${engineId}`);
    return null;
  }

  private async getMoveWithFallback(fen: string, modelId: string, fallbackId?: InternalEngineId): Promise<string | null> {
    let result: string | null = null;
    try {
        const serverPromise = serverEngineService.getMoveFromServer(fen, modelId);
        
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), FALLBACK_TIMEOUT_MS);
        });
    
        result = await Promise.race([serverPromise, timeoutPromise]);

        if (result !== null) {
          logger.info(`[GameplayService] Server engine responded in time with move: ${result}`);
          return result;
        }
    } catch (error) {
        logger.error(`[GameplayService] Server engine request for model ${modelId} failed:`, error);
    }

    if (result === null) {
        logger.warn(`[GameplayService] Server engine for model ${modelId} failed or timed out. Using fallback.`);
        
        if (fallbackId) {
          const fallbackConfig = engineConfigs[fallbackId];
          if (fallbackConfig && fallbackConfig.type === 'local' && fallbackConfig.depth) {
            logger.info(`[GameplayService] Executing fallback engine ${fallbackId} with depth ${fallbackConfig.depth}`);
            return StockfishManager.getBestMoveOnly(fen, { depth: fallbackConfig.depth });
          }
        }
        
        logger.error(`[GameplayService] Fallback failed: no valid fallbackId or config found for ${modelId}.`);
        return null;
    }

    return result;
  }
}

export const gameplayService = new GameplayServiceController();
