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
    isAnalysisActive: boolean;
}>();

const emit = defineEmits<{
    (e: 'restart'): void;
    (e: 'hint'): void;
    (e: 'toggle-review'): void;
    (e: 'playout'): void;
    (e: 'toggle-analysis'): void;
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
            <div class="btn-group">
                <button class="btn" :class="{ 'active': isAnalysisActive }" @click="emit('toggle-analysis')">
                    Analysis
                </button>
                <button class="btn success" @click="emit('playout')">Playout</button>
            </div>
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
/* ... existing styles ... */
.controls-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
}

.btn-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 4px;
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

.btn.success {
    background: #4caf50;
    color: white;
    border-color: #4caf50;
}

.btn.success:hover {
    background: #43a047;
}
</style>
