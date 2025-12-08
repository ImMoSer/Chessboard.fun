<!-- src/components/userCabinet/AnalyticsDisplay.vue -->
<script setup lang="ts">
import { ref, computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TimedModeStatsDto, UntimedModeStatsDto, ModeStatsDto, TornadoMode, AdvantageMode } from '@/types/api.types'
import RadarChart from './sections/RadarChart.vue'
import StatsCard from './sections/StatsCard.vue'
import { getThemeTranslationKey } from '@/utils/theme-mapper'

const { t } = useI18n()

// Define emits
const emit = defineEmits<{
  (e: 'theme-click', theme: string): void
}>()

type AllStats = TimedModeStatsDto | UntimedModeStatsDto

const props = defineProps({
  stats: {
    type: Object as PropType<AllStats | null>,
    required: true,
  },
  isTimed: {
    type: Boolean,
    default: false,
  },
})

type SortKey = 'theme' | 'rating' | 'attempted' | 'accuracy'
type DisplayMode = TornadoMode | AdvantageMode | 'All'

const sortKey = ref<SortKey>('rating')
const sortOrder = ref<'asc' | 'desc'>('desc')

const availableModes = computed<Array<TornadoMode | AdvantageMode>>(() => {
  if (!props.stats || !props.isTimed) return []
  const timedStats = props.stats as TimedModeStatsDto
  return Object.keys(timedStats).filter((mode) => {
    const modeStats = timedStats[mode as keyof TimedModeStatsDto]
    return modeStats && Object.keys(modeStats).length > 0
  }) as Array<TornadoMode | AdvantageMode>
})

const displayModes = computed<DisplayMode[]>(() =>
  props.isTimed ? ['All', ...availableModes.value] : []
)

const activeMode = ref<DisplayMode | null>(
  props.isTimed ? (displayModes.value.length > 1 ? 'All' : availableModes.value[0] || null) : null
)

const summarizedStats = computed<ModeStatsDto>(() => {
  const summary: { [theme: string]: { rating: number; solved: number; attempted: number } } = {}
  if (!props.stats || !props.isTimed) return {}
  const timedStats = props.stats as TimedModeStatsDto

  for (const mode of availableModes.value) {
    const modeStats = timedStats[mode]
    if (!modeStats) continue

    for (const theme in modeStats) {
      if (Object.prototype.hasOwnProperty.call(modeStats, theme)) {
        const themeStats = modeStats[theme]
        if (!themeStats) continue

        if (!summary[theme]) {
          summary[theme] = { rating: 0, solved: 0, attempted: 0 }
        }
        const summaryTheme = summary[theme]!
        summaryTheme.solved += themeStats.solved
        summaryTheme.attempted += themeStats.attempted
        summaryTheme.rating = Math.max(summaryTheme.rating, themeStats.rating)
      }
    }
  }

  const finalSummary: ModeStatsDto = {}
  for (const theme in summary) {
    const themeSummary = summary[theme]
    if (themeSummary) {
      finalSummary[theme] = {
        ...themeSummary,
        accuracy:
          themeSummary.attempted > 0
            ? Math.round((themeSummary.solved / themeSummary.attempted) * 100)
            : 0,
      }
      if (finalSummary[theme]!.rating === 0) {
        finalSummary[theme]!.rating = 1200
      }
    }
  }
  return finalSummary
})

const currentStats = computed<ModeStatsDto | null>(() => {
  if (!props.stats) return null
  if (!props.isTimed) return props.stats as UntimedModeStatsDto

  const timedStats = props.stats as TimedModeStatsDto
  if (activeMode.value === 'All') {
    return summarizedStats.value
  } else if (activeMode.value) {
    return timedStats[activeMode.value as keyof TimedModeStatsDto] ?? null
  }
  return null
})

const sortedStats = computed(() => {
  if (!currentStats.value) return []

  const statsArray = Object.entries(currentStats.value).map(([theme, data]) => ({
    theme: getThemeTranslationKey(theme),
    originalTheme: theme,
    ...data,
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
  return sortedStats.value.map(s => ({
    name: t('themes.' + s.theme, s.theme),
    value: s.rating,
  }));
});

const datasetLabel = computed(() => `Рейтинг (${activeMode.value || ''})`);

function sortBy(key: SortKey) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'desc'
  }
}
</script>

<template>
  <div class="analytics-display-container">
    <div v-if="!stats || Object.keys(stats).length === 0" class="no-data-message">
      Нет данных для отображения.
    </div>
    <div v-else>
      <div v-if="isTimed" class="sub-tabs-navigation">
        <button
          v-for="mode in displayModes"
          :key="mode"
          class="sub-tab-button"
          :class="{ active: activeMode === mode }"
          @click="activeMode = mode"
        >
          {{ mode }}
        </button>
      </div>

      <RadarChart v-if="sortedStats.length > 0" :chart-data="chartDataForRadar" :dataset-label="datasetLabel" />

      <div class="card-grid">
        <StatsCard
          v-for="stat in sortedStats"
          :key="stat.theme"
          :title="t('themes.' + stat.theme, stat.theme)"
          :rating="stat.rating"
          :accuracy="stat.accuracy"
          :solved="stat.solved"
          :attempted="stat.attempted"
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

.sub-tabs-navigation {
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  margin-bottom: 15px;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 10px;
}

.sub-tab-button {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-muted);
  font-family: var(--font-family-primary);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: capitalize;
}

.sub-tab-button:hover {
  background-color: var(--color-border-hover);
  color: var(--color-text-default);
}

.sub-tab-button.active {
  background-color: var(--color-accent-secondary);
  color: var(--color-text-dark);
  font-weight: bold;
}

.card-grid {
  display: grid;
  gap: 15px;
  /* Default for mobile (portrait) - 2 columns */
  grid-template-columns: repeat(2, 1fr);
}

@media (min-width: 768px) { /* Adjust breakpoint as needed for landscape/desktop */
  .card-grid {
    /* For landscape/desktop - 5 columns */
    grid-template-columns: repeat(5, 1fr);
  }
}
</style>
