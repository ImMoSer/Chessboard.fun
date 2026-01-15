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

export type EngineProfile = 'lite' | 'pro'

interface EngineConfig {
  loaderPath: string
  networkPath?: string
  networkFilename?: string
}

const ENGINE_CONFIGS: Record<EngineProfile, EngineConfig> = {
  lite: {
    loaderPath: '/stockfish_nnue/stockfish.js',
    networkPath: '/stockfish_nnue/nn-4fd273888b72.nnue',
    networkFilename: 'nn-4fd273888b72.nnue',
  },
  pro: {
    loaderPath: '/stockfish_nnue_big/stockfish.js',
    // Big engine has embedded network nn-ac5605a608d6.nnue
  },
}

export function loadSingleThreadEngine(): Promise<EngineController> {
  const loaderPath = '/stockfish_single/stockfish.js'
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
 * Загружает и инициализирует многопоточную версию движка Stockfish.
 * Возвращает null, если среда не поддерживает многопоточность (crossOriginIsolated = false).
 * @returns {Promise<EngineController | null>} Промис, который разрешается контроллером движка или null.
 */
export function loadMultiThreadEngine(profile: EngineProfile = 'lite'): Promise<EngineController | null> {
  const isCrossOriginIsolated = window.crossOriginIsolated
  if (!isCrossOriginIsolated) {
    logger.warn(`[EngineLoader] Multi-threaded engine not supported: crossOriginIsolated is false.`)
    return Promise.resolve(null)
  }

  const config = ENGINE_CONFIGS[profile]
  logger.info(`[EngineLoader] Loading multi-threaded engine (${profile}) from ${config.loaderPath}`)
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = config.loaderPath
    script.async = true
    script.onload = async () => {
      logger.info('[EngineLoader] Multi-threaded loader script loaded.')
      if (typeof window.Stockfish === 'function') {
        try {
          const engine = await window.Stockfish()
          logger.info('[EngineLoader] Multi-threaded Stockfish instance created successfully.')

          // Загружаем NNUE сеть, если она указана в конфиге
          if (config.networkPath && config.networkFilename) {
            try {
              logger.info(`[EngineLoader] Fetching NNUE network from ${config.networkPath}...`)
              const response = await fetch(config.networkPath)
              if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

              const buffer = await response.arrayBuffer()
              const uint8Array = new Uint8Array(buffer)
              const FS = (engine as any).FS

              if (FS) {
                const filename = `/${config.networkFilename}`
                FS.writeFile(filename, uint8Array)

                // Проверка наличия файла
                try {
                  const stat = FS.stat(filename)
                  logger.info(`[EngineLoader] NNUE file verified in FS: ${filename}, size: ${stat.size}`)
                } catch {
                  logger.error(`[EngineLoader] NNUE file verification failed: ${filename}`)
                }

                engine.postMessage(`setoption name EvalFile value ${filename}`)
                logger.info(`[EngineLoader] NNUE network option set: ${filename}`)
              } else {
                logger.warn('[EngineLoader] Emscripten FS not found on engine instance.')
              }
            } catch (nnueError) {
              logger.error(`[EngineLoader] Failed to load/init NNUE network (${profile}):`, nnueError)
            }
          }

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
      reject(new Error(`[EngineLoader] Failed to load script: ${config.loaderPath}`))
    }
    document.head.appendChild(script)
  })
}
