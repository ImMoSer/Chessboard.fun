import { type SessionMove } from '@/shared/types/openingSparring.types'

export interface MoveQuality {
  moveNumber: number
  color: 'white' | 'black'
  moveUci: string
  moveSan: string
  quality: 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'
  scoreDiff: number
  explanation?: string
}

export interface GameReport {
  theoryAccuracy: number
  playoutAccuracy: number
  acpl: number
  classification: {
    blunders: number
    mistakes: number
    inaccuracies: number
    good: number
  }
  keyMoments: MoveQuality[]
  summary: string
}

type QualityType = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

class GameReviewService {
  public generateReport(history: SessionMove[], playerColor: 'white' | 'black'): GameReport {
    const playerTurnCode = playerColor === 'white' ? 'w' : 'b'

    // 1. Theory Accuracy (Only player moves)
    const theoryMoves = history.filter((m) => m.phase === 'theory' && m.turn === playerTurnCode)
    let theoryAccuracy = 0
    if (theoryMoves.length > 0) {
      const sumAcc = theoryMoves.reduce((acc, m) => acc + (m.accuracy || m.popularity || 0), 0)
      theoryAccuracy = Math.round(sumAcc / theoryMoves.length)
    }

    // 2. Playout Analysis
    let totalCPLoss = 0
    let evaluatedMovesCount = 0
    const classifications = { blunders: 0, mistakes: 0, inaccuracies: 0, good: 0 }
    const criticalMoves: MoveQuality[] = []

    for (const move of history) {
      // Analyze ONLY player moves in playout phase
      if (move.phase !== 'playout' || move.turn !== playerTurnCode) continue

      // Evaluation data is stored in the MOVE itself (recorded after bestmove/analyze call)
      if (!move.evaluation) continue

      const bestSfMove = move.evaluation.best_move
      const playedUci = move.moveUci

      // If player played the best move, loss is 0
      let cpLoss = 0
      if (bestSfMove && playedUci !== bestSfMove) {
        // CP loss is the difference between best move EV and played move EV
        // Note: score_cp from analyzeMove is already from the perspective of the side whose turn it was?
        // Actually, our API returns CP from White's perspective usually, but let's check.
        // The _recordPlayoutMove in store uses response.evaluation.cp.
        // In playout mode, we calculate loss relative to the BEST option.

        // Find best move CP in lines
        const bestLine = move.evaluation.lines?.find(l => l.pv.startsWith(bestSfMove)) || move.evaluation.lines?.[0]
        if (bestLine) {
          const multiplier = playerColor === 'white' ? 1 : -1
          // Loss = (Best EV - Played EV) for white, (Played EV - Best EV) for black
          cpLoss = (bestLine.cp - move.evaluation.score_cp) * multiplier
          if (cpLoss < 0) cpLoss = 0
        }
      }

      const effectiveLoss = Math.min(cpLoss, 500)
      totalCPLoss += effectiveLoss
      evaluatedMovesCount++

      const quality = this.classifyMove(effectiveLoss)

      if (quality === 'blunder') classifications.blunders++
      else if (quality === 'mistake') classifications.mistakes++
      else if (quality === 'inaccuracy') classifications.inaccuracies++
      else classifications.good++

      if (quality === 'blunder' || quality === 'mistake') {
        criticalMoves.push({
          moveNumber: move.moveNumber || 0,
          color: playerColor,
          moveUci: move.moveUci,
          moveSan: move.san,
          quality,
          scoreDiff: effectiveLoss,
          explanation: this.generateExplanation(move, effectiveLoss),
        })
      }
    }

    const acpl = evaluatedMovesCount > 0 ? Math.round(totalCPLoss / evaluatedMovesCount) : 0
    const playoutAccuracy = Math.max(0, 100 - acpl / 2)

    return {
      theoryAccuracy,
      playoutAccuracy: Math.round(playoutAccuracy),
      acpl,
      classification: classifications,
      keyMoments: criticalMoves.sort((a, b) => b.scoreDiff - a.scoreDiff).slice(0, 3),
      summary: this.generateSummary(theoryAccuracy, acpl, classifications.blunders),
    }
  }

  private classifyMove(loss: number): QualityType {
    if (loss <= 25) return 'good'
    if (loss <= 60) return 'inaccuracy'
    if (loss <= 150) return 'mistake'
    return 'blunder'
  }

  private generateExplanation(move: SessionMove, loss: number): string {
    const evalData = move.evaluation
    const explanations: string[] = []

    if (evalData?.best_move_san && evalData.best_move !== move.moveUci) {
      explanations.push(`Best was ${evalData.best_move_san}.`)
    }

    if (move.tags && move.tags.length > 0) {
      const relevantTags = move.tags.filter(t => ['Mate', 'Hanging', 'Fork', 'Pin'].includes(t))
      if (relevantTags.length > 0) {
        explanations.push(`Tactical error: ${relevantTags.join(', ')}.`)
      }
    }

    if (explanations.length === 0) {
      return loss > 300 ? 'A serious tactical oversight.' : 'A positional error.'
    }

    return explanations.join(' ')
  }

  private generateSummary(theoryAcc: number, acpl: number, blunders: number): string {
    const theoryText = theoryAcc > 90 ? 'Excellent theory knowledge.' : theoryAcc > 70 ? 'Solid opening play.' : 'Needs work on theory.'

    let playoutText = ''
    if (acpl < 30) playoutText = 'Grandmaster level precision.'
    else if (acpl < 60) playoutText = 'Strong technical play.'
    else if (acpl < 100) playoutText = 'Decent play, but some inaccuracies.'
    else playoutText = 'Focus on tactical awareness.'

    const advice = blunders > 1 ? 'Focus on blunder checking.' : blunders === 1 ? 'One oversight cost you.' : 'Zero blunders! Very solid.'

    return `${theoryText} ${playoutText} ${advice}`
  }
}

export const gameReviewService = new GameReviewService()
