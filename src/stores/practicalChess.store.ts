// src/stores/practicalChess.store.ts
import type { Color as ChessgroundColor } from '@lichess-org/chessground/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { soundService } from '../services/sound.service'
import { webhookService } from '../services/WebhookService'
import type {
    PracticalChessCategory,
    PracticalChessDifficulty,
    PracticalChessPuzzle,
} from '../types/api.types'
import logger from '../utils/logger'
import { useAnalysisStore } from './analysis.store'
import { useAuthStore } from './auth.store'
import { useBoardStore, type GameEndOutcome } from './board.store'
import { useGameStore } from './game.store'

export const usePracticalChessStore = defineStore('practicalChess', () => {
  const gameStore = useGameStore()
  const boardStore = useBoardStore()
  const analysisStore = useAnalysisStore()
  const authStore = useAuthStore()

  const activePuzzle = ref<PracticalChessPuzzle | null>(null)
  const activeCategory = ref<PracticalChessCategory>('extra_pawn')
  const activeDifficulty = ref<PracticalChessDifficulty>('Novice')

  const isProcessingGameOver = ref(false)
  const isWaitingForColorSelection = ref(false)
  const currentUserColor = ref<ChessgroundColor>('white')

  function selectCategory(cat: PracticalChessCategory) {
    activeCategory.value = cat
  }

  function selectDifficulty(diff: PracticalChessDifficulty) {
    activeDifficulty.value = diff
  }

  async function loadNewPuzzle(id?: string) {
    isProcessingGameOver.value = false
    isWaitingForColorSelection.value = false

    if (analysisStore.isPanelVisible) {
      await analysisStore.hidePanel()
    }

    gameStore.setGamePhase('LOADING')

    try {
      let puzzle: PracticalChessPuzzle | null = null

      if (id) {
        puzzle = await webhookService.fetchPracticalPuzzleById(id)
      } else {
        puzzle = await webhookService.fetchPracticalPuzzle(
          activeCategory.value,
          activeDifficulty.value,
        )
      }

      if (!puzzle) throw new Error('Puzzle data is null')

      activePuzzle.value = puzzle
      activeCategory.value = puzzle.category
      activeDifficulty.value = puzzle.difficulty

      if (puzzle.category === 'material_equality') {
        isWaitingForColorSelection.value = true
        // Position board for white initially without starting game logic
        boardStore.setupPosition(puzzle.fen_0, 'white')
        gameStore.setGamePhase('IDLE')
        return
      }

      // Determine human color: user plays the side that is the winner
      const humanColor = puzzle.winner
      currentUserColor.value = humanColor

      gameStore.setupPuzzle(
        puzzle.fen_0,
        [], // moves
        _handleGameOver,
        _checkWinCondition,
        () => {}, // onPlayoutStart
        'practical-chess',
        undefined, // onCorrectFirstMove
        humanColor,
        undefined, // onUserMove
      )
    } catch (error) {
      logger.error('[PracticalChessStore] Failed to load puzzle:', error)
      gameStore.setGamePhase('IDLE')
    }
  }

  function _checkWinCondition(outcome?: GameEndOutcome): boolean {
    if (!activePuzzle.value || !outcome) return false

    // User wins if they won the game with their chosen color
    return outcome.winner === currentUserColor.value
  }

  async function _handleGameOver(isWin: boolean) {
    if (isProcessingGameOver.value) return
    isProcessingGameOver.value = true

    gameStore.setGamePhase('GAMEOVER')

    const puzzle = activePuzzle.value
    if (!puzzle) return

    try {
      const response = await webhookService.processPracticalResult(puzzle.category, {
        puzzleId: puzzle.puzzle_id,
        wasCorrect: isWin,
      })
      if (response && response.UserStatsUpdate) {
        authStore.updateUserStats(response.UserStatsUpdate)
      } else {
        await authStore.checkSession()
      }
    } catch (error) {
      logger.error('[PracticalChessStore] Error sending Practical Chess stats:', error)
    }
  }

  async function restartPuzzle() {
    if (activePuzzle.value) {
      if (activePuzzle.value.category === 'material_equality') {
        isWaitingForColorSelection.value = true
        boardStore.setupPosition(activePuzzle.value.fen_0, 'white')
        gameStore.setGamePhase('IDLE')
        return
      }

      gameStore.setupPuzzle(
        activePuzzle.value.fen_0,
        [], // moves
        _handleGameOver,
        _checkWinCondition,
        () => {}, // onPlayoutStart
        'practical-chess',
        undefined, // onCorrectFirstMove
        activePuzzle.value.winner,
        undefined, // onUserMove
      )
    }
  }

  function startYouMoveGame(color: 'white' | 'black') {
    if (!activePuzzle.value) return
    isWaitingForColorSelection.value = false
    currentUserColor.value = color

    let fen = activePuzzle.value.fen_0
    if (color === 'black') {
      // Replace 'w' with 'b' in the FEN side-to-move field
      // FEN format: [board] [turn] [castling] [enpassant] [halfmove] [fullmove]
      const parts = fen.split(' ')
      parts[1] = 'b'
      fen = parts.join(' ')
    } else {
      const parts = fen.split(' ')
      parts[1] = 'w'
      fen = parts.join(' ')
    }

    // Play the "YOU MOVE!" sound
    soundService.playSound('game_you_move')

    gameStore.setupPuzzle(
      fen,
      [],
      _handleGameOver,
      _checkWinCondition,
      () => {},
      'practical-chess',
      undefined,
      color,
    )
  }

  function handleResign() {
    _handleGameOver(false)
  }

  function reset() {
    activePuzzle.value = null
    isProcessingGameOver.value = false
  }

  return {
    activePuzzle,
    activeCategory,
    activeDifficulty,
    selectCategory,
    selectDifficulty,
    loadNewPuzzle,
    restartPuzzle,
    handleResign,
    startYouMoveGame,
    isWaitingForColorSelection,
    reset,
  }
})
