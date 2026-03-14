import { useGameStore, type IGameplayStrategy } from '@/entities/game'

import i18n from '@/shared/config/i18n'
import { soundService } from '@/shared/lib/sound.service'
import type { GamePuzzle } from '@/shared/types/api.types'
import { parseFen } from 'chessops/fen'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useTornadoMistakesStore = defineStore('tornado-mistakes', () => {
  const MISTAKES_STORAGE_KEY = 'tornado_mistakes'
  const t = i18n.global.t

  const gameStore = useGameStore()

  const mistakes = ref<GamePuzzle[]>([])
  const solvedStatus = ref<Record<string, boolean>>({})
  const selectedPuzzleId = ref<string | null>(null)
  const feedbackMessage = ref(t('features.tornado.mistakes.feedback.selectPuzzle'))
  const isAttemptMade = ref(false)

  const selectedPuzzle = computed(() => 
    mistakes.value.find((p) => (p.PuzzleId || p.puzzle_id) === selectedPuzzleId.value) || null
  )
  const unsolvedMistakes = computed(() => 
    mistakes.value.filter((p) => !solvedStatus.value[p.PuzzleId || p.puzzle_id || ''])
  )
  const allMistakesSolved = computed(() => 
    mistakes.value.length > 0 && mistakes.value.every((p) => solvedStatus.value[p.PuzzleId || p.puzzle_id || ''])
  )

  function loadMistakes() {
    const stored = localStorage.getItem(MISTAKES_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as GamePuzzle[]
        mistakes.value = parsed
        parsed.forEach(p => {
          const id = p.PuzzleId || p.puzzle_id
          if (id) solvedStatus.value[id] = false
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
    selectedPuzzleId.value = puzzle.PuzzleId || puzzle.puzzle_id || null
    feedbackMessage.value = t('features.tornado.mistakes.feedback.yourTurn')

    const fen = puzzle.FEN_0 || puzzle.initial_fen || ''
    
    // Determine human color as opposite of FEN turn (consistent with Tornado/FinishHim)
    const setup = parseFen(fen).unwrap()
    const humanColor = setup.turn === 'white' ? 'black' : 'white'
    
    gameStore.startWithStrategy(fen, createStrategy(puzzle), humanColor)
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
          feedbackMessage.value = t('features.tornado.mistakes.feedback.wrongMove')
          return false
        }
      },
      async onUserMoveExecuted() {
        if (moveIndex >= moves.length) {
          const id = puzzle.PuzzleId || puzzle.puzzle_id
          if (id) solvedStatus.value[id] = true
          soundService.playSound('game_tacktics_success')
          feedbackMessage.value = t('features.tornado.mistakes.feedback.solved')
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
