import { useAnalysisEngineStore } from '@/entities/analysis'
import {
  gameplayService,
  useGameStore,
  type GameStatusInfo,
  type IGameCoreApi,
  type IGameplayStrategy,
} from '@/entities/game'
import { type TopInfoDisplay } from '@/entities/puzzle'
import { useAuthStore } from '@/entities/user'
import { InsufficientPawnCoinsError } from '@/shared/api/client'
import i18n from '@/shared/config/i18n'
import logger from '@/shared/lib/logger'
import { soundService } from '@/shared/lib/sound.service'
import type {
  PracticalChessCategory,
  PracticalChessDifficulty,
  PracticalPuzzle,
} from '@/shared/types/api.types'
import { useUiStore } from '@/shared/ui/model/ui.store'
import type { Color as ChessgroundColor } from '@lichess-org/chessground/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePracticalChessQueries } from '../api/practicalChess.queries'
import { useQueryClient } from '@tanstack/vue-query'
import type { UserProfileStatsDto } from '@/shared/types/api.types'
const t = i18n.global.t

export const usePracticalChessStore = defineStore('practicalChess', () => {
  const gameStore = useGameStore()
  const analysisStore = useAnalysisEngineStore()
  const authStore = useAuthStore()
  const uiStore = useUiStore()
  const router = useRouter()
  const queryClient = useQueryClient()
  const activePuzzle = ref<PracticalPuzzle | null>(null)
  const activeCategory = ref<PracticalChessCategory>('extraPawn')
  const activeDifficulty = ref<PracticalChessDifficulty>('Novice')
  const requestedPuzzleId = ref<string | undefined>(undefined)

  const isProcessingGameOver = ref(false)
  const isWaitingForColorSelection = ref(false)
  const currentUserColor = ref<ChessgroundColor>('white')

  const { puzzleQuery, resultMutation } = usePracticalChessQueries({
    category: activeCategory,
    difficulty: activeDifficulty,
    puzzleId: requestedPuzzleId,
  })

  function selectCategory(cat: PracticalChessCategory) {
    activeCategory.value = cat
  }

  function selectDifficulty(diff: PracticalChessDifficulty) {
    activeDifficulty.value = diff
  }

  function _createStrategy(): IGameplayStrategy {
    return {
      onGameStart(api: IGameCoreApi) {
        if (isWaitingForColorSelection.value) {
          api.setPaused(true)
        }
      },
      checkWinCondition(currentState: GameStatusInfo): boolean {
        return currentState.outcome?.winner === currentUserColor.value
      },
      requestBotMove: async (fen: string) => {
        try {
          return await gameplayService.getBestMove(gameStore.botEngineId, fen)
        } catch (error) {
          logger.error('[PracticalChessStrategy] Failed to get bot move.', error)
          return null
        }
      },
      onGameOver(status: GameStatusInfo) {
        const isWin = this.checkWinCondition!(status)
        _handleGameOver(isWin)
      },
    }
  }

  async function loadNewPuzzle(id?: string) {
    isProcessingGameOver.value = false
    isWaitingForColorSelection.value = false

    gameStore.setGamePhase('LOADING')

    try {
      requestedPuzzleId.value = id
      const { data: puzzle, error: fetchError } = await puzzleQuery.refetch()

      if (fetchError) throw fetchError
      if (!puzzle) throw new Error('Puzzle data is null')

      activePuzzle.value = puzzle
      activeCategory.value = puzzle.category as PracticalChessCategory
      activeDifficulty.value = puzzle.difficulty as PracticalChessDifficulty

      if (puzzle.category === 'materialEquality') {
        isWaitingForColorSelection.value = true
        currentUserColor.value = 'white'
        gameStore.startWithStrategy(puzzle.initial_fen, _createStrategy(), 'white')
        return
      }

      // Determine human color: user plays the side that is the winner
      const humanColor = puzzle.winner as ChessgroundColor
      currentUserColor.value = humanColor

      gameStore.startWithStrategy(puzzle.initial_fen, _createStrategy(), humanColor)
    } catch (error) {
      if (error instanceof InsufficientPawnCoinsError) {
        const e = error as InsufficientPawnCoinsError
        const confirmed = await uiStore.showConfirmation(
          t('features.pricing.insufficientCoins.title'),
          t('features.pricing.insufficientCoins.message', {
            required: e.required,
            available: e.available,
          }) +
          '\n\n' +
          t('features.pricing.insufficientCoins.subMessage'),
          {
            confirmText: t('features.pricing.insufficientCoins.goToPricing'),
            cancelText: t('common.actions.close'),
          },
        )
        if (confirmed === 'confirm') {
          router.push('/pricing')
        } else {
          router.push('/')
        }
      } else {
        logger.error('[PracticalChessStore] Failed to load puzzle:', error)
        gameStore.setGamePhase('IDLE')

        await uiStore.showConfirmation(
          t('common.actions.error'),
          t('features.gameplay.feedback.loadFailed') || 'Failed to load puzzle. It might not exist.',
          {
            showCancel: false,
            confirmText: t('common.actions.ok'),
          },
        )
        router.push('/practical-chess')
      }
    }
  }

  async function _handleGameOver(isWin: boolean) {
    if (isProcessingGameOver.value) return
    isProcessingGameOver.value = true

    gameStore.setGamePhase('GAMEOVER')
    analysisStore.setPlayerColor(currentUserColor.value)

    const puzzle = activePuzzle.value
    if (!puzzle) return

    try {
      const response = await resultMutation.mutateAsync({
        category: puzzle.category,
        dto: {
          puzzleId: puzzle.puzzle_id,
          wasCorrect: isWin,
        },
      })
      if (response && response.userStatsUpdate) {
        authStore.updateUserStats(response.userStatsUpdate)
        
        if (response.userStatsUpdate.practical) {
          queryClient.setQueryData(['user-cabinet', 'detailed-stats'], (oldData: UserProfileStatsDto | undefined) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              practical: response.userStatsUpdate!.practical
            }
          })
        }
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
        gameStore.startWithStrategy(activePuzzle.value.initial_fen, _createStrategy(), 'white')
        return
      }

      gameStore.startWithStrategy(
        activePuzzle.value.initial_fen,
        _createStrategy(),
        activePuzzle.value.winner as ChessgroundColor,
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

    gameStore.startWithStrategy(fen, _createStrategy(), color)
  }

  async function handleResign() {
    const confirmed = await uiStore.showConfirmation(
      t('features.gameplay.confirmExit.title'),
      t('features.gameplay.confirmExit.message'),
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
    topInfoDisplay: computed<TopInfoDisplay>(() => {
      const puzzle = activePuzzle.value
      if (!puzzle) return { title: '', badges: [], stats: [] }

      const evalValue = puzzle.eval ? (puzzle.eval / 100).toFixed(1) : '?'

      return {
        title: t(`chess.themes.${activeCategory.value}`),
        mainValue: evalValue,
        mainIcon: 'bar-chart',
        mainColor: '#2080f0',
        customType: 'practical-chess',
        extra: {
          category: activeCategory.value,
          isWaiting: isWaitingForColorSelection.value,
        },
        badges: [
          {
            text: t(`common.difficulties.level_${puzzle.difficulty.toLowerCase()}`),
            type: puzzle.difficulty === 'Novice' ? 'success' : puzzle.difficulty === 'Pro' ? 'warning' : 'error',
          },
        ],
        stats: [
          { icon: 'pieces', value: puzzle.pieces_count, label: t('features.puzzleInfo.pieces') },
          { icon: 'material', value: puzzle.material_count, label: 'Mat.' },
        ],
      }
    }),
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
