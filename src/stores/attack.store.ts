// src/stores/attack.store.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useGameStore } from './game.store'
import { useBoardStore, type GameEndOutcome } from './board.store'
import { webhookService } from '../services/WebhookService'
import type { GamePuzzle, AttackRecordDto } from '../types/api.types'
import logger from '../utils/logger'
import { soundService } from '../services/sound.service'
import { useAuthStore } from './auth.store'
import { useRouter } from 'vue-router'
import { useUiStore } from './ui.store'
import i18n from '../services/i18n'
import { useAnalysisStore } from './analysis.store'

const t = i18n.global.t

export const useAttackStore = defineStore('attack', () => {
  const gameStore = useGameStore()
  const boardStore = useBoardStore()
  const authStore = useAuthStore()
  const router = useRouter()
  const uiStore = useUiStore()
  const analysisStore = useAnalysisStore()

  const activePuzzle = ref<GamePuzzle | null>(null)
  const outplayTimeRemainingMs = ref<number | null>(null)
  const timerId = ref<number | null>(null)
  const feedbackMessage = ref(t('attack.feedback.getReady'))

  const tenSecondsWarningPlayed = ref(false)
  const eightSecondsWarningPlayed = ref(false)

  function reset() {
    _clearTimer()
    activePuzzle.value = null
    outplayTimeRemainingMs.value = null
    feedbackMessage.value = t('attack.feedback.getReady')
    tenSecondsWarningPlayed.value = false
    eightSecondsWarningPlayed.value = false
    logger.info('[AttackStore] Local state has been reset.')
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

    logger.info('[AttackStore] Playout started. Starting timer.')
    feedbackMessage.value = t('attack.feedback.yourTurn')

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
    if (gameStore.gamePhase === 'GAMEOVER') return

    _clearTimer()
    gameStore.setGamePhase('GAMEOVER')

    if (isWin) {
      soundService.playSound('game_user_won')
      feedbackMessage.value = t('attack.feedback.win', { reason: outcome?.reason || '' })
    } else {
      soundService.playSound('game_user_lost')
      const reason = outcome?.reason
      if (reason === 'timeout') {
        feedbackMessage.value = t('attack.feedback.timeUp')
      } else if (reason === 'stalemate') {
        feedbackMessage.value = t('gameplay.gameOver.stalemate')
      } else if (reason === 'resign') {
        feedbackMessage.value = t('attack.feedback.resigned')
      } else {
        feedbackMessage.value = t('attack.feedback.loss', { reason: reason || 'unknown' })
      }
    }

    _updateAndSendStats(isWin)
    logger.info(`[AttackStore] Game Over. Result: ${isWin ? 'Win' : 'Loss'}`)

    analysisStore.showPanel()
  }

  async function _updateAndSendStats(isWin: boolean) {
    const user = authStore.userProfile
    const puzzle = activePuzzle.value

    if (!user || !puzzle) {
      logger.info('[AttackStore] User not logged in or no active puzzle. Stats not sent.')
      return
    }

    const dto: AttackRecordDto = {
      username: user.username,
      PuzzleId: puzzle.PuzzleId,
      success: isWin,
      time_in_seconds: 0,
      bw_value: puzzle.bw_value || 0,
    }

    if (isWin && outplayTimeRemainingMs.value !== null) {
      const initialSolveTimeSeconds = puzzle.solve_time ?? 300
      const timeSpentMs = initialSolveTimeSeconds * 1000 - outplayTimeRemainingMs.value
      dto.time_in_seconds = Math.round(timeSpentMs / 1000)
    }

    try {
      const response = await webhookService.sendAttackRecord(dto)
      if (response && response.UserStatsUpdate) {
        logger.info('[AttackStore] Stats sent and UserStatsUpdate received.')
        authStore.updateUserStats(response.UserStatsUpdate)
      } else {
        logger.warn(
          '[AttackStore] Did not receive UserStatsUpdate, falling back to full profile refresh.',
          response,
        )
        await authStore.checkSession()
      }
    } catch (error) {
      logger.error('[AttackStore] Error sending Attack stats:', error)
    }
  }

  function initialize() {
    soundService.playSound('app_game_entry')
  }

  async function loadNewPuzzle(puzzleId?: string) {
    if (analysisStore.isPanelVisible) {
      await analysisStore.hidePanel()
    }

    gameStore.setGamePhase('LOADING')
    feedbackMessage.value = t('common.loading')
    _clearTimer()

    try {
      const puzzle = puzzleId
        ? await webhookService.fetchAttackPuzzleById(puzzleId)
        : await webhookService.fetchAttackPuzzle()

      if (!puzzle) throw new Error('Puzzle data is null')

      activePuzzle.value = puzzle
      const solveTimeSeconds = puzzle.solve_time ?? 300
      outplayTimeRemainingMs.value = solveTimeSeconds * 1000

      gameStore.setupPuzzle(
        puzzle.FEN_0,
        puzzle.Moves.split(' '),
        _handleGameOver,
        _checkWinCondition,
        _startTimer,
        'attack',
      )

      feedbackMessage.value = t('attack.feedback.yourTurn')
    } catch (error) {
      logger.error('[AttackStore] Failed to load puzzle:', error)
      feedbackMessage.value = t('attack.feedback.loadFailed')
      gameStore.setGamePhase('IDLE')
    }
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

  return {
    gamePhase: computed(() => gameStore.gamePhase),
    activePuzzle,
    outplayTimeRemainingMs,
    formattedTimer,
    feedbackMessage,
    initialize,
    loadNewPuzzle,
    handleResign,
    handleRestart,
    handleExit,
    reset,
  }
})
