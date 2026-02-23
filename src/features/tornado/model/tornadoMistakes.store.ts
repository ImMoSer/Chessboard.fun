import { useGameStore, type IGameplayStrategy } from '@/entities/game'

import i18n from '@/shared/config/i18n'
import { soundService } from '@/shared/lib/sound.service'
import type { GamePuzzle } from '@/shared/types/api.types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useTornadoMistakesStore = defineStore('tornado-mistakes', () => {
  const MISTAKES_STORAGE_KEY = 'tornado_mistakes'
  const t = i18n.global.t

  const gameStore = useGameStore()


  const mistakes = ref<GamePuzzle[]>([])
  const solvedStatus = ref<Record<string, boolean>>({})
  const selectedPuzzleId = ref<string | null>(null)
  const feedbackMessage = ref(t('tornado.mistakes.feedback.selectPuzzle'))
  const isAttemptMade = ref(false)

  const selectedPuzzle = computed(() => mistakes.value.find((p) => p.PuzzleId === selectedPuzzleId.value) || null)
  const unsolvedMistakes = computed(() => mistakes.value.filter((p) => !solvedStatus.value[p.PuzzleId]))
  const allMistakesSolved = computed(() => mistakes.value.length > 0 && mistakes.value.every((p) => solvedStatus.value[p.PuzzleId]))

  function loadMistakes() {
    const stored = localStorage.getItem(MISTAKES_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as GamePuzzle[]
        mistakes.value = parsed
        parsed.forEach(p => {
          solvedStatus.value[p.PuzzleId] = false
        })
        return true
      } catch (e) {
        console.error('Failed to parse mistakes', e)
        return false
      }
    }
    return false
  }

  function clearMistakes() {
    localStorage.removeItem(MISTAKES_STORAGE_KEY)
    mistakes.value = []
    solvedStatus.value = {}
  }

  function selectPuzzle(puzzle: GamePuzzle) {
    isAttemptMade.value = false
    selectedPuzzleId.value = puzzle.PuzzleId
    feedbackMessage.value = t('tornado.mistakes.feedback.yourTurn')

    const fen = puzzle.FEN_0 || puzzle.initial_fen || ''
    gameStore.startWithStrategy(fen, createStrategy(puzzle), 'white')
  }

  function createStrategy(puzzle: GamePuzzle): IGameplayStrategy {
    const moves = (puzzle.Moves || puzzle.tactical_solution || '').split(' ').filter(Boolean)
    let moveIndex = 0

    return {
      async validateUserMove(uci: string) {
        if (moveIndex >= moves.length) return false
        const isCorrect = uci === moves[moveIndex]

        isAttemptMade.value = true
        if (isCorrect) {
          moveIndex++
          return true
        } else {
          soundService.playSound('game_tacktics_error')
          feedbackMessage.value = t('tornado.mistakes.feedback.wrongMove')
          return false
        }
      },
      async onUserMoveExecuted() {
        if (moveIndex >= moves.length) {
          solvedStatus.value[puzzle.PuzzleId] = true
          soundService.playSound('game_tacktics_success')
          feedbackMessage.value = t('tornado.mistakes.feedback.solved')
        }
      },
      async requestBotMove(): Promise<string | null> {
        if (moveIndex < moves.length) {
          const botUci = moves[moveIndex]
          moveIndex++
          return botUci || null
        }
        return null
      }
    }
  }

  return {
    mistakes,
    solvedStatus,
    selectedPuzzleId,
    feedbackMessage,
    isAttemptMade,
    selectedPuzzle,
    unsolvedMistakes,
    allMistakesSolved,
    loadMistakes,
    clearMistakes,
    selectPuzzle
  }
})
