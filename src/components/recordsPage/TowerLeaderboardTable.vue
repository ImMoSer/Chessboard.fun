<!-- src/components/recordsPage/TowerLeaderboardTable.vue -->
<script setup lang="ts">
import { h, type PropType } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { DataTableColumns } from 'naive-ui'
import type { TowerLeaderboardEntry, TowerId } from '@/types/api.types'
import InfoIcon from '../InfoIcon.vue'

type TowerLeaderboards = { [key in TowerId]?: TowerLeaderboardEntry[] }

const props = defineProps({
  title: { type: String, required: true },
  towerData: { type: Object as PropType<TowerLeaderboards>, required: true },
  colorClass: { type: String, required: true },
  infoTopic: { type: String, required: false },
})

const router = useRouter()
const { t } = useI18n()

const TOWER_DEFINITIONS: { id: TowerId; nameKey: string; color: string }[] = [
  { id: 'CM', nameKey: 'tower.names.CM', color: 'var(--color-accent-primary)' },
  { id: 'FM', nameKey: 'tower.names.FM', color: 'var(--color-accent-success)' },
  { id: 'IM', nameKey: 'tower.names.IM', color: 'var(--color-accent-warning)' },
  { id: 'GM', nameKey: 'tower.names.GM', color: 'var(--color-accent-error)' },
]

const tierToPieceMap: Record<string, string> = {
  Pawn: 'wP.svg', Knight: 'wN.svg', Bishop: 'wB.svg', Rook: 'wR.svg', Queen: 'wQ.svg', King: 'wK.svg',
}

const getSubscriptionIcon = (tier?: string) => {
  if (!tier || !tierToPieceMap[tier]) return null
  return `/piece/alpha/${tierToPieceMap[tier]}`
}

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const handleChallengeClick = (towerId?: string) => {
  if (towerId) router.push({ name: 'tower', params: { towerId } })
}

const columns: DataTableColumns<TowerLeaderboardEntry> = [
  { title: t('records.table.rank'), key: 'rank', align: 'center', width: 50 },
  {
    title: t('records.table.player'),
    key: 'username',
    render(row) {
      const icon = getSubscriptionIcon(row.subscriptionTier)
      return h('div', { style: { display: 'flex', alignItems: 'center' } }, [
        icon ? h('img', { src: icon, style: { height: '22px', marginRight: '6px' } }) : null,
        h('n-a', {
          href: `https://lichess.org/@/${row.lichess_id}`,
          target: '_blank',
          style: { fontWeight: 'bold' }
        }, row.username)
      ])
    }
  },
  { title: t('records.table.time'), key: 'best_time', align: 'right', render: (row) => formatTime(row.best_time) },
  { title: t('records.table.daysOld'), key: 'days_old', align: 'right', render: (row) => `${row.days_old}d` },
  {
    title: t('records.table.action'),
    key: 'action',
    align: 'center',
    render(row) {
      return h('n-button', {
        size: 'small',
        type: 'success',
        onClick: () => handleChallengeClick(row.tower_id)
      }, { default: () => t('records.table.challenge') })
    }
  }
]
</script>

<template>
  <div class="records-card" :class="colorClass">
    <div class="card-header main-header">
      <h3 class="card-title">
        {{ title }}
        <InfoIcon v-if="infoTopic" :topic="infoTopic" />
      </h3>
    </div>
    
    <div class="modes-container">
      <n-grid cols="1 s:2" x-gap="12" y-gap="12" responsive="screen">
        <n-grid-item v-for="towerDef in TOWER_DEFINITIONS" :key="towerDef.id">
          <div class="mode-table-wrapper">
            <div class="mode-header" :style="{ backgroundColor: towerDef.color }">
              {{ t(towerDef.nameKey) }}
            </div>
            <n-data-table
              :columns="columns"
              :data="towerData[towerDef.id] || []"
              :row-key="(row: TowerLeaderboardEntry) => row.tower_id + row.lichess_id"
              size="small"
              striped
              class="records-table"
              :max-height="300"
            />
          </div>
        </n-grid-item>
      </n-grid>
    </div>
  </div>
</template>

<style scoped>
.records-card {
  background-color: var(--color-bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--color-border-hover);
  overflow: hidden;
}

.main-header { padding: 10px; border-bottom: 1px solid var(--color-border-hover); }

.towerLeaderboard .main-header { background-color: var(--color-violett-lichess); }

.card-title {
  color: var(--color-bg-primary);
  font-size: var(--font-size-large);
  margin: 0;
  text-align: center;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.modes-container { padding: 12px; }

.mode-table-wrapper {
  border: 1px solid var(--color-border-hover);
  border-radius: 8px;
  overflow: hidden;
}

.mode-header {
  padding: 4px;
  text-align: center;
  font-weight: bold;
  color: var(--color-bg-primary);
}

.records-table {
  --n-td-color-striped: var(--color-bg-tertiary);
}

:deep(.n-data-table-th) {
  background-color: var(--color-bg-tertiary) !important;
  color: var(--color-text-muted) !important;
  font-family: var(--font-family-primary);
  font-size: var(--font-size-small);
}

:deep(.n-data-table-td) {
  font-family: var(--font-family-primary);
  font-size: var(--font-size-small);
}
</style>