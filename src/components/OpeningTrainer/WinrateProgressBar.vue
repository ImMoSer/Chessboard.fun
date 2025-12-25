<!-- src/components/OpeningTrainer/WinrateProgressBar.vue -->
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    white: number;
    draws: number;
    black: number;
}>();

const total = computed(() => props.white + props.draws + props.black || 1);

const whitePct = computed(() => (props.white / total.value) * 100);
const drawsPct = computed(() => (props.draws / total.value) * 100);
const blackPct = computed(() => (props.black / total.value) * 100);
</script>

<template>
    <div class="winrate-bar-container">
        <div class="winrate-labels">
            <span class="white-val">{{ Math.round(whitePct) }}%</span>
            <span class="draw-val">{{ Math.round(drawsPct) }}%</span>
            <span class="black-val">{{ Math.round(blackPct) }}%</span>
        </div>
        <div class="winrate-bar">
            <div class="segment white" :style="{ width: whitePct + '%' }"></div>
            <div class="segment draw" :style="{ width: drawsPct + '%' }"></div>
            <div class="segment black" :style="{ width: blackPct + '%' }"></div>
        </div>
    </div>
</template>

<style scoped>
.winrate-bar-container {
    width: 100%;
    padding: 10px;
    background: var(--color-bg-tertiary);
    border-radius: 8px;
    margin-bottom: 10px;
}

.winrate-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    font-weight: bold;
    margin-bottom: 4px;
}

.white-val {
    color: #fff;
    text-shadow: 0 0 2px #000;
}

.draw-val {
    color: #888;
}

.black-val {
    color: #000;
    text-shadow: 0 0 2px #fff;
}

.winrate-bar {
    display: flex;
    height: 12px;
    width: 100%;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.segment {
    height: 100%;
    transition: width 0.3s ease;
}

.segment.white {
    background-color: #f0f0f0;
}

.segment.draw {
    background-color: #888888;
}

.segment.black {
    background-color: #262421;
}
</style>
