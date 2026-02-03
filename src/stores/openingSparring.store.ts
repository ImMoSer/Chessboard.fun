// src/stores/openingSparring.store.ts
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { type Key } from '@lichess-org/chessground/types'
import { theoryGraphService } from '../services/TheoryGraphService'
import { soundService } from '../services/sound.service'
import { type SessionMove } from '../types/openingSparring.types'
import { areMovesEqual } from '../utils/chess-utils'
import { useBoardStore } from './board.store'
import { useGameStore } from './game.store'
import { useMozerBookStore } from './mozerBook.store'
import type { LichessMove, LichessOpeningResponse } from '../services/LichessApiService'
import type { MozerBookMove } from '../services/MozerBookService'

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
    currentLichessStats.value = null
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
    // 1. Always fetch Master stats (Source of Truth for evaluation)
    await mozerStore.fetchStats()

    // 2. If configured, fetch Lichess stats (Source for Bot decisions)
    if (opponentSource.value === 'lichess') {
        const { lichessApiService } = await import('../services/LichessApiService')
        // Using standard speeds (blitz, rapid, classical)
        currentLichessStats.value = await lichessApiService.getStats(boardStore.fen, 'lichess', {
            ratings: opponentRatings.value,
            speeds: ['blitz', 'rapid', 'classical']
        })
    } else {
        currentLichessStats.value = null
    }

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
    // Determine the source of moves for the bot
    let movesPool: (MozerBookMove | LichessMove)[] = []
    
    if (opponentSource.value === 'lichess' && currentLichessStats.value) {
        movesPool = currentLichessStats.value.moves
    } else {
        // Fallback to Master stats
        movesPool = currentStats.value?.moves || []
    }

    if (movesPool.length === 0) {
      // No moves available in the chosen source
      isTheoryOver.value = true
      
      // If we are in Lichess mode and run out of Lichess moves, 
      // check if Master moves exist. If so, maybe we shouldn't play winning sound yet?
      // But for now, if bot has no moves, theory is over.
      if (opponentSource.value === 'master') {
          soundService.playSound('game_user_won')
      }
      isProcessingMove.value = false
      return
    }

    // Pick a move from top N based on variability
    // NOTE: Lichess stats structure is slightly different (white, draws, black, total implied)
    // We need to normalize 'total' for random selection if it's Lichess
    
    const candidates = movesPool.slice(0, variability.value).map(m => {
        // Ensure we have a 'total' property
        let total = (m as MozerBookMove).total
        if (total === undefined) {
             // For Lichess moves
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

    // Now, we need to EVALUATE this move using Master Stats (MozerBook)
    const masterStats = currentStats.value
    // Find the selected move in Master stats to get the "official" evaluation
    const masterMoveData = masterStats?.moves.find(m => areMovesEqual(m.uci, selectedMove.uci))

    // Prepare data for history
    let moveStats = undefined
    let popularity = 0
    let accuracy = 0
    let winRateRaw = 0
    let rating = 0
    let san = selectedMove.san

    if (masterMoveData) {
        // Case A: Move exists in Master Book -> Use Master Stats
        const totalGamesInPos = masterStats!.summary
            ? masterStats!.summary!.w + masterStats!.summary!.d + masterStats!.summary!.l
            : masterStats!.moves.reduce((acc, m) => acc + m.total, 0) || 1

        popularity = (masterMoveData.total / totalGamesInPos) * 100
        const maxTotal = Math.max(...masterStats!.moves.map((m) => m.total))
        accuracy = maxTotal > 0 ? (masterMoveData.total / maxTotal) * 100 : 0
        
        const wins = playerColor.value === 'white' ? masterMoveData.w_pct : masterMoveData.l_pct
        winRateRaw = wins + 0.5 * masterMoveData.d_pct
        rating = masterMoveData.perf || 0
        san = masterMoveData.san

        moveStats = {
            uci: masterMoveData.uci,
            san: masterMoveData.san,
            total: masterMoveData.total,
            w_pct: masterMoveData.w_pct,
            d_pct: masterMoveData.d_pct,
            l_pct: masterMoveData.l_pct,
            perf: masterMoveData.perf
        }
    } else {
        // Case B: Move does NOT exist in Master Book (Bot played a "bad" or rare move)
        // We cannot provide Master stats. We treat this as a "Deviation" event essentially.
        // But the game continues.
        // We might want to fill stats with 0 or nulls.
        moveStats = undefined // No master stats
        popularity = 0
        accuracy = 0
        winRateRaw = 0 // Unknown winrate
        rating = 0
        // San is already set from selectedMove
    }

    boardStore.applyUciMove(selectedMove.uci)

    sessionHistory.value.push({
      fen: boardStore.fen,
      moveUci: selectedMove.uci,
      san: san,
      phase: 'theory',
      stats: moveStats,
      popularity,
      accuracy,
      winRate: winRateRaw,
      rating
    })

    await fetchStats()
    
    // Check if the move took us out of book (Master book)
    // If masterMoveData was null, we are definitely out of Master book.
    if (!masterMoveData) {
        // Option: End theory if bot leaves master book?
        // Or continue if Lichess book still has moves?
        // User said: "оценка ... базируются на исходя из статистики мозербука"
        // If we leave MozerBook, we can't evaluate further moves. 
        // So effectively, theory phase ends (or switches to playout/unknown).
        isTheoryOver.value = true
        // Maybe play a different sound? "Bot left book"
    }

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
    opponentSource,
    opponentRatings,
    initializeSession,
    handlePlayerMove,
    fetchStats,
    runFinalEvaluation,
    reset,
    hint,
    startPlayout,
  }
})