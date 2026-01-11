<!-- src/views/OpeningTrainingView.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AnalysisPanel from '../components/AnalysisPanel.vue';
import GameLayout from '../components/GameLayout.vue';
import OpeningStatsTable from '../components/OpeningTrainer/OpeningStatsTable.vue';
import OpeningTrainerHeader from '../components/OpeningTrainer/OpeningTrainerHeader.vue';
import OpeningTrainingSettingsModal from '../components/OpeningTrainer/OpeningTrainingSettingsModal.vue';
import i18n from '../services/i18n';
import { openingGraphService } from '../services/OpeningGraphService';
import { useAnalysisStore } from '../stores/analysis.store';
import { useBoardStore } from '../stores/board.store';
import { useGameStore } from '../stores/game.store';
import { useOpeningTrainingStore } from '../stores/openingTraining.store';
import { useUiStore } from '../stores/ui.store';

const t = i18n.global.t;
const openingStore = useOpeningTrainingStore();
const boardStore = useBoardStore();
const gameStore = useGameStore();
const uiStore = useUiStore();
const analysisStore = useAnalysisStore();
const router = useRouter();
const route = useRoute();

const isSettingsModalOpen = ref(true);
const isNavigatingToPlayout = ref(false);
let navigationDebounce: ReturnType<typeof setTimeout> | null = null;

// Sync Opening Stats with Board Position (Debounced for Navigation)
watch(() => boardStore.fen, () => {
    if (navigationDebounce) clearTimeout(navigationDebounce);

    navigationDebounce = setTimeout(() => {
        if (!openingStore.isLoading && !openingStore.isProcessingMove) {
            openingStore.fetchStats(false, false, true);
        }
    }, 100);
});

onMounted(async () => {
    openingStore.reset();
    analysisStore.showPanel(); // Always show in training
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
        if (opening) moves = opening.moves;
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
    analysisStore.setPlayerColor(color);
    analysisStore.showPanel();

    if (slug) {
        router.replace({
            name: 'opening-training',
            params: { openingSlug: slug, color: `for_${color}` }
        });
    } else {
        router.replace({ name: 'opening-training' });
    }

    gameStore.setupPuzzle(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        [],
        () => { },
        () => false,
        () => { },
        'opening-trainer',
        undefined,
        color,
        (uci) => openingStore.handlePlayerMove(uci)
    );

    await openingStore.initializeSession(color, moves);
}

async function handleRestart() {
    const confirmed = await uiStore.showConfirmation(
        t('gameplay.confirmExit.title'),
        'Restart the training session?'
    );
    if (confirmed) {
        openingStore.reset();
        await gameStore.resetGame();
        isSettingsModalOpen.value = true;
    }
}

async function handlePlayout() {
    const confirmed = await uiStore.showConfirmation(
        'Start Playout?',
        'Continue this position against the selected engine right here?'
    );
    if (confirmed) {
        openingStore.startPlayout();
    }
}
</script>

<template>
    <GameLayout>
        <template #left-panel>
            <div class="controls-panel">
                <OpeningTrainerHeader :opening-name="openingStore.openingName" :eco="openingStore.currentEco"
                    :average-accuracy="openingStore.averageAccuracy" :average-win-rate="openingStore.averageWinRate"
                    :average-rating="openingStore.averageRating" :is-theory-over="openingStore.isTheoryOver"
                    :is-deviation="openingStore.isDeviation" :is-review-mode="true"
                    :is-analysis-active="analysisStore.isPanelVisible" :is-playout-mode="openingStore.isPlayoutMode"
                    session-mode="training" @restart="handleRestart" @hint="openingStore.hint"
                    @toggle-analysis="analysisStore.isPanelVisible ? analysisStore.hidePanel() : analysisStore.showPanel()"
                    @playout="handlePlayout" />
            </div>
            <AnalysisPanel />
            <OpeningTrainingSettingsModal v-if="isSettingsModalOpen" @start="startSession" @close="() => { }" />
        </template>

        <template #center-column>
            <div v-if="openingStore.isLoading" class="loader-overlay">
                <div class="spinner"></div>
            </div>
        </template>

        <template #right-panel>
            <div class="stats-table-wrapper">
                <OpeningStatsTable v-if="openingStore.currentStats" :moves="openingStore.currentStats.moves"
                    :white="openingStore.currentStats.white" :draws="openingStore.currentStats.draws"
                    :black="openingStore.currentStats.black" :is-review-mode="true"
                    @select-move="m => openingStore.handlePlayerMove(m)" />

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
