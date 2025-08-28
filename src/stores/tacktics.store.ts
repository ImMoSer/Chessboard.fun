// src/stores/tacktics.store.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useGameStore } from './game.store'
import { useBoardStore, type GameEndOutcome } from './board.store'
import { webhookService } from '../services/WebhookService'
import type { GamePuzzle, SubmitTacticalResultDto, TacticalTrainerStats } from '../types/api.types'
import logger from '../utils/logger'
import { soundService } from '../services/sound.service'
import { useAuthStore } from './auth.store'
import { useRouter } from 'vue-router'
import { useUiStore } from './ui.store'
import i18n from '../services/i18n'
import { useAnalysisStore } from './analysis.store'

const t = i18n.global.t
const AUTO_NEXT_PUZZLE_DELAY_MS = 400
const TACKTICS_TIMER_MS = 10000 // 10.00 секунд

export type TacticalLevel = 'easy' | 'normal' | 'hard'

export const useTackticsStore = defineStore('tacktics', () => {
  const gameStore = useGameStore()
  const boardStore = useBoardStore()
  const authStore = useAuthStore()
  const router = useRouter()
  const uiStore = useUiStore()
  const analysisStore = useAnalysisStore()

  const activePuzzle = ref<GamePuzzle | null>(null)
  const tacticalStats = ref<TacticalTrainerStats | null>(null)
  const feedbackMessage = ref(t('tacktics.feedback.getReady'))
  const selectedLevel = ref<TacticalLevel>('normal')
  const isAutoLoadEnabled = ref(true)
  const isProcessingGameOver = ref(false)

  // --- Состояние таймера ---
  const tackticsTimeRemainingMs = ref<number | null>(null)
  const timerId = ref<number | null>(null)
  const eightSecondsWarningPlayed = ref(false)

  const formattedTimer = computed(() => {
    if (tackticsTimeRemainingMs.value === null) return '10.00'
    const seconds = Math.floor(tackticsTimeRemainingMs.value / 1000)
    const centiseconds = Math.floor((tackticsTimeRemainingMs.value % 1000) / 10)
    return `${seconds}.${centiseconds.toString().padStart(2, '0')}`
  })

  function _clearTimer() {
    if (timerId.value) {
      clearInterval(timerId.value)
      timerId.value = null
    }
    soundService.stopAllBackgroundSounds()
  }

  function _startTimer() {
    if (tackticsTimeRemainingMs.value === null) return

    eightSecondsWarningPlayed.value = false

    timerId.value = window.setInterval(() => {
      if (tackticsTimeRemainingMs.value !== null) {
        tackticsTimeRemainingMs.value -= 100

        if (tackticsTimeRemainingMs.value <= 8000 && !eightSecondsWarningPlayed.value) {
          soundService.playSound('board_timer_8s')
          eightSecondsWarningPlayed.value = true
        }

        if (tackticsTimeRemainingMs.value <= 0) {
          soundService.playSound('board_timer_times_up')
          _handleGameOver(false, { winner: undefined, reason: 'timeout' })
        }
      }
    }, 100)
  }

  function startPlayoutTimer() {
    logger.info('[TackticsStore] First correct move made, starting timer.')
    tackticsTimeRemainingMs.value = TACKTICS_TIMER_MS
    _startTimer()
  }

  function reset() {
    activePuzzle.value = null
    feedbackMessage.value = t('tacktics.feedback.getReady')
    isProcessingGameOver.value = false
    _clearTimer()
    tackticsTimeRemainingMs.value = null
    logger.info('[TackticsStore] Local state has been reset.')
  }

  function _checkWinCondition(isScenarioWin: boolean, outcome?: GameEndOutcome): boolean {
    const isCheckmateWin =
      !!outcome &&
      outcome.reason === 'checkmate' &&
      outcome.winner === boardStore.orientation
    return isScenarioWin || isCheckmateWin
  }

  function _handleGameOver(isScenarioWin: boolean, outcome?: GameEndOutcome) {
    if (isProcessingGameOver.value) return
    isProcessingGameOver.value = true
    _clearTimer() // Останавливаем таймер и звуки при любом завершении

    gameStore.setGamePhase('GAMEOVER')

    const isWin = _checkWinCondition(isScenarioWin, outcome)

    _updateAndSendStats(isWin)

    if (isWin) {
      soundService.playSound('game_user_won')
      feedbackMessage.value = t('tacktics.feedback.success')
      if (isAutoLoadEnabled.value) {
        setTimeout(() => loadNewPuzzle(), AUTO_NEXT_PUZZLE_DELAY_MS)
      } else {
        analysisStore.showPanel()
      }
    } else {
      soundService.playSound('game_tacktics_error')
      soundService.playSound('game_user_lost')

      boardStore.navigatePgn('backward')
      feedbackMessage.value = t('tacktics.feedback.wrongMoveAnalysis')
      analysisStore.showPanel()
    }
    logger.info(`[TackticsStore] Game Over. Result: ${isWin ? 'Win' : 'Loss'}`)
  }

  async function _updateAndSendStats(isWin: boolean) {
    if (!authStore.isAuthenticated || !activePuzzle.value) {
      return
    }

    const dto: SubmitTacticalResultDto = {
      PuzzleId: activePuzzle.value.PuzzleId,
      Rating: activePuzzle.value.Rating,
      Themes_PG: activePuzzle.value.Themes_PG || [],
      success: isWin,
    }

    try {
      const updatedStats = await webhookService.submitTacticalResult(dto)
      if (updatedStats) {
        tacticalStats.value = updatedStats
        if (updatedStats.UserStatsUpdate) {
          authStore.updateUserStats(updatedStats.UserStatsUpdate)
        }
      }
    } catch (error) {
      logger.error('[TackticsStore] Error sending tactical result:', error)
    }
  }

  async function _loadInitialStats() {
    if (authStore.isAuthenticated) {
      try {
        const stats = await webhookService.fetchTacticalStats()
        if (stats) {
          tacticalStats.value = stats
        }
      } catch (error) {
        logger.error('[TackticsStore] Failed to load initial tactical stats:', error)
      }
    }
  }

  function initialize() {
    soundService.playSound('app_game_entry')
    _loadInitialStats()
  }

  async function loadNewPuzzle(puzzleId?: string) {
    isProcessingGameOver.value = false
    if (analysisStore.isPanelVisible) {
      await analysisStore.hidePanel()
    }

    gameStore.setGamePhase('LOADING')
    feedbackMessage.value = t('common.loading')
    _clearTimer()
    tackticsTimeRemainingMs.value = null

    try {
      const puzzle = puzzleId
        ? await webhookService.fetchTacticalPuzzleById(puzzleId)
        : await webhookService.fetchTacticalPuzzle({ tactical_level: selectedLevel.value })

      if (!puzzle) throw new Error('Puzzle data is null')

      activePuzzle.value = puzzle
      gameStore.setupPuzzle(
        puzzle.FEN_0,
        puzzle.Moves.split(' '),
        _handleGameOver,
        () => false,
        () => { },
        'tacktics',
        startPlayoutTimer,
      )
      feedbackMessage.value = t('tacktics.feedback.yourTurn')
    } catch (error) {
      logger.error('[TackticsStore] Failed to load puzzle:', error)
      feedbackMessage.value = t('tacktics.feedback.loadFailed')
      gameStore.setGamePhase('IDLE')
    }
  }

  async function handleRestart() {
    if (activePuzzle.value) {
      await loadNewPuzzle(activePuzzle.value.PuzzleId)
    }
  }

  async function handleExit() {
    await gameStore.resetGame()
    router.push('/')
  }

  return {
    gamePhase: computed(() => gameStore.gamePhase),
    activePuzzle,
    tacticalStats,
    feedbackMessage,
    selectedLevel,
    isAutoLoadEnabled,
    formattedTimer,
    initialize,
    loadNewPuzzle,
    handleRestart,
    handleExit,
    reset,
  }
})
