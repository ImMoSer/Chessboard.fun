<!-- src/pages/TornadoMistakesView.vue -->
<script setup lang="ts">
import { useGameStore } from '@/entities/game'
import { AnalysisPanel, useAnalysisStore } from '@/features/analysis'
import ChessboardPreview from '@/shared/ui/board-preview/ChessboardPreview.vue'
import { useUiStore } from '@/shared/ui/model/ui.store'
import GameLayout from '@/widgets/game-layout/GameLayout.vue'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

import { useTornadoMistakesStore } from '@/features/tornado/model/tornadoMistakes.store'
import type { GamePuzzle } from '@/shared/types/api.types'
// --- STORES ---
const gameStore = useGameStore()
const analysisStore = useAnalysisStore()
const uiStore = useUiStore()
const mistakesStore = useTornadoMistakesStore()
const router = useRouter()
const { t } = useI18n()

// --- COMPUTED ---
const formattedThemes = computed(() => {
  if (!mistakesStore.selectedPuzzle) return ''

  let themesList: string[] = []
  const selectedPuzzle = mistakesStore.selectedPuzzle

  if (selectedPuzzle.Themes_PG && Array.isArray(selectedPuzzle.Themes_PG)) {
    themesList = selectedPuzzle.Themes_PG
  } else if (selectedPuzzle.Themes) {
    // Handle both space and comma separated strings
    themesList = selectedPuzzle.Themes.split(/[ ,]+/).filter(Boolean)
  } else if (selectedPuzzle.themes && Array.isArray(selectedPuzzle.themes)) {
    // Support for TornadoBox format (lowercase 'themes' array)
    themesList = selectedPuzzle.themes
  }

  return themesList
    .map((theme) => {
      return t(`chess.tornado.${theme}`)
    })
    .join(', ')
})

// --- METHODS ---
function selectNextUnsolvedPuzzle() {
  const currentIndex = mistakesStore.mistakes.findIndex((p) => p.PuzzleId === mistakesStore.selectedPuzzleId)
  const nextPuzzles = [
    ...mistakesStore.mistakes.slice(currentIndex + 1),
    ...mistakesStore.mistakes.slice(0, currentIndex + 1),
  ]

  const nextUnsolved = nextPuzzles.find((p) => !mistakesStore.solvedStatus[p.PuzzleId])

  if (nextUnsolved) {
    handleSelectPuzzle(nextUnsolved)
  } else if (mistakesStore.allMistakesSolved) {
    mistakesStore.feedbackMessage = t('tornado.mistakes.feedback.allSolved')
  }
}

function handleSelectPuzzle(puzzle: GamePuzzle) {
  if (analysisStore.isPanelVisible) {
    analysisStore.hidePanel()
  }
  mistakesStore.selectPuzzle(puzzle)
}

function showAnalysis() {
  if (mistakesStore.isAttemptMade) {
    analysisStore.showPanel(true)
  }
}

// --- LIFECYCLE & ROUTE GUARDS ---
onMounted(() => {
  const loaded = mistakesStore.loadMistakes()
  if (loaded && mistakesStore.mistakes.length > 0) {
    const firstMistake = mistakesStore.mistakes[0]
    if (firstMistake) {
      handleSelectPuzzle(firstMistake)
    }
  } else if (!loaded) {
    mistakesStore.feedbackMessage = t('tornado.mistakes.feedback.noMistakes')
  }
})

onBeforeRouteLeave(async (to, from, next) => {
  const userResponse = await uiStore.showConfirmation(
    t('tornado.mistakes.exit.title'),
    t('tornado.mistakes.exit.message'),
  )
  if (userResponse === 'confirm') {
    mistakesStore.clearMistakes()
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
            v-for="puzzle in mistakesStore.unsolvedMistakes"
            :key="puzzle.PuzzleId"
            class="mistake-item"
            :class="{
              active: puzzle.PuzzleId === mistakesStore.selectedPuzzleId,
              solved: mistakesStore.solvedStatus[puzzle.PuzzleId],
              unsolved: !mistakesStore.solvedStatus[puzzle.PuzzleId],
            }"
            @click="handleSelectPuzzle(puzzle)"
          >
            <ChessboardPreview
              :fen="puzzle.FEN_0 || puzzle.initial_fen || ''"
              orientation="white"
            />
          </div>
          <div v-if="mistakesStore.mistakes.length === 0" class="no-mistakes">
            {{ t('tornado.mistakes.feedback.noMistakes') }}
          </div>
        </div>
      </div>
    </template>

    <template #top-info>
      <div class="top-feedback-panel">
        {{ mistakesStore.feedbackMessage }}
      </div>
    </template>

    <template #right-panel>
      <div class="controls-container">
        <div v-if="mistakesStore.selectedPuzzle" class="puzzle-info-box">
          <div class="info-row">
            <span class="label">{{ t('tornado.mistakes.info.id') }}:</span>
            <span class="value">#{{ mistakesStore.selectedPuzzle.PuzzleId }}</span>
          </div>
          <div class="info-row">
            <span class="label">{{ t('tornado.mistakes.info.rating') }}:</span>
            <span class="value">{{ mistakesStore.selectedPuzzle.Rating }}</span>
          </div>
          <div class="info-row">
            <span class="label">{{ t('tornado.mistakes.info.theme') }}:</span>
            <span class="value">{{ formattedThemes }}</span>
          </div>
        </div>

        <div class="action-buttons">
          <button @click="showAnalysis" :disabled="!mistakesStore.isAttemptMade" class="action-btn analysis-btn">
            {{ t('tornado.mistakes.ui.analysisButton') }}
          </button>
          <button
            @click="selectNextUnsolvedPuzzle"
            :disabled="mistakesStore.unsolvedMistakes.length <= 1 || mistakesStore.allMistakesSolved"
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
