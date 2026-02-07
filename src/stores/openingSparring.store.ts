// src/stores/openingSparring.store.ts
import { type Key } from '@lichess-org/chessground/types'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { LichessMove, LichessOpeningResponse } from '../services/LichessApiService'
import type { MozerBookMove } from '../services/MozerBookService'
import { theoryGraphService } from '../services/TheoryGraphService'
import { soundService } from '../services/sound.service'
import { type SessionMove } from '../types/openingSparring.types'
import { areMovesEqual } from '../utils/chess-utils'
import { useBoardStore } from './board.store'
import { useGameStore } from './game.store'
import { useMozerBookStore } from './mozerBook.store'
import { pgnService, pgnTreeVersion } from '../services/PgnService'

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
        evaluation: meta.evaluation,
        threats: meta.threats,
        features: meta.features,
        
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
  const error = computed(() => mozerStore.error)
  const moveQueue = ref<string[]>([])

  // Baseline evaluation for the start of playout
  const theoryEndEval = ref<number | null>(null)

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
    const sum = sessionHistory.value.reduce((acc, m) => acc + (m.rating ?? 0), 0) // Fixed: was m.stats.perf
    return Math.round(sum / movesCount.value)
  })

  async function initializeSession(color: 'white' | 'black', startMoves: string[] = []) {
    // Prevent double initialization if already in progress or same state
    if (isProcessingMove.value && playerColor.value === color && sessionHistory.value.length > 0) {
      console.log('[OpeningSparring] Session already initializing, skipping redundant call')
      return
    }

    reset()
    playerColor.value = color
    isProcessingMove.value = true
    
    const gameStore = useGameStore()
    gameStore.shouldAutoPlayBot = false
    gameStore.currentGameMode = 'opening-trainer'

    try {
      await theoryGraphService.loadBook()
      boardStore.setupPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', color)

      for (const move of startMoves) {
        boardStore.applyUciMove(move)
        const node = pgnService.getLastMove()
        if (node) pgnService.updateNode(node, { metadata: { phase: 'theory' } })
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
    theoryEndEval.value = null
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
    if (isPlayoutMode.value) return

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

    // Capture board state for evaluation *before* async
    const fenToEvaluate = currentNode.fenAfter
    const fenBefore = currentNode.fenBefore
    const turnBefore = fenBefore.split(' ')[1] // 'w' or 'b'

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
        
        let evalData = null
        try {
            evalData = await serverEngineService.evaluateThreats(fenToEvaluate)
        } catch (e) {
            console.warn('[OpeningSparring] Evaluation failed:', e)
        }

        let quality: SessionMove['quality'] = undefined
        
        // Quality Calculation Logic
        // We need a baseline. 
        // A) If there is a previous move in history (theory or playout), use its eval.
        // B) If this is the FIRST playout move, use theoryEndEval.
        
        const moves = sessionHistory.value
        const myIndex = moves.findIndex(m => m.ply === currentNode.ply)
        const prevMove = myIndex > 0 ? moves[myIndex - 1] : null
        
        let prevEvalCp: number | null = null

        if (prevMove && prevMove.evaluation) {
            prevEvalCp = prevMove.evaluation.score_cp
        } else if (!prevMove && theoryEndEval.value !== null) {
             // Logic for very first move if history empty? Unlikely.
             // But if prevMove exists (Theory) but has no eval (because it was theory), 
             // we check theoryEndEval.
             prevEvalCp = theoryEndEval.value
        } else if (prevMove && !prevMove.evaluation && theoryEndEval.value !== null) {
             // Prev move was theory, so we use the captured theory end eval
             prevEvalCp = theoryEndEval.value
        }

        if (evalData && prevEvalCp !== null) {
            const currentEval = evalData.evaluation.score_cp
            
            // Calculate Loss based on who moved
            // If White moved (turnBefore == 'w'), we want eval to go UP. Loss = Prev - Current.
            // If Black moved (turnBefore == 'b'), we want eval to go DOWN. Loss = Current - Prev.
            
            let loss = 0
            if (turnBefore === 'w') {
                loss = prevEvalCp - currentEval
            } else {
                loss = currentEval - prevEvalCp
            }

            if (loss > 250) quality = 'blunder'
            else if (loss > 120) quality = 'mistake'
            else if (loss > 50) quality = 'inaccuracy'
            else if (loss < -50 && Math.abs(currentEval) < 200) quality = 'brilliant'
            else if (currentNode.uci === prevMove?.evaluation?.best_move) quality = 'best'
            else quality = 'good'
        }

        // Update PGN Node with full data
        pgnService.updateNode(currentNode, {
            metadata: {
                phase: 'playout',
                loading: false,
                quality,
                evaluation: evalData?.evaluation,
                threats: evalData?.threats,
                features: evalData?.features
            }
        })
    }).catch(err => {
        console.error('[OpeningSparring] Error in playout recording:', err)
        pgnService.updateNode(currentNode, {
             metadata: { phase: 'playout', loading: false, error: true }
        })
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
    
    // Capture Baseline Evaluation for the final theory position
    const currentFen = boardStore.fen
    try {
        // We do this asynchronously but block playout recording? 
        // No, we can just fire it. The recordQueue for the first move will wait?
        // Actually, we should try to get it before first move processing finishes.
        // Let's add it to the recordQueue!
        
        recordQueue = recordQueue.then(async () => {
             const { serverEngineService } = await import('../services/ServerEngineService')
             try {
                 // Fast eval for baseline? Or full threats? 
                 // Full threats is better to have consistent depth.
                 const data = await serverEngineService.evaluateThreats(currentFen)
                 theoryEndEval.value = data.evaluation.score_cp
                 console.log('[OpeningSparring] Baseline Eval captured:', theoryEndEval.value)
             } catch (e) {
                 console.warn('[OpeningSparring] Failed to capture baseline eval:', e)
             }
        })
    } catch (e) {
        console.error(e)
    }

    gameStore.setupPuzzle(
      boardStore.fen,
      [],
      handlePlayoutGameOver,
      (outcome) => outcome?.winner === playerColor.value,
      () => {},
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