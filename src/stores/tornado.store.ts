// src/stores/tornado.store.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useGameStore } from './game.store'
import { useBoardStore } from './board.store'
import { useRouter } from 'vue-router'
import { useUiStore } from './ui.store'
import { webhookService } from '../services/WebhookService'
import type { GamePuzzle, ThemeRating, TornadoNextPuzzleDto } from '../types/api.types'
import { type TornadoMode } from '../types/api.types' // Импортируем тип
import logger from '../utils/logger'
import { useAuthStore } from './auth.store'
import { soundService } from '@/services/sound.service'

const MISTAKES_STORAGE_KEY = 'tornado_mistakes'

const timeControls: Record<TornadoMode, { initial: number; increment: number }> = {
  bullet: { initial: 1 * 60 * 1000, increment: 1 * 1000 },
  blitz: { initial: 3 * 60 * 1000, increment: 2 * 1000 },
  rapid: { initial: 5 * 60 * 1000, increment: 3 * 1000 },
  classic: { initial: 10 * 60 * 1000, increment: 5 * 1000 },
}

const officialThemes = new Set([
  "mate", "fork", "sacrifice", "pin", "attraction", "discoveredAttack",
  "advancedPawn", "deflection", "skewer", "promotion", "quietMove",
  "trappedPiece", "clearance", "intermezzo", "capturingDefender",
  "backRankMate", "doubleCheck", "interference", "xRayAttack", "zugzwang"
]);

export const useTornadoStore = defineStore('tornado', () => {
  const gameStore = useGameStore()
  const boardStore = useBoardStore()
  const router = useRouter()
  const uiStore = useUiStore()
  const authStore = useAuthStore()

  const mode = ref<TornadoMode | null>(null)
  const sessionRating = ref(600)
  const themeRatings = ref<Record<string, ThemeRating> | null>(null)
  const activePuzzle = ref<GamePuzzle | null>(null)
  const mistakenPuzzles = ref<string[]>([])
  const sessionId = ref<string | null>(null)

  const timerValueMs = ref(0)
  const timeIncrementMs = ref(0)
  const timerId = ref<number | null>(null)
  const isSessionActive = ref(false)
  const feedbackMessage = ref('Выберите режим для начала')
  const isProcessingMove = ref(false)

  // --- НАЧАЛО ИЗМЕНЕНИЙ ---
  const tenSecondsWarningPlayed = ref(false)
  const eightSecondsWarningPlayed = ref(false)
  // --- КОНЕЦ ИЗМЕНЕНИЙ ---

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
    feedbackMessage.value = 'Выберите режим для начала'
    isProcessingMove.value = false
    // --- НАЧАЛО ИЗМЕНЕНИЙ ---
    tenSecondsWarningPlayed.value = false
    eightSecondsWarningPlayed.value = false
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---
    localStorage.removeItem(MISTAKES_STORAGE_KEY)
    logger.info('[TornadoStore] State has been reset.')
  }

  function _startTimer() {
    _stopTimer()
    if (timerValueMs.value <= 0) return

    timerId.value = window.setInterval(() => {
      timerValueMs.value -= 1000

      // --- НАЧАЛО ИЗМЕНЕНИЙ ---
      if (timerValueMs.value <= 10000 && !tenSecondsWarningPlayed.value) {
        soundService.playSound('board_timer_10s')
        tenSecondsWarningPlayed.value = true
      }
      if (timerValueMs.value <= 8000 && !eightSecondsWarningPlayed.value) {
        soundService.playSound('board_timer_8s')
        eightSecondsWarningPlayed.value = true
      }
      // --- КОНЕЦ ИЗМЕНЕНИЙ ---

      if (timerValueMs.value <= 0) {
        timerValueMs.value = 0;
        soundService.playSound('board_timer_times_up') // --- ИЗМЕНЕНИЕ ---
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
    if (!mode.value || !sessionId.value) return;
    _stopTimer()
    isSessionActive.value = false
    gameStore.setGamePhase('GAMEOVER')
    feedbackMessage.value = `Сессия завершена! Ваш результат: ${sessionRating.value}`

    await webhookService.endTornadoSession(mode.value, {
      sessionId: sessionId.value,
      finalScore: sessionRating.value
    });

    const userResponse = await uiStore.showConfirmation(
      'Сессия окончена',
      `Ваш финальный рейтинг: ${sessionRating.value}`,
      {
        confirmText: 'Заново',
        cancelText: 'Выйти',
      },
    )

    if (userResponse) {
      if (mode.value) {
        startSession(mode.value)
      }
    } else {
      router.push('/')
    }
  }

  async function startSession(selectedMode: TornadoMode) {
    reset()
    mode.value = selectedMode
    const controls = timeControls[selectedMode]
    timerValueMs.value = controls.initial
    timeIncrementMs.value = controls.increment
    feedbackMessage.value = 'Загрузка первой задачи...'

    try {
      const response = await webhookService.startTornadoSession(selectedMode);
      logger.info('[TornadoStore] Start session response:', response);
      if (response && response.puzzle && response.sessionId) {
        isSessionActive.value = true;
        sessionId.value = response.sessionId;
        sessionRating.value = response.sessionRating;
        activePuzzle.value = response.puzzle;
        setupPuzzle(response.puzzle);
        feedbackMessage.value = "Ваш ход! Найдите лучший ход."
      } else {
        throw new Error("Не удалось получить первую задачу");
      }
    } catch (error) {
      logger.error('[TornadoStore] Failed to start session:', error);
      feedbackMessage.value = "Ошибка при запуске сессии."
      isSessionActive.value = false;
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
    if (!activePuzzle.value || !isSessionActive.value || isProcessingMove.value || !mode.value || !sessionId.value) return
    isProcessingMove.value = true;

    timerValueMs.value += timeIncrementMs.value

    // --- НАЧАЛО ИЗМЕНЕНИЙ ---
    if (isCorrect) {
      soundService.playSound('game_tacktics_success')
    } else {
      soundService.playSound('game_tacktics_error')
      const currentFen = boardStore.fen
      mistakenPuzzles.value.push(currentFen)
      localStorage.setItem(MISTAKES_STORAGE_KEY, JSON.stringify(mistakenPuzzles.value))
    }
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---

    const lastPuzzleThemes = (activePuzzle.value.Themes_PG || []).filter(theme => officialThemes.has(theme));

    const dto: TornadoNextPuzzleDto = {
      sessionId: sessionId.value,
      lastPuzzleId: activePuzzle.value.PuzzleId,
      lastPuzzleRating: activePuzzle.value.Rating,
      lastPuzzleThemes: lastPuzzleThemes,
      wasCorrect: isCorrect,
    }

    try {
      const response = await webhookService.getNextTornadoPuzzle(mode.value, dto);
      if (response) {
        sessionRating.value = response.newSessionRating;
        themeRatings.value = response.updatedThemeRatings;
        activePuzzle.value = response.nextPuzzle;
        if (response.userStatsUpdate) {
          authStore.updateUserStats(response.userStatsUpdate)
        }
        setupPuzzle(response.nextPuzzle);
      } else {
        throw new Error("Не удалось получить следующую задачу");
      }
    } catch (error) {
      logger.error('[TornadoStore] Failed to get next puzzle:', error);
      await _handleSessionEnd();
    } finally {
      isProcessingMove.value = false;
    }
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
  }
})

