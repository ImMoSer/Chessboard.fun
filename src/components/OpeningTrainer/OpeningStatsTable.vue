<script setup lang="ts">
import type { LichessMove } from '../../services/OpeningApiService';

defineProps<{
    moves: LichessMove[];
    isReviewMode: boolean;
}>();

const formatWR = (move: LichessMove) => {
    const total = move.white + move.draws + move.black;
    if (total === 0) return '0%';
    // Assuming perspective of Whoever is to move?
    // Actually usually WR is shown as % for White in most tools,
    // but let's show simple W / D / L or just White Win % for now.
    return Math.round(((move.white + 0.5 * move.draws) / total) * 100) + '%';
};

const formatTotal = (total: number) => {
    if (total >= 1000000) return (total / 1000000).toFixed(1) + 'M';
    if (total >= 1000) return (total / 1000).toFixed(1) + 'K';
    return total.toString();
};
</script>

<template>
    <div class="stats-table-wrapper" :class="{ 'blurred': !isReviewMode }">
        <div v-if="!isReviewMode" class="overlay">
            <span>Review mode to see theory</span>
        </div>
        <table class="stats-table">
            <thead>
                <tr>
                    <th>Move</th>
                    <th>Games</th>
                    <th>Win Rate (W)</th>
                    <th>Avg. Rating</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="move in moves" :key="move.uci">
                    <td class="move-cell">{{ move.san }}</td>
                    <td>{{ formatTotal(move.white + move.draws + move.black) }}</td>
                    <td :class="calculateColorClass(move)">{{ formatWR(move) }}</td>
                    <td>{{ move.averageRating }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script lang="ts">
function calculateColorClass(move: LichessMove) {
    const total = move.white + move.draws + move.black;
    if (total === 0) return '';
    const wr = (move.white + 0.5 * move.draws) / total;
    if (wr >= 0.55) return 'text-success';
    if (wr <= 0.45) return 'text-danger';
    return '';
}
</script>

<style scoped>
.stats-table-wrapper {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-radius: 8px;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
}

.blurred .stats-table {
    filter: blur(8px);
    pointer-events: none;
    opacity: 0.6;
}

.overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    font-weight: bold;
    color: var(--color-text-primary);
    text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.stats-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
}

.stats-table th,
.stats-table td {
    padding: 8px 12px;
    text-align: left;
    border-bottom: 1px solid var(--color-border);
}

.stats-table th {
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    text-transform: uppercase;
}

.move-cell {
    font-weight: bold;
    color: var(--color-accent);
}

.text-success {
    color: #4caf50;
}

.text-danger {
    color: #f44336;
}

.stats-table tr:hover {
    background: rgba(255, 255, 255, 0.05);
}
</style>
