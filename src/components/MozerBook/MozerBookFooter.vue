<script setup lang="ts">
import { computed } from 'vue';

interface Props {
    summary: {
        w: number;
        d: number;
        l: number;
    };
    turn: 'white' | 'black';
}

const props = defineProps<Props>();

const total = computed(() => props.summary.w + props.summary.d + props.summary.l);

const whiteWinsPct = computed(() => {
    if (total.value === 0) return 0;
    // White wins (1-0) is stats.w if it's White's turn, else stats.l if it's Black's turn?
    // Actually, MozerBook API seems to return w/d/l from the perspective of the side to move.
    // Wait, let's re-verify the logic in MozerBook.vue:
    // "To match your request: Green bar and percentage should always represent White points (1-0)"
    // const whiteWins = turn.value === 'white' ? move.w : move.l;
    const whiteWins = props.turn === 'white' ? props.summary.w : props.summary.l;
    return (whiteWins / total.value) * 100;
});

const drawsPct = computed(() => {
    if (total.value === 0) return 0;
    return (props.summary.d / total.value) * 100;
});

const blackWinsPct = computed(() => {
    if (total.value === 0) return 0;
    const blackWins = props.turn === 'black' ? props.summary.w : props.summary.l;
    return (blackWins / total.value) * 100;
});

const whiteWinsDisplay = computed(() => props.turn === 'white' ? props.summary.w : props.summary.l);
const blackWinsDisplay = computed(() => props.turn === 'black' ? props.summary.w : props.summary.l);
</script>

<template>
    <div class="book-footer">
        <div class="footer-bars">
            <div class="bar-row" title="1-0 (White Wins)">
                <div class="bar white" :style="{ width: whiteWinsPct + '%' }"></div>
            </div>
            <div class="bar-row" title="Draws">
                <div class="bar draw" :style="{ width: drawsPct + '%' }"></div>
            </div>
            <div class="bar-row" title="0-1 (Black Wins)">
                <div class="bar black" :style="{ width: blackWinsPct + '%' }"></div>
            </div>
        </div>
        <div class="footer-legend">
            <div class="legend-item">
                1-0: {{ whiteWinsDisplay }} = {{ whiteWinsPct.toFixed(0) }}%
            </div>
            <div class="legend-item">
                1/2: {{ summary.d }} = {{ drawsPct.toFixed(0) }}%
            </div>
            <div class="legend-item">
                0-1: {{ blackWinsDisplay }} = {{ blackWinsPct.toFixed(0) }}%
            </div>
        </div>
    </div>
</template>

<style scoped>
.book-footer {
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border-top: 1px solid var(--color-border);
    display: flex;
    gap: 15px;
    align-items: center;
}

.footer-bars {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.bar-row {
    height: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
}

.bar {
    height: 100%;
}

.bar.white {
    background: #4caf50;
}

.bar.draw {
    background: #7E57C2;
}

.bar.black {
    background: #f44336;
}

.footer-legend {
    font-size: 11px;
    font-family: 'Fira Code', monospace;
    white-space: nowrap;
    color: var(--color-text-secondary);
}
</style>
