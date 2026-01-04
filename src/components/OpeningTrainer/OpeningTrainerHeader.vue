<script setup lang="ts">
defineProps<{
    openingName: string;
    eco?: string;
    averagePopularity: number;
    averageWinRate: number;
    averageRating: number;
    isTheoryOver: boolean;
    isDeviation: boolean;
    isReviewMode: boolean;
}>();

const emit = defineEmits<{
    (e: 'restart'): void;
    (e: 'hint'): void;
    (e: 'toggle-review'): void;
}>();
</script>

<template>
    <div class="opening-header">
        <h2 class="opening-name">
            <span v-if="eco" class="eco-code">{{ eco }}</span>
            {{ openingName || 'Searching theory...' }}
        </h2>

        <div class="status-badges">
            <div v-if="isTheoryOver" class="badge warning">Book Ended</div>
            <div v-if="isDeviation" class="badge error">Deviation</div>
        </div>

        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-label">Accuracy</span>
                <span class="stat-value">{{ averagePopularity }}%</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Win Rate</span>
                <span class="stat-value">{{ averageWinRate }}%</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Avg Rating</span>
                <span class="stat-value">{{ averageRating }}</span>
            </div>
        </div>

        <div class="controls-grid">
            <button class="btn" @click="emit('restart')">New Session</button>
            <button class="btn" @click="emit('hint')">Hint</button>
            <button class="btn" :class="{ 'active': isReviewMode }" @click="emit('toggle-review')">
                {{ isReviewMode ? 'Hide Theory' : 'Show Theory' }}
            </button>
        </div>
    </div>
</template>

<style scoped>
.opening-header {
    padding: 16px;
    background: var(--color-bg-secondary);
    border-radius: 12px;
    border: 1px solid var(--color-border-hover);
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.opening-name {
    margin: 0;
    font-size: 1.1rem;
    color: var(--color-text-primary);
    line-height: 1.4;
}

.eco-code {
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
    padding: 2px 6px;
    border-radius: 4px;
    margin-right: 6px;
    font-size: 0.9rem;
    font-weight: bold;
}

.status-badges {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: bold;
    text-transform: uppercase;
}

.badge.warning {
    background: #ff9800;
    color: white;
}

.badge.error {
    background: #f44336;
    color: white;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 12px;
    background: var(--color-bg-tertiary);
    border-radius: 8px;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.stat-label {
    font-size: 0.7rem;
    color: var(--color-text-secondary);
    margin-bottom: 4px;
}

.stat-value {
    font-size: 1rem;
    font-weight: bold;
    color: var(--color-accent);
}

.controls-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
}

.btn {
    padding: 8px 12px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9rem;
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    transition: all 0.2s;
}

.btn:hover {
    background: var(--color-border-hover);
    border-color: var(--color-text-secondary);
}

.btn.active {
    background: var(--color-accent);
    color: white;
    border-color: var(--color-accent);
}
</style>
