<!-- src/components/userCabinet/AnalyticsDisplay.vue -->
<script setup lang="ts">
import { ref, computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import RadarChart from './sections/RadarChart.vue'
import StatsCard from './sections/StatsCard.vue'
import { getThemeTranslationKey } from '@/utils/theme-mapper'

const { t } = useI18n()

// Define emits
const emit = defineEmits<{
  (e: 'theme-click', theme: string): void
}>()

export interface ThemeDisplayStat {
  theme: string
  rating: number
  attempts: number
  accuracy: number
}

const props = defineProps({
  stats: {
    type: Array as PropType<ThemeDisplayStat[]>,
    default: () => [],
  },
})

type SortKey = 'theme' | 'rating' | 'attempts' | 'accuracy'

const sortKey = ref<SortKey>('rating')
const sortOrder = ref<'asc' | 'desc'>('desc')

const sortedStats = computed(() => {
  if (!props.stats || props.stats.length === 0) return []

  const statsArray = props.stats.map((data) => ({
    ...data,
    theme: getThemeTranslationKey(data.theme),
    originalTheme: data.theme,
    solved: Math.round((data.attempts * data.accuracy) / 100),
  }))

  return [...statsArray].sort((a, b) => {
    let aValue: string | number, bValue: string | number
    if (sortKey.value === 'theme') {
      aValue = t('themes.' + a.theme)
      bValue = t('themes.' + b.theme)
    } else {
      aValue = a[sortKey.value]
      bValue = b[sortKey.value]
    }

    if (aValue < bValue) return sortOrder.value === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
})

const chartDataForRadar = computed(() => {
  return sortedStats.value.map((s) => ({
    name: t('themes.' + s.theme, s.theme),
    value: s.rating,
  }))
})

const datasetLabel = computed(() => `Рейтинг`)
</script>

<template>
  <div class="analytics-display-container">
    <div v-if="!stats || stats.length === 0" class="no-data-message">
      Нет данных для отображения.
    </div>
    <div v-else>
      <RadarChart
        v-if="sortedStats.length > 0"
        :chart-data="chartDataForRadar"
        :dataset-label="datasetLabel"
      />

      <div class="card-grid">
        <StatsCard
          v-for="stat in sortedStats"
          :key="stat.theme"
          :title="t('themes.' + stat.theme, stat.theme)"
          :rating="stat.rating"
          :accuracy="stat.accuracy"
          :solved="stat.solved"
          :attempted="stat.attempts"
          @click="emit('theme-click', stat.originalTheme)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.analytics-display-container {
  padding: 10px 0;
}

.no-data-message {
  text-align: center;
  padding: 20px;
  font-size: var(--font-size-large);
  color: var(--color-text-muted);
}

.card-grid {
  display: grid;
  gap: 15px;
  /* Default for mobile (portrait) - 2 columns */
  grid-template-columns: repeat(2, 1fr);
}

@media (min-width: 768px) {
  /* Adjust breakpoint as needed for landscape/desktop */
  .card-grid {
    /* For landscape/desktop - 5 columns */
    grid-template-columns: repeat(5, 1fr);
  }
}
</style>
