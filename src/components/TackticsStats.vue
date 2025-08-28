<!-- src/components/TackticsStats.vue -->
<script setup lang="ts">
import { useTackticsStore } from '@/stores/tacktics.store'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import type { TacticalThemeStat } from '@/types/api.types'

const tackticsStore = useTackticsStore()
const { tacticalStats } = storeToRefs(tackticsStore)
const { t } = useI18n()

const sortedThemeStats = computed(() => {
  if (!tacticalStats.value) return []
  return Object.entries(tacticalStats.value.theme_stats).sort(
    ([, a], [, b]) => b.total_attempts - a.total_attempts,
  )
})

const getSuccessRate = (themeStat: TacticalThemeStat) => {
  if (themeStat.total_attempts > 0) {
    return `${((themeStat.solved / themeStat.total_attempts) * 100).toFixed(0)}%`
  }
  return '-'
}
</script>

<template>
  <div class="user-stats-container">
    <template v-if="tacticalStats">
      <h4 class="stats-title">{{ t('tacktics.stats.title') }}</h4>
      <div class="global-rating-box">
        <span class="global-rating-label">{{ t('tacktics.stats.globalRating') }}</span>
        <span class="global-rating-value">{{ tacticalStats.global_rating }}</span>
      </div>
      <div class="theme-stats-table-wrapper">
        <table class="theme-stats-table">
          <thead>
            <tr>
              <th>{{ t('tacktics.stats.theme') }}</th>
              <th>{{ t('tacktics.stats.rating') }}</th>
              <th>{{ t('tacktics.stats.progress') }}</th>
              <th>{{ t('tacktics.stats.rate') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="[theme, stats] in sortedThemeStats" :key="theme">
              <td class="theme-name">
                {{ t(`tacktics.themes.${theme}`) }}
              </td>
              <td class="theme-rating">{{ stats.rating }}</td>
              <td class="theme-progress">{{ stats.solved }}/{{ stats.total_attempts }}</td>
              <td class="theme-rate">{{ getSuccessRate(stats) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <div v-else class="loading-container">
      <p>{{ t('common.loading') }}</p>
    </div>
  </div>
</template>

<style scoped>
/* Styles adapted from tacktics.css */
.user-stats-container {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--panel-border-radius);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  box-sizing: border-box;
}
.stats-title {
  margin: 0 0 10px 0;
  text-align: center;
  font-size: var(--font-size-large);
  color: var(--color-accent-success);
  font-weight: var(--font-weight-bold);
  border-bottom: 1px solid var(--color-border-hover);
  padding-bottom: 8px;
  flex-shrink: 0;
}
.global-rating-box {
  background-color: var(--color-bg-tertiary);
  padding: 8px;
  border-radius: 6px;
  text-align: center;
  flex-shrink: 0;
}
.global-rating-label {
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
  display: block;
}
.global-rating-value {
  font-size: var(--font-size-xlarge);
  font-weight: bold;
  color: var(--color-accent-primary);
}
.theme-stats-table-wrapper {
  flex-grow: 1;
  overflow-y: auto;
  min-height: 0;
}
.theme-stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-small);
}
.theme-stats-table th,
.theme-stats-table td {
  padding: 6px 4px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}
.theme-stats-table th {
  color: var(--color-text-muted);
  position: sticky;
  top: 0;
  background-color: var(--color-bg-secondary);
}
.theme-stats-table .theme-name {
  font-weight: bold;
}
.theme-stats-table .theme-rating,
.theme-stats-table .theme-progress,
.theme-stats-table .theme-rate {
  text-align: right;
  white-space: nowrap;
}
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--color-text-muted);
}
</style>
