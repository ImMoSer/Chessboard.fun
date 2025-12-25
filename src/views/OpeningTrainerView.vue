<!-- src/views/OpeningTrainerView.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import GameLayout from '../components/GameLayout.vue';
import OpeningTrainerHeader from '../components/OpeningTrainer/OpeningTrainerHeader.vue';
import WinrateProgressBar from '../components/OpeningTrainer/WinrateProgressBar.vue';
import OpeningStatsTable from '../components/OpeningTrainer/OpeningStatsTable.vue';
import OpeningTrainerSettingsModal from '../components/OpeningTrainer/OpeningTrainerSettingsModal.vue';
import { useOpeningTrainerStore } from '../stores/openingTrainer.store';
import { useBoardStore } from '../stores/board.store';
import { useGameStore } from '../stores/game.store';
import { useUiStore } from '../stores/ui.store';
import { useRouter } from 'vue-router';
import i18n from '../services/i18n';

const t = i18n.global.t;
const openingStore = useOpeningTrainerStore();
const boardStore = useBoardStore();
const gameStore = useGameStore();
const uiStore = useUiStore();
const router = useRouter();

const isReviewMode = ref(false);
const isSettingsModalOpen = ref(true);
const isNavigatingToPlayout = ref(false);

onMounted(() => {
    openingStore.reset();
});

onUnmounted(() => {
    openingStore.reset();
    if (!isNavigatingToPlayout.value) {
        gameStore.resetGame();
    }
});

async function startSession(color: 'white' | 'black') {
    isSettingsModalOpen.value = false;

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
    await openingStore.initializeSession(color);
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
            <OpeningTrainerHeader :opening-name="openingStore.openingName" :eco="openingStore.currentEco" :total-score="openingStore.totalScore"
                :is-theory-over="openingStore.isTheoryOver" :is-deviation="openingStore.isDeviation" />
        </template>

        <template #left-panel>
            <div class="controls-panel">
                <div class="game-controls">
                    <button class="btn" @click="handleRestart">New Session</button>
                    <button class="btn" @click="openingStore.hint">Hint</button>
                    <button class="btn" :class="{ 'active': isReviewMode }" @click="toggleReview">
                        {{ isReviewMode ? 'Hide Theory' : 'Review' }}
                    </button>
                    <button class="btn success" @click="handlePlayout">Playout</button>
                </div>
            </div>

            <OpeningTrainerSettingsModal v-if="isSettingsModalOpen" @start="startSession" @close="() => { }" />
        </template>

        <template #center-column>
            <div v-if="openingStore.isLoading" class="loader-overlay">
                <div class="spinner"></div>
            </div>
        </template>

        <template #right-panel>
            <div v-if="openingStore.currentStats" class="stats-panel">
                <WinrateProgressBar :white="openingStore.currentStats.white" :draws="openingStore.currentStats.draws"
                    :black="openingStore.currentStats.black" />
                <OpeningStatsTable :moves="openingStore.currentStats.moves" :is-review-mode="isReviewMode" />
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

.btn-group {
    display: flex;
    gap: 10px;
    margin-top: 10px;
}

.btn {
    padding: 10px 20px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-weight: bold;
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    transition: all 0.2s;
}

.btn:hover {
    background: var(--color-border-hover);
}

.btn.primary {
    background: var(--color-accent);
    color: white;
}

.btn.success {
    background: #4caf50;
    color: white;
}

.btn.active {
    background: var(--color-accent);
    color: white;
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
