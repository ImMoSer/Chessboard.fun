<!-- src/views/OpeningExamView.vue -->
<script setup lang="ts">
import { NTag } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AnalysisPanel from '../components/AnalysisPanel.vue'
import GameLayout from '../components/GameLayout.vue'
import MozerBook from '../components/MozerBook/MozerBook.vue'
import OpeningSparringHeader from '../components/OpeningSparring/OpeningSparringHeader.vue'
import OpeningSparringSettingsModal from '../components/OpeningSparring/OpeningSparringSettingsModal.vue'
import OpeningSparringSummaryModal from '../components/OpeningSparring/OpeningSparringSummaryModal.vue'
import GameReviewModal from '../components/OpeningSparring/GameReviewModal.vue'
import SessionHistoryList from '../components/OpeningSparring/SessionHistoryList.vue'
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
const showSummaryModal = ref(false)
const showReviewModal = ref(false)
const isNavigatingToPlayout = ref(false)

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
  }
)

// Automatically handle analysis panel in Exam mode
watch(
  isExamEnding,
  async (isEnding) => {
    if (isEnding && !openingStore.isPlayoutMode) {
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
    // Show analysis only during theory summary, NOT during playout review
    return isExamEnding.value && !showSummaryModal.value && !openingStore.isPlayoutMode && !showReviewModal.value
})

watch(showAnalysisPanel, (val) => {
    if (val) {
        analysisStore.showPanel(true)
    } else {
        analysisStore.hidePanel()
    }
})

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
  showSummaryModal.value = false
  showReviewModal.value = false
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
    (isWin, outcome) => {
      console.log('[OpeningSparring] Game Over:', isWin, outcome)
      gameStore.setGamePhase('GAMEOVER')
    },
    (outcome) => {
      return outcome?.winner === openingStore.playerColor
    },
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
    showReviewModal.value = false
  }
}

function handleReviewRestart() {
    showReviewModal.value = false
    openingStore.reset()
    gameStore.resetGame().then(() => {
         isSettingsModalOpen.value = true
    })
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

function handleSummaryPlayout() {
    showSummaryModal.value = false
    openingStore.startPlayout()
}

function handleSummaryAnalyze() {
    showSummaryModal.value = false
}

async function handleSummaryRestart() {
    showSummaryModal.value = false
    openingStore.reset()
    await gameStore.resetGame()
    isSettingsModalOpen.value = true
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
          :lives="openingStore.lives"
          @restart="handleRestart"
          @hint="openingStore.hint"
          @playout="handlePlayout"
        />

        <div class="history-list-wrapper">
             <SessionHistoryList />
        </div>
      </div>

      <OpeningSparringSettingsModal
        v-if="isSettingsModalOpen"
        @start="startSession"
        @close="() => {}"
      />
      <OpeningSparringSummaryModal
        :show="showSummaryModal"
        @close="showSummaryModal = false"
        @playout="handleSummaryPlayout"
        @analyze="handleSummaryAnalyze"
        @restart="handleSummaryRestart"
      />
      <GameReviewModal
        :show="showReviewModal"
        @close="showReviewModal = false"
        @restart="handleReviewRestart"
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
          <template v-if="openingStore.movesCount === 0">
            START POSITION
          </template>
          <template v-else>
            {{ openingStore.openingName || t('openingTrainer.header.searching') }}
          </template>
        </div>
      </div>
    </template>

    <template #center-column>
      <!-- Loader removed to prevent blinking -->
    </template>

    <template #right-panel>
      <AnalysisPanel v-if="showAnalysisPanel" style="margin-bottom: 12px; flex-shrink: 0;" />
      <div class="mozer-book-wrapper">
         <MozerBook :blurred="openingStore.isPlayoutMode" />
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
    height: 100%;
    overflow: hidden;
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
