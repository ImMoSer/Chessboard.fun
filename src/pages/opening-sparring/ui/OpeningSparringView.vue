<!-- src/pages/OpeningExamView.vue -->
<script setup lang="ts">
import { useGameStore } from '@/entities/game'
import { theoryGraphService } from '@/entities/opening'
import { AnalysisPanel, EngineLines, useAnalysisStore } from '@/features/analysis'
import { EngineSelector } from '@/features/engine'
import { MozerBook } from '@/features/mozer-book'
import {
  GameReviewModal,
  OpeningSparringHeader,
  OpeningSparringSettingsModal,
  OpeningSparringSummaryModal,
  SessionHistoryList,
  useOpeningSparringStore,
  useSparringLoop,
} from '@/features/opening-sparring'
import { useSmartHintStore } from '@/features/smart-hint'
import i18n from '@/shared/config/i18n'
import { useUiStore } from '@/shared/ui/model/ui.store'
import { ControlPanel, GameLayout, useControlsStore } from '@/widgets/game-layout'
import { NTag } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const t = i18n.global.t
const controlsStore = useControlsStore()
const openingStore = useOpeningSparringStore()
const gameStore = useGameStore()
const uiStore = useUiStore()
const analysisStore = useAnalysisStore()
const smartHintStore = useSmartHintStore()
const router = useRouter()
const route = useRoute()
const loop = useSparringLoop()

const isSettingsModalOpen = ref(true)
const showSummaryModal = ref(false)
const showReviewModal = ref(false)
const isNavigatingToPlayout = ref(false)
const lastSessionParams = ref<{ color: 'white' | 'black'; moves: string[]; slug?: string } | null>(null)

const isExamEnding = computed(() => openingStore.isTheoryOver || openingStore.isDeviation)

// Watch for game over in playout mode
watch(
  () => gameStore.gamePhase,
  (phase) => {
    if (phase === 'GAMEOVER' && openingStore.isPlayoutMode) {
      // Delay slightly to let board update final state/sound
      setTimeout(() => {
        showReviewModal.value = true
      }, 1000)
    }
  },
)

// Automatically handle analysis panel in Exam mode
watch(
  isExamEnding,
  async (isEnding) => {
    if (isEnding && !openingStore.isPlayoutMode && !openingStore.isReviewMode) {
      showSummaryModal.value = true
      await openingStore.runFinalEvaluation()
    } else if (!isEnding) {
      analysisStore.hidePanel()
      showSummaryModal.value = false
    }
  },
  { immediate: true },
)

const showAnalysisPanel = computed(() => {
  // Show analysis only during theory summary, NOT during playout review or Review Mode
  return (
    isExamEnding.value &&
    !showSummaryModal.value &&
    !openingStore.isPlayoutMode &&
    !showReviewModal.value &&
    !openingStore.isReviewMode
  )
})

watch(showAnalysisPanel, (val) => {
  if (val) {
    analysisStore.showPanel(true)
  } else {
    // Only hide if we are NOT in review mode (review mode handles analysis manually)
    if (!openingStore.isReviewMode) {
      analysisStore.hidePanel()
    }
  }
})

onMounted(async () => {
  if (route.params.openingSlug || route.params.color) {
    await handleRouteParams()
  }
})

async function handleRouteParams() {
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
  lastSessionParams.value = { color, moves, slug }
  isSettingsModalOpen.value = false
  showSummaryModal.value = false
  showReviewModal.value = false
  analysisStore.setPlayerColor(color)
  analysisStore.hidePanel()
  smartHintStore.resetHints(3)

  if (slug) {
    router.replace({
      name: 'opening-sparring',
      params: { openingSlug: slug, color: `for_${color}` },
    })
  } else {
    router.replace({ name: 'opening-sparring' })
  }

  // initializeSession now handles GameStore setup and stats fetching internally
  await openingStore.initializeSession(color, moves, loop.createStrategy())
}

async function handleNewGame() {
  const confirmed = await uiStore.showConfirmation(
    t('gameplay.confirmExit.title'),
    'Start a new exam?',
  )
  if (confirmed === 'confirm') {
    openingStore.reset()
    await gameStore.resetGame()
    isSettingsModalOpen.value = true
    showReviewModal.value = false
    showSummaryModal.value = false
  }
}

async function handleRestart() {
  const confirmed = await uiStore.showConfirmation(
    t('gameplay.confirmExit.title'),
    'Restart the current exam?',
  )
  if (confirmed === 'confirm') {
    openingStore.reset()
    await gameStore.resetGame()
    showReviewModal.value = false
    showSummaryModal.value = false
    if (lastSessionParams.value) {
      await startSession(lastSessionParams.value.color, lastSessionParams.value.moves, lastSessionParams.value.slug)
    } else {
      isSettingsModalOpen.value = true
    }
  }
}

function handleReviewRestart() {
  showReviewModal.value = false
  openingStore.reset()
  gameStore.resetGame().then(() => {
    if (lastSessionParams.value) {
      startSession(lastSessionParams.value.color, lastSessionParams.value.moves, lastSessionParams.value.slug)
    } else {
      isSettingsModalOpen.value = true
    }
  })
}

async function handleReviewAnalyze() {
  showReviewModal.value = false
  openingStore.enterReviewMode()
  // Start engine
  await analysisStore.showPanel(true)
}

function handleSummaryPlayout() {
  showSummaryModal.value = false
  loop.startPlayout()
}

function handleSummaryAnalyze() {
  showSummaryModal.value = false
  gameStore.setGamePhase('GAMEOVER')
}

async function handleSummaryRestart() {
  showSummaryModal.value = false
  openingStore.reset()
  await gameStore.resetGame()
  if (lastSessionParams.value) {
    await startSession(lastSessionParams.value.color, lastSessionParams.value.moves, lastSessionParams.value.slug)
  } else {
    isSettingsModalOpen.value = true
  }
}

async function handleResign() {
  const confirmed = await uiStore.showConfirmation(
    t('gameplay.confirmExit.title'),
    t('gameplay.confirmExit.message'),
  )
  if (confirmed === 'confirm') {
    if (openingStore.isPlayoutMode) {
      gameStore.handleGameResignation()
    } else {
      openingStore.isTheoryOver = true
      gameStore.setGamePhase('GAMEOVER')
    }
  }
}

watch(
  () => [gameStore.gamePhase, openingStore.isPlayoutMode, isExamEnding.value],
  () => {
    const isPlaying = gameStore.gamePhase === 'PLAYING'
    const isTheoryPhase = !isExamEnding.value
    const isSparringActive = isTheoryPhase || openingStore.isPlayoutMode

    controlsStore.setControls({
      canRequestNew: true,
      canRestart: true,
      canResign: isPlaying && isSparringActive && !openingStore.isReviewMode,
      canShare: false,
      canRequestHint: isPlaying && isSparringActive && !openingStore.isReviewMode,
      onRequestNew: handleNewGame,
      onRestart: handleRestart,
      onResign: handleResign,
    })
  },
  { immediate: true },
)

function goBack() {
  router.push({ name: 'welcome' })
}
</script>

<template>
  <GameLayout>
    <template #left-panel>
      <div class="left-panel-content">
        <OpeningSparringHeader
          :average-accuracy="openingStore.averageAccuracy"
          :average-win-rate="openingStore.averageWinRate"
          :average-rating="openingStore.averageRating"
          :is-theory-over="openingStore.isTheoryOver"
          :is-deviation="openingStore.isDeviation"
          :is-playout-mode="openingStore.isPlayoutMode"
          @restart="handleRestart"
        />

        <AnalysisPanel v-if="showAnalysisPanel" style="margin-bottom: 12px; flex-shrink: 0" />

        <div class="mozer-book-wrapper">
          <MozerBook
            :blurred="openingStore.isPlayoutMode"
            :is-paused="openingStore.isPlayoutMode"
          />
        </div>
      </div>

      <OpeningSparringSettingsModal
        v-if="isSettingsModalOpen"
        @start="startSession"
        @close="goBack"
      />
      <OpeningSparringSummaryModal
        :show="showSummaryModal"
        @close="showSummaryModal = false"
        @playout="handleSummaryPlayout"
        @analyze="handleSummaryAnalyze"
        @restart="handleSummaryRestart"
      >
        <template #engine-selector>
          <EngineSelector />
        </template>
      </OpeningSparringSummaryModal>
      <GameReviewModal
        :show="showReviewModal"
        @close="showReviewModal = false"
        @restart="handleReviewRestart"
        @analyze="handleReviewAnalyze"
      />
    </template>

    <template #top-info>
      <div class="opening-top-info">
        <n-tag
          v-if="openingStore.currentEco && openingStore.movesCount > 0"
          type="info"
          size="small"
          round
          :bordered="false"
          class="eco-tag"
        >
          {{ openingStore.currentEco }}
        </n-tag>
        <div class="opening-name-text">
          <template v-if="openingStore.movesCount === 0"> START POSITION </template>
          <template v-else>
            {{ openingStore.openingName || t('openingTrainer.header.searching') }}
          </template>
        </div>
      </div>
    </template>

    <template #center-column>
      <!-- Loader removed to prevent blinking -->
    </template>

    <template #controls>
      <ControlPanel />
    </template>

    <template #right-panel>
      <div v-if="openingStore.isReviewMode" class="review-engine-container">
        <EngineLines />
      </div>

      <div class="history-list-wrapper">
        <SessionHistoryList />
      </div>

      <div v-if="openingStore.error" class="error-msg">
        {{ openingStore.error }}
      </div>
    </template>
  </GameLayout>
</template>

<style scoped>
.left-panel-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.mozer-book-wrapper {
  flex: 1;
  min-height: 0; /* Important for flex child scroll */
}

.history-list-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.review-engine-container {
  margin-bottom: 12px;
  flex-shrink: 0;
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

.opening-top-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(4px);
}

.opening-name-text {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
}

.eco-tag {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 800;
  background: var(--color-accent-primary-alpha) !important;
  color: var(--color-accent-primary) !important;
}
</style>
