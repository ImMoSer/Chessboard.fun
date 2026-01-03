<!-- src/components/recordsPage/TornadoLeaderboardTable.vue -->
<script setup lang="ts">
import { h, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DataTableColumns } from 'naive-ui'
import type { TornadoLeaderboardEntry, TornadoMode } from '@/types/api.types'
import InfoIcon from '../InfoIcon.vue'

type TornadoLeaderboards = { [key in TornadoMode]?: TornadoLeaderboardEntry[] }

const props = defineProps({
  title: { type: String, required: true },
  tornadoData: { type: Object as PropType<TornadoLeaderboards>, required: true },
  colorClass: { type: String, required: true },
  infoTopic: { type: String, required: false },
})

const { t } = useI18n()

const TORNADO_DEFINITIONS: { id: TornadoMode; name: string; color: string }[] = [
  { id: 'bullet', name: 'Bullet', color: 'var(--color-accent-primary)' },
  { id: 'blitz', name: 'Blitz', color: 'var(--color-accent-success)' },
  { id: 'rapid', name: 'Rapid', color: 'var(--color-accent-warning)' },
  { id: 'classic', name: 'Classic', color: 'var(--color-accent-error)' },
]

const tierToPieceMap: Record<string, string> = {
  Pawn: 'wP.svg', Knight: 'wN.svg', Bishop: 'wB.svg', Rook: 'wR.svg', Queen: 'wQ.svg', King: 'wK.svg',
}

const getSubscriptionIcon = (tier?: string) => {
  if (!tier || !tierToPieceMap[tier]) return null
  return `/piece/alpha/${tierToPieceMap[tier]}`
}

const columns: DataTableColumns<TornadoLeaderboardEntry> = [
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
  { title: t('tornado.leaderboard.highScore'), key: 'highScore', align: 'right' },
  { title: t('records.table.daysOld'), key: 'days_old', align: 'right', render: (row) => `${row.days_old}d` }
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
        <n-grid-item v-for="modeDef in TORNADO_DEFINITIONS" :key="modeDef.id">
          <div class="mode-table-wrapper">
            <div class="mode-header" :style="{ backgroundColor: modeDef.color }">
              {{ modeDef.name }}
            </div>
            <n-data-table
              :columns="columns"
              :data="tornadoData[modeDef.id] || []"
              :row-key="(row: TornadoLeaderboardEntry) => row.lichess_id"
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

.tornadoLeaderboard .main-header { background-color: var(--color-accent-error-hover); }

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