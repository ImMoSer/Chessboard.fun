// src/stores/openingSparring.store.ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { theoryGraphService } from '../services/TheoryGraphService'
import { soundService } from '../services/sound.service'
import { type SessionMove } from '../types/openingTrainer.types'
import { areMovesEqual } from '../utils/chess-utils'
import { useAnalysisStore } from './analysis.store'
import { useBoardStore } from './board.store'
import { useGameStore } from './game.store'
import { useMozerBookStore } from './mozerBook.store'

export const useOpeningSparringStore = defineStore('openingSparring', () => {
  const boardStore = useBoardStore()
  const mozerStore = useMozerBookStore()

  const currentStats = computed(() => mozerStore.currentStats)
  const sessionHistory = ref<SessionMove[]>([])
  const isTheoryOver = ref(false)
  const isDeviation = ref(false)
  const variability = ref(5)
  const playerColor = ref<'white' | 'black'>('white')
  const openingName = ref('')
  const currentEco = ref('')
  const isLoading = computed(() => mozerStore.isLoading)
  const isProcessingMove = ref(false)
  const isPlayoutMode = ref(false)
  const error = computed(() => mozerStore.error)
  const moveQueue = ref<string[]>([])

  // Lives for Exam mode
  const lives = ref(3)

  const movesCount = computed(() => sessionHistory.value.length)

  const averageAccuracy = computed(() => {
    if (movesCount.value === 0) return 0
    const sum = sessionHistory.value.reduce((acc, m) => acc + (m.accuracy ?? m.popularity), 0)
    return Math.round(sum / movesCount.value)
  })

  const averageWinRate = computed(() => {
    if (movesCount.value === 0) return 0
    const sum = sessionHistory.value.reduce((acc, m) => acc + m.winRate, 0)
    return Math.round(sum / movesCount.value)
  })

  const averageRating = computed(() => {
    if (movesCount.value === 0) return 0
    const sum = sessionHistory.value.reduce((acc, m) => acc + m.rating, 0)
    return Math.round(sum / movesCount.value)
  })

  async function initializeSession(color: 'white' | 'black', startMoves: string[] = []) {
    reset()
    playerColor.value = color
    isProcessingMove.value = true

    try {
      // Still load book for initial navigation or slug search if used in View
      await theoryGraphService.loadBook()

      boardStore.setupPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', color)

      for (const move of startMoves) {
        boardStore.applyUciMove(move)
      }

      await fetchStats()

      if (boardStore.turn !== color) {
        await triggerBotMove()
      }
    } finally {
      isProcessingMove.value = false
    }
  }

  function reset() {
    mozerStore.reset()
    sessionHistory.value = []
    isTheoryOver.value = false
    isDeviation.value = false
    openingName.value = ''
    currentEco.value = ''
    isProcessingMove.value = false
    isPlayoutMode.value = false
    moveQueue.value = []
    lives.value = 3
  }

  async function fetchStats() {
    await mozerStore.fetchStats()
    if (currentStats.value) {
      if (currentStats.value.summary && !openingName.value) {
        // Fallback or use theory items if available
        const theoryItem = currentStats.value.theory?.[0]
        if (theoryItem) {
          openingName.value = theoryItem.name
          if (theoryItem.eco) currentEco.value = theoryItem.eco
        }
      }
    }
  }

  async function handlePlayerMove(moveUci: string) {
    if (isPlayoutMode.value) {
        // In playout mode, we just let the bot respond with engine
        isProcessingMove.value = true
        setTimeout(async () => {
            await triggerEngineMove()
            isProcessingMove.value = false
        }, 500)
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
        // No stats available, this shouldn't happen if we correctly transition,
        // but if it does, it's a deviation or theory over
        isTheoryOver.value = true
        isProcessingMove.value = false
        return
    }

    // Use our new move matching utility
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

    if (moveData.name) openingName.value = moveData.name
    if (moveData.eco) currentEco.value = moveData.eco

    sessionHistory.value.push({
      fen: boardStore.fen,
      moveUci,
      san: moveData.san,
      stats: {
          uci: moveData.uci,
          san: moveData.san,
          white: moveData.w_pct,
          draws: moveData.d_pct,
          black: moveData.l_pct,
          averageRating: moveData.perf
      } as any,
      popularity,
      accuracy,
      winRate: winRateRaw,
      rating,
    })

    await fetchStats()

    if (!isTheoryOver.value && !isDeviation.value) {
      await triggerBotMove()
    } else {
      isProcessingMove.value = false
    }
  }

  async function triggerBotMove() {
    const stats = currentStats.value
    if (!stats || stats.moves.length === 0) {
      isTheoryOver.value = true
      soundService.playSound('game_user_won')
      isProcessingMove.value = false
      return
    }

    // Pick a move from top N based on variability
    const topMoves = stats.moves.slice(0, variability.value)
    if (topMoves.length === 0) {
      isTheoryOver.value = true
      isProcessingMove.value = false
      return
    }

    const totalGames = topMoves.reduce((acc, m) => acc + m.total, 0)
    let random = Math.random() * totalGames
    let selectedMove = topMoves[0]!

    for (const move of topMoves) {
      if (random < move.total) {
        selectedMove = move
        break
      }
      random -= move.total
    }

    boardStore.applyUciMove(selectedMove.uci)
    await fetchStats()

    if (moveQueue.value.length > 0) {
      await processMoveQueue()
    } else {
      isProcessingMove.value = false
    }
  }

  async function triggerEngineMove() {
      const analysisStore = useAnalysisStore()
      // Make sure analysis is running
      if (!analysisStore.isAnalysisActive) {
          await analysisStore.showPanel(true)
      }

      // Wait a bit for engine to produce a move
      await new Promise(resolve => setTimeout(resolve, 1000))

      const bestMove = analysisStore.analysisLines[0]?.pvUci[0]
      if (bestMove) {
          boardStore.applyUciMove(bestMove)
          await fetchStats()
      }
  }

  function hint() {
    if (lives.value <= 0) return

    const bestMove = currentStats.value?.moves?.[0]
    if (!bestMove) return

    lives.value -= 1

    boardStore.drawableShapes = [
      {
        orig: bestMove.uci.substring(0, 2) as any,
        dest: bestMove.uci.substring(2, 4) as any,
        brush: 'green',
      },
    ]
    setTimeout(() => {
      boardStore.drawableShapes = []
    }, 2000)
  }

  function startPlayout() {
    isPlayoutMode.value = true
    const gameStore = useGameStore()
    // We stay in opening-trainer mode but isPlayoutMode flag will change behavior
    gameStore.currentGameMode = 'opening-trainer'
    soundService.playSound('game_play_out_start')

    // If it's bot's turn, trigger engine move
    if (boardStore.turn !== playerColor.value) {
        triggerEngineMove()
    }
  }

  return {
    currentStats,
    sessionHistory,
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
    isProcessingMove,
    isPlayoutMode,
    error,
    lives,
    initializeSession,
    handlePlayerMove,
    fetchStats,
    reset,
    hint,
    startPlayout,
  }
})
