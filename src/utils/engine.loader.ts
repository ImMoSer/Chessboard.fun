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

export function loadSingleThreadEngine(): Promise<EngineController> {
  // Используем Lite Single версию из npm пакета stockfish
  const loaderPath = '/stockfish/single/stockfish-17.1-lite-single-03e3232.js'
  logger.info(`[EngineLoader] Loading single-threaded engine from ${loaderPath}`)
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(loaderPath)

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
 * Интерфейс модуля Stockfish от Lichess.
 * Они используют метод uci() для отправки команд вместо postMessage.
 */
interface LichessModule {
  uci(command: string): void
  setNnueBuffer(buffer: ArrayBuffer): void
  getRecommendedNnue?(): string
  addMessageListener?: never // Этого метода нет в оригинале
  postMessage?: never      // Этого метода нет в оригинале
}

/**
 * Загружает и инициализирует многопоточную версию движка Stockfish (NNUE).
 * @returns {Promise<EngineController | null>} Промис, который разрешается контроллером движка или null.
 */
export function loadMultiThreadEngine(): Promise<EngineController | null> {
  const isCrossOriginIsolated = window.crossOriginIsolated
  if (!isCrossOriginIsolated) {
    logger.warn(`[EngineLoader] Multi-threaded engine not supported: crossOriginIsolated is false.`)
    return Promise.resolve(null)
  }

  // Путь к основному движку с вшитой сетью (Lichess SmallNet)
  const loaderPath = '/stockfish/nnue/sf_18_smallnet.js'

  logger.info(`[EngineLoader] Loading multi-threaded engine (NNUE) from ${loaderPath}`)
  
  return new Promise(async (resolve, reject) => {
    try {
      // Используем динамический импорт для загрузки ESM модуля
      const module = await import(/* @vite-ignore */ loaderPath)
      
      // Lichess stockfish-web экспортирует фабрику как default export
      const StockfishFactory = module.default || module.Stockfish || module
      
      if (typeof StockfishFactory !== 'function') {
        throw new Error('[EngineLoader] Stockfish factory is not a function.')
      }

      logger.info('[EngineLoader] Multi-threaded loader module imported.')

      // Массив подписчиков на сообщения от движка
      const listeners: ((message: string) => void)[] = []

      try {
        // Инициализируем движок.
        // Передаем callback 'listen', который будет транслировать сообщения нашим подписчикам.
        const engineInstance = await StockfishFactory({
          locateFile: (path: string, prefix: string) => {
            if (path.endsWith('.wasm')) {
              return `/stockfish/nnue/${path}`
            }
            return prefix + path
          },
          listen: (line: string) => {
             listeners.forEach((callback) => callback(line))
          }
        }) as LichessModule
        
        logger.info('[EngineLoader] Multi-threaded Stockfish instance created successfully.')
        
        // Получаем рекомендуемое имя файла от самого движка
        let nnueFileName = 'nn-4ca89e4b3abf.nnue' // Fallback
        if (typeof engineInstance.getRecommendedNnue === 'function') {
          try {
            nnueFileName = engineInstance.getRecommendedNnue()
            logger.info(`[EngineLoader] Engine recommended NNUE file: ${nnueFileName}`)
          } catch (e) {
            logger.warn('[EngineLoader] Failed to get recommended NNUE name, using fallback.', e)
          }
        }
        
        const nnuePath = `/stockfish/nnue/${nnueFileName}`

        // Load and set NNUE network
        try {
          logger.info(`[EngineLoader] Fetching NNUE file from ${nnuePath}...`)
          const response = await fetch(nnuePath)
          if (!response.ok) {
             if (response.status === 404) {
               logger.error(`[EngineLoader] NNUE file not found! Please download ${nnueFileName} and place it in public/stockfish/nnue/`)
             }
            throw new Error(`Failed to fetch NNUE file: ${response.status} ${response.statusText}`)
          }
          const buffer = await response.arrayBuffer()
          logger.info(`[EngineLoader] NNUE file fetched (${buffer.byteLength} bytes). Setting buffer...`)
          
          if (typeof engineInstance.setNnueBuffer === 'function') {
             engineInstance.setNnueBuffer(new Uint8Array(buffer))
             logger.info('[EngineLoader] NNUE buffer set successfully.')
          } else {
             logger.warn('[EngineLoader] setNnueBuffer function not found on engine instance!')
          }

        } catch (nnueError) {
          logger.error('[EngineLoader] Critical error loading NNUE file:', nnueError)
          // Можно реджектить, если без сети движок бесполезен
          reject(nnueError)
          return
        }
        
        // Создаем адаптер, чтобы движок выглядел как EngineController
        const engineAdapter: EngineController = {
          postMessage: (command: string) => {
            engineInstance.uci(command)
          },
          addMessageListener: (callback: (message: string) => void) => {
            listeners.push(callback)
          },
          terminate: () => {
            // Прямого метода terminate у WASM модуля обычно нет, если он запущен в главном потоке.
            // Можно просто очистить слушателей.
            listeners.length = 0
            logger.warn('[EngineLoader] Terminate called on main-thread WASM engine (no-op).')
          }
        }

        resolve(engineAdapter)
      } catch (error) {
        logger.error(
          '[EngineLoader] Error initializing multi-threaded Stockfish instance.',
          error,
        )
        reject(error)
      }

    } catch (error) {
      logger.error(`[EngineLoader] Failed to load module: ${loaderPath}`, error)
      reject(error)
    }
  })
}
