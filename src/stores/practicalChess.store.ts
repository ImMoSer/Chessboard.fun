// src/stores/practicalChess.store.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { webhookService } from '../services/WebhookService'
import type {
  PracticalChessCategory,
  PracticalChessDifficulty,
  PracticalChessPuzzle,
} from '../types/api.types'
import logger from '../utils/logger'
import { useAnalysisStore } from './analysis.store'
import { useAuthStore } from './auth.store'
import { useGameStore } from './game.store'

export const usePracticalChessStore = defineStore('practicalChess', () => {
  const gameStore = useGameStore()
  const analysisStore = useAnalysisStore()
  const authStore = useAuthStore()

  const activePuzzle = ref<PracticalChessPuzzle | null>(null)
  const activeCategory = ref<PracticalChessCategory>('extra_pawn')
  const activeDifficulty = ref<PracticalChessDifficulty>('Novice')

  const isProcessingGameOver = ref(false)

  function selectCategory(cat: PracticalChessCategory) {
    activeCategory.value = cat
  }

  function selectDifficulty(diff: PracticalChessDifficulty) {
    activeDifficulty.value = diff
  }

  async function loadNewPuzzle(id?: string) {
    isProcessingGameOver.value = false

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

      // Determine human color: user plays the side that is the winner
      const humanColor = puzzle.winner

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

  function _checkWinCondition(outcome: any): boolean {
    // In Practical Chess, user wins if they win the game or draw if it's a draw puzzle?
    // Actually, positions_extra_pawn are usually winning.
    // User wins if the outcome matches their color winning.
    if (!activePuzzle.value) return false

    const humanColor = activePuzzle.value.winner
    if (outcome.winner === humanColor) return true

    // Maybe draws count as half-win or loss? User objective is usually to win if they have extra pawn.
    // But for "Practical Chess" we can follow Theoretical Endings logic where you must achieve the goal.
    // If it's a win position, you must win.
    return false
  }

  async function _handleGameOver(isWin: boolean) {
    if (isProcessingGameOver.value) return
    isProcessingGameOver.value = true

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
    reset,
  }
})
