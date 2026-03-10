// src/stores/theoryEndings.store.ts
import {
  gameplayService,
  useGameStore,
  type GameEndOutcome,
  type GameStatusInfo,
  type IGameplayStrategy,
} from '@/entities/game'
import { type TopInfoDisplay } from '@/entities/puzzle'
import { useAuthStore } from '@/entities/user'
import { InsufficientPawnCoinsError } from '@/shared/api/client'
import i18n from '@/shared/config/i18n'
import logger from '@/shared/lib/logger'
import { soundService } from '@/shared/lib/sound.service'
import type {
  TheoryEndingCategory,
  TheoryEndingDifficulty,
  TheoryEndingResultDto,
  TheoryEndingType,
  TheoryPuzzle,
} from '@/shared/types/api.types'
import { useUiStore } from '@/shared/ui/model/ui.store'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTheoryEndingsQueries } from '../api/theoryEndings.queries'
import { useQueryClient } from '@tanstack/vue-query'
import type { UserProfileStatsDto } from '@/shared/types/api.types'
const t = i18n.global.t

export const useTheoryEndingsStore = defineStore('theoryEndings', () => {
  const gameStore = useGameStore()
  const authStore = useAuthStore()
  const router = useRouter()
  const uiStore = useUiStore()
  const queryClient = useQueryClient()
  const activePuzzle = ref<TheoryPuzzle | null>(null)
  const activeType = ref<TheoryEndingType | null>(null)
  const activeDifficulty = ref<TheoryEndingDifficulty | null>(null)
  const activeCategory = ref<TheoryEndingCategory | null>(null)
  const requestedPuzzleId = ref<string | undefined>(undefined)

  const feedbackMessage = ref(t('theoryEndings.feedback.pressNext'))
  const isProcessingGameOver = ref(false)

  const { puzzleQuery, resultMutation } = useTheoryEndingsQueries({
    type: activeType,
    difficulty: activeDifficulty,
    category: activeCategory,
    puzzleId: requestedPuzzleId,
  })

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

  // Эти функции перенесены внутрь объекта strategy ниже

  function _handleGameOver(isWin: boolean, outcome?: GameEndOutcome) {
    if (gameStore.gamePhase === 'GAMEOVER' || isProcessingGameOver.value) {
      return
    }
    isProcessingGameOver.value = true

    // Explicitly set game phase, Strategy API doesn't do this by itself
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
  }

  async function _updateAndSendStats(isWin: boolean) {
    const user = authStore.userProfile
    const puzzle = activePuzzle.value

    if (!user || !puzzle) {
      logger.info('[TheoryEndingsStore] User not logged in or no active puzzle. Stats not sent.')
      return
    }

    const dto: TheoryEndingResultDto = {
      puzzleId: puzzle.puzzle_id,
      wasCorrect: isWin,
    }

    try {
      const response = await resultMutation.mutateAsync(dto)
      if (response && response.userStatsUpdate) {
        authStore.updateUserStats(response.userStatsUpdate)
        
        if (response.userStatsUpdate.theory) {
          queryClient.setQueryData(['user-cabinet', 'detailed-stats'], (oldData: UserProfileStatsDto | undefined) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              theory: response.userStatsUpdate!.theory
            }
          })
        }
      } else {
        await authStore.checkSession()
      }
    } catch (error) {
      logger.error('[TheoryEndingsStore] Error sending Theory Endings stats:', error)
    }
  }

  async function loadNewPuzzle(type?: TheoryEndingType, puzzleId?: string) {
    isProcessingGameOver.value = false

    gameStore.setGamePhase('LOADING')
    _clearGame() // If any

    try {
      requestedPuzzleId.value = puzzleId
      if (type) activeType.value = type

      const { data: puzzle, error: fetchError } = await puzzleQuery.refetch()

      if (fetchError) throw fetchError
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

      const strategy: IGameplayStrategy = {
        config: {
          // Используется системная задержка 20мс
        },

        checkWinCondition(currentState: GameStatusInfo): boolean {
          const outcome = currentState.outcome
          if (!outcome) return false

          if (activeType.value === 'win') {
            return outcome.winner === humanColor && outcome.reason === 'checkmate'
          } else {
            // Draw mode: any draw (winner is undefined) or win for human is success
            return outcome.winner === humanColor || outcome.winner === undefined
          }
        },

        requestBotMove: async (fen: string) => {
          // Вызываем тяжелый Stockfish (или Mozer) через gameplayService
          try {
            return await gameplayService.getBestMove(gameStore.botEngineId, fen)
          } catch (error) {
            logger.error('[TheoryEndingsStrategy] Failed to get bot move.', error)
            return null
          }
        },

        onGameOver(status: GameStatusInfo) {
          const isWin = this.checkWinCondition!(status)
          _handleGameOver(isWin, status.outcome)
        },
      }

      gameStore.startWithStrategy(puzzle.initial_fen, strategy, humanColor, false)

      feedbackMessage.value = t('finishHim.feedback.yourTurn')
    } catch (error) {
      if (error instanceof InsufficientPawnCoinsError) {
        const e = error as InsufficientPawnCoinsError
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
        } else {
          router.push('/')
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
    topInfoDisplay: computed<TopInfoDisplay>(() => {
      const puzzle = activePuzzle.value
      if (!puzzle) return { title: '', badges: [], stats: [] }

      const resultKey = puzzle.result === 'win' ? 'win' : 'draw'

      return {
        title: t(`chess.endings.${activeCategory.value}`),
        mainValue: t(`chess.types.${resultKey}`),
        mainIcon: 'flash',
        mainColor: puzzle.result === 'win' ? '#f0a020' : '#2080f0',
        badges: [
          {
            text: t(`chess.difficulties.${puzzle.difficulty}`),
            type: puzzle.difficulty === 'Novice' ? 'success' : puzzle.difficulty === 'Pro' ? 'warning' : 'error',
          },
        ],
        stats: [{ icon: 'pieces', value: puzzle.pieces_count, label: t('puzzleInfo.pieces') }],
        secondaryText: t(`chess.types.${puzzle.weak_side}Endgame`),
      }
    }),
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
