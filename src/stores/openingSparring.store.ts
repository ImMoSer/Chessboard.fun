// src/stores/openingSparring.store.ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { type Key } from '@lichess-org/chessground/types'
import { theoryGraphService } from '../services/TheoryGraphService'
import { soundService } from '../services/sound.service'
import { type SessionMove } from '../types/openingSparring.types'
import { areMovesEqual } from '../utils/chess-utils'
import { useBoardStore } from './board.store'
import { useGameStore } from './game.store'
import { useMozerBookStore } from './mozerBook.store'

const PLAYOUT_DELAY = 100

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

  // Final Evaluation state
  const finalEval = ref<{ type: 'cp' | 'mate'; value: number } | null>(null)
  const isFinalEvaluating = ref(false)
  const finalEvalDepth = ref(0)

  const movesCount = computed(() => sessionHistory.value.length)

  const averageAccuracy = computed(() => {
    if (movesCount.value === 0) return 0
    const sum = sessionHistory.value.reduce((acc, m) => acc + (m.accuracy ?? m.popularity ?? 0), 0)
    return Math.round(sum / movesCount.value)
  })

  const averageWinRate = computed(() => {
    if (movesCount.value === 0) return 0
    const sum = sessionHistory.value.reduce((acc, m) => acc + (m.winRate ?? 0), 0)
    return Math.round(sum / movesCount.value)
  })

  const averageRating = computed(() => {
    if (movesCount.value === 0) return 0
    // If stats are missing (playout), we treat as 0 or ignore. Here treating as 0.
    const sum = sessionHistory.value.reduce((acc, m) => acc + (m.stats?.perf ?? 0), 0)
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
    console.log('[OpeningSparring] Resetting session')
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
    finalEval.value = null
    isFinalEvaluating.value = false
    finalEvalDepth.value = 0
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

  async function runFinalEvaluation() {
      if (isFinalEvaluating.value) return

      const targetDepth = 20

      isFinalEvaluating.value = true
      finalEvalDepth.value = 0
      finalEval.value = null

      // We use analysisService directly to not interfere with analysisStore UI
      const { analysisService } = await import('../services/AnalysisService')
      await analysisService.initialize()

      // Dynamically calculate threads: cores / 2, but between 1 and 4.
      const cores = navigator.hardwareConcurrency || 1
      const threads = Math.max(1, Math.min(4, Math.floor(cores / 2)))
      await analysisService.setThreads(threads)

      return new Promise<void>((resolve) => {
          // Use multiPV = 1 for fastest assessment of the top line
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
        // In playout mode, we add move to history (without stats) and trigger engine
        sessionHistory.value.push({
            fen: boardStore.fen,
            moveUci: moveUci,
            san: '', // We don't have SAN easily here without chessops, leaving empty for now or need a parser
            phase: 'playout',
            stats: undefined
        })
        
        isProcessingMove.value = true
        setTimeout(async () => {
            await triggerEngineMove()
            isProcessingMove.value = false
        }, PLAYOUT_DELAY)
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
    
    // Mapping MozerBook fields to TheoryMove directly (no mapping needed per se, just assignment)
    // MozerBookMove fields: w_pct, d_pct, l_pct, perf, total... matches TheoryMove
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

    sessionHistory.value.push({
      fen: boardStore.fen,
      moveUci,
      san: moveData.san,
      phase: 'theory',
      stats: moveStats,
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

    // Calculate stats for the bot's move
    const totalGamesInPos = stats.summary
      ? stats.summary.w + stats.summary.d + stats.summary.l
      : stats.moves.reduce((acc, m) => acc + m.total, 0) || 1

    const popularity = (selectedMove.total / totalGamesInPos) * 100
    const maxTotal = Math.max(...stats.moves.map((m) => m.total))
    const accuracy = maxTotal > 0 ? (selectedMove.total / maxTotal) * 100 : 0
    
    // Win rate from User's perspective
    const wins = playerColor.value === 'white' ? selectedMove.w_pct : selectedMove.l_pct
    const winRateRaw = wins + 0.5 * selectedMove.d_pct
    const rating = selectedMove.perf || 0

    const moveStats = {
        uci: selectedMove.uci,
        san: selectedMove.san,
        total: selectedMove.total,
        w_pct: selectedMove.w_pct,
        d_pct: selectedMove.d_pct,
        l_pct: selectedMove.l_pct,
        perf: selectedMove.perf
    }

    boardStore.applyUciMove(selectedMove.uci)

    sessionHistory.value.push({
      fen: boardStore.fen,
      moveUci: selectedMove.uci,
      san: selectedMove.san,
      phase: 'theory',
      stats: moveStats,
      popularity,
      accuracy,
      winRate: winRateRaw,
      rating
    })

    await fetchStats()

    if (moveQueue.value.length > 0) {
      await processMoveQueue()
    } else {
      isProcessingMove.value = false
    }
  }

  async function triggerEngineMove() {
      // Use gameplayService to get the best move from the selected sparring partner
      // This respects the engine choice (Server or Local) and doesn't trigger analysis panel
      const { gameplayService } = await import('../services/GameplayService')
      const { useControlsStore } = await import('./controls.store')
      
      const controlsStore = useControlsStore()
      const selectedEngine = controlsStore.selectedEngine

      try {
          await new Promise(resolve => setTimeout(resolve, PLAYOUT_DELAY))
          
          const bestMove = await gameplayService.getBestMove(selectedEngine, boardStore.fen)

          if (bestMove) {
              boardStore.applyUciMove(bestMove)
              
              // Record bot move in session history (playout phase)
              sessionHistory.value.push({
                  fen: boardStore.fen,
                  moveUci: bestMove,
                  san: '', // Empty SAN for now
                  phase: 'playout',
                  stats: undefined
              })
              
              // We do not fetchStats() in playout mode as we are out of book
          }
      } catch (err) {
          console.error('Error in triggerEngineMove:', err)
      }
  }

  function hint() {
    if (lives.value <= 0) return

    const bestMove = currentStats.value?.moves?.[0]
    if (!bestMove) return

    lives.value -= 1

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
    isFinalEvaluating.value = false
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
    finalEval,
    isFinalEvaluating,
    finalEvalDepth,
    initializeSession,
    handlePlayerMove,
    fetchStats,
    runFinalEvaluation,
    reset,
    hint,
    startPlayout,
  }
})