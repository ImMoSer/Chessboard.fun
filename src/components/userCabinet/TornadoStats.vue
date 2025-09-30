<!-- src/components/userCabinet/TornadoStats.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PropType } from 'vue'
import type { TimedModeStatsDto, TornadoMode, ModeStatsDto } from '@/types/api.types'

const { t } = useI18n()

const props = defineProps({
  stats: {
    type: Object as PropType<TimedModeStatsDto | null>,
    required: true,
  },
})

type SortKey = 'theme' | 'rating' | 'attempted' | 'accuracy'
type DisplayMode = TornadoMode | 'All'

const sortKey = ref<SortKey>('rating')
const sortOrder = ref<'asc' | 'desc'>('desc')

const availableModes = computed<TornadoMode[]>(() => {
  if (!props.stats) return []
  return Object.keys(props.stats).filter((mode) => {
    const modeStats = props.stats![mode as TornadoMode]
    return modeStats && Object.keys(modeStats).length > 0
  }) as TornadoMode[]
})

const displayModes = computed<DisplayMode[]>(() => ['All', ...availableModes.value])

const activeMode = ref<DisplayMode | null>(displayModes.value.length > 1 ? 'All' : availableModes.value[0] || null)

const summarizedStats = computed<ModeStatsDto>(() => {
  const summary: { [theme: string]: { rating: number; solved: number; attempted: number } } = {}
  if (!props.stats) return {}

  for (const mode of availableModes.value) {
    const modeStats = props.stats[mode]
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

const sortedStats = computed(() => {
  let statsForMode: ModeStatsDto | null = null

  if (activeMode.value === 'All') {
    statsForMode = summarizedStats.value
  } else if (props.stats && activeMode.value) {
    statsForMode = props.stats[activeMode.value as TornadoMode] ?? null
  }

  if (!statsForMode) return []

  const statsArray = Object.entries(statsForMode).map(([theme, data]) => ({
    theme,
    ...data,
  }))

  return [...statsArray].sort((a, b) => {
    let aValue: string | number, bValue: string | number

    if (sortKey.value === 'theme') {
      aValue = a.theme
      bValue = b.theme
    } else {
      aValue = a[sortKey.value]
      bValue = b[sortKey.value]
    }

    if (aValue < bValue) {
      return sortOrder.value === 'asc' ? -1 : 1
    }
    if (aValue > bValue) {
      return sortOrder.value === 'asc' ? 1 : -1
    }
    return 0
  })
})

function sortBy(key: SortKey) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'desc'
  }
}

function getSortIcon(key: SortKey) {
  if (sortKey.value !== key) return ''
  return sortOrder.value === 'desc' ? '▼' : '▲'
}
</script>

<template>
  <div class="stats-container">
    <div v-if="!stats || availableModes.length === 0" class="no-data-message">
      Нет данных для отображения.
    </div>
    <div v-else>
      <div class="sub-tabs-navigation">
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

      <div class="stats-table-container">
        <table class="stats-table">
          <thead>
            <tr>
              <th @click="sortBy('theme')">{{ t('userCabinet.analyticsTable.theme') }} {{ getSortIcon('theme') }}</th>
              <th @click="sortBy('rating')">{{ t('userCabinet.analyticsTable.rating') }} {{ getSortIcon('rating') }}</th>
              <th @click="sortBy('attempted')">{{ t('userCabinet.analyticsTable.solved_attempted') }} {{ getSortIcon('attempted') }}</th>
              <th @click="sortBy('accuracy')">{{ t('userCabinet.analyticsTable.accuracy_percent') }} {{ getSortIcon('accuracy') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stat in sortedStats" :key="stat.theme">
              <td>{{ t('themes.' + stat.theme) }}</td>
              <td class="rating-cell">{{ stat.rating }}</td>
              <td>{{ stat.solved }} / {{ stat.attempted }}</td>
              <td class="accuracy-cell">{{ stat.accuracy }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

.stats-table-container {
  overflow-x: auto;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-base);
}

.stats-table th,
.stats-table td {
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  text-align: center;
  white-space: nowrap;
}

.stats-table th {
  background-color: var(--color-bg-secondary);
  font-weight: bold;
  cursor: pointer;
  user-select: none;
}

.stats-table th:hover {
  background-color: var(--color-border-hover);
}

.stats-table td:first-child {
  text-align: left;
  font-weight: bold;
  white-space: normal;
}

.no-data-message {
  text-align: center;
  padding: 20px;
  font-size: var(--font-size-large);
  color: var(--color-text-muted);
}

.rating-cell {
  font-weight: bold;
  color: var(--color-accent-primary);
}

.accuracy-cell {
  font-weight: bold;
}
</style>
