// src/stores/openingExam.store.ts
import type { Key } from '@lichess-org/chessground/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  openingApiService,
  type LichessMastersParams,
  type LichessMove,
  type LichessOpeningResponse,
  type LichessParams,
  type OpeningDatabaseSource,
} from '../services/OpeningApiService'
import { openingGraphService } from '../services/OpeningGraphService'
import { soundService } from '../services/sound.service'
import { type SessionMove } from '../types/openingTrainer.types'
import { useBoardStore } from './board.store'
import { useGameStore } from './game.store'

export const useOpeningExamStore = defineStore('openingExam', () => {
  const boardStore = useBoardStore()

  const currentStats = ref<LichessOpeningResponse | null>(null)
  const sessionHistory = ref<SessionMove[]>([])
  const isTheoryOver = ref(false)
  const isDeviation = ref(false)
  const variability = ref(5)
  const playerColor = ref<'white' | 'black'>('white')
  const openingName = ref('')
  const currentEco = ref('')
  const isLoading = ref(false)
  const isProcessingMove = ref(false)
  const isPlayoutMode = ref(false)
  const error = ref<string | null>(null)
  const moveQueue = ref<string[]>([])

  // Lives for Exam mode
  const lives = ref(3)

  // Database settings - Fixed for Exam
  const dbSource = ref<OpeningDatabaseSource>('masters')
  const lichessParams = ref<LichessParams>({
    ratings: [1800, 2000, 2200, 2500],
    speeds: ['blitz', 'rapid', 'classical'],
  })
  const lichessMastersParams = ref({
    since: 1952,
    until: new Date().getFullYear(),
    moves: 12,
    topGames: 10,
  })

  // Request deduplication tracking
  const lastFetchedFen = ref<string>('')
  const lastFetchedConfig = ref<string>('')

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
      await openingGraphService.loadBook()
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
    currentStats.value = null
    sessionHistory.value = []
    isTheoryOver.value = false
    isDeviation.value = false
    openingName.value = ''
    currentEco.value = ''
    error.value = null
    isLoading.value = false
    isProcessingMove.value = false
    isPlayoutMode.value = false
    moveQueue.value = []
    lastFetchedFen.value = ''
    lastFetchedConfig.value = ''
    lives.value = 3 // Reset lives
  }

  function setLichessParams(params: Partial<LichessParams>) {
    lichessParams.value = { ...lichessParams.value, ...params }
    fetchStats(false, true) // Force refresh
  }

  function setLichessMastersParams(params: LichessMastersParams) {
    lichessMastersParams.value = { ...lichessMastersParams.value, ...params }
    fetchStats(false, true) // Force refresh
  }

  function setDbSource(source: OpeningDatabaseSource) {
    dbSource.value = source
    fetchStats(false, true) // Force refresh
  }

  function generateConfigHash(): string {
    if (dbSource.value === 'masters') {
      const m = lichessMastersParams.value
      return `masters:${m.since}:${m.until}:${m.topGames}`
    }
    return `lichess:${lichessParams.value.ratings.slice().sort().join(',')}|${lichessParams.value.speeds.slice().sort().join(',')}`
  }

  async function fetchStats(isGameplay = true, force = false, onlyCache = false) {
    const currentFen = boardStore.fen
    const currentConfig = generateConfigHash()

    if (
      !force &&
      currentFen === lastFetchedFen.value &&
      currentConfig === lastFetchedConfig.value &&
      !onlyCache
    ) {
      return
    }

    isLoading.value = true
    error.value = null
    try {
      const params = dbSource.value === 'masters' ? lichessMastersParams.value : lichessParams.value
      const data = await openingApiService.getStats(currentFen, dbSource.value, params, {
        onlyCache,
      })

      if (!onlyCache) {
        lastFetchedFen.value = currentFen
        lastFetchedConfig.value = currentConfig
      }

      if (data) {
        currentStats.value = data
        if (data.opening && !openingName.value) {
          openingName.value = data.opening.name
          if (data.opening.eco) currentEco.value = data.opening.eco
        }

        if (data.moves.length === 0 && isGameplay) {
          isTheoryOver.value = true
          soundService.playSound('game_user_won')
        }
      } else {
        if (onlyCache) {
          currentStats.value = null
        } else if (isGameplay) {
          isTheoryOver.value = true
        }
      }
    } catch {
      currentStats.value = null
      error.value = `Failed to fetch stats from ${dbSource.value}.`
    } finally {
      isLoading.value = false
    }
  }

  async function handlePlayerMove(moveUci: string) {
    isProcessingMove.value = true
    moveQueue.value.push(moveUci)
    try {
      await processMoveQueue()
    } catch {
      isProcessingMove.value = false
    }
  }

  async function processMoveQueue() {
    if (isLoading.value || error.value || !currentStats.value || moveQueue.value.length === 0) {
      return
    }

    const moveUci = moveQueue.value.shift()!
    const moveData = currentStats.value.moves.find((m: LichessMove) => m.uci === moveUci)

    if (!moveData) {
      isDeviation.value = true
      soundService.playSound('game_user_won')
      moveQueue.value = []
      isProcessingMove.value = false
      return
    }

    const totalGamesInPos =
      currentStats.value.white + currentStats.value.draws + currentStats.value.black || 1
    const moveGames = moveData.white + moveData.draws + moveData.black
    const popularity = (moveGames / totalGamesInPos) * 100

    const graphMoves = openingGraphService.getMoves(boardStore.fen)
    const isAcademic = graphMoves.some((gm) => gm.uci === moveUci)
    const maxGames = Math.max(
      ...currentStats.value.moves.map((m: any) => m.white + m.draws + m.black),
    )
    let accuracy = maxGames > 0 ? (moveGames / maxGames) * 100 : 0
    if (isAcademic) accuracy = 100

    const wins = playerColor.value === 'white' ? moveData.white : moveData.black
    const winRateRaw = moveGames > 0 ? ((wins + 0.5 * moveData.draws) / moveGames) * 100 : 0
    const rating = moveData.averageRating || 0

    const graphMoveData = graphMoves.find((m) => m.uci === moveUci)
    if (graphMoveData) {
      if (graphMoveData.name) openingName.value = graphMoveData.name
      if (graphMoveData.eco) currentEco.value = graphMoveData.eco
    }

    sessionHistory.value.push({
      fen: boardStore.fen,
      moveUci,
      san: moveData.san,
      stats: moveData,
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
    if (!currentStats.value || currentStats.value.moves.length === 0) {
      await fetchStats()
      if (!currentStats.value || currentStats.value.moves.length === 0) {
        isTheoryOver.value = true
        soundService.playSound('game_user_won')
        isProcessingMove.value = false
        return
      }
    }

    let candidateMoves = currentStats.value.moves
    const graphMoves = openingGraphService.getMoves(boardStore.fen)
    const academicMoves = candidateMoves.filter((lm: LichessMove) =>
      graphMoves.some((gm) => gm.uci === lm.uci),
    )

    if (academicMoves.length > 0) {
      candidateMoves = academicMoves
    }

    const topMoves = candidateMoves.slice(0, variability.value)
    if (topMoves.length === 0) {
      isTheoryOver.value = true
      isProcessingMove.value = false
      return
    }

    const totalGames = topMoves.reduce(
      (acc: number, m: LichessMove) => acc + (m.white + m.draws + m.black),
      0,
    )
    let random = Math.random() * totalGames
    let selectedMove: LichessMove = topMoves[0]!

    for (const move of topMoves) {
      const moveGames = move.white + move.draws + move.black
      if (random < moveGames) {
        selectedMove = move
        break
      }
      random -= moveGames
    }

    boardStore.applyUciMove(selectedMove.uci)
    await fetchStats()

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

    lives.value -= 1 // Decrement lives

    boardStore.drawableShapes = [
      {
        orig: bestMove.uci.substring(0, 2) as Key,
        dest: bestMove.uci.substring(2, 4) as Key,
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
    gameStore.currentGameMode = 'sandbox'
    soundService.playSound('game_play_out_start')
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
    dbSource,
    lichessParams,
    lichessMastersParams,
    lives,
    setLichessParams,
    setLichessMastersParams,
    setDbSource,
    initializeSession,
    handlePlayerMove,
    fetchStats,
    reset,
    hint,
    startPlayout,
  }
})
