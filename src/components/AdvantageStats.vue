<!-- src/components/AdvantageStats.vue -->
<script setup lang="ts">
import { useAdvantageStore } from '@/stores/advantage.store'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const advantageStore = useAdvantageStore()
const { globalRating, puzzlesSolved } = storeToRefs(advantageStore)
const { t } = useI18n()
</script>

<template>
  <div class="advantage-stats-container">
    <h4 class="stats-title">{{ t('nav.advantage') }}</h4>
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-label">{{ t('advantage.stats.globalRating') }}</span>
        <span class="stat-value rating">{{ globalRating }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">{{ t('advantage.stats.puzzlesSolved') }}</span>
        <span class="stat-value solved">{{ puzzlesSolved }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.advantage-stats-container {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--panel-border-radius);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stats-title {
  margin: 0 0 10px 0;
  text-align: center;
  font-size: var(--font-size-large);
  color: var(--color-accent-primary);
  font-weight: var(--font-weight-bold);
  border-bottom: 1px solid var(--color-border-hover);
  padding-bottom: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-base);
  background-color: var(--color-bg-tertiary);
  padding: 5px 8px;
  border-radius: 4px;
}

.stat-label {
  color: var(--color-text-muted);
}

.stat-value {
  font-weight: bold;
}

.stat-value.rating {
  color: var(--color-accent-success);
}

.stat-value.solved {
  color: var(--color-accent-warning);
}
</style>
