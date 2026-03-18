// src/services/MultiThreadEngineManager.ts
import { DEFAULT_NNUE_FILE } from '@/shared/config/engine.constants'
import { loadMultiThreadEngine, type EngineController } from '@/shared/lib/engine.loader'
import logger from '@/shared/lib/logger'

import {
  type AnalysisUpdateCallback,
  type EvaluatedLine,
  type ScoreInfo,
  type WdlStats,
} from './types'

/**
 * Сервис, управляющий экземпляром МНОГОПОТОЧНОГО движка для анализа.
 * Если многопоточность не поддерживается, движок не будет загружен.
 */
class MultiThreadEngineManagerController {
  private engine: EngineController | null = null
  private isSupported = false
  private isReady = false
  private isInitializing = false
  private isSearching = false
  private initPromise: Promise<void> | null = null
  private resolveInitPromise!: () => void
  private rejectInitPromise!: (reason?: unknown) => void

  private commandQueue: string[] = []
  private infiniteAnalysisCallback: AnalysisUpdateCallback | null = null
  private lastIsReadyTime: number = 0

  // Promises for synchronization
  private readyResolve: (() => void) | null = null
  private stopResolve: (() => void) | null = null

  constructor() {
    logger.info('[MultiThreadEngineManager] Service created. Engine will be loaded on demand.')
  }

  public async ensureReady(): Promise<void> {
    if (this.isReady && !this.isInitializing) return
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
      const loadedEngine = await loadMultiThreadEngine()

      if (!loadedEngine) {
        this.isSupported = false
        logger.warn(`[MultiThreadEngineManager] Multi-threading not supported. Engine not loaded.`)
        this.isInitializing = false
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

      this.initPromise?.finally(() => clearTimeout(timeoutId))
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
    if (
      !this.isReady &&
      !['uci', 'isready'].includes(command) &&
      !command.startsWith('setoption')
    ) {
      this.commandQueue.push(command)
      return
    }
    this.engine.postMessage(command)
  }

  private processCommandQueue(): void {
    while (this.commandQueue.length > 0) {
      const command = this.commandQueue.shift()
      if (command) this.sendCommand(command)
    }
  }

  public async waitReady(): Promise<void> {
    await this.ensureReady()
    if (!this.engine) return

    return new Promise((resolve) => {
      this.readyResolve = resolve
      this.lastIsReadyTime = performance.now()
      this.sendCommand('isready')
    })
  }

  private getOptimalHashSize(): number {
    try {
      const nav = navigator as Navigator & { deviceMemory?: number }
      const ramGb = nav.deviceMemory || 4
      return ramGb >= 4 ? 512 : 64
    } catch {
      return 64
    }
  }

  private handleEngineMessage(message: string): void {
    const parts = message.split(' ')

    if (message === 'uciok') {
      this.sendCommand('setoption name Use NNUE value true')
      this.sendCommand(`setoption name EvalFile value ${DEFAULT_NNUE_FILE}`)
      this.sendCommand(`setoption name Hash value ${this.getOptimalHashSize()}`)
      this.sendCommand('setoption name UCI_ShowWDL value true')
      this.sendCommand('isready')
    } else if (message === 'readyok') {
      const waitTime = performance.now() - (this.lastIsReadyTime || 0)
      if (this.isInitializing) {
        this.isReady = true
        this.isInitializing = false
        logger.info(`[MultiThreadEngineManager] Engine is ready (init) in ${waitTime.toFixed(1)}ms.`)
        if (this.resolveInitPromise) this.resolveInitPromise()
        this.processCommandQueue()
      } else {
        logger.info(`[MultiThreadEngineManager] readyok received in ${waitTime.toFixed(1)}ms.`)
      }
      if (this.readyResolve) {
        const resolve = this.readyResolve
        this.readyResolve = null
        resolve()
      }
    } else if (parts[0] === 'info') {
      this.parseInfoLine(message)
    } else if (parts[0] === 'bestmove') {
      this.isSearching = false
      const bestMoveUci = parts[1] && parts[1] !== '(none)' ? parts[1] : null

      // If we were waiting for stop to complete
      if (this.stopResolve) {
        const resolve = this.stopResolve
        this.stopResolve = null
        resolve()
      }

      if (this.infiniteAnalysisCallback) {
        this.infiniteAnalysisCallback([], bestMoveUci)
      }
    }
  }

  private parseInfoLine(line: string): void {
    if (!this.infiniteAnalysisCallback || !this.isSearching) return
    try {
      let currentLineId = 1,
        depth = 0
      let score: ScoreInfo | null = null
      let wdl: WdlStats | undefined
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
          case 'wdl': {
            const winStr = parts[++i]
            const drawStr = parts[++i]
            const lossStr = parts[++i]

            if (winStr && drawStr && lossStr) {
              const win = parseInt(winStr, 10)
              const draw = parseInt(drawStr, 10)
              const loss = parseInt(lossStr, 10)
              if (!isNaN(win) && !isNaN(draw) && !isNaN(loss)) {
                wdl = { win, draw, loss }
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
        const parsedData: EvaluatedLine = { id: currentLineId, depth, score, wdl, pvUci }
        this.infiniteAnalysisCallback([parsedData], null)
      }
    } catch (error) {
      logger.warn('[MultiThreadEngineManager] Error parsing info line:', line, error)
    }
  }

  public async startAnalysis(fen: string, callback: AnalysisUpdateCallback): Promise<void> {
    await this.ensureReady()
    if (!this.engine) return

    // Critical: stop previous analysis first and wait for bestmove
    if (this.isSearching) {
      await this.stopAnalysis()
    }

    this.infiniteAnalysisCallback = callback
    this.isSearching = true
    this.sendCommand(`position fen ${fen}`)
    this.sendCommand('go infinite')
  }

  public async startNewGame(): Promise<void> {
    await this.ensureReady()
    if (!this.engine) return

    if (this.isSearching) {
      await this.stopAnalysis()
    }

    this.sendCommand('ucinewgame')
    await this.waitReady()
  }

  public async calculateFixedDepth(fen: string, depth: number, multiPv: number = 3): Promise<EvaluatedLine[]> {
    await this.ensureReady()
    if (!this.engine) return []

    if (this.isSearching) {
      await this.stopAnalysis()
    }

    return new Promise((resolve) => {
      const results = new Map<number, EvaluatedLine>()

      const fixedDepthCallback = (lines: EvaluatedLine[], bestMoveUci?: string | null) => {
        lines.forEach((line) => {
          results.set(line.id, line)
        })
        if (bestMoveUci !== undefined && bestMoveUci !== null) {
          this.infiniteAnalysisCallback = null
          this.isSearching = false
          resolve(Array.from(results.values()).sort((a, b) => a.id - b.id))
        }
      }

      this.infiniteAnalysisCallback = fixedDepthCallback
      this.isSearching = true

      this.sendCommand(`setoption name MultiPV value ${multiPv}`)
      this.sendCommand(`position fen ${fen}`)
      this.sendCommand(`go depth ${depth}`)
    })
  }

  public async stopAnalysis(): Promise<void> {
    await this.ensureReady()
    if (!this.engine || !this.isSearching) {
      this.isSearching = false
      return
    }

    return new Promise((resolve) => {
      this.stopResolve = resolve
      this.sendCommand('stop')

      // Safety timeout: if bestmove doesn't arrive in 2s, force resolve
      setTimeout(() => {
        if (this.stopResolve === resolve) {
          logger.warn('[MultiThreadEngineManager] Stop timeout reached. Forcing stop.')
          this.isSearching = false
          this.stopResolve = null
          resolve()
        }
      }, 2000)
    })
  }

  public async setOption(name: string, value: string | number): Promise<void> {
    await this.ensureReady()
    if (!this.engine) return

    // UCI standard: options should be set while engine is not searching
    const wasSearching = this.isSearching
    if (wasSearching) {
      await this.stopAnalysis()
    }

    this.sendCommand(`setoption name ${name} value ${value}`)
    await this.waitReady()

    // Resume if we were searching (Note: startAnalysis expects caller to provide FEN,
    // so resuming here is tricky. Usually, the Store handles orchestration.
    // For now, we just ensure the option is set and engine is ready.)
  }

  public isMultiThreadingSupported(): boolean {
    return this.isSupported
  }

  public getMaxThreads(): number {
    return Math.max(1, navigator.hardwareConcurrency || 4)
  }
}

export const multiThreadEngineManager = new MultiThreadEngineManagerController()
