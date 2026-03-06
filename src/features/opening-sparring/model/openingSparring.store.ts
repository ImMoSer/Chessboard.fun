import { analysisService } from '@/entities/analysis'
import { useBoardStore, useGameStore, type IGameplayStrategy } from '@/entities/game'
import { theoryGraphService, useTheoryStore } from '@/entities/opening'
import logger from '@/shared/lib/logger'
import { pgnService, pgnTreeVersion } from '@/shared/lib/pgn/PgnService'
import { type SessionMove } from '@/shared/types/openingSparring.types'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { gameReviewService } from '../api/GameReviewService'
import { apiClient } from '@/shared/api/client'

import { type TopInfoBadge, type TopInfoDisplay, type TopInfoStat } from '@/entities/puzzle'
import i18n from '@/shared/config/i18n'

const t = (key: string) => i18n.global.t(key)

export const useOpeningSparringStore = defineStore('openingSparring', () => {
  const boardStore = useBoardStore()
  const theoryStore = useTheoryStore()

  // -- sessionHistory ref with computed from PGN --
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
        fen: node.fenAfter,
        moveUci: node.uci,
        san: node.san,
        phase: meta.phase || 'theory',
        stats: meta.stats,
        ply: node.ply,
        turn,
        moveNumber,
        quality: meta.quality,
        nag: meta.nag,
        evaluation: meta.evaluation,
        popularity: meta.popularity,
        winRate: meta.winRate,
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

  const savedRatingRange = localStorage.getItem('openingSparring.opponentRatingRange')
  const validRanges = ['1000-1499', '1500-1799', '1800-2200']
  const opponentRatingRange = ref<'1000-1499' | '1500-1799' | '1800-2200'>(
    savedRatingRange && validRanges.includes(savedRatingRange)
      ? (savedRatingRange as '1000-1499' | '1500-1799' | '1800-2200')
      : '1000-1499'
  )

  // Persist settings
  watch(
    [opponentSource, opponentRatingRange],
    () => {
      localStorage.setItem('openingSparring.opponentSource', opponentSource.value)
      localStorage.setItem('openingSparring.opponentRatingRange', opponentRatingRange.value)
      theoryStore.setLichessParams({ ratingRange: opponentRatingRange.value })
    },
    { deep: true, immediate: true },
  )

  // Link UI state to the unified Theory Store
  const currentStats = computed(() => theoryStore.currentMozerStats)
  const currentLichessStats = computed(() => theoryStore.currentLichessStats)
  const isStatsLoading = computed(() => theoryStore.isMozerLoading || theoryStore.isLichessLoading)

  // Final Evaluation state
  const finalEval = ref<{ type: 'cp' | 'mate'; value: number } | null>(null)
  const isFinalEvaluating = ref(false)
  const finalEvalDepth = ref(0)

  const movesCount = computed(() => sessionHistory.value.length)

  const averagePopularity = computed(() => {
    const playerMoves = sessionHistory.value.filter(
      (m) =>
        (m.turn === 'w' && playerColor.value === 'white') ||
        (m.turn === 'b' && playerColor.value === 'black'),
    )
    if (playerMoves.length === 0) return 0
    const sum = playerMoves.reduce((acc, m) => acc + (m.popularity ?? 0), 0)
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

  const isInitializing = ref(false)

  async function startSparringMutation() {
    return apiClient<{ status: string }>('/opening/sparring/start', {
      method: 'POST'
    })
  }

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

      // Load initial theory stats for the starting position via stable repository call
      await theoryStore.fetchMozerStats(sessionStartFen)

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
        await startSparringMutation()
      } catch (err) {
        logger.error('[OpeningSparring] Failed to start session on backend', err)
      }

    } finally {
      isProcessingMove.value = false
      isInitializing.value = false
    }
  }

  function reset() {
    console.log('[OpeningSparring] Resetting session')
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
    theoryStore.reset()
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

  // Reactive Name & ECO from Local Graph
  watch(
    () => theoryStore.currentFen,
    (fen) => {
      if (fen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
        openingName.value = t('openingTrainer.settings.startPosition')
        currentEco.value = ''
        return
      }

      const node = pgnService.getCurrentNode()
      if (!node || node.ply === 0) return

      const result = theoryGraphService.getOpeningByMove(node.fenBefore, node.uci)
      if (result) {
        if (result.name) openingName.value = result.name
        if (result.eco) currentEco.value = result.eco
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

    if (isDeviation.value && !isPlayoutMode.value) {
      badges.push({
        text: t('openingTrainer.header.deviation'),
        type: 'error',
      })
    }

    if (isPlayoutMode.value) {
      // Add NAG badges (Show only if count > 0)
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
          value: averagePopularity.value,
          label: t('openingTrainer.header.popularity') || 'Popularity',
          color: '#f0a020',
        },
        {
          icon: 'trending-up',
          value: averageWinRate.value,
          label: t('openingTrainer.header.winRate'),
          color: '#4caf50',
        }
      )
    } else {
      // Playout Mode: Show evaluation only (Sticky update: show last known eval while calculating)
      let evalMove = sessionHistory.value[sessionHistory.value.length - 1]

      // If latest move is still loading its evaluation, look back for the previous one
      if (!evalMove || !evalMove.evaluation) {
        for (let i = sessionHistory.value.length - 2; i >= 0; i--) {
          const m = sessionHistory.value[i]
          if (m && m.evaluation) {
            evalMove = m
            break
          }
        }
      }

      const evaluationValue = (evalMove && evalMove.evaluation)
        ? (evalMove.evaluation.score_cp / 100).toFixed(1)
        : '0.0'

      stats.push(
        {
          icon: 'advantage',
          value: evaluationValue,
          label: t('puzzleInfo.evaluation'),
          color: parseFloat(evaluationValue) >= 0 ? '#4caf50' : '#f44336',
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
    sessionHistory,
    averagePopularity,
    averageWinRate,
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
    finalEval,
    isFinalEvaluating,
    finalEvalDepth,
    opponentSource,
    opponentRatingRange,
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
