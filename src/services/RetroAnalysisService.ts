import { Chess } from 'chessops/chess'
import { parseFen } from 'chessops/fen'
import { makeSan } from 'chessops/san'
import { parseUci } from 'chessops/util'
import { loadMultiThreadEngine, loadSingleThreadEngine, type EngineController } from '../utils/engine.loader'
import logger from '../utils/logger'

export interface RetroAnalysisStep {
  ply: number
  fen: string
  moveSan: string
  score: number // в сантипашках, положительное - преимущество белых
  bestMoveSan: string
  bestMoveUci: string
  loss: number
  classification: 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'book'
}

export interface RetroAnalysisReport {
  steps: RetroAnalysisStep[]
  accuracy: number
  acpl: number
  playerColor: 'white' | 'black'
  counts: {
    blunder: number
    mistake: number
    inaccuracy: number
    best: number
  }
}

export interface AnalysisSettings {
  threads: number
  hash: number
  depth: number
  movetime: number
}

class RetroAnalysisServiceController {
  private engine: EngineController | null = null
  private isStopping = false

  public async runAnalysis(
    fens: string[],
    movesSan: string[],
    settings: AnalysisSettings,
    playerColor: 'white' | 'black',
    onProgress: (stepIndex: number) => void
  ): Promise<RetroAnalysisReport> {
    this.isStopping = false
    logger.info('[RetroAnalysis] Starting session...', { steps: fens.length, settings, playerColor })
    
    this.engine = await this.initEngine()
    
    await this.waitForReady()
    
    await this.sendCommand(`setoption name Threads value ${settings.threads}`)
    await this.sendCommand(`setoption name Hash value ${settings.hash}`)
    await this.waitForReady()

    const steps: RetroAnalysisStep[] = []
    const total = fens.length
    
    for (let i = total - 1; i >= 0; i--) {
      if (this.isStopping) break
      
      const fen = fens[i]
      if (!fen) continue

      const moveSan = movesSan[i] || ''
      
      logger.debug(`[RetroAnalysis] Analyzing ply ${i}/${total-1}...`)
      const result = await this.analyzePosition(fen, settings)
      
      steps.push({
        ply: i,
        fen: fen,
        moveSan: moveSan,
        score: result.score,
        bestMoveSan: result.bestMoveSan,
        bestMoveUci: result.bestMoveUci,
        loss: 0,
        classification: 'best'
      })
      
      onProgress(total - i)
    }

    this.stop()
    
    steps.reverse()
    const report = this.generateReport(steps, playerColor)
    return report
  }

  public stop() {
    this.isStopping = true
    if (this.engine?.terminate) {
      this.engine.terminate()
      this.engine = null
      logger.info('[RetroAnalysis] Engine terminated.')
    }
  }

  private async initEngine(): Promise<EngineController> {
    const multi = await loadMultiThreadEngine('lite')
    if (multi) return multi
    return await loadSingleThreadEngine('lite')
  }

  private sendCommand(command: string) {
    if (!this.engine) return
    this.engine.postMessage(command)
  }

  private waitForReady(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.engine) return resolve()
      
      const listener = (msg: string) => {
        if (msg === 'readyok' || msg === 'uciok') {
            resolve()
        }
      }
      this.engine.addMessageListener(listener)
      this.engine.postMessage('uci')
      this.engine.postMessage('isready')
    })
  }

  private analyzePosition(fen: string, settings: AnalysisSettings): Promise<{ score: number, bestMoveSan: string, bestMoveUci: string }> {
    return new Promise((resolve) => {
      if (!this.engine) return resolve({ score: 0, bestMoveSan: '', bestMoveUci: '' })

      let lastScore = 0
      let lastBestMoveUci = ''
      let lastBestMoveSan = ''

      const listener = (msg: string) => {
        if (msg.startsWith('info')) {
          const parts = msg.split(' ')
          const scoreIdx = parts.indexOf('score')
          if (scoreIdx !== -1) {
            const type = parts[scoreIdx + 1]
            const valueStr = parts[scoreIdx + 2]
            if (valueStr) {
                let value = parseInt(valueStr, 10)
                if (type === 'mate') value = value > 0 ? 10000 : -10000
                
                if (fen.includes(' b ')) {
                   lastScore = -value
                } else {
                   lastScore = value
                }
            }
          }
          const pvIdx = parts.indexOf('pv')
          if (pvIdx !== -1 && parts[pvIdx + 1]) {
            lastBestMoveUci = parts[pvIdx + 1] || ''
          }
        } else if (msg.startsWith('bestmove')) {
          if (lastBestMoveUci) {
            try {
              const setup = parseFen(fen).unwrap()
              const pos = Chess.fromSetup(setup).unwrap()
              const move = parseUci(lastBestMoveUci)
              if (move && pos.isLegal(move)) {
                lastBestMoveSan = makeSan(pos, move)
              }
            } catch (e) {
               // ignore
            }
          }
          resolve({ score: lastScore, bestMoveSan: lastBestMoveSan, bestMoveUci: lastBestMoveUci })
        }
      }

      this.engine.addMessageListener(listener)
      this.engine.postMessage(`position fen ${fen}`)
      this.engine.postMessage(`go depth ${settings.depth} movetime ${settings.movetime}`)
    })
  }

  private generateReport(steps: RetroAnalysisStep[], playerColor: 'white' | 'black'): RetroAnalysisReport {
    let totalLoss = 0
    let userMovesCount = 0
    const counts = { blunder: 0, mistake: 0, inaccuracy: 0, best: 0 }

    for (let i = 0; i < steps.length - 1; i++) {
      const current = steps[i]
      const next = steps[i + 1]
      
      if (!current || !next) continue

      const turn = current.fen.includes(' w ') ? 'white' : 'black'
      let loss = 0
      
      if (turn === 'white') {
        loss = Math.max(0, current.score - next.score)
      } else {
        loss = Math.max(0, next.score - current.score)
      }

      next.loss = loss
      
      // КЛАССИФИКАЦИЯ
      if (loss > 300) {
        next.classification = 'blunder'
      } else if (loss > 100) {
        next.classification = 'mistake'
      } else if (loss > 50) {
        next.classification = 'inaccuracy'
      } else {
        next.classification = 'best'
      }

      // СТАТИСТИКА: только для цвета игрока
      if (turn === playerColor) {
        if (next.classification === 'blunder') counts.blunder++
        else if (next.classification === 'mistake') counts.mistake++
        else if (next.classification === 'inaccuracy') counts.inaccuracy++
        else counts.best++

        totalLoss += loss
        userMovesCount++
      }
    }

    const acpl = userMovesCount > 0 ? totalLoss / userMovesCount : 0
    const accuracy = Math.round(100 * Math.exp(-0.004 * acpl))

    return {
      steps,
      accuracy,
      acpl: Math.round(acpl),
      playerColor,
      counts
    }
  }
}

export const retroAnalysisService = new RetroAnalysisServiceController()
