<!-- src/components/clubPage/ClubStatsTable.vue -->
<script setup lang="ts">
import { h, computed, type PropType } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import type { TeamBattlePlayerSummary } from '../../types/api.types'

interface TableColumnConfig {
  key: keyof TeamBattlePlayerSummary
  label: string
  class?: string
}

const props = defineProps({
  title: { type: String, required: true },
  players: { type: Array as PropType<TeamBattlePlayerSummary[]>, required: true },
  columns: { type: Array as PropType<TableColumnConfig[]>, required: true },
  sortKey: { type: String as PropType<keyof TeamBattlePlayerSummary>, required: true },
  titleColorClass: { type: String, default: 'title-color-primary' },
  infoTopic: { type: String, default: '' },
})

// Преобразуем входящие конфиги колонок в формат Naive UI
const nColumns = computed<DataTableColumns<TeamBattlePlayerSummary>>(() => {
  return props.columns.map(col => ({
    title: col.label,
    key: col.key as string,
    align: col.class?.includes('text-right') ? 'right' : (col.class?.includes('text-center') ? 'center' : 'left'),
    render(row) {
      const value = row[col.key]

      // Специфическая отрисовка для имени пользователя
      if (col.key === 'username') {
        return h('a', {
          href: `https://lichess.org/@/${row.lichess_id}`,
          target: '_blank',
          style: { color: 'var(--color-text-link)', textDecoration: 'none' }
        }, value as string)
      }

      // Специфическая отрисовка для VECTOR (делаем жирным)
      if (col.key === 'vector') {
        return h('span', { style: { fontWeight: 'bold', color: 'var(--color-accent-warning)' } }, value as number)
      }

      return value as string | number
    }
  }))
})

// Сортируем данные перед передачей в таблицу
const sortedData = computed(() => {
  return [...props.players].sort((a, b) => {
    const valA = a[props.sortKey] ?? 0
    const valB = b[props.sortKey] ?? 0
    if (typeof valA === 'number' && typeof valB === 'number') return valB - valA
    return String(valB).localeCompare(String(valA))
  })
})
</script>

<template>
  <div class="stats-card">
    <div class="card-header" :class="titleColorClass">
      <div class="header-content">
        <n-h3 class="card-title">{{ title }}</n-h3>
        <info-icon v-if="infoTopic" :topic="infoTopic" base-path="info.club." color="white" />
      </div>
    </div>
    <n-data-table :columns="nColumns" :data="sortedData" :row-key="(row: TeamBattlePlayerSummary) => row.lichess_id"
      size="small" striped class="stats-table" :max-height="400" />
  </div>
</template>

<style scoped>
.stats-card {
  background-color: var(--color-bg-tertiary);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.card-header {
  padding: 10px 16px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  margin: 0;
  color: white;
  font-family: var(--font-family-primary);
  font-size: var(--font-size-large);
}

/* Цвета заголовков из оригинального CSS */
.title-color-primary {
  background-color: var(--color-accent-primary);
}

.title-color-secondary {
  background-color: var(--color-accent-secondary);
}

.title-color-violet {
  background-color: var(--color-violett-lichess);
}

.stats-table {
  flex: 1;
  --n-td-color-striped: var(--color-bg-secondary);
}

:deep(.n-data-table-th) {
  background-color: var(--color-bg-secondary) !important;
  font-family: var(--font-family-primary);
  font-size: var(--font-size-small);
}

:deep(.n-data-table-td) {
  font-family: var(--font-family-primary);
  font-size: var(--font-size-small);
}
</style>
