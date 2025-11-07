// src/stores/tornado.store.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useGameStore } from './game.store'
import { useRouter } from 'vue-router'
import { useUiStore } from './ui.store'
import { webhookService } from '../services/WebhookService'
import type { GamePuzzle, ThemeRating, TornadoNextPuzzleDto } from '../types/api.types'
import { type TornadoMode } from '../types/api.types'
import logger from '../utils/logger'
import { useAuthStore } from './auth.store'
import { soundService } from '@/services/sound.service'
import i18n from '../services/i18n'

export type { TornadoMode } from '../types/api.types'

const t = i18n.global.t

const MISTAKES_STORAGE_KEY = 'tornado_mistakes'

const timeControls: Record<TornadoMode, { initial: number; increment: number }> = {
  bullet: { initial: 1 * 60 * 1000, increment: 1 * 1000 },
  blitz: { initial: 3 * 60 * 1000, increment: 2 * 1000 },
  rapid: { initial: 5 * 60 * 1000, increment: 3 * 1000 },
  classic: { initial: 10 * 60 * 1000, increment: 5 * 1000 },
}

const officialThemes = new Set([
  'mate',
  'fork',
  'sacrifice',
  'pin',
  'attraction',
  'discoveredAttack',
  'advancedPawn',
  'deflection',
  'skewer',
  'promotion',
  'quietMove',
  'trappedPiece',
  'clearance',
  'intermezzo',
  'capturingDefender',
  'backRankMate',
  'doubleCheck',
  'interference',
  'xRayAttack',
  'zugzwang',
])

export const useTornadoStore = defineStore('tornado', () => {
  const gameStore = useGameStore()
  const router = useRouter()
  const uiStore = useUiStore()
  const authStore = useAuthStore()

  const mode = ref<TornadoMode | null>(null)
  const sessionRating = ref(600)
  const themeRatings = ref<Record<string, ThemeRating> | null>(null)
  const activePuzzle = ref<GamePuzzle | null>(null)
  const mistakenPuzzles = ref<GamePuzzle[]>([])
  const sessionId = ref<string | null>(null)

  const timerValueMs = ref(0)
  const timeIncrementMs = ref(0)
  const timerId = ref<number | null>(null)
  const isSessionActive = ref(false)
  const feedbackMessage = ref(t('tornado.feedback.selectMode'))
  const isProcessingMove = ref(false)

  const tenSecondsWarningPlayed = ref(false)
  const eightSecondsWarningPlayed = ref(false)

  const formattedTimer = computed(() => {
    const totalSeconds = Math.ceil(timerValueMs.value / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  })

  function reset() {
    _stopTimer()
    mode.value = null
    sessionRating.value = 600
    themeRatings.value = null
    activePuzzle.value = null
    mistakenPuzzles.value = []
    sessionId.value = null
    timerValueMs.value = 0
    timeIncrementMs.value = 0
    isSessionActive.value = false
    feedbackMessage.value = t('tornado.feedback.selectMode')
    isProcessingMove.value = false
    tenSecondsWarningPlayed.value = false
    eightSecondsWarningPlayed.value = false
    localStorage.removeItem(MISTAKES_STORAGE_KEY)
    logger.info('[TornadoStore] State has been reset.')
  }

  function _startTimer() {
    _stopTimer()
    if (timerValueMs.value <= 0) return

    timerId.value = window.setInterval(() => {
      timerValueMs.value -= 1000

      if (timerValueMs.value <= 10000 && !tenSecondsWarningPlayed.value) {
        soundService.playSound('board_timer_10s')
        tenSecondsWarningPlayed.value = true
      }

      if (timerValueMs.value <= 8000 && !eightSecondsWarningPlayed.value) {
        soundService.playSound('board_timer_8s')
        eightSecondsWarningPlayed.value = true
      }

      if (timerValueMs.value <= 0) {
        timerValueMs.value = 0
        soundService.playSound('board_timer_times_up')
        _handleSessionEnd()
      }
    }, 1000)
  }

  function _stopTimer() {
    if (timerId.value) {
      clearInterval(timerId.value)
      timerId.value = null
    }
  }

  async function _handleSessionEnd() {
    if (!mode.value || !sessionId.value) return
    _stopTimer()
    isSessionActive.value = false
    gameStore.setGamePhase('GAMEOVER')
    feedbackMessage.value = t('tornado.feedback.sessionEnded', { rating: sessionRating.value })

    await webhookService.endTornadoSession(mode.value, {
      sessionId: sessionId.value,
      finalScore: sessionRating.value,
    })

    const hasMistakes = mistakenPuzzles.value.length > 0

    const userResponse = await uiStore.showConfirmation(
      t('tornado.sessionEnd.title'),
      t('tornado.sessionEnd.message', { rating: sessionRating.value }),
      {
        confirmText: t('tornado.sessionEnd.newSession'),
        cancelText: t('tornado.sessionEnd.exit'),
        extraText: t('tornado.sessionEnd.mistakes'),
        showExtra: hasMistakes,
      },
    )

    switch (userResponse) {
      case 'extra':
        router.push('/tornado/mistakes')
        break
      case 'confirm':
        if (mode.value) {
          startSession(mode.value) // reset() is called inside startSession
        }
        break
      case 'cancel':
      default:
        localStorage.removeItem(MISTAKES_STORAGE_KEY)
        router.push('/')
        break
    }
  }

  async function startSession(selectedMode: TornadoMode, theme?: string) {
    reset()
    mode.value = selectedMode
    const controls = timeControls[selectedMode]
    timerValueMs.value = controls.initial
    timeIncrementMs.value = controls.increment
    feedbackMessage.value = t('tornado.feedback.loadingFirstPuzzle')

    try {
      const response = await webhookService.startTornadoSession(selectedMode, theme)
      logger.info('[TornadoStore] Start session response:', response)
      if (response && response.puzzle && response.sessionId) {
        isSessionActive.value = true
        sessionId.value = response.sessionId
        sessionRating.value = response.sessionRating
        activePuzzle.value = response.puzzle
        setupPuzzle(response.puzzle)
        feedbackMessage.value = t('tornado.feedback.yourTurn')
      } else {
        throw new Error(t('tornado.feedback.loadingFailed'))
      }
    } catch (error) {
      logger.error('[TornadoStore] Failed to start session:', error)
      feedbackMessage.value = t('tornado.feedback.startFailed')
      isSessionActive.value = false
    }
  }

  function setupPuzzle(puzzle: GamePuzzle) {
    gameStore.setupPuzzle(
      puzzle.FEN_0,
      puzzle.Moves.split(' '),
      (isCorrect) => handlePuzzleResult(isCorrect),
      () => true,
      () => { },
      'tornado',
      () => {
        if (isSessionActive.value && timerId.value === null) {
          _startTimer()
        }
      },
    )
  }

  async function handlePuzzleResult(isCorrect: boolean) {
    if (
      !activePuzzle.value ||
      !isSessionActive.value ||
      isProcessingMove.value ||
      !mode.value ||
      !sessionId.value
    )
      return
    isProcessingMove.value = true

    if (timerValueMs.value > 10000) {
      timerValueMs.value += timeIncrementMs.value
    }

    if (isCorrect) {
      soundService.playSound('game_tacktics_success')
    } else {
      soundService.playSound('game_tacktics_error')
      mistakenPuzzles.value.push(activePuzzle.value)
      localStorage.setItem(MISTAKES_STORAGE_KEY, JSON.stringify(mistakenPuzzles.value))
    }

    const lastPuzzleThemes = (activePuzzle.value.Themes_PG || []).filter((theme) =>
      officialThemes.has(theme),
    )

    const dto: TornadoNextPuzzleDto = {
      sessionId: sessionId.value,
      lastPuzzleId: activePuzzle.value.PuzzleId,
      lastPuzzleRating: activePuzzle.value.Rating,
      lastPuzzleThemes: lastPuzzleThemes,
      wasCorrect: isCorrect,
    }

    try {
      const response = await webhookService.getNextTornadoPuzzle(mode.value, dto)
      if (response) {
        sessionRating.value = response.newSessionRating
        themeRatings.value = response.updatedThemeRatings
        activePuzzle.value = response.nextPuzzle
        if (response.userStatsUpdate) {
          authStore.updateUserStats(response.userStatsUpdate)
        }
        setupPuzzle(response.nextPuzzle)
      } else {
        throw new Error(t('tornado.feedback.loadingFailed'))
      }
    } catch (error) {
      logger.error('[TornadoStore] Failed to get next puzzle:', error)
      await _handleSessionEnd()
    } finally {
      isProcessingMove.value = false
    }
  }

  function handleRestart() {
    if (mode.value) {
      logger.info(`[TornadoStore] Restarting session with mode: ${mode.value}`)
      startSession(mode.value)
    }
  }

  function handleNew() {
    reset()
    router.push('/tornado')
  }

  return {
    mode,
    sessionRating,
    themeRatings,
    activePuzzle,
    mistakenPuzzles,
    isSessionActive,
    feedbackMessage,
    formattedTimer,
    startSession,
    reset,
    handleRestart,
    handleNew,
  }
})

