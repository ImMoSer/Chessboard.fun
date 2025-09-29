// src/stores/advantage.store.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useGameStore } from './game.store'
import { useBoardStore, type GameEndOutcome } from './board.store'
import { webhookService } from '../services/WebhookService'
import type { GamePuzzle, AdvantageResultDto, AdvantageMode } from '../types/api.types'
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

export const useAdvantageStore = defineStore('advantage', () => {
  const gameStore = useGameStore()
  const boardStore = useBoardStore()
  const authStore = useAuthStore()
  const router = useRouter()
  const uiStore = useUiStore()
  const analysisStore = useAnalysisStore()

  const activePuzzle = ref<GamePuzzle | null>(null)
  const mode = ref<AdvantageMode | null>(null)
  const outplayTimeRemainingMs = ref<number | null>(null)
  const timerId = ref<number | null>(null)
  const feedbackMessage = ref(t('finishHim.feedback.pressNext'))

  const isProcessingGameOver = ref(false)

  const tenSecondsWarningPlayed = ref(false)
  const eightSecondsWarningPlayed = ref(false)
  const incrementDisabled = ref(false)

  function reset() {
    _clearTimer()
    activePuzzle.value = null
    outplayTimeRemainingMs.value = null
    feedbackMessage.value = t('finishHim.feedback.pressNext')
    isProcessingGameOver.value = false
    tenSecondsWarningPlayed.value = false
    eightSecondsWarningPlayed.value = false
    incrementDisabled.value = false
    mode.value = null
    logger.info('[AdvantageStore] Local state has been reset.')
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
    incrementDisabled.value = false

    logger.info('[AdvantageStore] Playout started. Starting timer.')
    feedbackMessage.value = t('finishHim.feedback.yourTurnPlayout')

    timerId.value = window.setInterval(() => {
      if (outplayTimeRemainingMs.value !== null) {
        outplayTimeRemainingMs.value -= 1000

        if (outplayTimeRemainingMs.value <= 10000) {
          incrementDisabled.value = true
          if (!tenSecondsWarningPlayed.value) {
            soundService.playSound('board_timer_10s')
            tenSecondsWarningPlayed.value = true
          }
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

  function addIncrement() {
    if (!mode.value || incrementDisabled.value || outplayTimeRemainingMs.value === null) return
    const increment = timeControls[mode.value].increment
    outplayTimeRemainingMs.value += increment
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
    logger.info(`[AdvantageStore] Game Over. Result: ${isWin ? 'Win' : 'Loss'}`)

    analysisStore.showPanel()
  }

  async function _updateAndSendStats(isWin: boolean) {
    const user = authStore.userProfile
    const puzzle = activePuzzle.value
    const currentMode = mode.value

    if (!user || !puzzle || !currentMode) {
      logger.info('[AdvantageStore] User not logged in, no active puzzle or mode. Stats not sent.')
      return
    }

    const dto: AdvantageResultDto = {
      puzzleId: puzzle.PuzzleId,
      wasCorrect: isWin,
      theme: puzzle.EndgameType as string, // EndgameType can be null
    }

    try {
      const response = await webhookService.postAdvantageResult(currentMode, dto)
      if (response && response.UserStatsUpdate) {
        logger.info('[AdvantageStore] Stats sent and UserStatsUpdate received.')
        authStore.updateUserStats(response.UserStatsUpdate)
      } else {
        logger.warn(
          '[AdvantageStore] Did not receive UserStatsUpdate, falling back to full profile refresh.',
          response,
        )
        await authStore.checkSession()
      }
    } catch (error) {
      logger.error('[AdvantageStore] Error sending Advantage stats:', error)
    }
  }

  function initialize() {
    soundService.playSound('app_game_entry')
  }

  async function loadNewPuzzle(puzzleId?: string) {
    isProcessingGameOver.value = false

    if (!mode.value) {
      logger.error('[AdvantageStore] Cannot load puzzle without a mode.')
      // TODO: Handle this case, maybe redirect to selection
      return
    }

    if (analysisStore.isPanelVisible) {
      await analysisStore.hidePanel()
    }

    gameStore.setGamePhase('LOADING')
    feedbackMessage.value = t('common.loading')
    _clearTimer()

    try {
      const puzzle = puzzleId
        ? await webhookService.getAdvantagePuzzleById(puzzleId)
        : await webhookService.getAdvantageNextPuzzle(mode.value)

      if (!puzzle) throw new Error('Puzzle data is null')

      activePuzzle.value = puzzle

      const controls = timeControls[mode.value]
      outplayTimeRemainingMs.value = controls.initial

      gameStore.setupPuzzle(
        puzzle.FEN_0,
        puzzle.Moves.split(' '),
        _handleGameOver,
        _checkWinCondition,
        _startTimer,
        'advantage',
        addIncrement,
      )

      feedbackMessage.value = t('finishHim.feedback.yourTurn')
    } catch (error) {
      logger.error('[AdvantageStore] Failed to load puzzle:', error)
      feedbackMessage.value = t('finishHim.feedback.loadFailed')
      gameStore.setGamePhase('IDLE')
    }
  }

  function setMode(newMode: AdvantageMode) {
    mode.value = newMode
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
    router.push('/')
  }

  function handleUnloadResignation() {
    if (!activePuzzle.value || !authStore.userProfile || !mode.value) {
      logger.info('[AdvantageStore] No active puzzle, user or mode. Beacon not sent.')
      return
    }

    const dto: AdvantageResultDto = {
      puzzleId: activePuzzle.value.PuzzleId,
      wasCorrect: false,
      theme: activePuzzle.value.EndgameType as string,
    }

    // TODO: Create a beacon endpoint for advantage
    // webhookService.sendAdvantageResultBeacon(mode.value, dto)
    logger.info(
      '[AdvantageStore] Resignation beacon would be sent for puzzle:',
      activePuzzle.value.PuzzleId,
    )
  }

  return {
    gamePhase: computed(() => gameStore.gamePhase),
    activePuzzle,
    outplayTimeRemainingMs,
    formattedTimer,
    feedbackMessage,
    mode,
    initialize,
    loadNewPuzzle,
    setMode,
    handleResign,
    handleRestart,
    handleExit,
    reset,
    handleUnloadResignation,
  }
})
