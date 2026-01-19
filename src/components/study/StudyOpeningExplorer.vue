<script setup lang="ts">
import { openingApiService, type LichessOpeningResponse } from '@/services/OpeningApiService';
import { pgnService, pgnTreeVersion } from '@/services/PgnService';
import { useBoardStore } from '@/stores/board.store';
import { NButton, NButtonGroup } from 'naive-ui';
import { onMounted, ref, watch } from 'vue';
import OpeningStatsTable from '../OpeningTrainer/OpeningStatsTable.vue';

const stats = ref<LichessOpeningResponse | null>(null);
const loading = ref(false);
const source = ref<'masters' | 'lichess'>('lichess');
const boardStore = useBoardStore();

const handleSelectMove = (uci: string) => {
    boardStore.applyUciMove(uci);
};

const fetchStats = async () => {
    loading.value = true;
    try {
        const fen = pgnService.getCurrentNavigatedFen();
        const data = await openingApiService.getStats(fen, source.value);
        stats.value = data;
    } catch (e) {
        console.error('[StudyOpeningExplorer] Failed to fetch stats:', e);
    } finally {
        loading.value = false;
    }
};

watch([pgnTreeVersion, source], () => {
    fetchStats();
});

onMounted(() => {
    fetchStats();
});
</script>

<template>
    <div class="study-opening-explorer">
        <div class="explorer-header">
            <div class="header-title">Opening Explorer</div>
            <n-button-group size="tiny">
                <n-button :secondary="source !== 'lichess'" @click="source = 'lichess'">Lichess</n-button>
                <n-button :secondary="source !== 'masters'" @click="source = 'masters'">Masters</n-button>
            </n-button-group>
        </div>

        <div v-if="loading && !stats" class="loading-state">
            Loading stats...
        </div>

        <OpeningStatsTable v-if="stats" :moves="stats.moves" :isReviewMode="true" :white="stats.white"
            :draws="stats.draws" :black="stats.black" :avg-elo="stats.avgElo" :avg-draw="stats.avgDraw"
            :avg-score="stats.avgScore" @select-move="handleSelectMove" />

        <div v-if="!loading && !stats" class="empty-state">
            No statistics available for this position.
        </div>
    </div>
</template>

<style scoped>
.study-opening-explorer {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
    background: var(--color-bg-secondary);
    border-top: 1px solid var(--color-border);
    max-height: 400px;
    overflow-y: auto;
}

.explorer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
}

.header-title {
    font-size: 0.9em;
    font-weight: bold;
    color: var(--color-text-secondary);
    text-transform: uppercase;
}

.loading-state,
.empty-state {
    padding: 20px;
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 0.9em;
}
</style>
