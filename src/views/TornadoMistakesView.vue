<!-- src/views/TornadoMistakesView.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game.store'
import { useAnalysisStore } from '@/stores/analysis.store'
import { useUiStore } from '@/stores/ui.store'
import { useI18n } from 'vue-i18n'
import GameLayout from '@/components/GameLayout.vue'
import AnalysisPanel from '@/components/AnalysisPanel.vue'
import ChessboardPreview from '@/components/ChessboardPreview.vue'
import type { GamePuzzle } from '@/types/api.types'
import { soundService } from '@/services/sound.service'

// --- CONSTANTS ---
const MISTAKES_STORAGE_KEY = 'tornado_mistakes'

// --- STORES ---
const gameStore = useGameStore()
const analysisStore = useAnalysisStore()
const uiStore = useUiStore()
const router = useRouter()
const { t } = useI18n()

// --- STATE ---
const mistakes = ref<GamePuzzle[]>([])
const solvedStatus = ref<Record<string, boolean>>({})
const selectedPuzzleId = ref<string | null>(null)
const feedbackMessage = ref(t('tornado.mistakes.feedback.selectPuzzle'))
const isAttemptMade = ref(false)

// --- COMPUTED ---
const selectedPuzzle = computed(() => {
  return mistakes.value.find((p) => p.PuzzleId === selectedPuzzleId.value) || null
})

const unsolvedMistakes = computed(() => {
  return mistakes.value.filter(p => !solvedStatus.value[p.PuzzleId]);
})

const allMistakesSolved = computed(() => {
  if (mistakes.value.length === 0) return false
  return mistakes.value.every((p) => solvedStatus.value[p.PuzzleId])
})

// --- METHODS ---
function selectPuzzle(puzzle: GamePuzzle) {
  if (analysisStore.isPanelVisible) {
    analysisStore.hidePanel()
  }
  isAttemptMade.value = false
  selectedPuzzleId.value = puzzle.PuzzleId
  feedbackMessage.value = t('tornado.mistakes.feedback.yourTurn')

  gameStore.setupPuzzle(
    puzzle.FEN_0,
    puzzle.Moves.split(' '),
    handlePuzzleResult,
    () => true,
    () => { },
    'tornado',
  )
}

function handlePuzzleResult(isCorrect: boolean) {
  if (!selectedPuzzle.value) return
  isAttemptMade.value = true
  if (isCorrect) {
    solvedStatus.value[selectedPuzzle.value.PuzzleId] = true
    feedbackMessage.value = t('tornado.mistakes.feedback.solved')
    soundService.playSound('game_tacktics_success');
  } else {
    feedbackMessage.value = t('tornado.mistakes.feedback.wrongMove')
    soundService.playSound('game_tacktics_error');
  }
}

function selectNextUnsolvedPuzzle() {
  const currentIndex = mistakes.value.findIndex((p) => p.PuzzleId === selectedPuzzleId.value)
  const nextPuzzles = [...mistakes.value.slice(currentIndex + 1), ...mistakes.value.slice(0, currentIndex + 1)]

  const nextUnsolved = nextPuzzles.find(p => !solvedStatus.value[p.PuzzleId])

  if (nextUnsolved) {
    selectPuzzle(nextUnsolved)
  } else if (allMistakesSolved.value) {
    feedbackMessage.value = t('tornado.mistakes.feedback.allSolved')
  }
}

function showAnalysis() {
  if (isAttemptMade.value) {
    analysisStore.showPanel(true)
  }
}

// --- LIFECYCLE & ROUTE GUARDS ---
onMounted(() => {
  const storedMistakes = localStorage.getItem(MISTAKES_STORAGE_KEY)
  if (storedMistakes) {
    try {
      const parsedMistakes: GamePuzzle[] = JSON.parse(storedMistakes)
      mistakes.value = parsedMistakes
      parsedMistakes.forEach((p) => {
        solvedStatus.value[p.PuzzleId] = false
      })
      if (parsedMistakes.length > 0) {
        const firstMistake = parsedMistakes[0]
        if (firstMistake) {
          selectPuzzle(firstMistake)
        }
      } else {
        feedbackMessage.value = t('tornado.mistakes.feedback.noMistakes')
      }
    } catch (e) {
      console.error('Error parsing mistakes from localStorage', e)
      feedbackMessage.value = t('tornado.mistakes.feedback.loadFailed')
    }
  }
})

onBeforeRouteLeave(async (to, from, next) => {
  const userResponse = await uiStore.showConfirmation(
    t('tornado.mistakes.exit.title'),
    t('tornado.mistakes.exit.message'),
  )
  if (userResponse === 'confirm') {
    localStorage.removeItem(MISTAKES_STORAGE_KEY)
    gameStore.resetGame()
    next()
  } else {
    next(false)
  }
})

async function handleExit() {
  router.push('/')
}
</script>

<template>
  <GameLayout>
    <template #left-panel>
      <div class="mistakes-list-container">
        <h4>{{ t('tornado.mistakes.title') }}</h4>
        <div class="mistakes-list-scrollable">
          <div v-for="(puzzle) in unsolvedMistakes" :key="puzzle.PuzzleId" class="mistake-item" :class="{
            active: puzzle.PuzzleId === selectedPuzzleId,
            solved: solvedStatus[puzzle.PuzzleId],
            unsolved: !solvedStatus[puzzle.PuzzleId],
          }" @click="selectPuzzle(puzzle)">
            <ChessboardPreview :fen="puzzle.FEN_0" orientation="white" />

          </div>
          <div v-if="mistakes.length === 0" class="no-mistakes">
            {{ t('tornado.mistakes.feedback.noMistakes') }}
          </div>
        </div>
      </div>
    </template>

    <template #right-panel>
      <div class="controls-container">
        <div class="feedback-panel">
          {{ feedbackMessage }}
        </div>

        <div class="action-buttons">
          <button @click="showAnalysis" :disabled="!isAttemptMade" class="action-btn analysis-btn">
            {{ t('tornado.mistakes.ui.analysisButton') }}
          </button>
          <button @click="selectNextUnsolvedPuzzle" :disabled="unsolvedMistakes.length <= 1 || allMistakesSolved"
            class="action-btn next-btn">
            {{ t('tornado.mistakes.ui.nextButton') }}
          </button>
          <button @click="handleExit" class="action-btn exit-btn">
            {{ t('tornado.mistakes.ui.exitButton') }}
          </button>
        </div>

        <AnalysisPanel v-if="analysisStore.isPanelVisible" />
      </div>
    </template>
  </GameLayout>
</template>

<style scoped>
.mistakes-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 10px;
}

h4 {
  text-align: center;
  margin-top: 0;
  margin-bottom: 15px;
  color: var(--color-accent-warning);
  flex-shrink: 0;
}

.mistakes-list-scrollable {
  flex-grow: 1;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  padding-right: 5px;
  align-content: flex-start;
}

.mistake-item {
  /* ...остальные стили... */
  width: calc((100% - 15px) / 2);
  /* Ширина под два столбца с учетом gap */
  aspect-ratio: 1 / 1;
  flex-shrink: 0;
}


.mistake-item:hover {
  transform: scale(1.01);
  border-color: var(--color-accent-primary);
}

.mistake-item.unsolved {
  border-color: var(--color-accent-error);
}

.mistake-item.solved {
  border-color: var(--color-accent-success);
}

.mistake-item.active {
  box-shadow: 0 0 15px var(--color-accent-primary);
  border-color: var(--color-accent-primary);
}

.puzzle-preview {
  width: 100%;
  display: block;
}

.puzzle-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px;
  text-align: center;
  font-size: var(--font-size-small);
  font-weight: bold;
}

.no-mistakes {
  text-align: center;
  color: var(--color-text-muted);
  padding: 20px;
}

.controls-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  height: 100%;
}

.feedback-panel {
  padding: 15px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--panel-border-radius);
  text-align: center;
  font-weight: bold;
  min-height: 50px;
}

.action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

.action-btn {
  padding: 12px;
  font-size: var(--font-size-base);
  font-weight: bold;
  border: none;
  border-radius: var(--panel-border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.analysis-btn {
  background-color: var(--color-accent-primary);
  color: var(--color-text-dark);
}

.next-btn {
  background-color: var(--color-accent-success);
  color: var(--color-text-dark);
}

.exit-btn {
  background-color: var(--color-accent-error);
  color: var(--color-text-on-accent);
}
</style>
