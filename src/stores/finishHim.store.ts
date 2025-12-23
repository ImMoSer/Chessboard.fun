// src/stores/finishHim.store.ts
import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { useGameStore } from './game.store'
import { useBoardStore, type GameEndOutcome } from './board.store'
import { webhookService } from '../services/WebhookService'
import type {
  GamePuzzle,
  AdvantageMode,
  AdvantageResultDto,
  TowerTheme,
} from '../types/api.types'
import logger from '../utils/logger'
import { soundService } from '../services/sound.service'
import { useAuthStore } from './auth.store'
import { useRouter } from 'vue-router'
import { useUiStore } from './ui.store'
import i18n from '../services/i18n'
import { useAnalysisStore } from './analysis.store'

const t = i18n.global.t

const timeControls: Record<AdvantageMode, { initial: number; increment: number }> = {
  bullet: { initial: 1 * 60 * 1000, increment: 1 * 1000 },
  blitz: { initial: 3 * 60 * 1000, increment: 2 * 1000 },
  rapid: { initial: 5 * 60 * 1000, increment: 3 * 1000 },
  classic: { initial: 10 * 60 * 1000, increment: 5 * 1000 },
}

export const useFinishHimStore = defineStore('finishHim', () => {
  const gameStore = useGameStore()
  const boardStore = useBoardStore()
  const authStore = useAuthStore()
  const router = useRouter()
  const uiStore = useUiStore()
  const analysisStore = useAnalysisStore()

  const activePuzzle = ref<GamePuzzle | null>(null)
  const activeMode = ref<AdvantageMode | null>(null)
  const outplayTimeRemainingMs = ref<number | null>(null)
  const timerId = ref<number | null>(null)
  const feedbackMessage = ref(t('finishHim.feedback.pressNext'))

  const selectedTheme = ref<string>('auto') // Default theme

  const isProcessingGameOver = ref(false)

  const tenSecondsWarningPlayed = ref(false)

  const eightSecondsWarningPlayed = ref(false)

  watch(
    () => gameStore.userMovesCount,
    (count) => {
      if (
        count > 0 &&
        activeMode.value &&
        outplayTimeRemainingMs.value !== null &&
        gameStore.isGameActive
      ) {
        if (outplayTimeRemainingMs.value > 10000) {
          const increment = timeControls[activeMode.value].increment
          outplayTimeRemainingMs.value += increment
        }
      }
    },
  )

  function reset() {
    _clearTimer()
    activePuzzle.value = null
    outplayTimeRemainingMs.value = null
    feedbackMessage.value = t('finishHim.feedback.pressNext')
    isProcessingGameOver.value = false
    tenSecondsWarningPlayed.value = false
    eightSecondsWarningPlayed.value = false
    // activeMode.value = null // Don't reset mode on simple reset, maybe?
    // User might want to play next puzzle in same mode.
    // Only reset mode if explicitly leaving the mode context.
    // For now, let's keep it.
    logger.info('[FinishHimStore] Local state has been reset.')
  }

  function setMode(mode: AdvantageMode) {
    activeMode.value = mode
  }

  const formattedTimer = computed(() => {
    if (outplayTimeRemainingMs.value === null) return '00:00'
    const totalSeconds = Math.ceil(outplayTimeRemainingMs.value / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  })

  function _clearTimer() {
    if (timerId.value) {
      clearInterval(timerId.value)
      timerId.value = null
    }
  }

  function _startTimer() {
    _clearTimer()
    if (outplayTimeRemainingMs.value === null) return

    tenSecondsWarningPlayed.value = false
    eightSecondsWarningPlayed.value = false

    logger.info('[FinishHimStore] Playout started. Starting timer.')
    feedbackMessage.value = t('finishHim.feedback.yourTurnPlayout')

    timerId.value = window.setInterval(() => {
      if (outplayTimeRemainingMs.value !== null) {
        outplayTimeRemainingMs.value -= 1000

        if (outplayTimeRemainingMs.value <= 10000 && !tenSecondsWarningPlayed.value) {
          soundService.playSound('board_timer_10s')
          tenSecondsWarningPlayed.value = true
        }
        if (outplayTimeRemainingMs.value <= 8000 && !eightSecondsWarningPlayed.value) {
          soundService.playSound('board_timer_8s')
          eightSecondsWarningPlayed.value = true
        }

        if (outplayTimeRemainingMs.value <= 0) {
          soundService.playSound('board_timer_times_up')
          _handleGameOver(false, { winner: undefined, reason: 'timeout' })
        }
      }
    }, 1000)
  }

  function _checkWinCondition(outcome?: GameEndOutcome): boolean {
    if (!outcome) return false
    const humanColor = boardStore.orientation
    return outcome.reason === 'checkmate' && outcome.winner === humanColor
  }

  function _handleGameOver(isWin: boolean, outcome?: GameEndOutcome) {
    if (gameStore.gamePhase === 'GAMEOVER' || isProcessingGameOver.value) {
      return
    }
    isProcessingGameOver.value = true

    _clearTimer()
    gameStore.setGamePhase('GAMEOVER')

    if (isWin) {
      soundService.playSound('game_user_won')
      feedbackMessage.value = t('finishHim.feedback.win')
    } else {
      soundService.playSound('game_user_lost')
      const reason = outcome?.reason
      if (reason === 'timeout') {
        feedbackMessage.value = t('finishHim.feedback.timeUp')
      } else if (reason === 'stalemate') {
        feedbackMessage.value = t('gameplay.gameOver.stalemate')
      } else if (reason === 'resign') {
        feedbackMessage.value = t('finishHim.feedback.resigned')
      } else {
        feedbackMessage.value = t('finishHim.feedback.loss')
      }
    }

    _updateAndSendStats(isWin)
    logger.info(`[FinishHimStore] Game Over. Result: ${isWin ? 'Win' : 'Loss'}`)

    analysisStore.showPanel()
  }

  async function _updateAndSendStats(isWin: boolean) {
    const user = authStore.userProfile
    const puzzle = activePuzzle.value
    const mode = activeMode.value || 'classic' // Fallback to classic if mode lost

    if (!user || !puzzle) {
      logger.info('[FinishHimStore] User not logged in or no active puzzle. Stats not sent.')
      return
    }

    const dto: AdvantageResultDto = {
      puzzleId: puzzle.PuzzleId,
      wasCorrect: isWin,
    }

    try {
      const response = await webhookService.processAdvantageResult(mode, dto)
      if (response && response.UserStatsUpdate) {
        logger.info('[FinishHimStore] Stats sent and UserStatsUpdate received.')
        authStore.updateUserStats(response.UserStatsUpdate)
      } else {
        logger.warn(
          '[FinishHimStore] Did not receive UserStatsUpdate, falling back to full profile refresh.',
          response,
        )
        await authStore.checkSession()
      }
    } catch (error) {
      logger.error('[FinishHimStore] Error sending Finish Him stats:', error)
    }
  }

  function initialize() {
    soundService.playSound('app_game_entry')
  }

  async function loadNewPuzzle(puzzleId?: string) {
    isProcessingGameOver.value = false

    if (analysisStore.isPanelVisible) {
      await analysisStore.hidePanel()
    }

    gameStore.setGamePhase('LOADING')
    feedbackMessage.value = t('common.loading')
    _clearTimer()

    try {
      let puzzle: GamePuzzle | null = null

      if (puzzleId) {
        puzzle = await webhookService.fetchAdvantagePuzzleById(puzzleId)
      } else {
        if (!activeMode.value) {
          throw new Error('Mode not selected for Finish Him')
        }
        const themeParam = selectedTheme.value === 'auto' ? undefined : selectedTheme.value
        puzzle = await webhookService.fetchAdvantagePuzzle(activeMode.value, themeParam)
      }

      if (!puzzle) throw new Error('Puzzle data is null')

      activePuzzle.value = puzzle

      // Logic: solve_time is critical for Finish Him
      // Update: Use selected mode's time control if available
      if (activeMode.value) {
        outplayTimeRemainingMs.value = timeControls[activeMode.value].initial
      } else {
        const solveTimeSeconds = puzzle.solve_time ?? 300
        outplayTimeRemainingMs.value = solveTimeSeconds * 1000
      }

      gameStore.setupPuzzle(
        puzzle.FEN_0,
        puzzle.Moves.split(' '),
        _handleGameOver,
        _checkWinCondition,
        _startTimer,
        'finish-him',
      )

      feedbackMessage.value = t('finishHim.feedback.yourTurn')
    } catch (error) {
      logger.error('[FinishHimStore] Failed to load puzzle:', error)
      feedbackMessage.value = t('finishHim.feedback.loadFailed')
      gameStore.setGamePhase('IDLE')
    }
  }

  async function setThemeAndLoadPuzzle(theme: string) {
    if (selectedTheme.value === theme) return
    selectedTheme.value = theme
    await loadNewPuzzle()
  }

  async function handleResign() {
    if (gameStore.isGameActive) {
      const confirmed = await uiStore.showConfirmation(
        t('gameplay.confirmExit.title'),
        t('gameplay.confirmExit.message'),
      )
      if (confirmed) {
        gameStore.handleGameResignation()
      }
    }
  }

  async function handleRestart() {
    if (gameStore.isGameActive) {
      const confirmed = await uiStore.showConfirmation(
        t('gameplay.confirmExit.title'),
        t('gameplay.confirmExit.message'),
      )
      if (confirmed) {
        gameStore.handleGameResignation()
        if (activePuzzle.value) {
          loadNewPuzzle(activePuzzle.value.PuzzleId)
        }
      }
    } else if (activePuzzle.value) {
      loadNewPuzzle(activePuzzle.value.PuzzleId)
    }
  }

  async function handleExit() {
    if (gameStore.isGameActive) {
      const confirmed = await uiStore.showConfirmation(
        t('gameplay.confirmExit.title'),
        t('gameplay.confirmExit.message'),
      )
      if (!confirmed) {
        return
      }
    }

    await gameStore.resetGame()
    router.push('/finish-him') // Go back to selection
  }

  function handleUnloadResignation() {
    if (!activePuzzle.value || !authStore.userProfile) {
      return
    }
    // Beacon replacement if possible, or just skip if not critical
    // Ideally we should try to send failure.
    // For now, we omit it as Beacon for JSON with custom DTO is complex without Blob support in backend
    // and WebhookService.sendFinishHimStatsUpdateBeacon was custom.
    // We can assume the user just abandoned the game.
  }

  return {
    gamePhase: computed(() => gameStore.gamePhase),
    activePuzzle,
    activeMode,
    outplayTimeRemainingMs,
    formattedTimer,
    feedbackMessage,
    selectedTheme,
    initialize,
    loadNewPuzzle,
    handleResign,
    handleRestart,
    handleExit,
    reset,
    setMode,
    setThemeAndLoadPuzzle,
    handleUnloadResignation,
  }
})
