import { analysisService } from '@/entities/analysis'
import { useBoardStore, useGameStore, type IGameplayStrategy } from '@/entities/game'
import { mozerBookService, theoryGraphService, type MozerBookResponse } from '@/entities/opening'
import logger from '@/shared/lib/logger'
import { pgnService, pgnTreeVersion } from '@/shared/lib/pgn/PgnService'
import { type SessionMove } from '@/shared/types/openingSparring.types'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { gameReviewService } from '../api/GameReviewService'

import { type TopInfoBadge, type TopInfoDisplay, type TopInfoStat } from '@/entities/puzzle'
import i18n from '@/shared/config/i18n'
import { useOpeningSparringQueries } from '../api/openingSparring.queries'

const t = (key: string) => i18n.global.t(key)

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
        rating: meta.rating,
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

  const savedSource = localStorage.getItem('openingSparring.opponentSource') as
    | 'master'
    | 'lichess'
    | null
  const opponentSource = ref<'master' | 'lichess'>(savedSource || 'master')

  const savedRatings = localStorage.getItem('openingSparring.opponentRatings')
  const defaultRatings = [1200, 1400, 1600, 1800, 2000, 2200]
  const opponentRatings = ref<number[]>(savedRatings ? JSON.parse(savedRatings) : defaultRatings)

  // --- stable theory state for game loop ---
  const activeTheoryStats = ref<MozerBookResponse | null>(null)

  // --- Vue Query Integration (Reactive for UI) ---
  const fen = computed(() => boardStore.fen)
  const shouldFetchLichess = computed(() => boardStore.turn !== playerColor.value)
  const isTheoryPhase = computed(() => !isPlayoutMode.value && !isReviewMode.value)

  const { mozerQuery, lichessQuery, startSparringMutation } = useOpeningSparringQueries({
    fen,
    source: opponentSource,
    shouldFetchLichess,
    lichessRatings: opponentRatings,
    isTheoryPhase,
  })

  const currentStats = computed(() => mozerQuery.data.value ?? null)
  const currentLichessStats = computed(() => lichessQuery.data.value ?? null)
  const isStatsLoading = computed(
    () => mozerQuery.isFetching.value || lichessQuery.isFetching.value,
  )

  // Persist settings
  watch(
    [opponentSource, opponentRatings],
    () => {
      localStorage.setItem('openingSparring.opponentSource', opponentSource.value)
      localStorage.setItem('openingSparring.opponentRatings', JSON.stringify(opponentRatings.value))
    },
    { deep: true },
  )

  // Final Evaluation state
  const finalEval = ref<{ type: 'cp' | 'mate'; value: number } | null>(null)
  const isFinalEvaluating = ref(false)
  const finalEvalDepth = ref(0)

  const movesCount = computed(() => sessionHistory.value.length)

  const averageAccuracy = computed(() => {
    const playerMoves = sessionHistory.value.filter(
      (m) =>
        (m.turn === 'w' && playerColor.value === 'white') ||
        (m.turn === 'b' && playerColor.value === 'black'),
    )
    if (playerMoves.length === 0) return 0
    const sum = playerMoves.reduce((acc, m) => acc + (m.accuracy ?? m.popularity ?? 0), 0)
    return Math.round(sum / playerMoves.length)
  })

  const averageWinRate = computed(() => {
    const playerMoves = sessionHistory.value.filter(
      (m) =>
        (m.turn === 'w' && playerColor.value === 'white') ||
        (m.turn === 'b' && playerColor.value === 'black'),
    )
    if (playerMoves.length === 0) return 0
    const sum = playerMoves.reduce((acc, m) => acc + (m.winRate ?? 0), 0)
    return Math.round(sum / playerMoves.length)
  })

  const averageRating = computed(() => {
    const playerMoves = sessionHistory.value.filter(
      (m) =>
        (m.turn === 'w' && playerColor.value === 'white') ||
        (m.turn === 'b' && playerColor.value === 'black'),
    )
    if (playerMoves.length === 0) return 0
    const sum = playerMoves.reduce((acc, m) => acc + (m.rating ?? 0), 0)
    return Math.round(sum / playerMoves.length)
  })

  const isInitializing = ref(false)

  async function initializeSession(
    color: 'white' | 'black',
    startMoves: string[] = [],
    strategy: IGameplayStrategy,
  ) {
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

      // 1. Manually setup board and history with startMoves BEFORE passing to GameStore
      boardStore.setupPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', color)
      for (const move of startMoves) {
        boardStore.applyUciMove(move)
        const node = pgnService.getLastMove()
        if (node) pgnService.updateNode(node, { metadata: { phase: 'theory' } })
      }

      const sessionStartFen = boardStore.fen

      // Load initial theory stats for the starting position
      activeTheoryStats.value = await mozerBookService.getStats(sessionStartFen)

      // 2. Pass control to GameStore Dual-Boot logic
      const gameStore = useGameStore()
      gameStore.startWithStrategy(
        sessionStartFen,
        strategy,
        color,
        true // keepPgn: true (we just built it)
      )

      await theoryGraphService.loadBook()

      try {
        await startSparringMutation.mutateAsync()
      } catch (err) {
        logger.error('[OpeningSparring] Failed to start session on backend', err)
      }

      // The bot move will be triggered automatically by GameStore if `boardStore.turn !== color`

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

  watch(
    () => currentStats.value,
    (stats) => {
      // Sync names on successful load automatically
      if (stats && stats.summary && !openingName.value) {
        const theoryItem = stats.theory?.[0]
        if (theoryItem) {
          openingName.value = theoryItem.name
          if (theoryItem.eco) currentEco.value = theoryItem.eco
        }
      }
    },
    { immediate: true },
  )

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
      analysisService.startAnalysis(
        boardStore.fen,
        (lines) => {
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
        },
        1,
      )
    })
  }

  // Removed: handlePlayerMove, processMoveQueue, triggerBotMove, startPlayout
  // The Game Loop is now in useSparringLoop composable

  async function generateGameReport() {
    return gameReviewService.generateReport(sessionHistory.value, playerColor.value)
  }

  const playoutStats = computed(() => {
    const stats = {
      brilliant: 0,
      best: 0,
      interesting: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
    }

    sessionHistory.value.forEach((m) => {
      if (m.phase === 'playout' && m.turn === (playerColor.value === 'white' ? 'w' : 'b')) {
        if (m.quality) {
          if (m.quality === 'brilliant') stats.brilliant++
          else if (['best', 'great', 'good'].includes(m.quality)) stats.best++
          else if (m.quality === 'interesting') stats.interesting++
          else if (m.quality === 'inaccuracy') stats.inaccuracy++
          else if (m.quality === 'mistake') stats.mistake++
          else if (m.quality === 'blunder') stats.blunder++
        }
      }
    })
    return stats
  })

  const topInfoDisplay = computed<TopInfoDisplay>(() => {
    const badges: TopInfoBadge[] = []

    if (isTheoryOver.value && !isPlayoutMode.value) {
      badges.push({
        text: t('openingTrainer.header.bookEnded'),
        type: 'warning',
      })
    }

    if (isDeviation.value) {
      badges.push({
        text: t('openingTrainer.header.deviation'),
        type: 'error',
      })
    }

    if (isPlayoutMode.value) {
      // Add NAG badges
      const pStats = playoutStats.value
      if (pStats.brilliant > 0) badges.push({ text: `!!`, type: 'default', color: 'var(--color-nag-brilliant)', count: pStats.brilliant })
      if (pStats.best > 0) badges.push({ text: `!`, type: 'default', color: 'var(--color-nag-best)', count: pStats.best })
      if (pStats.interesting > 0) badges.push({ text: `!?`, type: 'default', color: 'var(--color-nag-interesting)', count: pStats.interesting })
      if (pStats.inaccuracy > 0) badges.push({ text: `?!`, type: 'default', color: 'var(--color-nag-inaccuracy)', count: pStats.inaccuracy })
      if (pStats.mistake > 0) badges.push({ text: `?`, type: 'default', color: 'var(--color-nag-mistake)', count: pStats.mistake })
      if (pStats.blunder > 0) badges.push({ text: `??`, type: 'default', color: 'var(--color-nag-blunder)', count: pStats.blunder })
    }

    // Determine stats based on mode
    const stats: TopInfoStat[] = []

    if (!isPlayoutMode.value) {
      stats.push(
        {
          icon: 'flash',
          value: averageAccuracy.value,
          label: t('openingTrainer.header.accuracy'),
          color: '#f0a020',
        },
        {
          icon: 'trending-up',
          value: averageWinRate.value,
          label: t('openingTrainer.header.winRate'),
          color: '#4caf50',
        },
        {
          icon: 'bar-chart',
          value: averageRating.value,
          label: t('openingTrainer.header.avgRating'),
          color: '#2080f0',
        }
      )
    } else {
      // Playout Mode: Show evaluation and accuracy
      const lastMove = sessionHistory.value[sessionHistory.value.length - 1]
      const evaluation = lastMove?.evaluation
        ? (lastMove.evaluation.score_cp / 100).toFixed(1)
        : '0.0'

      stats.push(
        {
          icon: 'advantage',
          value: evaluation,
          label: t('puzzleInfo.evaluation'),
          color: parseFloat(evaluation) >= 0 ? '#4caf50' : '#f44336',
        },
        {
          icon: 'flash',
          value: averageAccuracy.value,
          label: t('openingTrainer.header.accuracy'),
          color: '#f0a020',
        }
      )
    }

    return {
      title: '',
      badges,
      stats,
    }
  })

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
    activeTheoryStats,
    error,
    moveQueue,
    finalEval,
    isFinalEvaluating,
    finalEvalDepth,
    opponentSource,
    opponentRatings,
    currentLichessStats,
    isStatsLoading,
    initializeSession,
    handlePlayerMove: () => {
      console.warn('Called removed handlePlayerMove from store. Use useSparringLoop instead.')
    },
    triggerBotMove: () => {
      console.warn('Called removed triggerBotMove from store. Use useSparringLoop instead.')
    },
    generateGameReport,
    runFinalEvaluation,
    topInfoDisplay,
    reset,
    isReviewMode,
    reviewMoveIndex,
    enterReviewMode,
    exitReviewMode,
    setReviewMove,
    nextReviewMove,
    prevReviewMove,
  }
})
