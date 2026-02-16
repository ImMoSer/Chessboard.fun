<!-- src/components/recordsPage/TimedModeLeaderboardTable.vue -->
<script setup lang="ts">
import type {
    AdvantageLeaderboardEntry,
    TornadoLeaderboardEntry,
    TornadoMode,
} from '@/types/api.types'
import type { DataTableColumns } from 'naive-ui'
import { computed, h, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import InfoIcon from '../InfoIcon.vue'

type TimedLeaderboards = {
  [key in TornadoMode]?: (TornadoLeaderboardEntry | AdvantageLeaderboardEntry)[]
}

const props = defineProps({
  title: { type: String, required: true },
  data: { type: Object as PropType<TimedLeaderboards>, required: true },
  colorClass: { type: String, required: true },
  infoTopic: { type: String, required: false },
  mode: { type: String as PropType<'tornado' | 'advantage'>, required: true },
})

const { t } = useI18n()

const MODE_DEFINITIONS: { id: TornadoMode; name: string; color: string; icon: string }[] = [
  { id: 'bullet', name: 'Bullet', color: 'var(--color-accent-primary)', icon: '⚡' },
  { id: 'blitz', name: 'Blitz', color: 'var(--color-accent-success)', icon: '🔥' },
  { id: 'rapid', name: 'Rapid', color: 'var(--color-accent-warning)', icon: '🕒' },
  { id: 'classic', name: 'Classic', color: 'var(--color-accent-error)', icon: '🐢' },
]

const tierToPieceMap: Record<string, string> = {
  Pawn: 'wP.svg',
  Knight: 'wN.svg',
  Bishop: 'wB.svg',
  Rook: 'wR.svg',
  Queen: 'wQ.svg',
  King: 'wK.svg',
}

const getSubscriptionIcon = (tier?: string) => {
  if (!tier || !tierToPieceMap[tier]) return null
  return `/piece/alpha/${tierToPieceMap[tier]}`
}

const columns = computed<DataTableColumns<TornadoLeaderboardEntry | AdvantageLeaderboardEntry>>(
  () => [
    { title: t('records.table.rank'), key: 'rank', align: 'center', width: 45 },
    {
      title: t('records.table.player'),
      key: 'username',
      minWidth: 160,
      ellipsis: { tooltip: true },
      render(row) {
        const icon = getSubscriptionIcon(row.subscriptionTier)
        return h('div', { style: { display: 'flex', alignItems: 'center' } }, [
          icon ? h('img', { src: icon, style: { height: '22px', marginRight: '6px' } }) : null,
          h(
            'n-a',
            {
              href: `https://lichess.org/@/${row.lichess_id}`,
              target: '_blank',
              style: { fontWeight: 'bold' },
            },
            row.username,
          ),
        ])
      },
    },
    {
      title:
        props.mode === 'tornado' ? t('tornado.leaderboard.highScore') : t('records.table.score'),
      key: props.mode === 'tornado' ? 'highScore' : 'score',
      align: 'right',
      render(row) {
        const val =
          props.mode === 'tornado'
            ? (row as TornadoLeaderboardEntry).highScore
            : (row as AdvantageLeaderboardEntry).score
        return h('span', { class: 'mode-score-value' }, val)
      },
    },
    {
      title: t('records.table.daysOld'),
      key: 'days_old',
      align: 'right',
      render: (row) => `${row.days_old}d`,
    },
  ],
)
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
      <n-tabs type="segment" animated>
        <n-tab-pane v-for="modeDef in MODE_DEFINITIONS" :key="modeDef.id" :name="modeDef.id">
          <template #tab>
            <div class="tab-label">
              <span class="tab-icon">{{ modeDef.icon }}</span>
              <span class="tab-name">{{ modeDef.name }}</span>
            </div>
          </template>
          <div class="mode-table-wrapper">
            <n-data-table
              :columns="columns"
              :data="data[modeDef.id] || []"
              :row-key="(row: any) => row.lichess_id"
              size="small"
              striped
              class="records-table"
              :max-height="400"
            />
          </div>
        </n-tab-pane>
      </n-tabs>
    </div>
  </div>
</template>

<style scoped>
.records-card {
  background-color: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--glass-border);
  overflow: hidden;
  margin-bottom: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.main-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.03);
}

.tornadoLeaderboard .card-title { color: var(--color-neon-orange); }
.advantageLeaderboard .card-title { color: var(--color-neon-purple); }

.card-title {
  font-size: 1.4rem;
  margin: 0;
  text-align: center;
  font-weight: 800;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.modes-container {
  padding: 12px;
}

.mode-table-wrapper {
  margin-top: 16px;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.2);
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mode-score-value {
  font-weight: bold;
  color: var(--color-accent-warning);
  font-family: monospace;
  font-size: 1.1em;
}

.records-table {
  --n-td-color-striped: rgba(255, 255, 255, 0.035);
}

:deep(.n-data-table-th) {
  background-color: rgba(255, 255, 255, 0.05) !important;
  color: var(--color-text-muted) !important;
  font-family: var(--font-family-primary);
  font-size: 0.95rem;
  white-space: nowrap;
}

:deep(.n-data-table-td) {
  font-family: var(--font-family-primary);
  font-size: 1rem;
  padding: 10px 8px !important;
}

:deep(.n-tabs-tab) {
  font-family: var(--font-family-primary);
}
</style>
