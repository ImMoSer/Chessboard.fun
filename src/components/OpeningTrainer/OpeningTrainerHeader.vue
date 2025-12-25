<script setup lang="ts">
defineProps<{
    openingName: string;
    totalScore: number;
    isTheoryOver: boolean;
    isDeviation: boolean;
}>();
</script>

<template>
    <div class="opening-header">
        <div class="main-info">
            <h2 class="opening-name">{{ openingName || 'Searching theory...' }}</h2>
            <div class="stats-badges">
                <div class="badge score">Score: {{ totalScore }}</div>
                <div v-if="isTheoryOver" class="badge warning">Book Ended</div>
                <div v-if="isDeviation" class="badge error">Deviation</div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.opening-header {
    padding: 15px;
    background: var(--color-bg-secondary);
    border-radius: 12px;
    border: 1px solid var(--color-border-hover);
    margin-bottom: 15px;
}

.opening-name {
    margin: 0;
    font-size: 1.25rem;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.stats-badges {
    display: flex;
    gap: 10px;
    margin-top: 8px;
}

.badge {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: bold;
}

.badge.score {
    background: var(--color-accent);
    color: white;
}

.badge.warning {
    background: #ff9800;
    color: white;
}

.badge.error {
    background: #f44336;
    color: white;
}
</style>
