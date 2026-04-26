<!-- src/components/recordsPage/TimedModeLeaderboardTable.vue -->
<script setup lang="ts">
import type {
    FinishHimLeaderboardEntry,
    TornadoLeaderboardEntry,
    TornadoMode,
} from '@/shared/types/api.types'
import type { DataTableColumns } from 'naive-ui'
import { computed, h, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTornadoLeaderboardsQuery } from '@/shared/api/queries/leaderboard.queries'

type TimedLeaderboards = {
  [key in TornadoMode]?: (TornadoLeaderboardEntry | FinishHimLeaderboardEntry)[]
}

const props = defineProps({
  title: { type: String, required: true },
  data: { type: Object as PropType<TimedLeaderboards>, required: false },
  colorClass: { type: String, required: true },
  mode: { type: String as PropType<'tornado' | 'finish_him'>, required: true },
})

const { t } = useI18n()

// Fetch independently if mode is tornado
const { data: tornadoApiData, isLoading: isTornadoLoading } = useTornadoLeaderboardsQuery(props.mode === 'tornado')

const effectiveData = computed(() => {
  if (props.mode === 'tornado' && tornadoApiData.value) {
    return tornadoApiData.value
  }
  return props.data || {}
})

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

const columns = computed<DataTableColumns<TornadoLeaderboardEntry | FinishHimLeaderboardEntry>>(
  () => {
    const baseCols: DataTableColumns<TornadoLeaderboardEntry | FinishHimLeaderboardEntry> = [
      { 
        title: '#', 
        key: 'rank', 
        align: 'center', 
        width: 45,
        render: (_, index) => index + 1
      },
      {
        title: t('features.leaderboards.table.player'),
        key: 'username',
        minWidth: 140,
        ellipsis: { tooltip: true },
        render(row) {
          const tier = ('tier' in row ? row.tier : row.subscriptionTier) || 'Pawn'
          const id = 'id' in row ? row.id : row.lichess_id
          const icon = getSubscriptionIcon(tier)
          return h('div', { style: { display: 'flex', alignItems: 'center' } }, [
            icon ? h('img', { src: icon, style: { height: '20px', marginRight: '6px' } }) : null,
            h(
              'n-a',
              {
                href: `https://lichess.org/@/${id}`,
                target: '_blank',
                style: { fontWeight: 'bold' },
              },
              row.username,
            ),
          ])
        },
      },
      {
        title: props.mode === 'tornado' ? t('features.tornado.leaderboard.highScore') : t('features.leaderboards.table.score'),
        key: props.mode === 'tornado' ? 'highScore' : 'best_time',
        align: 'right',
        render(row) {
          const val = props.mode === 'tornado'
            ? (row as TornadoLeaderboardEntry).highScore
            : (row as FinishHimLeaderboardEntry).best_time
          return h('span', { class: 'mode-score-value' }, val)
        },
      }
    ]

    if (props.mode === 'tornado') {
      baseCols.push(
        {
          title: t('features.leaderboards.table.solved'),
          key: 'solved',
          align: 'right',
          width: 70,
          render: (row) => (row as TornadoLeaderboardEntry).solved
        },
        {
          title: t('features.leaderboards.table.failed'),
          key: 'failed',
          align: 'right',
          width: 70,
          render: (row) => (row as TornadoLeaderboardEntry).failed
        },
        {
          title: '%',
          key: 'accuracy',
          align: 'right',
          width: 70,
          render(row) {
            const r = row as TornadoLeaderboardEntry
            const total = r.solved + r.failed
            if (total === 0) return '-'
            const acc = (r.solved / total) * 100
            return h('span', { style: { color: acc > 70 ? 'var(--color-accent-success)' : 'var(--color-accent-error)' } }, 
              `${acc.toFixed(1)}%`
            )
          }
        }
      )
    }

    return baseCols
  }
)
</script>

<template>
  <div class="records-card" :class="colorClass">
    <div class="card-header main-header">
      <h3 class="card-title">
        {{ title }}
      </h3>
    </div>

    <div class="modes-container">
      <div v-if="isTornadoLoading && mode === 'tornado'" class="loading-wrapper">
        <n-spin size="large" />
      </div>
      <n-tabs v-else type="segment" animated>
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
              :data="effectiveData[modeDef.id] || []"
              :row-key="(row: TornadoLeaderboardEntry | FinishHimLeaderboardEntry) => ('id' in row ? row.id : row.lichess_id)"
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

.tornadoLeaderboard .card-title {
  color: var(--neon-orange);
}

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

.loading-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
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
@media (max-width: 768px) {
  .main-header {
    padding: 11px 14px;
  }

  .card-title {
    font-size: 1rem;
    letter-spacing: 1px;
    gap: 8px;
  }

  .modes-container {
    padding: 8px;
  }

  .mode-table-wrapper {
    margin-top: 11px;
    border-radius: 6px;
  }

  .mode-score-value {
    font-size: 0.8em;
  }

  :deep(.n-data-table-th) {
    font-size: 0.65rem;
    padding: 7px 5px !important;
  }

  :deep(.n-data-table-td) {
    font-size: 0.7rem;
    padding: 7px 5px !important;
  }

  :deep(.n-tabs-tab) {
    font-size: 0.8rem;
    padding: 8px 10px !important;
  }

  .tab-icon {
    font-size: 0.9rem;
  }
}
</style>
