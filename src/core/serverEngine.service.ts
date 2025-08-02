// src/core/serverEngine.service.ts
import logger from '../utils/logger';
import { AuthService } from './auth.service';

// --- ИЗМЕНЕНО: URL теперь указывает на наш основной бэкенд ---
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL as string;
const SERVER_ENGINE_ENDPOINT = `${BACKEND_API_URL}/engine/move`;

const MOVE_TIMEOUT_MS = 15000; // Общий таймаут запроса

class ServerEngineServiceController {
  private isThinking = false;

  constructor() {
    logger.info(`[ServerEngineService] Initialized to work with Backend at: ${SERVER_ENGINE_ENDPOINT}`);
  }

  /**
   * Запрашивает ход у бэкенд-сервиса, указывая конкретную модель.
   * @param fen FEN-строка текущей позиции.
   * @param modelId Идентификатор модели движка (например, 'MOZER_1900+').
   * @returns Промис, который разрешается строкой с ходом в UCI-формате или null в случае ошибки.
   */
  public async getMoveFromServer(fen: string, modelId: string): Promise<string | null> {
    if (this.isThinking) {
      logger.warn('[ServerEngineService] getMoveFromServer called while already thinking. Request rejected.');
      return Promise.reject(new Error('ServerEngineService is already processing a request.'));
    }

    // --- ИЗМЕНЕНО: Проверка авторизации через AuthService ---
    if (!AuthService.getIsAuthenticated()) {
        logger.error('[ServerEngineService] User is not authenticated. Request rejected.');
        return Promise.reject(new Error('User not authenticated'));
    }

    this.isThinking = true;
    logger.info(`[ServerEngineService] Requesting move for FEN: ${fen} using model: ${modelId}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MOVE_TIMEOUT_MS);

      // --- ИЗМЕНЕНО: Запрос идет на новый эндпоинт, заголовки авторизации больше не нужны ---
      // Браузер автоматически отправит cookie 'app_session_token'
      const response = await fetch(SERVER_ENGINE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fen, model: modelId }),
        signal: controller.signal,
        credentials: 'include', // <-- ВАЖНО: для отправки cookie
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

    } catch (error: any) {
      if (error.name === 'AbortError') {
        logger.error(`[ServerEngineService] Request timed out after ${MOVE_TIMEOUT_MS}ms.`);
      } else {
        logger.error('[ServerEngineService] Failed to fetch move from server:', error);
      }
      return null;
    } finally {
      this.isThinking = false;
    }
  }

  public terminate(): void {
    logger.info('[ServerEngineService] Terminate called (no-op for server implementation).');
  }
}

export const serverEngineService = new ServerEngineServiceController();
