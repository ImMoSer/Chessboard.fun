// src/stores/advantage.store.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'
import { useGameStore } from './game.store'
import { useAuthStore } from './auth.store'
import { useUiStore } from './ui.store'
import { webhookService } from '../services/WebhookService'
import { soundService } from '../services/sound.service'
import i18n from '../services/i18n'
import logger from '../utils/logger'
import type {
  CachedAdvantagePuzzle,
  TornadoMode,
  AdvantageTheme,
  SubmitAdvantageDto,
} from '../types/api.types'

const t = i18n.global.t

export const useAdvantageStore = defineStore('advantage', () => {
  // --- STORE DEPENDENCIES ---
  const gameStore = useGameStore()
  const authStore = useAuthStore()
  const router = useRouter()
  const uiStore = useUiStore()

  // --- STATE ---
  const activePuzzle = ref<CachedAdvantagePuzzle | null>(null)
  const isLoading = ref<boolean>(false)
  const feedbackMessage = ref<string>('')
  const globalRating = ref<number>(1200)
  const puzzlesSolved = ref<number>(0)
  const themeRatings = ref<object | null>(null) // For future extensions
  const puzzleStartTime = ref<number>(0)

  // Store current mode/theme to refetch puzzles
  const currentMode = ref<TornadoMode | null>(null)
  const currentTheme = ref<AdvantageTheme | 'automatic' | null>(null)

  // --- ACTIONS ---

  function reset() {
    activePuzzle.value = null
    isLoading.value = false
    feedbackMessage.value = ''
    globalRating.value = 1200
    puzzlesSolved.value = 0
    themeRatings.value = null
    puzzleStartTime.value = 0
    currentMode.value = null
    currentTheme.value = null
    logger.info('[AdvantageStore] State has been reset.')
  }

  async function startNextPuzzle(mode: TornadoMode, theme: AdvantageTheme | 'automatic') {
    isLoading.value = true
    feedbackMessage.value = t('common.loading')
    currentMode.value = mode
    currentTheme.value = theme

    try {
      const puzzle = await webhookService.startAdvantage({ mode, theme })
      if (!puzzle) {
        throw new Error('Failed to load puzzle from server.')
      }

      activePuzzle.value = puzzle

      const advantageStats = authStore.userProfile?.advantageStats
      if (advantageStats) {
        globalRating.value = advantageStats.globalRating || 1200
        puzzlesSolved.value = advantageStats.globalPuzzlesSolved || 0
      }

      puzzleStartTime.value = Date.now()

      // Advantage puzzles have only one correct move to check
      gameStore.setupPuzzle(
        puzzle.FEN_0,
        puzzle.Moves.split(' '), // Array with the correct move
        handlePuzzleResult, // onGameOver callback
        () => false, // winCondition is not based on checkmate
        () => { }, // onPlayoutStart is not used
        'advantage', // A new game mode to handle single-move puzzle logic
      )

      isLoading.value = false
      feedbackMessage.value = t('advantage.feedback.yourTurn')
    } catch (error) {
      logger.error('[AdvantageStore] Failed to start next puzzle:', error)
      isLoading.value = false
      feedbackMessage.value = t('advantage.feedback.loadFailed')
    }
  }

  async function handlePuzzleResult(isCorrect: boolean) {
    if (!activePuzzle.value || !currentMode.value || !currentTheme.value) return

    const timeInSeconds = (Date.now() - puzzleStartTime.value) / 1000

    const dto: SubmitAdvantageDto = {
      puzzleId: activePuzzle.value.PuzzleId,
      mode: currentMode.value,
      wasCorrect: isCorrect,
      timeInSeconds,
    }

    try {
      const response = await webhookService.submitAdvantage(dto)
      if (response && response.updatedUser) {
        authStore.updateProfile(response.updatedUser)

        globalRating.value = response.globalRating
        puzzlesSolved.value = response.globalPuzzlesSolved

        feedbackMessage.value = t('advantage.feedback.ratingUpdate', {
          rating: response.globalRating,
        })

        if (isCorrect) {
          soundService.playSound('game_tacktics_success')
        } else {
          soundService.playSound('game_tacktics_error')
        }

        setTimeout(() => {
          if (currentMode.value && currentTheme.value) {
            startNextPuzzle(currentMode.value, currentTheme.value)
          }
        }, 1500)
      } else {
        throw new Error('Invalid response from submitAdvantage endpoint.')
      }
    } catch (error) {
      logger.error('[AdvantageStore] Failed to submit puzzle result:', error)
      feedbackMessage.value = t('advantage.feedback.submitFailed')
    }
  }

  async function handleExit() {
    if (gameStore.isGameActive) {
      const userConfirmed = await uiStore.showConfirmation(
        t('gameplay.confirmExit.title'),
        t('gameplay.confirmExit.message'),
      )
      if (!userConfirmed) return
    }
    await gameStore.resetGame()
    reset()
    router.push('/')
  }

  return {
    activePuzzle,
    isLoading,
    feedbackMessage,
    globalRating,
    puzzlesSolved,
    themeRatings,
    currentMode,
    currentTheme,
    startNextPuzzle,
    handleExit,
    reset,
  }
})

