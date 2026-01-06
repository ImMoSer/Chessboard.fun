// src/services/ServerEngineService.ts
import logger from '../utils/logger';
import { authService } from './AuthService';

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL as string;
// Эндпоинт изменен на /bestmove в соответствии с новым API
const SERVER_ENGINE_ENDPOINT = `${BACKEND_API_URL}/bestmove`;
const MOVE_TIMEOUT_MS = 15000;

class ServerEngineServiceController {
  private isThinking = false;

  constructor() {
    logger.info(`[ServerEngineService] Initialized to work with Backend at: ${SERVER_ENGINE_ENDPOINT}`);
  }

  // modelId теперь соответствует параметру engine_name
  public async getMoveFromServer(fen: string, engine_name: string): Promise<string | null> {
    if (this.isThinking) {
      logger.warn('[ServerEngineService] getMoveFromServer called while already thinking. Request rejected.');
      return Promise.reject(new Error('ServerEngineService is already processing a request.'));
    }

    if (!authService.getIsAuthenticated()) {
      logger.error('[ServerEngineService] User is not authenticated. Request rejected.');
      return Promise.reject(new Error('User not authenticated'));
    }

    this.isThinking = true;
    // Логируем engine_name для ясности
    logger.info(`[ServerEngineService] Requesting move for FEN: ${fen} using engine: ${engine_name}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MOVE_TIMEOUT_MS);

      // Формируем URL с обязательными query-параметрами
      const url = new URL(SERVER_ENGINE_ENDPOINT);
      url.searchParams.append('fen', fen);
      url.searchParams.append('engine_name', engine_name);

      // Выполняем GET-запрос
      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
        credentials: 'include',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server engine returned an error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const bestMove = data.bestMove || null;

      logger.info(`[ServerEngineService] Received best move: ${bestMove}`);
      return bestMove;

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error(`[ServerEngineService] Request timed out after ${MOVE_TIMEOUT_MS}ms.`);
      } else {
        logger.error('[ServerEngineService] Failed to fetch move from server:', error);
      }
      throw error;
    } finally {
      this.isThinking = false;
    }
  }

  public terminate(): void {
    logger.info('[ServerEngineService] Terminate called (no-op for server implementation).');
  }
}

export const serverEngineService = new ServerEngineServiceController();
