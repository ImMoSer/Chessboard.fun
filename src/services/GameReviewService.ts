import { type SessionMove } from '../types/openingSparring.types'

export interface MoveQuality {
  moveNumber: number
  color: 'white' | 'black'
  moveUci: string
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
    const theoryMoves = history.filter((m) => m.phase === 'theory')

    let theoryAccuracy = 0
    if (theoryMoves.length > 0) {
      const sumAcc = theoryMoves.reduce((acc, m) => acc + (m.accuracy || m.popularity || 0), 0)
      theoryAccuracy = Math.round(sumAcc / theoryMoves.length)
    }

    let totalCPLoss = 0
    let evaluatedMovesCount = 0
    const classifications = { blunders: 0, mistakes: 0, inaccuracies: 0, good: 0 }
    const criticalMoves: MoveQuality[] = []

    for (let i = 1; i < history.length; i++) {
      const move = history[i]
      const prevMove = history[i - 1]

      if (!move || !prevMove || move.phase !== 'playout') continue

      const isPlayerMove = this.isPlayerMove(prevMove.fen, playerColor)
      if (!isPlayerMove) continue

      if (!move.evaluation || !prevMove.evaluation) continue

      const multiplier = playerColor === 'white' ? 1 : -1
      const advBefore = prevMove.evaluation.score_cp * multiplier
      const advAfter = move.evaluation.score_cp * multiplier
      
      let cpLoss = advBefore - advAfter
      if (cpLoss < 0) cpLoss = 0
      
      const effectiveLoss = Math.min(cpLoss, 500)
      totalCPLoss += effectiveLoss
      evaluatedMovesCount++

      const quality = this.classifyMove(effectiveLoss)
      
      // Маппинг качества на ключи объекта classifications
      if (quality === 'blunder') classifications.blunders++
      else if (quality === 'mistake') classifications.mistakes++
      else if (quality === 'inaccuracy') classifications.inaccuracies++
      else classifications.good++

      if (quality === 'blunder' || quality === 'mistake') {
        criticalMoves.push({
          moveNumber: Math.floor(i / 2) + 1,
          color: playerColor,
          moveUci: move.moveUci,
          quality,
          scoreDiff: effectiveLoss,
          explanation: this.generateExplanation(move, prevMove, effectiveLoss),
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

  private isPlayerMove(fen: string, playerColor: 'white' | 'black'): boolean {
    return (fen.includes(' w ') && playerColor === 'white') || (fen.includes(' b ') && playerColor === 'black')
  }

  private classifyMove(loss: number): QualityType {
    if (loss <= 20) return 'good'
    if (loss <= 50) return 'inaccuracy'
    if (loss <= 150) return 'mistake'
    return 'blunder'
  }

  private generateExplanation(move: SessionMove, prevMove: SessionMove, loss: number): string {
    const threats = prevMove.threats
    const evalData = prevMove.evaluation
    const explanations: string[] = []

    if (evalData?.best_move_san && evalData.best_move !== move.moveUci) {
      explanations.push(`Best was ${evalData.best_move_san}.`)
    }

    if (threats && threats.threat_severity_score < -100 && loss > 100) {
      explanations.push(`Missed threat: ${threats.threat_description || threats.opponent_threat_san}.`)
    }

    const kingSafetyBefore = prevMove.features?.king_safety?.is_safe_heuristic
    const kingSafetyAfter = move.features?.king_safety?.is_safe_heuristic
    
    if (kingSafetyBefore && !kingSafetyAfter) {
      explanations.push('Exposed the King.')
    }

    if (explanations.length === 0) {
      return loss > 300 ? 'A serious tactical oversight.' : 'A positional error.'
    }

    return explanations.join(' ')
  }

  private generateSummary(theoryAcc: number, acpl: number, blunders: number): string {
    const theoryText = theoryAcc > 90 ? 'Excellent theory knowledge.' : theoryAcc > 70 ? 'Solid opening play.' : 'Needs work on theory.'
    
    let playoutText = ''
    if (acpl < 30) playoutText = 'Grandmaster level precision in conversion.'
    else if (acpl < 60) playoutText = 'Strong technical play.'
    else if (acpl < 100) playoutText = 'Decent play, but some inaccuracies.'
    else playoutText = 'Tactical opportunities were missed.'

    const advice = blunders > 1 ? 'Focus on blunder checking.' : 'Good consistency.'

    return `${theoryText} ${playoutText} ${advice}`
  }
}

export const gameReviewService = new GameReviewService()