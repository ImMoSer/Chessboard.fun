// src/core/engine.loader.ts
import logger from '../utils/logger';

/**
 * Унифицированный интерфейс для контроллера движка Stockfish.
 * Обе версии (многопоточная и однопоточная обертка) будут его реализовывать.
 */
export interface EngineController {
  postMessage(command: string): void;
  addMessageListener(callback: (message: string) => void): void;
  terminate?(): void; // terminate может отсутствовать в старом API
}

const MULTI_THREAD_LOADER_PATH = '/stockfish_wasm/stockfish.js';
const SINGLE_THREAD_WORKER_PATH = '/stockfish_single/stockfish.js';

/**
 * Динамически загружает и инициализирует подходящую версию движка Stockfish.
 * @returns {Promise<EngineController>} Промис, который разрешается унифицированным контроллером движка.
 */
export async function loadEngine(): Promise<EngineController> {
  const isCrossOriginIsolated = window.crossOriginIsolated;
  logger.info(`[EngineLoader] Environment check: crossOriginIsolated is ${isCrossOriginIsolated}.`);

  if (isCrossOriginIsolated) {
    // --- Сценарий 1: Браузер с поддержкой многопоточности ---
    logger.info(`[EngineLoader] Loading multi-threaded engine from ${MULTI_THREAD_LOADER_PATH}`);
    return new Promise((resolve, reject) => {
      // 1. Динамически загружаем скрипт-обертку
      const script = document.createElement('script');
      script.src = MULTI_THREAD_LOADER_PATH;
      script.async = true;
      script.onload = async () => {
        logger.info('[EngineLoader] Multi-threaded loader script loaded.');
        // 2. Проверяем, появилась ли глобальная фабрика Stockfish
        if (typeof (window as any).Stockfish === 'function') {
          try {
            // 3. Вызываем фабрику для получения контроллера
            const engine = await (window as any).Stockfish();
            logger.info('[EngineLoader] Multi-threaded Stockfish instance created successfully.');
            resolve(engine as EngineController);
          } catch (error) {
            logger.error('[EngineLoader] Error initializing multi-threaded Stockfish instance.', error);
            reject(error);
          }
        } else {
          reject(new Error('[EngineLoader] Stockfish factory function not found on window after script load.'));
        }
      };
      script.onerror = () => {
        reject(new Error(`[EngineLoader] Failed to load script: ${MULTI_THREAD_LOADER_PATH}`));
      };
      document.head.appendChild(script);
    });
  } else {
    // --- Сценарий 2: Telegram Mini App или браузер без COOP/COEP ---
    logger.info(`[EngineLoader] Loading single-threaded engine from ${SINGLE_THREAD_WORKER_PATH}`);
    return new Promise((resolve, reject) => {
      try {
        // 1. Напрямую создаем Worker, как в старом коде
        const worker = new Worker(SINGLE_THREAD_WORKER_PATH);

        // 2. Создаем объект-обертку (адаптер), чтобы его API соответствовало EngineController
        const engineWrapper: EngineController = {
          postMessage(command: string) {
            worker.postMessage(command);
          },
          addMessageListener(callback: (message: string) => void) {
            worker.onmessage = (event: MessageEvent) => {
              callback(event.data);
            };
          },
          terminate() {
            worker.terminate();
          }
        };
        worker.onerror = (err) => {
            logger.error('[EngineLoader] Single-threaded worker error.', err);
            reject(err);
        };
        logger.info('[EngineLoader] Single-threaded worker and wrapper created successfully.');
        resolve(engineWrapper);
      } catch (error) {
        logger.error('[EngineLoader] Error creating single-threaded worker.', error);
        reject(error);
      }
    });
  }
}
