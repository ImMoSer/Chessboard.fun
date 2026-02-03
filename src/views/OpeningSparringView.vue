<!-- src/views/OpeningExamView.vue -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AnalysisPanel from '../components/AnalysisPanel.vue'
import GameLayout from '../components/GameLayout.vue'
import MozerBook from '../components/MozerBook/MozerBook.vue'
import OpeningSparringHeader from '../components/OpeningSparring/OpeningSparringHeader.vue'
import OpeningSparringSettingsModal from '../components/OpeningSparring/OpeningSparringSettingsModal.vue'
import i18n from '../services/i18n'
import { theoryGraphService } from '../services/TheoryGraphService'
import { useAnalysisStore } from '../stores/analysis.store'
import { useGameStore } from '../stores/game.store'
import { useOpeningSparringStore } from '../stores/openingSparring.store'
import { useUiStore } from '../stores/ui.store'

const t = i18n.global.t
const openingStore = useOpeningSparringStore()
const gameStore = useGameStore()
const uiStore = useUiStore()
const analysisStore = useAnalysisStore()
const router = useRouter()
const route = useRoute()

const isSettingsModalOpen = ref(true)
const isNavigatingToPlayout = ref(false)

const isExamEnding = computed(() => openingStore.isTheoryOver || openingStore.isDeviation)

// Automatically handle analysis panel in Exam mode
watch(
  isExamEnding,
  (isEnding) => {
    if (isEnding) {
      analysisStore.showPanel(true)
    } else {
      analysisStore.hidePanel()
    }
  },
  { immediate: true },
)

onMounted(async () => {
  openingStore.reset()
  analysisStore.hidePanel()
  if (route.params.openingSlug || route.params.color) {
    await handleRouteParams()
  }
})

async function handleRouteParams() {
  await theoryGraphService.loadBook()
  let slug = route.params.openingSlug as string | undefined
  let colorParam = route.params.color as string | undefined
  let color: 'white' | 'black' = 'white'
  let moves: string[] = []

  if (slug) {
    if (slug === 'white' || slug === 'black' || slug === 'for_white' || slug === 'for_black') {
      colorParam = slug
      slug = undefined
    } else if (slug === 'start') {
      slug = undefined
    }
  }

  if (colorParam) {
    const normalized = colorParam.replace('for_', '')
    if (normalized === 'white' || normalized === 'black') color = normalized
  }

  if (slug) {
    const opening = theoryGraphService.findOpeningBySlug(slug)
    if (opening) moves = opening.moves
  }

  if (slug || colorParam) {
    await startSession(color, moves, slug)
  }
}

onUnmounted(() => {
  openingStore.reset()
  analysisStore.setPlayerColor(null)
  if (!isNavigatingToPlayout.value) {
    gameStore.resetGame()
  }
})

async function startSession(color: 'white' | 'black', moves: string[] = [], slug?: string) {
  isSettingsModalOpen.value = false
  analysisStore.setPlayerColor(color)
  analysisStore.hidePanel()

  if (slug) {
    router.replace({
      name: 'opening-sparring',
      params: { openingSlug: slug, color: `for_${color}` },
    })
  } else {
    router.replace({ name: 'opening-sparring' })
  }

  gameStore.setupPuzzle(
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    [],
    () => {},
    () => false,
    () => {},
    'opening-trainer',
    undefined,
    color,
    (uci) => openingStore.handlePlayerMove(uci),
  )

  await openingStore.initializeSession(color, moves)
}

async function handleRestart() {
  const confirmed = await uiStore.showConfirmation(
    t('gameplay.confirmExit.title'),
    'Restart the exam?',
  )
  if (confirmed) {
    openingStore.reset()
    await gameStore.resetGame()
    isSettingsModalOpen.value = true
  }
}

async function handlePlayout() {
  const confirmed = await uiStore.showConfirmation(
    'Start Playout?',
    'Continue this position against the selected engine right here?',
  )
  if (confirmed) {
    openingStore.startPlayout()
  }
}
</script>

<template>
  <GameLayout>
    <template #left-panel>
      <div class="controls-panel">
        <OpeningSparringHeader
          :opening-name="openingStore.openingName"
          :eco="openingStore.currentEco"
          :average-accuracy="openingStore.averageAccuracy"
          :average-win-rate="openingStore.averageWinRate"
          :average-rating="openingStore.averageRating"
          :is-theory-over="openingStore.isTheoryOver"
          :is-deviation="openingStore.isDeviation"
          :is-playout-mode="openingStore.isPlayoutMode"
          :lives="openingStore.lives"
          @restart="handleRestart"
          @hint="openingStore.hint"
          @playout="handlePlayout"
        />
      </div>
      <AnalysisPanel v-if="isExamEnding" />
      <OpeningSparringSettingsModal
        v-if="isSettingsModalOpen"
        @start="startSession"
        @close="() => {}"
      />
    </template>

    <template #center-column>
      <div v-if="openingStore.isLoading" class="loader-overlay">
        <div class="spinner"></div>
      </div>
    </template>

    <template #right-panel>
      <div class="stats-table-wrapper">
        <MozerBook />

        <div v-if="openingStore.error" class="error-msg">
          {{ openingStore.error }}
        </div>
      </div>
    </template>
  </GameLayout>
</template>

<style scoped>
.controls-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.loader-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  pointer-events: none;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-msg {
  color: #f44336;
  padding: 10px;
  background: rgba(244, 67, 54, 0.1);
  border-radius: 8px;
  margin-top: 10px;
  text-align: center;
}
</style>
