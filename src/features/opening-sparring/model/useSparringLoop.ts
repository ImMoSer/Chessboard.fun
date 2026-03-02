import { gameplayService, useBoardStore, useGameStore, type GameStatusInfo, type IGameplayStrategy } from '@/entities/game'
import { useTheoryStore, type MozerBookMove } from '@/entities/opening'
import { areMovesEqual } from '@/shared/lib/chess-utils'
import { serverEngineService, type AnalysisResponse } from '@/shared/lib/engine'
import { pgnService } from '@/shared/lib/pgn/PgnService'
import { soundService } from '@/shared/lib/sound.service'
import { useOpeningSparringStore } from '../index'

/**
 * Encapsulates the core game loop for Opening Sparring.
 * Moves the heavy recursive async logic (processMoveQueue, triggerBotMove)
 * and direct PGN/Service manipulations out of the store.
 */
export function useSparringLoop() {
  const store = useOpeningSparringStore()
  const boardStore = useBoardStore()
  const theoryStore = useTheoryStore()

  async function fetchStats() {
    store.isLoading = true
    store.error = null
    try {
      await theoryStore.fetchMozerStats(boardStore.fen)
      if (store.opponentSource === 'lichess' && boardStore.turn !== store.playerColor) {
        await theoryStore.fetchLichessStats(boardStore.fen)
      }
    } catch (e: unknown) {
      store.error = e instanceof Error ? e.message : String(e)
    } finally {
      store.isLoading = false
    }
  }

  // handlePlayerMove removed, handled by Strategy mapping directly to enrichUserMove

  async function enrichUserMove(moveUci: string) {
    store.isProcessingMove = true
    const stats = store.activeTheoryStats

    if (!stats || !stats.moves || stats.moves.length === 0) {
      console.log('[OpeningSparring] Theory over: No stats available for enrichment.')
      store.isTheoryOver = true
      store.isProcessingMove = false
      return
    }

    const moveData = stats.moves.find((m: MozerBookMove) => areMovesEqual(m.uci, moveUci))

    if (!moveData) {
      console.log('[OpeningSparring] Deviation detected:', moveUci)
      store.isDeviation = true
      soundService.playSound('game_user_won')
      store.isProcessingMove = false
      return
    }

    const totalGamesInPos = stats.summary
      ? stats.summary.total
      : stats.moves.reduce((acc: number, m: MozerBookMove) => acc + m.total, 0) || 1

    const popularity = (moveData.total / totalGamesInPos) * 100
    const maxTotal = Math.max(...stats.moves.map((m: MozerBookMove) => m.total))
    const accuracy = maxTotal > 0 ? (moveData.total / maxTotal) * 100 : 0
    const wins = store.playerColor === 'white' ? moveData.win_p : moveData.loss_p
    const winRateRaw = wins + 0.5 * moveData.draw_p
    const rating = moveData.perf || 0
    const moveStats = {
      uci: moveData.uci,
      san: moveData.san,
      total: moveData.total,
      win_p: moveData.win_p,
      draw_p: moveData.draw_p,
      loss_p: moveData.loss_p,
      perf: moveData.perf,
    }

    if (moveData.name) store.openingName = moveData.name
    if (moveData.eco) store.currentEco = moveData.eco

    // Enrich PGN
    const node = pgnService.getLastMove()
    if (node) {
      pgnService.updateNode(node, {
        metadata: {
          phase: 'theory',
          stats: moveStats,
          popularity,
          accuracy,
          winRate: winRateRaw,
          rating,
        },
      })
    }

    // Refresh reactive stats for UI
    await fetchStats()

    // Advance stable theory stats for next move
    store.activeTheoryStats = await theoryStore.awaitMozerStatsForFen(boardStore.fen)

    store.isProcessingMove = false
  }

  async function getTheoryBotMoveUci(): Promise<string | null> {
    const stats = store.activeTheoryStats
    if (!stats || !stats.moves || stats.moves.length === 0) {
      store.isTheoryOver = true
      return null
    }

    // Determine candidate moves
    const movesPool = stats.moves

    const candidates = movesPool
      .slice(0, store.variability)
      .map((m: MozerBookMove) => {
        return { uci: m.uci, total: m.total }
      })

    if (candidates.length === 0) {
      store.isTheoryOver = true
      return null
    }

    const totalGames = candidates.reduce((acc: number, m: { total: number }) => acc + m.total, 0)
    let random = Math.random() * totalGames
    let selectedMove = candidates[0]!

    for (const move of candidates) {
      if (random < move.total) {
        selectedMove = move
        break
      }
      random -= move.total
    }

    return selectedMove.uci
  }

  async function enrichBotMove(selectedUci: string) {
    const stats = store.activeTheoryStats
    const moveData = stats?.moves.find((m: MozerBookMove) =>
      areMovesEqual(m.uci, selectedUci),
    )

    let moveStats = undefined
    let popularity = 0
    let accuracy = 0
    let winRateRaw = 0
    let rating = 0

    if (moveData) {
      const totalGamesInPos = stats!.summary
        ? stats!.summary!.total
        : stats!.moves.reduce((acc: number, m: MozerBookMove) => acc + m.total, 0) || 1

      popularity = (moveData.total / totalGamesInPos) * 100
      const maxTotal = Math.max(...stats!.moves.map((m: MozerBookMove) => m.total))
      accuracy = maxTotal > 0 ? (moveData.total / maxTotal) * 100 : 0

      const wins = store.playerColor === 'white' ? moveData.win_p : moveData.loss_p
      winRateRaw = wins + 0.5 * moveData.draw_p
      rating = moveData.perf || 0

      moveStats = {
        uci: moveData.uci,
        san: moveData.san,
        total: moveData.total,
        win_p: moveData.win_p,
        draw_p: moveData.draw_p,
        loss_p: moveData.loss_p,
        perf: moveData.perf,
      }
    }

    const node = pgnService.getLastMove()
    if (node && node.uci === selectedUci) {
      pgnService.updateNode(node, {
        metadata: {
          phase: 'theory',
          stats: moveStats,
          popularity,
          accuracy,
          winRate: winRateRaw,
          rating,
        },
      })
    }

    // Refresh reactive stats for UI
    await fetchStats()

    // Advance stable theory stats for next move
    store.activeTheoryStats = await theoryStore.awaitMozerStatsForFen(boardStore.fen)

    if (!moveData) {
      store.isTheoryOver = true
    }
  }

  // Promise chain for playout move processing
  let recordQueue = Promise.resolve()

  async function _recordPlayoutMove(uci: string) {
    const currentNode = pgnService.getLastMove()
    if (!currentNode || currentNode.uci !== uci) {
      console.warn(
        '[OpeningSparring] PGN Sync Error: Current node does not match played move.',
        currentNode?.uci,
        uci,
      )
      return
    }

    const fenBefore = currentNode.fenBefore

    pgnService.updateNode(currentNode, {
      metadata: {
        phase: 'playout',
        loading: true,
      },
    })

    recordQueue = recordQueue.then(async () => {
      try {
        const response = (await serverEngineService.analyzeMove(fenBefore, uci)) as AnalysisResponse

        if (response && response.quality && response.evaluation) {
          const firstLine = response.evaluation.lines?.[0]
          const pvSan = firstLine?.pv_san || ''

          let bestMoveSan = ''
          if (pvSan) {
            const parts = pvSan.split(' ')
            const movePart = parts.find((p) => !p.includes('.'))
            bestMoveSan = movePart || ''
          }

          pgnService.updateNode(currentNode, {
            metadata: {
              phase: 'playout',
              loading: false,
              quality: response.quality.verbal_score.toLowerCase(),
              nag: response.quality.nag,
              accuracy: response.quality.accuracy,
              tags: response.quality.tags,
              evaluation: {
                score_cp: response.evaluation.cp,
                win_prob: response.evaluation.win_prob,
                wdl: response.evaluation.wdl,
                depth: response.evaluation.depth,
                best_move: response.quality.best_sf_move,
                best_move_san: bestMoveSan,
                pv_san: pvSan,
                lines: response.evaluation.lines,
              },
            },
          })
        }
      } catch (e) {
        console.error('[OpeningSparring] Error in playout recording:', e)
        pgnService.updateNode(currentNode, {
          metadata: { phase: 'playout', loading: false, error: true },
        })
      }
    })

    await recordQueue
  }

  function handlePlayoutGameOver(
    isWin: boolean,
    outcome?: { winner?: 'white' | 'black'; reason?: string },
  ) {
    const gameStore = useGameStore()
    gameStore.setGamePhase('GAMEOVER')
    console.log(`[OpeningSparring] Playout Game Over. Win: ${isWin}, Reason: ${outcome?.reason}`)
  }

  async function startPlayout() {
    store.isPlayoutMode = true
    store.isFinalEvaluating = false
    const gameStore = useGameStore()

    soundService.playSound('game_play_out_start')

    // Rebooting GameStore loop ensures bot will move if it's its turn
    gameStore.startWithStrategy(boardStore.fen, createStrategy(), store.playerColor, true)
  }

  function createStrategy(): IGameplayStrategy {
    return {
      config: {
      },
      async validateUserMove() {
        return true
      },
      async onUserMoveExecuted(uci: string) {
        if (store.isPlayoutMode) {
          await _recordPlayoutMove(uci)
        } else {
          await enrichUserMove(uci)
        }
      },
      async requestBotMove(fen: string): Promise<string | null> {
        if (store.isPlayoutMode) {
          store.isProcessingMove = true
          const gameStore = useGameStore()
          const botEngineId = gameStore.botEngineId
          const uci = await gameplayService.getBestMove(botEngineId, fen)
          return uci
        }

        if (store.isTheoryOver || store.isDeviation) return null

        store.isProcessingMove = true
        const uci = await getTheoryBotMoveUci()
        return uci
      },
      async onBotMoveExecuted(uci: string) {
        if (store.isPlayoutMode) {
          await _recordPlayoutMove(uci)
        } else {
          await enrichBotMove(uci)
        }
        store.isProcessingMove = false
      },
      onGameOver(status: GameStatusInfo) {
        handlePlayoutGameOver(status.outcome?.winner === store.playerColor, status.outcome)
      },
      checkWinCondition(status: GameStatusInfo) {
        return status.outcome?.winner === store.playerColor
      },
    }
  }

  return {
    fetchStats,
    createStrategy,
    startPlayout,
  }
}
