<!-- src/components/userCabinet/sections/GlobalActivityStats.vue -->
<script setup lang="ts">
import { h, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useUserCabinetStore, type ActivityPeriod } from '@/stores/userCabinet.store'
import type { DataTableColumns } from 'naive-ui'

const { t } = useI18n()
const userCabinetStore = useUserCabinetStore()
const {
  personalActivityStats,
  isPersonalActivityStatsLoading,
  selectedActivityPeriod,
} = storeToRefs(userCabinetStore)

interface ActivityRow {
  mode: 'advantage' | 'tornado'
  requested: number
  solved: number
  skill: number
}

const columns: DataTableColumns<ActivityRow> = [
  {
    title: t('userCabinet.stats.modes.all'),
    key: 'mode',
    render(row) {
      const label = row.mode === 'tornado'
        ? t('nav.tornado')
        : t('nav.finishHim')
      return h('span', { style: { fontWeight: 'bold' } }, label)
    }
  },
  { title: t('records.table.requested'), key: 'requested', align: 'center' },
  { title: t('records.table.solved'), key: 'solved', align: 'center' },
  {
    title: t('records.table.totalSkill'),
    key: 'skill',
    align: 'right',
    render(row) {
      return h('span', { style: { fontWeight: 'bold', color: 'var(--color-accent-success)' } }, row.skill)
    }
  }
]

const tableData = computed(() => {
  if (!personalActivityStats.value) return []
  const periodData = personalActivityStats.value[selectedActivityPeriod.value]
  return (['advantage', 'tornado'] as const).map(mode => ({
    mode,
    requested: periodData[mode].puzzles_requested,
    solved: periodData[mode].puzzles_solved,
    skill: periodData[mode].skill_value
  }))
})

const handlePeriodChange = (period: string) => {
  userCabinetStore.setSelectedActivityPeriod(period as ActivityPeriod)
}
</script>

<template>
  <n-card class="activity-card">
    <template #header>
      <span class="card-header-text">{{ t('userCabinet.stats.global.title') }}</span>
    </template>

    <n-tabs type="segment" :value="selectedActivityPeriod" @update:value="handlePeriodChange" class="activity-tabs">
      <n-tab-pane name="daily" :tab="t('userCabinet.stats.periods.day')" />
      <n-tab-pane name="weekly" :tab="t('userCabinet.stats.periods.week')" />
      <n-tab-pane name="monthly" :tab="t('userCabinet.stats.periods.month')" />
    </n-tabs>

    <n-data-table :loading="isPersonalActivityStatsLoading" :columns="columns" :data="tableData"
      :row-key="(row: ActivityRow) => row.mode" striped class="activity-table" />
  </n-card>
</template>

<style scoped>
.activity-card {
  background-color: var(--color-bg-tertiary);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.card-header-text {
  font-family: var(--font-family-primary);
  color: var(--color-accent-success);
  font-size: var(--font-size-large);
  font-weight: bold;
}

.activity-tabs {
  margin-bottom: 16px;
}

.activity-table {
  --n-td-color-striped: var(--color-bg-secondary);
}

:deep(.n-data-table-th) {
  background-color: var(--color-bg-secondary) !important;
  font-family: var(--font-family-primary);
}

:deep(.n-data-table-td) {
  font-family: var(--font-family-primary);
  font-size: var(--font-size-base);
}
</style>
