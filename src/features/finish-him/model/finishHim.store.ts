// src/stores/finishHim.store.ts
import {
  gameplayService,
  useGameStore,
  type GameStatusInfo,
  type IGameplayStrategy,
} from '@/entities/game'
import { useAuthStore } from '@/entities/user'
import { InsufficientFunCoinsError } from '@/shared/api/client'
import i18n from '@/shared/config/i18n'
import logger from '@/shared/lib/logger'
import { soundService } from '@/shared/lib/sound/sound.service'
import type {
  FinishHimDifficulty,
  FinishHimPuzzle,
  FinishHimResultDto,
} from '@/shared/types/api.types'
import { useUiStore } from '@/shared/ui/model/ui.store'
import { parseFen } from 'chessops/fen'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFinishHimQueries } from '../api/finishHim.queries'

const t = i18n.global.t

export const useFinishHimStore = defineStore('finishHim', () => {
  const uiStore = useUiStore()
  const router = useRouter()
  const gameStore = useGameStore()
  const authStore = useAuthStore()

  const activePuzzle = ref<FinishHimPuzzle | null>(null)
  const feedbackMessage = ref(t('finishHim.feedback.pressNext'))

  const selectedTheme = ref<string>('auto')
  const selectedDifficulty = ref<FinishHimDifficulty>('Novice')
  const requestedPuzzleId = ref<string | undefined>(undefined)

  const isProcessingGameOver = ref(false)

  const { puzzleQuery, resultMutation } = useFinishHimQueries({
    theme: selectedTheme,
    difficulty: selectedDifficulty,
    puzzleId: requestedPuzzleId,
  })

  function reset() {
    activePuzzle.value = null
    feedbackMessage.value = t('finishHim.feedback.pressNext')
    isProcessingGameOver.value = false
    logger.info('[FinishHimStore] Local state has been reset.')
  }

  function _createStrategy(
    puzzle: FinishHimPuzzle | null,
    humanColor: 'white' | 'black',
  ): IGameplayStrategy {
    const scenarioMoves = puzzle ? puzzle.tactical_solution.split(' ') : []
    let currentScenarioIndex = 0
    let isPlayoutMode = puzzle === null // Если пазла нет (прямой вызов startPlayoutFromFen), сразу переходим в плейаут

    return {
      config: {
        initialBotDelayMs: 300,
      },
      checkWinCondition(currentState: GameStatusInfo): boolean {
        return (
          currentState.outcome?.reason === 'checkmate' &&
          currentState.outcome?.winner === humanColor
        )
      },
      onUserMoveExecuted(uciMove: string) {
        if (isPlayoutMode) return

        const expectedMove = scenarioMoves[currentScenarioIndex]
        if (uciMove === expectedMove) {
          currentScenarioIndex++
        } else {
          // Игрок свернул со сценария. Переходим в Плейаут
          isPlayoutMode = true
          currentScenarioIndex = scenarioMoves.length
          soundService.playSound('game_play_out_start')
        }
      },
      requestBotMove: async (fen: string) => {
        if (!isPlayoutMode && currentScenarioIndex < scenarioMoves.length) {
          const move = scenarioMoves[currentScenarioIndex] || null
          currentScenarioIndex++
          return move
        }

        // Живой движок (Mozer/Stockfish)
        try {
          return await gameplayService.getBestMove('MOZER_2000', fen)
        } catch (error) {
          logger.error('[FinishHimStrategy] Failed to get bot move.', error)
          return null
        }
      },
      onGameOver(status: GameStatusInfo) {
        const isWin = this.checkWinCondition!(status)
        _handleGameOver(isWin, status.outcome)
      },
    }
  }

  function _handleGameOver(isWin: boolean, outcome?: { reason?: string; winner?: string }) {
    if (gameStore.gamePhase === 'GAMEOVER' || isProcessingGameOver.value) {
      return
    }
    isProcessingGameOver.value = true

    gameStore.setGamePhase('GAMEOVER')

    if (isWin) {
      soundService.playSound('game_user_won')
      feedbackMessage.value = t('finishHim.feedback.win')
    } else {
      soundService.playSound('game_user_lost')
      const reason = outcome?.reason
      if (reason === 'stalemate') {
        feedbackMessage.value = t('gameplay.gameOver.stalemate')
      } else if (reason === 'resign') {
        feedbackMessage.value = t('finishHim.feedback.resigned')
      } else {
        feedbackMessage.value = t('finishHim.feedback.loss')
      }
    }

    _updateAndSendStats(isWin)
    logger.info(`[FinishHimStore] Game Over. Result: ${isWin ? 'Win' : 'Loss'}`)
  }

  async function _updateAndSendStats(isWin: boolean) {
    const user = authStore.userProfile
    const puzzle = activePuzzle.value

    if (!user || !puzzle) {
      logger.info('[FinishHimStore] User not logged in or no active puzzle. Stats not sent.')
      return
    }

    const dto: FinishHimResultDto = {
      puzzleId: puzzle.puzzle_id,
      wasCorrect: isWin,
    }

    try {
      const response = await resultMutation.mutateAsync(dto)
      if (response && response.userStatsUpdate) {
        logger.info('[FinishHimStore] Stats sent and userStatsUpdate received.')
        authStore.updateUserStats(response.userStatsUpdate)
      } else {
        logger.warn(
          '[FinishHimStore] Did not receive userStatsUpdate, falling back to full profile refresh.',
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

    gameStore.setGamePhase('LOADING')
    feedbackMessage.value = t('common.loading')

    try {
      requestedPuzzleId.value = puzzleId
      const { data: puzzle } = await puzzleQuery.refetch()

      if (!puzzle) throw new Error('Puzzle data is null')

      activePuzzle.value = puzzle

      // Explicitly determine human color from FEN turn
      const setup = parseFen(puzzle.initial_fen).unwrap()
      const humanColor = setup.turn === 'white' ? 'black' : 'white'

      gameStore.startWithStrategy(puzzle.initial_fen, _createStrategy(puzzle, humanColor), humanColor, false)

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
        logger.error('[FinishHimStore] Failed to load puzzle:', error)
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
        router.push('/finish-him')
      }
    }
  }

  async function startPlayoutFromFen(fen: string, color: 'white' | 'black') {
    isProcessingGameOver.value = false
    gameStore.setGamePhase('LOADING')
    feedbackMessage.value = t('finishHim.feedback.yourTurnPlayout')

    gameStore.startWithStrategy(fen, _createStrategy(null, color), color, false)
  }

  function setParams(theme: string, difficulty: FinishHimDifficulty) {
    selectedTheme.value = theme
    selectedDifficulty.value = difficulty
  }

  async function setThemeAndLoadPuzzle(theme: string) {
    if (selectedTheme.value === theme) return
    selectedTheme.value = theme
    await loadNewPuzzle()
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
    if (gameStore.isGameActive) {
      const confirmed = await uiStore.showConfirmation(
        t('gameplay.confirmExit.title'),
        t('gameplay.confirmExit.message'),
      )
      if (confirmed) {
        gameStore.handleGameResignation()
        if (activePuzzle.value) {
          loadNewPuzzle(activePuzzle.value.puzzle_id)
        }
      }
    } else if (activePuzzle.value) {
      loadNewPuzzle(activePuzzle.value.puzzle_id)
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


  return {
    gamePhase: computed(() => gameStore.gamePhase),
    activePuzzle,
    feedbackMessage,
    selectedTheme,
    selectedDifficulty,
    initialize,
    loadNewPuzzle,
    startPlayoutFromFen,
    handleResign,
    handleRestart,
    handleExit,
    reset,
    setParams,
    setThemeAndLoadPuzzle,
  }
})
