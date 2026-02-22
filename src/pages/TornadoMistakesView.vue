<!-- src/pages/TornadoMistakesView.vue -->
<script setup lang="ts">
import { useGameStore } from '@/entities/game'
import { useAnalysisStore } from '@/features/analysis'
import { AnalysisPanel } from '@/features/analysis'
import { soundService } from '@/shared/lib/sound/sound.service'
import type { GamePuzzle } from '@/shared/types/api.types'
import ChessboardPreview from '@/shared/ui/board-preview/ChessboardPreview.vue'
import { useUiStore } from '@/shared/ui/model/ui.store'
import GameLayout from '@/widgets/game-layout/GameLayout.vue'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

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
  return mistakes.value.filter((p) => !solvedStatus.value[p.PuzzleId])
})

const allMistakesSolved = computed(() => {
  if (mistakes.value.length === 0) return false
  return mistakes.value.every((p) => solvedStatus.value[p.PuzzleId])
})

const formattedThemes = computed(() => {
  if (!selectedPuzzle.value) return ''

  let themesList: string[] = []

  if (selectedPuzzle.value.Themes_PG && Array.isArray(selectedPuzzle.value.Themes_PG)) {
    themesList = selectedPuzzle.value.Themes_PG
  } else if (selectedPuzzle.value.Themes) {
    // Handle both space and comma separated strings
    themesList = selectedPuzzle.value.Themes.split(/[ ,]+/).filter(Boolean)
  } else if (selectedPuzzle.value.themes && Array.isArray(selectedPuzzle.value.themes)) {
    // Support for TornadoBox format (lowercase 'themes' array)
    themesList = selectedPuzzle.value.themes
  }

  return themesList
    .map((theme) => {
      return t(`chess.tornado.${theme}`)
    })
    .join(', ')
})

// --- METHODS ---
function selectPuzzle(puzzle: GamePuzzle) {
  if (analysisStore.isPanelVisible) {
    analysisStore.hidePanel()
  }
  isAttemptMade.value = false
  selectedPuzzleId.value = puzzle.PuzzleId
  feedbackMessage.value = t('tornado.mistakes.feedback.yourTurn')

  const fen = puzzle.FEN_0 || puzzle.initial_fen || ''
  const moves = puzzle.Moves || puzzle.tactical_solution || ''

  gameStore.setupPuzzle(
    fen,
    moves.split(' '),
    handlePuzzleResult,
    () => true,
    () => {},
    'tornado',
  )
}

function handlePuzzleResult(isCorrect: boolean) {
  if (!selectedPuzzle.value) return
  isAttemptMade.value = true
  if (isCorrect) {
    solvedStatus.value[selectedPuzzle.value.PuzzleId] = true
    feedbackMessage.value = t('tornado.mistakes.feedback.solved')
    soundService.playSound('game_tacktics_success')
  } else {
    feedbackMessage.value = t('tornado.mistakes.feedback.wrongMove')
    soundService.playSound('game_tacktics_error')
  }
}

function selectNextUnsolvedPuzzle() {
  const currentIndex = mistakes.value.findIndex((p) => p.PuzzleId === selectedPuzzleId.value)
  const nextPuzzles = [
    ...mistakes.value.slice(currentIndex + 1),
    ...mistakes.value.slice(0, currentIndex + 1),
  ]

  const nextUnsolved = nextPuzzles.find((p) => !solvedStatus.value[p.PuzzleId])

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
  router.push('/tornado')
}
</script>

<template>
  <GameLayout>
    <template #left-panel>
      <div class="mistakes-list-container">
        <h4>{{ t('tornado.mistakes.title') }}</h4>
        <div class="mistakes-list-scrollable">
          <div
            v-for="puzzle in unsolvedMistakes"
            :key="puzzle.PuzzleId"
            class="mistake-item"
            :class="{
              active: puzzle.PuzzleId === selectedPuzzleId,
              solved: solvedStatus[puzzle.PuzzleId],
              unsolved: !solvedStatus[puzzle.PuzzleId],
            }"
            @click="selectPuzzle(puzzle)"
          >
            <ChessboardPreview :fen="puzzle.FEN_0 || puzzle.initial_fen || ''" orientation="white" />
          </div>
          <div v-if="mistakes.length === 0" class="no-mistakes">
            {{ t('tornado.mistakes.feedback.noMistakes') }}
          </div>
        </div>
      </div>
    </template>

    <template #top-info>
      <div class="top-feedback-panel">
        {{ feedbackMessage }}
      </div>
    </template>

    <template #right-panel>
      <div class="controls-container">
        <div v-if="selectedPuzzle" class="puzzle-info-box">
          <div class="info-row">
            <span class="label">{{ t('tornado.mistakes.info.id') }}:</span>
            <span class="value">#{{ selectedPuzzle.PuzzleId }}</span>
          </div>
          <div class="info-row">
            <span class="label">{{ t('tornado.mistakes.info.rating') }}:</span>
            <span class="value">{{ selectedPuzzle.Rating }}</span>
          </div>
          <div class="info-row">
            <span class="label">{{ t('tornado.mistakes.info.theme') }}:</span>
            <span class="value">{{ formattedThemes }}</span>
          </div>
        </div>

        <div class="action-buttons">
          <button @click="showAnalysis" :disabled="!isAttemptMade" class="action-btn analysis-btn">
            {{ t('tornado.mistakes.ui.analysisButton') }}
          </button>
          <button
            @click="selectNextUnsolvedPuzzle"
            :disabled="unsolvedMistakes.length <= 1 || allMistakesSolved"
            class="action-btn next-btn"
          >
            {{ t('tornado.mistakes.ui.nextButton') }}
          </button>
          <button @click="handleExit" class="action-btn restart-btn">
            {{ t('tornado.mistakes.ui.restartButton') }}
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
  width: calc((100% - 30px) / 2);
  aspect-ratio: 1 / 1;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: var(--panel-border-radius);
  transition: all 0.2s ease-in-out;
  border: 2px solid var(--color-border);
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

.top-feedback-panel {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: var(--font-size-large);
  font-weight: bold;
  color: var(--color-accent-warning);
  text-align: center;
}

.puzzle-info-box {
  background-color: var(--color-bg-tertiary);
  padding: 15px;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border);
  margin-bottom: 10px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: var(--font-size-small);
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row .label {
  color: var(--color-text-muted);
}

.info-row .value {
  font-weight: bold;
  text-align: right;
  max-width: 70%;
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

.restart-btn {
  background-color: var(--color-accent-warning);
  color: var(--color-text-dark);
}

.exit-btn {
  background-color: var(--color-accent-error);
  color: var(--color-text-on-accent);
}
</style>
