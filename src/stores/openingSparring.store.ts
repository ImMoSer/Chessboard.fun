// src/stores/openingSparring.store.ts
import { type Key } from '@lichess-org/chessground/types'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { LichessMove, LichessOpeningResponse } from '../services/LichessApiService'
import type { MozerBookMove } from '../services/MozerBookService'
import { pgnService, pgnTreeVersion } from '../services/PgnService'
import { type AnalysisResponse } from '../services/ServerEngineService'
import { theoryGraphService } from '../services/TheoryGraphService'
import { soundService } from '../services/sound.service'
import { type SessionMove } from '../types/openingSparring.types'
import { areMovesEqual } from '../utils/chess-utils'
import { useBoardStore } from './board.store'
import { useGameStore } from './game.store'
import { useMozerBookStore } from './mozerBook.store'

export const useOpeningSparringStore = defineStore('openingSparring', () => {
  const boardStore = useBoardStore()
  const mozerStore = useMozerBookStore()

  const currentStats = computed(() => mozerStore.currentStats)

  // -- REPLACED sessionHistory ref with computed from PGN --
  const sessionHistory = computed<SessionMove[]>(() => {
    // Reactivity dependency
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _v = pgnTreeVersion.value

    const moves: SessionMove[] = []
    let node = pgnService.getRootNode().children[0]

    // Traverse the Main Line (assuming sparring session is linear)
    while (node) {
      const meta = node.metadata || {}

      // Calculate derived fields
      const fenParts = node.fenBefore.split(' ')
      const turn = fenParts[1] as 'w' | 'b'
      const moveNumber = parseInt(fenParts[5] || '1', 10)

      moves.push({
        // Standard SessionMove fields
        fen: node.fenAfter,
        moveUci: node.uci,
        san: node.san,
        phase: meta.phase || 'theory',
        stats: meta.stats,

        // PGN Context
        ply: node.ply,
        turn,
        moveNumber,

        // Analysis Data
        quality: meta.quality,
        nag: meta.nag,
        evaluation: meta.evaluation,

        // Metrics
        popularity: meta.popularity,
        accuracy: meta.accuracy,
        winRate: meta.winRate,
        rating: meta.rating
      })

      node = node.children[0]
    }
    return moves
  })

  const isTheoryOver = ref(false)
  const isDeviation = ref(false)
  const variability = ref(5)
  const playerColor = ref<'white' | 'black'>('white')
  const openingName = ref('')
  const currentEco = ref('')
  const isLoading = computed(() => mozerStore.isLoading)
  const isProcessingMove = ref(false)
  const isPlayoutMode = ref(false)
  const isReviewMode = ref(false)
  const reviewMoveIndex = ref(-1)
  // const error = computed(() => mozerStore.error) // Commented out or merged if needed.
  // Actually openingSparring.store.ts already had 'error: computed(() => mozerStore.error)'
  // Let's just keep the computed if it's used elsewhere or remove it if mozerStore is enough.
  const error = computed(() => mozerStore.error)
  const moveQueue = ref<string[]>([])


  const savedSource = localStorage.getItem('openingSparring.opponentSource') as 'master' | 'lichess' | null
  const opponentSource = ref<'master' | 'lichess'>(savedSource || 'master')

  const savedRatings = localStorage.getItem('openingSparring.opponentRatings')
  const defaultRatings = [1200, 1400, 1600, 1800, 2000, 2200]
  const opponentRatings = ref<number[]>(savedRatings ? JSON.parse(savedRatings) : defaultRatings)

  const currentLichessStats = ref<LichessOpeningResponse | null>(null)

  // Persist settings
  watch([opponentSource, opponentRatings], () => {
    localStorage.setItem('openingSparring.opponentSource', opponentSource.value)
    localStorage.setItem('openingSparring.opponentRatings', JSON.stringify(opponentRatings.value))
  }, { deep: true })

  // Lives for Exam mode
  const lives = ref(3)

  // Final Evaluation state
  const finalEval = ref<{ type: 'cp' | 'mate'; value: number } | null>(null)
  const isFinalEvaluating = ref(false)
  const finalEvalDepth = ref(0)

  const movesCount = computed(() => sessionHistory.value.length)

  const averageAccuracy = computed(() => {
    const playerMoves = sessionHistory.value.filter(m =>
      (m.turn === 'w' && playerColor.value === 'white') ||
      (m.turn === 'b' && playerColor.value === 'black')
    )
    if (playerMoves.length === 0) return 0
    const sum = playerMoves.reduce((acc, m) => acc + (m.accuracy ?? m.popularity ?? 0), 0)
    return Math.round(sum / playerMoves.length)
  })

  const averageWinRate = computed(() => {
    const playerMoves = sessionHistory.value.filter(m =>
      (m.turn === 'w' && playerColor.value === 'white') ||
      (m.turn === 'b' && playerColor.value === 'black')
    )
    if (playerMoves.length === 0) return 0
    const sum = playerMoves.reduce((acc, m) => acc + (m.winRate ?? 0), 0)
    return Math.round(sum / playerMoves.length)
  })

  const averageRating = computed(() => {
    const playerMoves = sessionHistory.value.filter(m =>
      (m.turn === 'w' && playerColor.value === 'white') ||
      (m.turn === 'b' && playerColor.value === 'black')
    )
    if (playerMoves.length === 0) return 0
    const sum = playerMoves.reduce((acc, m) => acc + (m.rating ?? 0), 0)
    return Math.round(sum / playerMoves.length)
  })

  const isInitializing = ref(false)

  async function initializeSession(color: 'white' | 'black', startMoves: string[] = []) {
    if (isInitializing.value) {
      console.log('[OpeningSparring] Initialization already in progress, skipping')
      return
    }

    isInitializing.value = true
    try {
      console.log('[OpeningSparring] Initializing session', { color, startMoves })

      // 1. Reset everything first
      reset()

      // 2. Set basic state
      playerColor.value = color
      isProcessingMove.value = true

      // 3. Configure GameStore
      const gameStore = useGameStore()
      gameStore.setupPuzzle(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        [],
        (isWin, outcome) => {
          console.log('[OpeningSparring] Game Over:', isWin, outcome)
          gameStore.setGamePhase('GAMEOVER')
        },
        (outcome) => {
          return outcome?.winner === playerColor.value
        },
        () => { },
        'opening-trainer',
        undefined,
        color,
        (uci) => handlePlayerMove(uci),
        undefined, // onBotMove
        false, // autoPlayBot - Disable GameStore engine bot to avoid conflict with MozerBook
      )

      // 4. Load theory book
      await theoryGraphService.loadBook()

      // 5. External services setup
      const { webhookService } = await import('../services/WebhookService')
      await webhookService.startOpeningSparring()

      // 6. Setup board and PGN (ALREADY DONE in Step 3 via setupPuzzle)
      // boardStore.setupPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', color)

      // 7. Apply start moves if any
      for (const move of startMoves) {
        boardStore.applyUciMove(move)
        const node = pgnService.getLastMove()
        if (node) pgnService.updateNode(node, { metadata: { phase: 'theory' } })
      }

      // 8. Fetch stats for the starting position
      await fetchStats()

      // 9. Trigger bot move if it's bot's turn
      if (boardStore.turn !== color) {
        await triggerBotMove()
      }
    } finally {
      isProcessingMove.value = false
      isInitializing.value = false
    }
  }

  function reset() {
    console.log('[OpeningSparring] Resetting session')
    mozerStore.reset()
    currentLichessStats.value = null
    // sessionHistory is computed, no need to reset
    // But we must reset PGN!
    // boardStore.resetBoardState() covers pgnService.reset() usually?
    // initializeSession calls boardStore.setupPosition which resets PGN.

    isTheoryOver.value = false
    isDeviation.value = false
    openingName.value = ''
    currentEco.value = ''
    isProcessingMove.value = false
    isPlayoutMode.value = false
    isReviewMode.value = false
    reviewMoveIndex.value = -1
    moveQueue.value = []
    lives.value = 3
    finalEval.value = null
    isFinalEvaluating.value = false
    finalEvalDepth.value = 0
  }

  function enterReviewMode() {
    isReviewMode.value = true
    isPlayoutMode.value = false
    reviewMoveIndex.value = sessionHistory.value.length - 1
    const gameStore = useGameStore()
    gameStore.setGamePhase('IDLE')
  }

  function exitReviewMode() {
    isReviewMode.value = false
    reviewMoveIndex.value = -1
  }

  function setReviewMove(index: number) {
    if (index < -1 || index >= sessionHistory.value.length) return

    reviewMoveIndex.value = index

    if (index === -1) {
      pgnService.navigateToStart()
      boardStore.syncBoardWithPgn()
    } else {
      const move = sessionHistory.value[index]
      if (move && move.ply) {
        pgnService.navigateToPly(move.ply)
        boardStore.syncBoardWithPgn()
      }
    }
  }

  function nextReviewMove() {
    if (reviewMoveIndex.value < sessionHistory.value.length - 1) {
      setReviewMove(reviewMoveIndex.value + 1)
    }
  }

  function prevReviewMove() {
    if (reviewMoveIndex.value > -1) {
      setReviewMove(reviewMoveIndex.value - 1)
    }
  }

  async function fetchStats() {
    if (isPlayoutMode.value || isTheoryOver.value || isDeviation.value) return

    await mozerStore.fetchStats()

    if (opponentSource.value === 'lichess' && boardStore.turn !== playerColor.value) {
      const { lichessApiService } = await import('../services/LichessApiService')
      currentLichessStats.value = await lichessApiService.getStats(boardStore.fen, 'lichess', {
        ratings: opponentRatings.value,
        speeds: ['blitz', 'rapid', 'classical']
      })
    } else {
      currentLichessStats.value = null
    }

    if (currentStats.value) {
      if (currentStats.value.summary && !openingName.value) {
        const theoryItem = currentStats.value.theory?.[0]
        if (theoryItem) {
          openingName.value = theoryItem.name
          if (theoryItem.eco) currentEco.value = theoryItem.eco
        }
      }
    }
  }

  async function runFinalEvaluation() {
    if (isFinalEvaluating.value) return

    const targetDepth = 20
    isFinalEvaluating.value = true
    finalEvalDepth.value = 0
    finalEval.value = null

    const { analysisService } = await import('../services/AnalysisService')
    await analysisService.initialize()

    const cores = navigator.hardwareConcurrency || 1
    const threads = Math.max(1, Math.min(4, Math.floor(cores / 2)))
    await analysisService.setThreads(threads)

    return new Promise<void>((resolve) => {
      analysisService.startAnalysis(boardStore.fen, (lines) => {
        if (lines.length > 0) {
          const bestLine = lines[0]!
          finalEvalDepth.value = bestLine.depth

          if (bestLine.depth >= targetDepth || bestLine.score.type === 'mate') {
            finalEval.value = bestLine.score
            analysisService.stopAnalysis()
            isFinalEvaluating.value = false
            resolve()
          }
        }
      }, 1)
    })
  }

  async function handlePlayerMove(moveUci: string) {
    if (isPlayoutMode.value) {
      isProcessingMove.value = false
      return
    }

    isProcessingMove.value = true
    moveQueue.value.push(moveUci)
    try {
      await processMoveQueue()
    } catch {
      isProcessingMove.value = false
    }
  }

  async function processMoveQueue() {
    if (moveQueue.value.length === 0) {
      return
    }

    const moveUci = moveQueue.value.shift()!
    const stats = currentStats.value

    if (!stats || stats.moves.length === 0) {
      isTheoryOver.value = true
      isProcessingMove.value = false
      return
    }

    const moveData = stats.moves.find((m) => areMovesEqual(m.uci, moveUci))

    if (!moveData) {
      isDeviation.value = true
      soundService.playSound('game_user_won')
      moveQueue.value = []
      isProcessingMove.value = false
      return
    }

    const totalGamesInPos = stats.summary
      ? stats.summary.w + stats.summary.d + stats.summary.l
      : stats.moves.reduce((acc, m) => acc + m.total, 0) || 1

    const popularity = (moveData.total / totalGamesInPos) * 100
    const maxTotal = Math.max(...stats.moves.map((m) => m.total))
    const accuracy = maxTotal > 0 ? (moveData.total / maxTotal) * 100 : 0
    const wins = playerColor.value === 'white' ? moveData.w_pct : moveData.l_pct
    const winRateRaw = wins + 0.5 * moveData.d_pct
    const rating = moveData.perf || 0
    const moveStats = {
      uci: moveData.uci,
      san: moveData.san,
      total: moveData.total,
      w_pct: moveData.w_pct,
      d_pct: moveData.d_pct,
      l_pct: moveData.l_pct,
      perf: moveData.perf
    }

    if (moveData.name) openingName.value = moveData.name
    if (moveData.eco) currentEco.value = moveData.eco

    // Check if the move is already applied on the board (Player move case)
    // boardStore.lastMove is [from, to] keys.
    const lastMoveUci = boardStore.lastMove ? boardStore.lastMove.join('') : ''

    // We strictly apply the move ONLY if it's not already the last move on the board.
    // This fixes the "Illegal move" error when handling player moves that GameStore already applied.
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
          rating
        }
      })
    }

    await fetchStats()

    if (!isTheoryOver.value && !isDeviation.value) {
      await triggerBotMove()
    } else {
      isProcessingMove.value = false
    }
  }

  async function triggerBotMove() {
    let movesPool: (MozerBookMove | LichessMove)[] = []
    if (opponentSource.value === 'lichess' && currentLichessStats.value) {
      movesPool = currentLichessStats.value.moves
    } else {
      movesPool = currentStats.value?.moves || []
    }

    if (movesPool.length === 0) {
      isTheoryOver.value = true
      if (opponentSource.value === 'master') {
        soundService.playSound('game_user_won')
      }
      isProcessingMove.value = false
      return
    }

    const candidates = movesPool.slice(0, variability.value).map(m => {
      let total = (m as MozerBookMove).total
      if (total === undefined) {
        const lm = m as LichessMove
        total = lm.white + lm.draws + lm.black
      }
      return { ...m, total }
    })

    if (candidates.length === 0) {
      isTheoryOver.value = true
      isProcessingMove.value = false
      return
    }

    const totalGames = candidates.reduce((acc, m) => acc + m.total, 0)
    let random = Math.random() * totalGames
    let selectedMove = candidates[0]!

    for (const move of candidates) {
      if (random < move.total) {
        selectedMove = move
        break
      }
      random -= move.total
    }

    const masterStats = currentStats.value
    const masterMoveData = masterStats?.moves.find(m => areMovesEqual(m.uci, selectedMove.uci))

    let moveStats = undefined
    let popularity = 0
    let accuracy = 0
    let winRateRaw = 0
    let rating = 0
    // san variable removed as it was shadowing selectedMove.san and causing unused var warning

    if (masterMoveData) {
      const totalGamesInPos = masterStats!.summary
        ? masterStats!.summary!.w + masterStats!.summary!.d + masterStats!.summary!.l
        : masterStats!.moves.reduce((acc, m) => acc + m.total, 0) || 1

      popularity = (masterMoveData.total / totalGamesInPos) * 100
      const maxTotal = Math.max(...masterStats!.moves.map((m) => m.total))
      accuracy = maxTotal > 0 ? (masterMoveData.total / maxTotal) * 100 : 0

      const wins = playerColor.value === 'white' ? masterMoveData.w_pct : masterMoveData.l_pct
      winRateRaw = wins + 0.5 * masterMoveData.d_pct
      rating = masterMoveData.perf || 0
      // san = masterMoveData.san // Removed

      moveStats = {
        uci: masterMoveData.uci,
        san: masterMoveData.san,
        total: masterMoveData.total,
        w_pct: masterMoveData.w_pct,
        d_pct: masterMoveData.d_pct,
        l_pct: masterMoveData.l_pct,
        perf: masterMoveData.perf
      }
    }

    boardStore.applyUciMove(selectedMove.uci)

    const node = pgnService.getLastMove()
    if (node) {
      pgnService.updateNode(node, {
        metadata: {
          phase: 'theory',
          stats: moveStats,
          popularity,
          accuracy,
          winRate: winRateRaw,
          rating
        }
      })
    }

    await fetchStats()

    if (!masterMoveData) {
      isTheoryOver.value = true
    }

    if (moveQueue.value.length > 0) {
      await processMoveQueue()
    } else {
      isProcessingMove.value = false
    }
  }

  function hint() {
    if (lives.value <= 0) return
    const bestMove = currentStats.value?.moves?.[0]
    if (!bestMove) return

    lives.value -= 1
    boardStore.setDrawableShapes([
      {
        orig: bestMove.uci.substring(0, 2) as Key,
        dest: bestMove.uci.substring(2, 4) as Key,
        brush: 'green',
      },
    ])
    setTimeout(() => {
      boardStore.setDrawableShapes([])
    }, 2000)
  }

  // Promise chain for playout move processing
  let recordQueue = Promise.resolve()

  async function _recordPlayoutMove(uci: string) {
    // 1. Synchronous Context Capture
    const currentNode = pgnService.getLastMove()
    if (!currentNode || currentNode.uci !== uci) {
      console.warn('[OpeningSparring] PGN Sync Error: Current node does not match played move.', currentNode?.uci, uci)
      return
    }

    const fenBefore = currentNode.fenBefore

    // Mark basic metadata immediately
    pgnService.updateNode(currentNode, {
      metadata: {
        phase: 'playout',
        loading: true
      }
    })

    // 2. Queue Analysis
    recordQueue = recordQueue.then(async () => {
      const { serverEngineService } = await import('../services/ServerEngineService')

      try {
        const response = (await serverEngineService.analyzeMove(
          fenBefore,
          uci,
        )) as AnalysisResponse

        if (response && response.quality && response.evaluation) {
          const firstLine = response.evaluation.lines?.[0]
          const pvSan = firstLine?.pv_san || ''

          // Extract best move SAN from PV string like "9... g5" or "10. d4"
          let bestMoveSan = ''
          if (pvSan) {
            const parts = pvSan.split(' ')
            const movePart = parts.find((p) => !p.includes('.'))
            bestMoveSan = movePart || ''
          }

          // Update PGN Node with full data from new API
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
          metadata: { phase: 'playout', loading: false, error: true }
        })
      }
    })

    await recordQueue
  }

  function handlePlayoutGameOver(isWin: boolean, outcome?: { winner?: 'white' | 'black'; reason?: string }) {
    const gameStore = useGameStore()
    gameStore.setGamePhase('GAMEOVER')
    console.log(`[OpeningSparring] Playout Game Over. Win: ${isWin}, Reason: ${outcome?.reason}`)
  }

  async function startPlayout() {
    isPlayoutMode.value = true
    isFinalEvaluating.value = false
    const gameStore = useGameStore()

    soundService.playSound('game_play_out_start')

    gameStore.setupPuzzle(
      boardStore.fen,
      [],
      handlePlayoutGameOver,
      (outcome) => outcome?.winner === playerColor.value,
      () => { },
      'opening-trainer',
      undefined,
      playerColor.value,
      (uci) => _recordPlayoutMove(uci),
      (uci) => _recordPlayoutMove(uci),
      true,
      true // keepPgn: true
    )
  }

  async function generateGameReport() {
    const { gameReviewService } = await import('../services/GameReviewService')
    return gameReviewService.generateReport(sessionHistory.value, playerColor.value)
  }

  return {
    currentStats,
    sessionHistory, // Now computed!
    averageAccuracy,
    averageWinRate,
    averageRating,
    movesCount,
    isTheoryOver,
    isDeviation,
    variability,
    playerColor,
    openingName,
    currentEco,
    isLoading,
    isInitializing,
    isProcessingMove,
    isPlayoutMode,
    error,
    lives,
    finalEval,
    isFinalEvaluating,
    finalEvalDepth,
    opponentSource,
    opponentRatings,
    initializeSession,
    handlePlayerMove,
    fetchStats,
    runFinalEvaluation,
    reset,
    hint,
    startPlayout,
    generateGameReport,
    isReviewMode,
    reviewMoveIndex,
    enterReviewMode,
    exitReviewMode,
    setReviewMove,
    nextReviewMove,
    prevReviewMove,
  }
})
