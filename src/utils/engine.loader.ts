// src/utils/engine.loader.ts
import logger from './logger'

declare global {
  interface Window {
    Stockfish?: () => Promise<EngineController>
  }
}

/**
 * Унифицированный интерфейс для контроллера движка Stockfish.
 * Обе версии (многопоточная и однопоточная обертка) будут его реализовывать.
 */
export interface EngineController {
  postMessage(command: string): void
  addMessageListener(callback: (message: string) => void): void
  terminate?(): void
}

const MULTI_THREAD_LOADER_PATH = '/stockfish_wasm/stockfish.js'
const SINGLE_THREAD_WORKER_PATH = '/stockfish_single/stockfish.js'

/**
 * Загружает и инициализирует однопоточную версию движка Stockfish.
 * Эта версия гарантированно работает во всех средах, включая Telegram Mini App.
 * @returns {Promise<EngineController>} Промис, который разрешается контроллером движка.
 */
export function loadSingleThreadEngine(): Promise<EngineController> {
  logger.info(`[EngineLoader] Loading single-threaded engine from ${SINGLE_THREAD_WORKER_PATH}`)
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(SINGLE_THREAD_WORKER_PATH)

      const engineWrapper: EngineController = {
        postMessage(command: string) {
          worker.postMessage(command)
        },
        addMessageListener(callback: (message: string) => void) {
          worker.onmessage = (event: MessageEvent) => {
            callback(event.data)
          }
        },
        terminate() {
          worker.terminate()
        },
      }
      worker.onerror = (err) => {
        logger.error('[EngineLoader] Single-threaded worker error.', err)
        reject(err)
      }
      logger.info('[EngineLoader] Single-threaded worker and wrapper created successfully.')
      resolve(engineWrapper)
    } catch (error) {
      logger.error('[EngineLoader] Error creating single-threaded worker.', error)
      reject(error)
    }
  })
}

/**
 * Загружает и инициализирует многопоточную версию движка Stockfish.
 * Возвращает null, если среда не поддерживает многопоточность (crossOriginIsolated = false).
 * @returns {Promise<EngineController | null>} Промис, который разрешается контроллером движка или null.
 */
export function loadMultiThreadEngine(): Promise<EngineController | null> {
  const isCrossOriginIsolated = window.crossOriginIsolated
  if (!isCrossOriginIsolated) {
    logger.warn(`[EngineLoader] Multi-threaded engine not supported: crossOriginIsolated is false.`)
    return Promise.resolve(null)
  }

  logger.info(`[EngineLoader] Loading multi-threaded engine from ${MULTI_THREAD_LOADER_PATH}`)
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = MULTI_THREAD_LOADER_PATH
    script.async = true
    script.onload = async () => {
      logger.info('[EngineLoader] Multi-threaded loader script loaded.')
      if (typeof window.Stockfish === 'function') {
        try {
          const engine = await window.Stockfish()
          logger.info('[EngineLoader] Multi-threaded Stockfish instance created successfully.')
          resolve(engine as EngineController)
        } catch (error) {
          logger.error('[EngineLoader] Error initializing multi-threaded Stockfish instance.', error)
          reject(error)
        }
      } else {
        reject(
          new Error('[EngineLoader] Stockfish factory function not found on window after script load.'),
        )
      }
    }
    script.onerror = () => {
      reject(new Error(`[EngineLoader] Failed to load script: ${MULTI_THREAD_LOADER_PATH}`))
    }
    document.head.appendChild(script)
  })
}
