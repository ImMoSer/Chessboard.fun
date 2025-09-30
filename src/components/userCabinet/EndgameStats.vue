<!-- src/components/userCabinet/EndgameStats.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PropType } from 'vue'
import type { UntimedModeStatsDto } from '@/types/api.types'

const { t } = useI18n()

const props = defineProps({
  stats: {
    type: Object as PropType<UntimedModeStatsDto | null>,
    required: true,
  },
})

type SortKey = 'theme' | 'rating' | 'attempted' | 'accuracy'

const sortKey = ref<SortKey>('rating')
const sortOrder = ref<'asc' | 'desc'>('desc')

const sortedStats = computed(() => {
  if (!props.stats) return []

  const statsArray = Object.entries(props.stats).map(([theme, data]) => ({
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
    <div v-if="!stats || Object.keys(stats).length === 0" class="no-data-message">
      Нет данных для отображения.
    </div>
    <div v-else class="stats-table-container">
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
                  </tbody>      </table>
    </div>
  </div>
</template>

<style scoped>
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
