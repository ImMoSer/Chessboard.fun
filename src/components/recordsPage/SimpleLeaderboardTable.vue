<!-- src/components/recordsPage/SimpleLeaderboardTable.vue -->
<script setup lang="ts">
import { h, type PropType } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { DataTableColumns } from 'naive-ui'
import type { FinishHimLeaderboardEntry } from '@/types/api.types'
import InfoIcon from '../InfoIcon.vue'

const props = defineProps({
  title: { type: String, required: true },
  entries: { type: Array as PropType<FinishHimLeaderboardEntry[]>, required: true },
  mode: { type: String as PropType<'finish-him'>, required: true },
  colorClass: { type: String, required: true },
  infoTopic: { type: String, required: false },
})

const router = useRouter()
const { t } = useI18n()

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

const handleChallengeClick = (puzzleId?: string) => {
  if (puzzleId) router.push({ name: props.mode, params: { puzzleId } })
}

const columns: DataTableColumns<FinishHimLeaderboardEntry> = [
  { title: t('records.table.rank'), key: 'rank', align: 'center', width: 60 },
  {
    title: t('records.table.player'),
    key: 'username',
    render(row) {
      const icon = getSubscriptionIcon(row.subscriptionTier)
      return h('div', { style: { display: 'flex', alignItems: 'center' } }, [
        icon ? h('img', { src: icon, style: { height: '24px', marginRight: '8px' } }) : null,
        h('n-a', {
          href: `https://lichess.org/@/${row.lichess_id}`,
          target: '_blank',
          style: { fontWeight: 'bold' }
        }, row.username)
      ])
    }
  },
  {
    title: t('records.table.time'),
    key: 'best_time',
    align: 'right',
    render: (row) => formatTime(row.best_time)
  },
  {
    title: t('records.table.daysOld'),
    key: 'days_old',
    align: 'right',
    render: (row) => `${row.days_old}d`
  },
  {
    title: t('records.table.action'),
    key: 'action',
    align: 'center',
    render(row) {
      return h('n-button', {
        size: 'small',
        type: 'success',
        onClick: () => handleChallengeClick(row.puzzle_id)
      }, { default: () => t('records.table.challenge') })
    }
  }
]
</script>

<template>
  <div class="records-card" :class="colorClass">
    <div class="card-header">
      <h3 class="card-title">
        {{ title }}
        <InfoIcon v-if="infoTopic" :topic="infoTopic" />
      </h3>
    </div>
    <n-data-table
      :columns="columns"
      :data="entries"
      :row-key="(row: FinishHimLeaderboardEntry) => row.puzzle_id + row.lichess_id"
      size="small"
      striped
      class="records-table"
    />
  </div>
</template>

<style scoped>
.records-card {
  background-color: var(--color-bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--color-border-hover);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.card-header {
  padding: 10px;
  border-bottom: 1px solid var(--color-border-hover);
}

.finishHimLeaderboard .card-header { background-color: var(--color-accent-secondary); }

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

.records-table {
  --n-td-color-striped: var(--color-bg-tertiary);
}

:deep(.n-data-table-th) {
  background-color: var(--color-bg-tertiary) !important;
  color: var(--color-text-muted) !important;
  font-family: var(--font-family-primary);
}

:deep(.n-data-table-td) {
  font-family: var(--font-family-primary);
  font-size: var(--font-size-base);
}
</style>
