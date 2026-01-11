// src/services/MultiThreadEngineManager.ts
import { loadMultiThreadEngine, type EngineController, type EngineProfile } from '../utils/engine.loader'
import logger from '../utils/logger'

// --- Интерфейсы для анализа ---
export interface ScoreInfo {
  type: 'cp' | 'mate'
  value: number
}

export interface EvaluatedLine {
  id: number
  depth: number
  score: ScoreInfo
  pvUci: string[]
}

export type AnalysisUpdateCallback = (lines: EvaluatedLine[], bestMoveUci?: string | null) => void

/**
 * Сервис, управляющий экземпляром МНОГОПОТОЧНОГО движка для анализа.
 * Если многопоточность не поддерживается, движок не будет загружен.
 */
class MultiThreadEngineManagerController {
  private engine: EngineController | null = null
  private isSupported = false
  private isReady = false
  private isInitializing = false
  private initPromise: Promise<void> | null = null
  private currentProfile: EngineProfile = 'lite'
  private resolveInitPromise!: () => void
  private rejectInitPromise!: (reason?: unknown) => void

  private commandQueue: string[] = []
  private infiniteAnalysisCallback: AnalysisUpdateCallback | null = null

  constructor() {
    logger.info('[MultiThreadEngineManager] Service created. Engine will be loaded on demand.')
  }

  public async ensureReady(): Promise<void> {
    if (this.isReady) return
    if (this.isInitializing && this.initPromise) return this.initPromise

    this.isInitializing = true
    this.initPromise = new Promise<void>((resolve, reject) => {
      this.resolveInitPromise = resolve
      this.rejectInitPromise = reject
      this._initEngine().catch(reject)
    })
    return this.initPromise
  }

  private async _initEngine(): Promise<void> {
    try {
      const loadedEngine = await loadMultiThreadEngine(this.currentProfile)

      if (!loadedEngine) {
        this.isSupported = false
        logger.warn(`[MultiThreadEngineManager] Multi-threading not supported. Engine not loaded.`)
        this.isInitializing = false
        // Успешно завершаем инициализацию, просто движок не будет доступен
        this.resolveInitPromise()
        return
      }

      this.engine = loadedEngine
      this.isSupported = true
      this.engine.addMessageListener((message: string) => this.handleEngineMessage(message))

      const timeoutId = setTimeout(() => {
        if (!this.isReady) {
          const errorMsg = 'UCI handshake timeout for MultiThreadEngineManager'
          logger.error(`[MultiThreadEngineManager] ${errorMsg}`)
          this.rejectInitPromise(new Error(errorMsg))
        }
      }, 15000)

      this.initPromise?.then(() => clearTimeout(timeoutId)).catch(() => clearTimeout(timeoutId))
      this.sendCommand('uci')
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error('[MultiThreadEngineManager] Failed to initialize engine:', errorMsg, error)
      this.isInitializing = false
      this.initPromise = null
      if (this.rejectInitPromise) this.rejectInitPromise(error)
    }
  }

  private sendCommand(command: string): void {
    if (!this.engine) return
    if (!this.isReady && !['uci', 'isready'].includes(command) && !command.startsWith('setoption')) {
      this.commandQueue.push(command)
      return
    }
    // logger.debug(`[MultiThreadEngineManager] Sending: ${command}`)
    this.engine.postMessage(command)
  }

  private processCommandQueue(): void {
    while (this.commandQueue.length > 0) {
      const command = this.commandQueue.shift()
      if (command) this.sendCommand(command)
    }
  }

  private handleEngineMessage(message: string): void {
    // logger.debug(`[RAW_ENGINE_MSG] ${message}`)
    // logger.debug(`[MultiThreadEngineManager] Received: ${message}`)
    const parts = message.split(' ')

    if (message === 'uciok') {
      this.sendCommand('isready')
    } else if (message === 'readyok') {
      this.isReady = true
      this.isInitializing = false
      logger.info('[MultiThreadEngineManager] Engine is ready.')
      if (this.resolveInitPromise) this.resolveInitPromise()
      this.processCommandQueue()
    } else if (parts[0] === 'info') {
      this.parseInfoLine(message)
    } else if (parts[0] === 'bestmove') {
      const bestMoveUci = parts[1] && parts[1] !== '(none)' ? parts[1] : null
      if (this.infiniteAnalysisCallback) this.infiniteAnalysisCallback([], bestMoveUci)
    }
  }

  private parseInfoLine(line: string): void {
    if (!this.infiniteAnalysisCallback) return
    try {
      let currentLineId = 1,
        depth = 0
      let score: ScoreInfo | null = null
      let pvUci: string[] = []
      const parts = line.split(' ')
      let i = 0
      while (i < parts.length) {
        const token = parts[i]
        switch (token) {
          case 'depth': {
            const depthStr = parts[++i]
            if (depthStr) depth = parseInt(depthStr, 10)
            break
          }
          case 'multipv': {
            const multipvStr = parts[++i]
            if (multipvStr) currentLineId = parseInt(multipvStr, 10)
            break
          }
          case 'score': {
            const type = parts[++i] as 'cp' | 'mate'
            const valueStr = parts[++i]
            if (type && valueStr) {
              const value = parseInt(valueStr, 10)
              if ((type === 'cp' || type === 'mate') && !isNaN(value)) {
                score = { type, value }
              }
            }
            break
          }
          case 'pv':
            pvUci = parts.slice(i + 1)
            i = parts.length
            break
        }
        i++
      }
      if (score && pvUci.length > 0 && !isNaN(depth) && depth > 0) {
        // <<< ИЗМЕНЕНИЕ: Логирование разобранных данных
        const parsedData = { id: currentLineId, depth, score, pvUci }
        // logger.debug('[PARSED_INFO]', parsedData)
        this.infiniteAnalysisCallback([parsedData], null)
      }
    } catch (error) {
      logger.warn('[MultiThreadEngineManager] Error parsing info line:', line, error)
    }
  }

  public async startAnalysis(fen: string, callback: AnalysisUpdateCallback): Promise<void> {
    await this.ensureReady()
    if (!this.engine) return
    this.infiniteAnalysisCallback = callback
    this.sendCommand('ucinewgame')
    this.sendCommand(`position fen ${fen}`)
    this.sendCommand('go infinite')
  }

  public async stopAnalysis(): Promise<void> {
    await this.ensureReady()
    if (!this.engine) return
    this.infiniteAnalysisCallback = null
    this.sendCommand('stop')
  }

  public async setOption(name: string, value: string | number): Promise<void> {
    await this.ensureReady()
    if (!this.engine) return
    this.sendCommand(`setoption name ${name} value ${value}`)
  }

  public isMultiThreadingSupported(): boolean {
    return this.isSupported
  }

  public getMaxThreads(): number {
    // navigator.hardwareConcurrency возвращает общее количество логических процессоров.
    // Обычно рекомендуется использовать на 1-2 меньше для отзывчивости интерфейса,
    // но Stockfish эффективно масштабируется.
    return Math.max(1, (navigator.hardwareConcurrency || 4))
  }

  public async setProfile(profile: EngineProfile): Promise<void> {
    if (this.currentProfile === profile && this.engine) return

    logger.info(`[MultiThreadEngineManager] Switching profile to ${profile}`)
    this.currentProfile = profile

    if (this.engine) {
      if (this.engine.terminate) this.engine.terminate()
      this.engine = null
      this.isReady = false
      this.isInitializing = false
    }

    return this.ensureReady()
  }

  public getProfile(): EngineProfile {
    return this.currentProfile
  }
}

export const multiThreadEngineManager = new MultiThreadEngineManagerController()
