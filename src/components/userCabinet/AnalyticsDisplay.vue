<!-- src/components/userCabinet/AnalyticsDisplay.vue -->
<script setup lang="ts">
import { ref, computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import RadarChart from './sections/RadarChart.vue'
import StatsCard from './sections/StatsCard.vue'
import { getThemeTranslationKey } from '@/utils/theme-mapper'

const { t } = useI18n()

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

const sortKey = ref('rating')
const sortOrder = ref<'asc' | 'desc'>('desc')

const sortedStats = computed(() => {
  if (!props.stats || props.stats.length === 0) return []

  const statsArray = props.stats.map((data) => ({
    ...data,
    themeLabel: t('themes.' + getThemeTranslationKey(data.theme)),
    originalTheme: data.theme,
    solved: Math.round((data.attempts * data.accuracy) / 100),
  }))

  return [...statsArray].sort((a, b) => {
    const aTyped = a as Record<string, unknown>;
    const bTyped = b as Record<string, unknown>;
    const aValue = aTyped[sortKey.value] as number | string;
    const bValue = bTyped[sortKey.value] as number | string;
    if (aValue < bValue) return sortOrder.value === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
})

const chartDataForRadar = computed(() => {
  return sortedStats.value.map((s) => ({
    name: s.themeLabel,
    value: s.rating,
  }))
})
</script>

<template>
  <div class="analytics-display-container">
    <div v-if="!stats || stats.length === 0" class="no-data-box">
      <n-empty description="Нет данных для отображения." />
    </div>

    <div v-else>
      <n-card class="radar-card" :bordered="false">
        <RadarChart v-if="sortedStats.length > 0" :chart-data="chartDataForRadar"
          :dataset-label="t('userCabinet.analyticsTable.rating')" />
      </n-card>

      <div class="stats-grid-wrapper">
        <n-grid x-gap="12" y-gap="12" cols="2 m:4 l:5" responsive="screen">
          <n-grid-item v-for="stat in sortedStats" :key="stat.originalTheme">
            <StatsCard :title="stat.themeLabel" :rating="stat.rating" :accuracy="stat.accuracy" :solved="stat.solved"
              :attempted="stat.attempts" @click="emit('theme-click', stat.originalTheme)" />
          </n-grid-item>
        </n-grid>
      </div>
    </div>
  </div>
</template>

<style scoped>
.analytics-display-container {
  padding: 10px 0;
}

.radar-card {
  background-color: transparent;
  margin-bottom: 24px;
}

.stats-grid-wrapper {
  margin-top: 12px;
}

.no-data-box {
  padding: 40px;
  display: flex;
  justify-content: center;
}
</style>
