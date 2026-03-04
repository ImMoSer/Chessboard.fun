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

    // 1. Theory Accuracy (Only player moves) -> Now based on popularity
    const theoryMoves = history.filter((m) => m.phase === 'theory' && m.turn === playerTurnCode)
    let theoryAccuracy = 0
    if (theoryMoves.length > 0) {
      const sumAcc = theoryMoves.reduce((acc, m) => acc + (m.popularity || 0), 0)
      theoryAccuracy = Math.round(sumAcc / theoryMoves.length)
    }

    // 2. Playout Analysis
    let totalCPLoss = 0
    let evaluatedMovesCount = 0
    const classifications = { blunders: 0, mistakes: 0, inaccuracies: 0, good: 0 }
    const criticalMoves: MoveQuality[] = []

    for (const move of history) {
      if (move.phase !== 'playout' || move.turn !== playerTurnCode) continue
      if (!move.evaluation) continue

      // New: rely entirely on the provided NAG
      const nag = move.nag || 'OK'
      const quality = this.classifyMoveFromNag(nag)

      // We can still use CP Loss roughly for sorting/display, but it's optional. Let's just use a fake or 0 loss if not available, since UI might need scoreDiff.
      let effectiveLoss = 0
      if (quality === 'blunder') effectiveLoss = 300
      else if (quality === 'mistake') effectiveLoss = 150
      else if (quality === 'inaccuracy') effectiveLoss = 50

      totalCPLoss += effectiveLoss
      evaluatedMovesCount++

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
          explanation: this.generateExplanation(move, quality),
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

  private classifyMoveFromNag(nag: string): QualityType {
    if (nag === '??') return 'blunder'
    if (nag === '?') return 'mistake'
    if (nag === '?!') return 'inaccuracy'
    if (nag === '!!') return 'best'
    return 'good'
  }

  private generateExplanation(move: SessionMove, quality: QualityType): string {
    const evalData = move.evaluation
    const explanations: string[] = []

    if (evalData?.best_move && evalData.best_move !== move.moveUci) {
      explanations.push(`The engine preferred: ${evalData.best_move}.`)
    }

    // Since we don't have tags anymore, we can just say:
    if (quality === 'blunder') {
      explanations.push('A serious oversight.')
    } else if (quality === 'mistake') {
      explanations.push('A positional or tactical error.')
    }

    return explanations.join(' ')
  }

  private generateSummary(theoryAcc: number, acpl: number, blunders: number): string {
    const theoryText =
      theoryAcc > 90
        ? 'Excellent theory knowledge.'
        : theoryAcc > 70
          ? 'Solid opening play.'
          : 'Needs work on theory.'

    let playoutText = ''
    if (acpl < 30) playoutText = 'Grandmaster level precision.'
    else if (acpl < 60) playoutText = 'Strong technical play.'
    else if (acpl < 100) playoutText = 'Decent play, but some inaccuracies.'
    else playoutText = 'Focus on tactical awareness.'

    const advice =
      blunders > 1
        ? 'Focus on blunder checking.'
        : blunders === 1
          ? 'One oversight cost you.'
          : 'Zero blunders! Very solid.'

    return `${theoryText} ${playoutText} ${advice}`
  }
}

export const gameReviewService = new GameReviewService()
