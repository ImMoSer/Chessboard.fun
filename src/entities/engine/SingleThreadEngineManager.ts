// src/services/SingleThreadEngineManager.ts
import {
  loadSingleThreadEngine,
  type EngineController,
} from '@/utils/engine.loader'
import logger from '@/utils/logger'

// --- Интерфейсы ---
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

export interface AnalysisResult {
  bestMoveUci: string | null
  evaluatedLines: EvaluatedLine[]
}

export interface AnalysisOptions {
  depth?: number
  movetime?: number
}

export type AnalysisUpdateCallback = (lines: EvaluatedLine[], bestMoveUci?: string | null) => void

type AnalysisResolve = (value: AnalysisResult | null) => void
type AnalysisReject = (reason?: unknown) => void

interface PendingRequest {
  resolve: AnalysisResolve
  reject: AnalysisReject
  timeoutId: number
  collectedLines: Map<number, EvaluatedLine>
}

/**
 * Сервис для управления однопоточным движком.
 * Используется для геймплея и как фолбэк для анализа.
 */
class SingleThreadEngineManagerController {
  private engine: EngineController | null = null
  private isReady = false
  private isInitializing = false
  private initPromise: Promise<void> | null = null
  private resolveInitPromise!: () => void
  private rejectInitPromise!: (reason?: unknown) => void

  private infiniteAnalysisCallback: AnalysisUpdateCallback | null = null
  private pendingRequest: PendingRequest | null = null
  private commandQueue: string[] = []

  constructor() {
    logger.info('[SingleThreadEngineManager] Service created.')
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
      this.engine = await loadSingleThreadEngine()
      this.engine.addMessageListener((message: string) => this.handleEngineMessage(message))

      const timeoutId = setTimeout(() => {
        if (!this.isReady) {
          const errorMsg = 'UCI handshake timeout for SingleThreadEngineManager'
          logger.error(`[SingleThreadEngineManager] ${errorMsg}`)
          this.rejectInitPromise(new Error(errorMsg))
        }
      }, 15000)

      this.initPromise?.then(() => clearTimeout(timeoutId)).catch(() => clearTimeout(timeoutId))
      this.sendCommand('uci')
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error('[SingleThreadEngineManager] Failed to initialize engine:', errorMsg, error)
      this.isInitializing = false
      this.initPromise = null
      if (this.rejectInitPromise) this.rejectInitPromise(error)
    }
  }

  private sendCommand(command: string): void {
    if (!this.engine) return
    if (
      !this.isReady &&
      !['uci', 'isready'].includes(command) &&
      !command.startsWith('setoption')
    ) {
      this.commandQueue.push(command)
      return
    }
    // logger.debug(`[SingleThreadEngineManager] Sending: ${command}`)
    this.engine.postMessage(command)
  }

  private processCommandQueue(): void {
    while (this.commandQueue.length > 0) {
      const command = this.commandQueue.shift()
      if (command) this.sendCommand(command)
    }
  }

  private handleEngineMessage(message: string): void {
    // logger.debug(`[SingleThreadEngineManager] Received: ${message}`)
    const parts = message.split(' ')

    if (message === 'uciok') {
      this.sendCommand('isready')
    } else if (message === 'readyok') {
      this.isReady = true
      this.isInitializing = false
      logger.info('[SingleThreadEngineManager] Engine is ready.')
      if (this.resolveInitPromise) this.resolveInitPromise()
      this.processCommandQueue()
    } else if (parts[0] === 'info') {
      this.parseInfoLine(message)
    } else if (parts[0] === 'bestmove') {
      const bestMoveUci = parts[1] && parts[1] !== '(none)' ? parts[1] : null
      if (this.pendingRequest) {
        this.handleBestMove(bestMoveUci)
      } else if (this.infiniteAnalysisCallback) {
        this.infiniteAnalysisCallback([], bestMoveUci)
      }
    }
  }

  private parseInfoLine(line: string): void {
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
        const newLine = { id: currentLineId, depth, score, pvUci }
        if (this.pendingRequest) {
          this.pendingRequest.collectedLines.set(newLine.id, newLine)
        } else if (this.infiniteAnalysisCallback) {
          this.infiniteAnalysisCallback([newLine], null)
        }
      }
    } catch (error) {
      logger.warn('[SingleThreadEngineManager] Error parsing info line:', line, error)
    }
  }

  private handleBestMove(bestMoveUci: string | null): void {
    if (this.pendingRequest) {
      clearTimeout(this.pendingRequest.timeoutId)
      const result: AnalysisResult = {
        bestMoveUci,
        evaluatedLines: Array.from(this.pendingRequest.collectedLines.values()),
      }
      this.pendingRequest.resolve(result)
      this.pendingRequest = null
    }
  }

  private async getAnalysis(
    fen: string,
    options: AnalysisOptions = {},
  ): Promise<AnalysisResult | null> {
    await this.ensureReady()
    if (this.pendingRequest || this.infiniteAnalysisCallback) {
      logger.warn(`[SingleThreadEngineManager] getAnalysis called while busy. Aborting.`)
      return null
    }

    return new Promise<AnalysisResult | null>((resolve, reject) => {
      const timeoutDuration = (options.movetime || 2000) + 3000
      this.pendingRequest = {
        resolve,
        reject,
        timeoutId: window.setTimeout(() => {
          logger.warn(`[SingleThreadEngineManager] getAnalysis timed out for FEN: ${fen}`)
          this.sendCommand('stop')
          reject(new Error('Stockfish analysis timeout'))
          this.pendingRequest = null
        }, timeoutDuration),
        collectedLines: new Map(),
      }

      this.sendCommand('ucinewgame')
      this.sendCommand(`position fen ${fen}`)
      const goCommand = `go ${options.depth ? `depth ${options.depth}` : ''} ${options.movetime ? `movetime ${options.movetime}` : ''
        }`.trim()
      this.sendCommand(goCommand || 'go depth 10')
    })
  }

  public async getBestMoveOnly(
    fen: string,
    options: { depth?: number; movetime?: number } = {},
  ): Promise<string | null> {
    const result = await this.getAnalysis(fen, { ...options })
    return result?.bestMoveUci || null
  }

  public async startAnalysis(fen: string, callback: AnalysisUpdateCallback): Promise<void> {
    await this.ensureReady()
    if (this.pendingRequest) {
      logger.warn(
        `[SingleThreadEngineManager] Cannot start analysis while a getBestMove request is pending.`,
      )
      return
    }
    this.infiniteAnalysisCallback = callback
    this.sendCommand('ucinewgame')
    this.sendCommand(`position fen ${fen}`)
    this.sendCommand('go infinite')
  }

  public async stopAnalysis(): Promise<void> {
    await this.ensureReady()
    this.infiniteAnalysisCallback = null
    this.sendCommand('stop')
  }

  public async setOption(name: string, value: string | number): Promise<void> {
    await this.ensureReady()
    this.sendCommand(`setoption name ${name} value ${value}`)
  }
}

export const singleThreadEngineManager = new SingleThreadEngineManagerController()
