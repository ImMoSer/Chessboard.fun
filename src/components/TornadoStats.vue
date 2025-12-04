<!-- src/components/TornadoStats.vue -->
<script setup lang="ts">
import { useTornadoStore } from '@/stores/tornado.store'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const tornadoStore = useTornadoStore()
const { themeRatings } = storeToRefs(tornadoStore)
const { t } = useI18n()

const tacticalThemes = [
  'mate',
  'fork',
  'attackTheKing',
  'sacrifice',
  'endgame',
  'pin',
  'attraction',
  'discoveredAttack',
  'advancedPawn',
  'deflection',
  'defensiveMove',
  'skewer',
  'promotion',
  'hangingPiece',
  'trappedPiece',
  'quietMove',
  'clearance',
  'intermezzo',
  'capturingDefender',
  'doubleCheck',
  'backRankMate',
  'interference',
  'xRayAttack',
  'zugzwang',
]

const sortedThemeStats = computed(() => {
  if (!themeRatings.value) {
    // Возвращаем мок-данные, если реальных нет
    return tacticalThemes.map((theme) => ({
      theme,
      rating: 1000,
    }))
  }
  return Object.entries(themeRatings.value)
    .map(([theme, stats]) => ({ theme, rating: Math.round(stats.rating) }))
    .sort((a, b) => b.rating - a.rating)
})
</script>

<template>
  <div class="stats-container">
    <h4 class="stats-title">{{ t('tornado.stats.title') }}</h4>
    <div class="theme-stats-table-wrapper">
      <table class="theme-stats-table">
        <thead>
          <tr>
            <th>{{ t('tornado.stats.theme') }}</th>
            <th>{{ t('tornado.stats.rating') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in sortedThemeStats" :key="item.theme">
            <td class="theme-name">{{ item.theme }}</td>
            <td class="theme-rating">{{ item.rating }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.stats-container {
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

.theme-name {
  font-weight: bold;
}

.theme-rating {
  text-align: right;
  white-space: nowrap;
  font-weight: bold;
  color: var(--color-accent-primary);
}
</style>
