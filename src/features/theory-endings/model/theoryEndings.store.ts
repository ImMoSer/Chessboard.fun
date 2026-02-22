// src/stores/theoryEndings.store.ts
import { useBoardStore, type GameEndOutcome } from '@/entities/board'
import { useGameStore } from '@/entities/game'
import { useAuthStore } from '@/entities/user'
import { useAnalysisStore } from '@/features/analysis'
import { InsufficientFunCoinsError, webhookService } from '@/shared/api/WebhookService'
import i18n from '@/shared/config/i18n'
import logger from '@/shared/lib/logger'
import { soundService } from '@/shared/lib/sound/sound.service'
import type {
  TheoryEndingCategory,
  TheoryEndingDifficulty,
  TheoryEndingType,
  TheoryPuzzle,
} from '@/shared/types/api.types'
import { useUiStore } from '@/shared/ui/model/ui.store'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const t = i18n.global.t

export const useTheoryEndingsStore = defineStore('theoryEndings', () => {
  const gameStore = useGameStore()
  const boardStore = useBoardStore()
  const authStore = useAuthStore()
  const router = useRouter()
  const uiStore = useUiStore()
  const analysisStore = useAnalysisStore()

  const activePuzzle = ref<TheoryPuzzle | null>(null)
  const activeType = ref<TheoryEndingType | null>(null)
  const activeDifficulty = ref<TheoryEndingDifficulty | null>(null)
  const activeCategory = ref<TheoryEndingCategory | null>(null)

  const feedbackMessage = ref(t('theoryEndings.feedback.pressNext'))
  const isProcessingGameOver = ref(false)

  function reset() {
    activePuzzle.value = null
    feedbackMessage.value = t('theoryEndings.feedback.pressNext')
    isProcessingGameOver.value = false
    logger.info('[TheoryEndingsStore] Local state has been reset.')
  }

  function setParams(
    type: TheoryEndingType,
    diff: TheoryEndingDifficulty,
    cat: TheoryEndingCategory,
  ) {
    activeType.value = type
    activeDifficulty.value = diff
    activeCategory.value = cat
  }

  function _checkWinCondition(outcome?: GameEndOutcome): boolean {
    if (!outcome) return false
    const humanColor = boardStore.orientation
    if (activeType.value === 'win') {
      return outcome.winner === humanColor && outcome.reason === 'checkmate'
    } else {
      // Draw mode: any draw (winner is undefined) or win for human is success
      return outcome.winner === humanColor || outcome.winner === undefined
    }
  }

  function _handleGameOver(isWin: boolean, outcome?: GameEndOutcome) {
    if (gameStore.gamePhase === 'GAMEOVER' || isProcessingGameOver.value) {
      return
    }
    isProcessingGameOver.value = true

    gameStore.setGamePhase('GAMEOVER')

    if (isWin) {
      soundService.playSound('game_user_won')
      feedbackMessage.value =
        activeType.value === 'win'
          ? t('theoryEndings.feedback.win')
          : t('theoryEndings.feedback.drawSuccess')
    } else {
      soundService.playSound('game_user_lost')
      const reason = outcome?.reason
      if (reason === 'resign') {
        feedbackMessage.value = t('finishHim.feedback.resigned')
      } else {
        feedbackMessage.value = t('finishHim.feedback.loss')
      }
    }

    _updateAndSendStats(isWin)
    logger.info(`[TheoryEndingsStore] Game Over. Result: ${isWin ? 'Success' : 'Failure'}`)

    analysisStore.showPanel()
  }

  async function _updateAndSendStats(isWin: boolean) {
    const user = authStore.userProfile
    const puzzle = activePuzzle.value

    if (!user || !puzzle) {
      logger.info('[TheoryEndingsStore] User not logged in or no active puzzle. Stats not sent.')
      return
    }

    try {
      const response = await webhookService.processTheoryResult({
        puzzleId: puzzle.puzzle_id,
        wasCorrect: isWin,
      })
      if (response && response.UserStatsUpdate) {
        authStore.updateUserStats(response.UserStatsUpdate)
      } else {
        await authStore.checkSession()
      }
    } catch (error) {
      logger.error('[TheoryEndingsStore] Error sending Theory Endings stats:', error)
    }
  }

  async function loadNewPuzzle(type?: TheoryEndingType, puzzleId?: string) {
    isProcessingGameOver.value = false

    if (analysisStore.isPanelVisible) {
      await analysisStore.hidePanel()
    }

    gameStore.setGamePhase('LOADING')
    _clearGame() // If any

    try {
      let puzzle: TheoryPuzzle | null = null

      if (puzzleId && type) {
        puzzle = await webhookService.fetchTheoryPuzzleById(type, puzzleId)
      }

      if (!puzzle) {
        // If no specific puzzleId, use selection params
        const targetType = type || activeType.value
        const targetDifficulty = activeDifficulty.value
        const targetCategory = activeCategory.value

        if (!targetType || !targetDifficulty || !targetCategory) {
          throw new Error('Params not selected for Theory Endings')
        }
        puzzle = await webhookService.fetchTheoryPuzzle(
          targetType,
          targetDifficulty,
          targetCategory,
        )
      }

      if (!puzzle) throw new Error('Puzzle data is null')

      activePuzzle.value = puzzle
      // activeType is managed by setParams or preserved if loading by ID with known type
      if (type) activeType.value = type

      activeDifficulty.value = puzzle.difficulty as TheoryEndingDifficulty
      activeCategory.value = puzzle.category as TheoryEndingCategory

      // Determine human color
      let humanColor: 'white' | 'black'
      // Use activeType.value for game type logic
      if (activeType.value === 'win') {
        humanColor = 'white'
      } else {
        if (puzzle.weak_side === 'even') {
          humanColor = Math.random() > 0.5 ? 'white' : 'black'
        } else {
          humanColor = puzzle.weak_side as 'white' | 'black'
        }
      }

      gameStore.setupPuzzle(
        puzzle.initial_fen,
        [], // No scenario moves
        _handleGameOver,
        _checkWinCondition,
        () => { }, // No timer start callback needed
        'theory',
        undefined,
        humanColor,
      )

      feedbackMessage.value = t('finishHim.feedback.yourTurn')
    } catch (error) {
      if (error instanceof InsufficientFunCoinsError) {
        const e = error as InsufficientFunCoinsError
        const confirmed = await uiStore.showConfirmation(
          t('pricing.insufficientCoins.title'),
          t('pricing.insufficientCoins.message', {
            required: e.required,
            available: e.available,
          }) +
          '\n\n' +
          t('pricing.insufficientCoins.subMessage'),
          {
            confirmText: t('pricing.insufficientCoins.goToPricing'),
            cancelText: t('common.close'),
          },
        )
        if (confirmed === 'confirm') {
          router.push('/pricing')
        }
      } else {
        logger.error('[TheoryEndingsStore] Failed to load puzzle:', error)
        feedbackMessage.value = t('finishHim.feedback.loadFailed')
        gameStore.setGamePhase('IDLE')

        await uiStore.showConfirmation(
          t('common.error'),
          t('gameplay.feedback.loadFailed') || 'Failed to load puzzle. It might not exist.',
          {
            showCancel: false,
            confirmText: t('common.ok'),
          },
        )
        router.push('/theory-endings')
      }
    }
  }

  function _clearGame() {
    // any cleanup
  }

  async function handleResign() {
    if (gameStore.gamePhase === 'PLAYING') {
      const confirmed = await uiStore.showConfirmation(
        t('gameplay.confirmExit.title'),
        t('gameplay.confirmExit.message'),
      )
      if (confirmed === 'confirm') {
        gameStore.handleGameResignation()
      }
    }
  }

  async function handleRestart() {
    if (activePuzzle.value) {
      if (gameStore.isGameActive) {
        const confirmed = await uiStore.showConfirmation(
          t('gameplay.confirmExit.title'),
          t('gameplay.confirmExit.message'),
        )
        if (confirmed) {
          gameStore.handleGameResignation()
          await loadNewPuzzle(activeType.value!, activePuzzle.value.puzzle_id)
        }
      } else {
        await loadNewPuzzle(activeType.value!, activePuzzle.value.puzzle_id)
      }
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
    router.push('/theory-endings')
  }

  return {
    gamePhase: computed(() => gameStore.gamePhase),
    activePuzzle,
    activeType,
    activeDifficulty,
    activeCategory,
    feedbackMessage,
    loadNewPuzzle,
    handleResign,
    handleRestart,
    handleExit,
    reset,
    setParams,
  }
})
