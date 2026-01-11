// src/services/AnalysisService.ts
import { Chess } from 'chessops/chess'
import { parseFen } from 'chessops/fen'
import { makeSan } from 'chessops/san'
import type { Color as ChessopsColor } from 'chessops/types'
import { parseUci } from 'chessops/util'
import type { EngineProfile } from '../utils/engine.loader'
import logger from '../utils/logger'
import type { AnalysisUpdateCallback, EvaluatedLine } from './MultiThreadEngineManager'
import { multiThreadEngineManager } from './MultiThreadEngineManager'
import { singleThreadEngineManager } from './SingleThreadEngineManager'

export interface EvaluatedLineWithSan extends EvaluatedLine {
  pvSan: string[]
  startingFen: string
  initialFullMoveNumber: number
  initialTurn: ChessopsColor
}

class AnalysisServiceController {
  private activeEngineManager: typeof multiThreadEngineManager | typeof singleThreadEngineManager | null =
    null
  private sanCache = new Map<
    string,
    { pvSan: string[]; initialFullMoveNumber: number; initialTurn: ChessopsColor }
  >()

  constructor() {
    logger.info('[AnalysisService] Created.')
  }

  public async initialize(profile: EngineProfile = 'lite') {
    // Инициализация происходит один раз при старте приложения
    await multiThreadEngineManager.setProfile(profile)
    if (multiThreadEngineManager.isMultiThreadingSupported()) {
      this.activeEngineManager = multiThreadEngineManager
      logger.info(`[AnalysisService] Initialized with Multi-Threaded Engine (${profile}).`)
    } else {
      await singleThreadEngineManager.setProfile(profile)
      this.activeEngineManager = singleThreadEngineManager
      logger.info(`[AnalysisService] Initialized with Single-Threaded Engine fallback (${profile}).`)
    }
  }

  public isMultiThreadAvailable(): boolean {
    return this.activeEngineManager === multiThreadEngineManager
  }

  public getMaxThreads(): number {
    return this.isMultiThreadAvailable() ? multiThreadEngineManager.getMaxThreads() : 1
  }

  public async startAnalysis(fen: string, callback: (lines: EvaluatedLineWithSan[]) => void) {
    if (!this.activeEngineManager) {
      logger.error('[AnalysisService] Cannot start analysis, no engine manager is active.')
      return
    }

    const analysisUpdateCallback: AnalysisUpdateCallback = (updatedLines) => {
      //logger.debug('[AnalysisService_CALLBACK]', { updatedLines })
      if (updatedLines.length > 0) {
        const linesWithSan = this.prepareLinesForDisplay(updatedLines, fen)
        callback(linesWithSan)
      }
    }

    await this.activeEngineManager.setOption('MultiPV', 3)
    await this.activeEngineManager.startAnalysis(fen, analysisUpdateCallback)
  }

  public async stopAnalysis() {
    if (!this.activeEngineManager) {
      logger.warn('[AnalysisService] Cannot stop analysis, no engine manager is active.')
      return
    }
    await this.activeEngineManager.stopAnalysis()
  }

  public async setThreads(count: number) {
    if (this.activeEngineManager === multiThreadEngineManager) {
      await this.activeEngineManager.setOption('Threads', count)
      logger.info(`[AnalysisService] Threads set to ${count}`)
    } else {
      logger.warn(`[AnalysisService] Cannot set threads for single-threaded engine.`)
    }
  }

  public async setEngineProfile(profile: EngineProfile) {
    if (this.activeEngineManager) {
      const wasAnalyzing = (this.activeEngineManager as any).infiniteAnalysisCallback !== null
      const currentFen = wasAnalyzing ? (this.activeEngineManager as any).currentFen : null // Hypothetical

      await this.activeEngineManager.setProfile(profile)
      logger.info(`[AnalysisService] Engine profile switched to ${profile}`)
    }
  }

  public getEngineProfile(): EngineProfile {
    return this.activeEngineManager ? (this.activeEngineManager as any).getProfile() : 'lite'
  }

  private prepareLinesForDisplay(lines: EvaluatedLine[], fen: string): EvaluatedLineWithSan[] {
    const setup = parseFen(fen).unwrap()
    const turn = setup.turn
    return lines.map((line) => {
      const conversionResult = this.convertUciToSanForLine(fen, line.pvUci)
      const correctedScore =
        turn === 'black' ? { ...line.score, value: -line.score.value } : line.score
      return {
        ...line,
        startingFen: fen,
        score: correctedScore,
        ...conversionResult,
      }
    })
  }

  private convertUciToSanForLine(
    fen: string,
    pvUci: string[],
  ): { pvSan: string[]; initialFullMoveNumber: number; initialTurn: ChessopsColor } {
    const cacheKey = `${fen}|${pvUci.join(' ')}`
    if (this.sanCache.has(cacheKey)) {
      return this.sanCache.get(cacheKey)!
    }

    const sanMoves: string[] = []
    let initialFullMoveNumber = 1
    let initialTurn: ChessopsColor = 'white'

    try {
      const setup = parseFen(fen).unwrap()
      const pos = Chess.fromSetup(setup).unwrap()
      initialFullMoveNumber = pos.fullmoves
      initialTurn = pos.turn

      for (const uciMove of pvUci) {
        const move = parseUci(uciMove)
        if (move && pos.isLegal(move)) {
          sanMoves.push(makeSan(pos, move))
          pos.play(move)
        } else {
          break
        }
      }
    } catch (e: unknown) {
      logger.error('[AnalysisService] Error converting UCI to SAN:', e instanceof Error ? e.message : String(e))
      return { pvSan: [], initialFullMoveNumber: 1, initialTurn: 'white' }
    }

    const result = { pvSan: sanMoves, initialFullMoveNumber, initialTurn }
    this.sanCache.set(cacheKey, result)
    return result
  }
}

export const analysisService = new AnalysisServiceController()
