import type { Color as ChessgroundColor } from '@lichess-org/chessground/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import i18n from '../services/i18n'
import { soundService } from '../services/sound.service'
import { webhookService } from '../services/WebhookService'
import type {
  PracticalChessCategory,
  PracticalChessDifficulty,
  PracticalPuzzle,
} from '../types/api.types'
import logger from '../utils/logger'
import { useAnalysisStore } from './analysis.store'
import {  useAuthStore  } from '@/entities/user/auth.store'
import {  useBoardStore, type GameEndOutcome  } from '@/entities/board/board.store'
import { useGameStore } from './game.store'
import { useUiStore } from './ui.store'

const t = i18n.global.t

export const usePracticalChessStore = defineStore('practicalChess', () => {
  const gameStore = useGameStore()
  const boardStore = useBoardStore()
  const analysisStore = useAnalysisStore()
  const authStore = useAuthStore()
  const uiStore = useUiStore()
  const router = useRouter()

  const activePuzzle = ref<PracticalPuzzle | null>(null)
  const activeCategory = ref<PracticalChessCategory>('extraPawn')
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
      let puzzle: PracticalPuzzle | null = null

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
      activeCategory.value = puzzle.category as PracticalChessCategory
      activeDifficulty.value = puzzle.difficulty as PracticalChessDifficulty

      if (puzzle.category === 'materialEquality') {
        isWaitingForColorSelection.value = true
        // Position board for white initially without starting game logic
        boardStore.setupPosition(puzzle.initial_fen, 'white')
        gameStore.setGamePhase('IDLE')
        return
      }

      // Determine human color: user plays the side that is the winner
      const humanColor = puzzle.winner as ChessgroundColor
      currentUserColor.value = humanColor

      gameStore.setupPuzzle(
        puzzle.initial_fen,
        [], // moves
        _handleGameOver,
        _checkWinCondition,
        () => { }, // onPlayoutStart
        'practical-chess',
        undefined, // onCorrectFirstMove
        humanColor,
        undefined, // onUserMove
      )
    } catch (error) {
      logger.error('[PracticalChessStore] Failed to load puzzle:', error)
      gameStore.setGamePhase('IDLE')

      await uiStore.showConfirmation(
        t('common.error'),
        t('gameplay.feedback.loadFailed') || 'Failed to load puzzle. It might not exist.',
        {
          showCancel: false,
          confirmText: t('common.ok'),
        },
      )
      router.push('/practical-chess')
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
    analysisStore.showPanel()
    analysisStore.setPlayerColor(currentUserColor.value)

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
      if (activePuzzle.value.category === 'materialEquality') {
        isWaitingForColorSelection.value = true
        boardStore.setupPosition(activePuzzle.value.initial_fen, 'white')
        gameStore.setGamePhase('IDLE')
        return
      }

      gameStore.setupPuzzle(
        activePuzzle.value.initial_fen,
        [], // moves
        _handleGameOver,
        _checkWinCondition,
        () => { }, // onPlayoutStart
        'practical-chess',
        undefined, // onCorrectFirstMove
        activePuzzle.value.winner as ChessgroundColor,
        undefined, // onUserMove
      )
    }
  }

  function startYouMoveGame(color: 'white' | 'black') {
    if (!activePuzzle.value) return
    isWaitingForColorSelection.value = false
    currentUserColor.value = color

    let fen = activePuzzle.value.initial_fen
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
      () => { },
      'practical-chess',
      undefined,
      color,
    )
  }

  async function handleResign() {
    const confirmed = await uiStore.showConfirmation(
      t('gameplay.confirmExit.title'),
      t('gameplay.confirmExit.message'),
    )
    if (confirmed === 'confirm') {
      _handleGameOver(false)
    }
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
