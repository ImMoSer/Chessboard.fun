import { gameplayService, useBoardStore, useGameStore, type GameStatusInfo, type IGameplayStrategy } from '@/entities/game'
import { useOpeningSparringStore } from '@/features/opening-sparring'
import { useOpeningSparringQueries } from '@/features/opening-sparring/api/openingSparring.queries'
import { type LichessMove } from '@/shared/api/lichess-explorer/LichessApiService'
import type { MozerBookMove } from '@/shared/api/mozer-book/MozerBookService'
import { areMovesEqual } from '@/shared/lib/chess-utils'
import { serverEngineService, type AnalysisResponse } from '@/shared/lib/engine'
import { pgnService } from '@/shared/lib/pgn/PgnService'
import { soundService } from '@/shared/lib/sound/sound.service'
import { computed } from 'vue'

/**
 * Encapsulates the core game loop for Opening Sparring.
 * Moves the heavy recursive async logic (processMoveQueue, triggerBotMove)
 * and direct PGN/Service manipulations out of the store.
 */
export function useSparringLoop() {
  const store = useOpeningSparringStore()
  const boardStore = useBoardStore()
  const queries = useOpeningSparringQueries({
    fen: computed(() => boardStore.fen),
    source: computed(() => store.opponentSource),
    shouldFetchLichess: computed(() => boardStore.turn !== store.playerColor),
    lichessRatings: computed(() => store.opponentRatings),
  })

  async function fetchStats() {
    store.isLoading = true
    store.error = null
    try {
      await queries.mozerQuery.refetch()
      if (store.opponentSource === 'lichess' && boardStore.turn !== store.playerColor) {
        await queries.lichessQuery.refetch()
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
    const stats = store.currentStats

    if (!stats || stats.moves.length === 0) {
      store.isTheoryOver = true
      store.isProcessingMove = false
      return
    }

    const moveData = stats.moves.find((m: MozerBookMove) => areMovesEqual(m.uci, moveUci))

    if (!moveData) {
      store.isDeviation = true
      soundService.playSound('game_user_won')
      store.isProcessingMove = false
      return
    }

    const totalGamesInPos = stats.summary
      ? stats.summary.w + stats.summary.d + stats.summary.l
      : stats.moves.reduce((acc: number, m: MozerBookMove) => acc + m.total, 0) || 1

    const popularity = (moveData.total / totalGamesInPos) * 100
    const maxTotal = Math.max(...stats.moves.map((m: MozerBookMove) => m.total))
    const accuracy = maxTotal > 0 ? (moveData.total / maxTotal) * 100 : 0
    const wins = store.playerColor === 'white' ? moveData.w_pct : moveData.l_pct
    const winRateRaw = wins + 0.5 * moveData.d_pct
    const rating = moveData.perf || 0
    const moveStats = {
      uci: moveData.uci,
      san: moveData.san,
      total: moveData.total,
      w_pct: moveData.w_pct,
      d_pct: moveData.d_pct,
      l_pct: moveData.l_pct,
      perf: moveData.perf,
    }

    if (moveData.name) store.openingName = moveData.name
    if (moveData.eco) store.currentEco = moveData.eco

    // В Dual-Boot ход уже на доске
    const lastMoveUci = boardStore.lastMove ? boardStore.lastMove.join('') : ''
    if (lastMoveUci !== moveUci) {
      boardStore.applyUciMove(moveUci)
    }

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

    await fetchStats()
    store.isProcessingMove = false
  }

  async function getTheoryBotMoveUci(): Promise<string | null> {
    let movesPool: (MozerBookMove | LichessMove)[] = []
    if (store.opponentSource === 'lichess' && store.currentLichessStats) {
      movesPool = store.currentLichessStats.moves
    } else {
      movesPool = store.currentStats?.moves || []
    }

    if (movesPool.length === 0) {
      store.isTheoryOver = true
      if (store.opponentSource === 'master') {
        soundService.playSound('game_user_won')
      }
      return null
    }

    const candidates = movesPool
      .slice(0, store.variability)
      .map((m: MozerBookMove | LichessMove) => {
        let total = (m as MozerBookMove).total
        if (total === undefined) {
          const lm = m as LichessMove
          total = lm.white + lm.draws + lm.black
        }
        return { uci: m.uci, total }
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
    const masterStats = store.currentStats
    const masterMoveData = masterStats?.moves.find((m: MozerBookMove) =>
      areMovesEqual(m.uci, selectedUci),
    )

    let moveStats = undefined
    let popularity = 0
    let accuracy = 0
    let winRateRaw = 0
    let rating = 0

    if (masterMoveData) {
      const totalGamesInPos = masterStats!.summary
        ? masterStats!.summary!.w + masterStats!.summary!.d + masterStats!.summary!.l
        : masterStats!.moves.reduce((acc: number, m: MozerBookMove) => acc + m.total, 0) || 1

      popularity = (masterMoveData.total / totalGamesInPos) * 100
      const maxTotal = Math.max(...masterStats!.moves.map((m: MozerBookMove) => m.total))
      accuracy = maxTotal > 0 ? (masterMoveData.total / maxTotal) * 100 : 0

      const wins = store.playerColor === 'white' ? masterMoveData.w_pct : masterMoveData.l_pct
      winRateRaw = wins + 0.5 * masterMoveData.d_pct
      rating = masterMoveData.perf || 0

      moveStats = {
        uci: masterMoveData.uci,
        san: masterMoveData.san,
        total: masterMoveData.total,
        w_pct: masterMoveData.w_pct,
        d_pct: masterMoveData.d_pct,
        l_pct: masterMoveData.l_pct,
        perf: masterMoveData.perf,
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

    await fetchStats()

    if (!masterMoveData) {
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
        if (store.isTheoryOver || store.isDeviation) return null

        store.isProcessingMove = true
        if (store.isPlayoutMode) {
          const gameStore = useGameStore()
          const botEngineId = gameStore.botEngineId
          const uci = await gameplayService.getBestMove(botEngineId, fen)
          return uci
        } else {
          const uci = await getTheoryBotMoveUci()
          return uci
        }
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
