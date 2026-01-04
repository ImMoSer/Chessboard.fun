<!-- src/views/OpeningTrainerView.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import GameLayout from '../components/GameLayout.vue';
import OpeningTrainerHeader from '../components/OpeningTrainer/OpeningTrainerHeader.vue';
import OpeningStatsTable from '../components/OpeningTrainer/OpeningStatsTable.vue';
import OpeningTrainerSettingsModal from '../components/OpeningTrainer/OpeningTrainerSettingsModal.vue';
import AnalysisPanel from '../components/AnalysisPanel.vue';
import { useOpeningTrainerStore } from '../stores/openingTrainer.store';
import { useBoardStore } from '../stores/board.store';
import { useGameStore } from '../stores/game.store';
import { useUiStore } from '../stores/ui.store';
import { useAnalysisStore } from '../stores/analysis.store';
import { useRouter, useRoute } from 'vue-router';
import i18n from '../services/i18n';
import { openingGraphService } from '../services/OpeningGraphService';

const t = i18n.global.t;
const openingStore = useOpeningTrainerStore();
const boardStore = useBoardStore();
const gameStore = useGameStore();
const uiStore = useUiStore();
const analysisStore = useAnalysisStore();
const router = useRouter();
const route = useRoute();

const isReviewMode = ref(false);
const isSettingsModalOpen = ref(true);
const isNavigatingToPlayout = ref(false);
let navigationDebounce: ReturnType<typeof setTimeout> | null = null;

// Sync Opening Stats with Board Position (Debounced for Navigation)
watch(() => boardStore.fen, () => {
  if (navigationDebounce) clearTimeout(navigationDebounce);

  navigationDebounce = setTimeout(() => {
    // If the store is processing a game move, it will fetch stats itself.
    // We only fetch here if it's purely navigation (isProcessingMove is false).
    if (!openingStore.isLoading && !openingStore.isProcessingMove) {
      openingStore.fetchStats(false, false, true); // isGameplay = false, force = false, onlyCache = true
    }
  }, 100);
});

onMounted(async () => {
  openingStore.reset();
  if (route.params.openingSlug || route.params.color) {
    await handleRouteParams();
  }
});

async function handleRouteParams() {
  await openingGraphService.loadBook();

  let slug = route.params.openingSlug as string | undefined;
  let colorParam = route.params.color as string | undefined;
  let color: 'white' | 'black' = 'white';
  let moves: string[] = [];

  // Handle case where only color is provided in first param or slug is 'start'
  if (slug) {
    if (slug === 'white' || slug === 'black' || slug === 'for_white' || slug === 'for_black') {
      colorParam = slug;
      slug = undefined;
    } else if (slug === 'start') {
      slug = undefined;
    }
  }

  if (colorParam) {
    const normalized = colorParam.replace('for_', '');
    if (normalized === 'white' || normalized === 'black') {
      color = normalized;
    }
  }

  if (slug) {
    const opening = openingGraphService.findOpeningBySlug(slug);
    if (opening) {
      moves = opening.moves;
    }
  }

  if (slug || colorParam) {
    await startSession(color, moves, slug);
  }
}

onUnmounted(() => {
  openingStore.reset();
  analysisStore.setPlayerColor(null);
  if (!isNavigatingToPlayout.value) {
    gameStore.resetGame();
  }
});

async function startSession(color: 'white' | 'black', moves: string[] = [], slug?: string) {
  isSettingsModalOpen.value = false;

  // Set Analysis Player Color for smart navigation
  analysisStore.setPlayerColor(color);

  // Update URL to reflect current session
  if (slug) {
    router.replace({
      name: 'opening-trainer',
      params: {
        openingSlug: slug,
        color: `for_${color}`
      }
    });
  } else {
    // Clear params if starting fresh/standard
    router.replace({ name: 'opening-trainer' });
  }

  // Setup game store with opening-trainer mode FIRST
  gameStore.setupPuzzle(
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    [],
    () => { }, // onGameOver
    () => false, // winCondition
    () => { }, // onPlayoutStart
    'opening-trainer',
    undefined,
    color,
    (uci) => openingStore.handlePlayerMove(uci)
  );

  // Initialize opening store (will fetch stats and make bot move if Black)
  await openingStore.initializeSession(color, moves);
}

async function handleRestart() {
  const confirmed = await uiStore.showConfirmation(
    t('gameplay.confirmExit.title'),
    'Restart the opening session?'
  );
  if (confirmed) {
    openingStore.reset();
    await gameStore.resetGame();
    isSettingsModalOpen.value = true;
  }
}

function toggleReview() {
  isReviewMode.value = !isReviewMode.value;
}

async function handlePlayout() {
  const confirmed = await uiStore.showConfirmation(
    'Start Playout?',
    'Continue this position against Stockfish?'
  );
  if (confirmed) {
    isNavigatingToPlayout.value = true;
    const fen = boardStore.fen.replace(/ /g, '_');
    const color = openingStore.playerColor;
    // Redirect to Sandbox with default engine SF_2200
    router.push(`/sandbox/play/SF_2200/${color}/${fen}`);
  }
}
</script>

<template>
  <GameLayout>
    <template #top-info>
      <!-- Header moved to left panel -->
    </template>

    <template #left-panel>
      <div class="controls-panel">
        <OpeningTrainerHeader :opening-name="openingStore.openingName" :eco="openingStore.currentEco"
          :average-popularity="openingStore.averagePopularity" :average-win-rate="openingStore.averageWinRate"
          :average-rating="openingStore.averageRating" :is-theory-over="openingStore.isTheoryOver"
          :is-deviation="openingStore.isDeviation" :is-review-mode="isReviewMode"
          :is-analysis-active="analysisStore.isPanelVisible" @restart="handleRestart" @hint="openingStore.hint"
          @toggle-review="toggleReview"
          @toggle-analysis="analysisStore.isPanelVisible ? analysisStore.hidePanel() : analysisStore.showPanel()"
          @playout="handlePlayout" />
      </div>

      <AnalysisPanel />

      <OpeningTrainerSettingsModal v-if="isSettingsModalOpen" @start="startSession" @close="() => { }" />
    </template>

    <template #center-column>
      <div v-if="openingStore.isLoading" class="loader-overlay">
        <div class="spinner"></div>
      </div>
    </template>

    <template #right-panel>
      <div v-if="openingStore.currentStats" class="stats-panel">
        <OpeningStatsTable :moves="openingStore.currentStats.moves" :is-review-mode="isReviewMode"
          :white="openingStore.currentStats.white" :draws="openingStore.currentStats.draws"
          :black="openingStore.currentStats.black" />
      </div>

      <div v-if="openingStore.error" class="error-msg">
        {{ openingStore.error }}
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

.variability-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.variability-control input {
  cursor: pointer;
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
