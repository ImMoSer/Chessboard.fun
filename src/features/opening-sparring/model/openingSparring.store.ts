import { useBoardStore } from '@/entities/board'
import { useGameStore } from '@/entities/game'
import { theoryGraphService } from '@/entities/opening'
import { analysisService } from '@/features/analysis/api/AnalysisService'
import { gameReviewService } from '@/features/opening-sparring/api/GameReviewService'
import { useOpeningSparringQueries } from '@/features/opening-sparring/api/openingSparring.queries'
import { webhookService } from '@/shared/api/WebhookService'
import { pgnService, pgnTreeVersion } from '@/shared/lib/pgn/PgnService'
import { type SessionMove } from '@/shared/types/openingSparring.types'
import { type Key } from '@lichess-org/chessground/types'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export const useOpeningSparringStore = defineStore('openingSparring', () => {
  const boardStore = useBoardStore()

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
  const isLoading = ref(false)
  const isProcessingMove = ref(false)
  const isPlayoutMode = ref(false)
  const isReviewMode = ref(false)
  const reviewMoveIndex = ref(-1)
  const error = ref<string | null>(null)
  const moveQueue = ref<string[]>([])


  const savedSource = localStorage.getItem('openingSparring.opponentSource') as 'master' | 'lichess' | null
  const opponentSource = ref<'master' | 'lichess'>(savedSource || 'master')

  const savedRatings = localStorage.getItem('openingSparring.opponentRatings')
  const defaultRatings = [1200, 1400, 1600, 1800, 2000, 2200]
  const opponentRatings = ref<number[]>(savedRatings ? JSON.parse(savedRatings) : defaultRatings)

  // --- Vue Query Integration ---
  const fen = computed(() => boardStore.fen)
  const shouldFetchLichess = computed(() => boardStore.turn !== playerColor.value)

  const { mozerQuery, lichessQuery } = useOpeningSparringQueries({
    fen,
    source: opponentSource,
    shouldFetchLichess,
    lichessRatings: opponentRatings,
  })

  const currentStats = computed(() => mozerQuery.data.value ?? null)
  const currentLichessStats = computed(() => lichessQuery.data.value ?? null)
  const isStatsLoading = computed(() => mozerQuery.isFetching.value || lichessQuery.isFetching.value)

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

  // Dependencies for initialization
  interface InitCallbacks {
    onPlayerMove: (uci: string) => void
    onBotMove: () => Promise<void>
  }

  async function initializeSession(color: 'white' | 'black', startMoves: string[] = [], callbacks: InitCallbacks) {
    if (isInitializing.value) {
      console.log('[OpeningSparring] Initialization already in progress, skipping')
      return
    }

    isInitializing.value = true
    try {
      console.log('[OpeningSparring] Initializing session', { color, startMoves })

      reset()
      playerColor.value = color
      isProcessingMove.value = true

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
        (uci) => callbacks.onPlayerMove(uci),
        undefined, // onBotMove handled by the hook
        false,
      )

      await theoryGraphService.loadBook()
      await webhookService.startOpeningSparring()

      for (const move of startMoves) {
        boardStore.applyUciMove(move)
        const node = pgnService.getLastMove()
        if (node) pgnService.updateNode(node, { metadata: { phase: 'theory' } })
      }

      // Instead of manual fetchStats(), we wait for Vue Query to resolve if needed,
      // but typically we just wait to see whose turn it is
      // We assume queries are automatically triggered by reactivity now.

      // If Bot turn, trigger hook callback
      if (boardStore.turn !== color) {
        // Delay briefly to allow queries to begin fetching
        setTimeout(() => {
          callbacks.onBotMove()
        }, 100)
      }
    } finally {
      isProcessingMove.value = false
      isInitializing.value = false
    }
  }

  function reset() {
    console.log('[OpeningSparring] Resetting session')
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

  watch(() => currentStats.value, (stats) => {
    // Sync names on successful load automatically
    if (stats && stats.summary && !openingName.value) {
      const theoryItem = stats.theory?.[0]
      if (theoryItem) {
        openingName.value = theoryItem.name
        if (theoryItem.eco) currentEco.value = theoryItem.eco
      }
    }
  }, { immediate: true })

  async function runFinalEvaluation() {
    if (isFinalEvaluating.value) return

    const targetDepth = 20
    isFinalEvaluating.value = true
    finalEvalDepth.value = 0
    finalEval.value = null

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

  // Removed: handlePlayerMove, processMoveQueue, triggerBotMove, startPlayout
  // The Game Loop is now in useSparringLoop composable

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

  async function generateGameReport() {
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
    moveQueue,
    lives,
    finalEval,
    isFinalEvaluating,
    finalEvalDepth,
    opponentSource,
    opponentRatings,
    currentLichessStats,
    isStatsLoading,
    initializeSession,
    handlePlayerMove: () => { console.warn('Called removed handlePlayerMove from store. Use useSparringLoop instead.') },
    triggerBotMove: () => { console.warn('Called removed triggerBotMove from store. Use useSparringLoop instead.') },
    generateGameReport,
    runFinalEvaluation,
    reset,
    hint,
    isReviewMode,
    reviewMoveIndex,
    enterReviewMode,
    exitReviewMode,
    setReviewMove,
    nextReviewMove,
    prevReviewMove,
  }
})
