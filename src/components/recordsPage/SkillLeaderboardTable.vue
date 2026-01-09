<!-- src/components/recordsPage/SkillLeaderboardTable.vue -->
<script setup lang="ts">
import type {
  OverallSolvedLeaderboardEntry,
  SkillPeriod,
  SolveStreakLeaderboardEntry,
  SolvedByMode,
} from '@/types/api.types'
import type { DataTableColumns } from 'naive-ui'
import { computed, h, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import InfoIcon from '../InfoIcon.vue'

const props = defineProps({
  title: { type: String, required: true },
  entries: { type: Array as PropType<(OverallSolvedLeaderboardEntry | SolveStreakLeaderboardEntry)[]>, required: true },
  colorClass: { type: String, required: true },
  showStreak: { type: Boolean, default: false },
  showFilter: { type: Boolean, default: false },
  showTimer: { type: Boolean, default: false },
  isLoading: { type: Boolean, default: false },
  selectedPeriod: { type: String as PropType<SkillPeriod>, default: '7' },
  infoTopic: { type: String, required: false },
})

const emit = defineEmits<{
  (e: 'period-change', period: SkillPeriod): void
}>()

const { t } = useI18n()

// Настройки ширины колонок для удобного редактирования
const COLUMN_WIDTHS = {
  rank: 25,
  player: 180,
  streak: 50,
  score: 50 // Теперь это минимальная ширина для колонки с баром
}

const tierToPieceMap: Record<string, string> = {
  Pawn: 'wP.svg', Knight: 'wN.svg', Bishop: 'wB.svg', Rook: 'wR.svg', Queen: 'wQ.svg', King: 'wK.svg',
}

const skillModes: { key: keyof SolvedByMode; nameKey: string; color: string }[] = [
  { key: 'advantage', nameKey: 'userCabinet.stats.modes.finishHim', color: 'var(--color-accent-primary)' },
  { key: 'tornado', nameKey: 'nav.tornado', color: 'var(--color-accent-secondary)' },
  { key: 'theory', nameKey: 'userCabinet.stats.modes.theory', color: 'var(--color-violett-lichess)' },
]

const getSubscriptionIcon = (tier?: string) => {
  if (!tier || !tierToPieceMap[tier]) return null
  return `/piece/alpha/${tierToPieceMap[tier]}`
}

const localResetTimeMessage = computed(() => {
  if (!props.showTimer) return ''
  const now = new Date()
  const tomorrowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  const localTime = tomorrowUTC.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return t('userCabinet.stats.activity.titleWithTime', { time: localTime })
})

const periodOptions = [
  { label: t('userCabinet.stats.periods.week'), value: '7' },
  { label: t('records.periods.days14'), value: '14' },
  { label: t('records.periods.days21'), value: '21' },
  { label: t('userCabinet.stats.periods.month'), value: '30' },
]

const columns = computed<DataTableColumns<OverallSolvedLeaderboardEntry | SolveStreakLeaderboardEntry>>(() => {
  const cols: DataTableColumns<OverallSolvedLeaderboardEntry | SolveStreakLeaderboardEntry> = [
    { title: t('records.table.rank'), key: 'rank', align: 'center', width: COLUMN_WIDTHS.rank, render: (_, index) => index + 1 },
    {
      title: t('records.table.player'),
      key: 'username',
      width: COLUMN_WIDTHS.player,
      ellipsis: { tooltip: true },
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
    }
  ]

  if (props.showStreak) {
    cols.push({
      title: t('records.table.streakDays'),
      key: 'current_streak',
      align: 'center',
      width: COLUMN_WIDTHS.streak,
      render: (row) => (row as SolveStreakLeaderboardEntry).current_streak
    })
  }

  cols.push({
    title: t('records.table.score'),
    key: 'total_score',
    align: 'right',
    minWidth: COLUMN_WIDTHS.score,
    render(row) {
      const entry = row as OverallSolvedLeaderboardEntry | SolveStreakLeaderboardEntry
      const score = entry.total_score !== undefined ? entry.total_score : entry.total_solved

      return h('div', { class: 'solved-column-wrapper' }, [
        h('span', { class: 'total-score' }, score),
        entry.solved_by_mode && (entry.total_score || 0) > 0 ? h('div', { class: 'skill-progress-bar' },
          skillModes.map(mode => {
            const val = entry.solved_by_mode[mode.key] || 0
            const total = entry.total_score || entry.total_solved || 1 // Fallback to avoid div by zero
            const width = (val / total) * 100

            if (width <= 0) return null
            return h('div', {
              class: ['skill-bar-segment', mode.key],
              style: { width: `${width}%`, backgroundColor: mode.color },
              title: `${t(mode.nameKey)}: ${val}`
            })
          })
        ) : null
      ])
    }
  })

  return cols
})
</script>

<template>
  <div class="records-card" :class="colorClass">
    <div class="card-header">
      <h3 class="card-title">
        {{ title }}
        <InfoIcon v-if="infoTopic" :topic="infoTopic" />
      </h3>
    </div>

    <div v-if="showTimer" class="timer-banner">
      {{ localResetTimeMessage }}
    </div>

    <n-space vertical class="controls-area" :size="12">
      <div v-if="showFilter" class="filter-row">
        <n-select :value="selectedPeriod" :options="periodOptions"
          @update:value="(val: string) => emit('period-change', val as any)" style="width: 200px" />
      </div>

      <div class="legend-row">
        <n-space justify="center">
          <div v-for="mode in skillModes" :key="mode.key" class="legend-item">
            <span class="dot" :style="{ backgroundColor: mode.color }"></span>
            <span class="label">{{ t(mode.nameKey) }}</span>
          </div>
        </n-space>
      </div>
    </n-space>

    <n-data-table :columns="columns" :data="entries" :loading="isLoading" :row-key="(row: any) => row.lichess_id"
      size="small" striped class="records-table" />
  </div>
</template>

<style scoped>
.records-card {
  background-color: var(--color-bg-secondary);
  border-radius: 5px;
  border: 1px solid var(--color-border-hover);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.card-header {
  padding: 10px;
  border-bottom: 1px solid var(--color-border-hover);
}

/* Цвета из оригинала */
.skillStreak .card-header {
  background-color: var(--color-accent-success);
}

.skillStreakMega .card-header {
  background-color: var(--color-violett-lichess);
}

.topToday .card-header {
  background-color: var(--color-accent-warning);
}

.overallSkill .card-header {
  background-color: var(--color-accent-primary);
}

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

.timer-banner {
  text-align: center;
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
  background-color: var(--color-bg-tertiary);
  padding: 4px;
}

.controls-area {
  background-color: var(--color-bg-tertiary);
  padding: 12px;
}

.filter-row {
  display: flex;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-item .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-item .label {
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
}

.records-table {
  --n-td-color-striped: var(--color-bg-tertiary);
}

:deep(.n-data-table-th) {
  background-color: var(--color-bg-tertiary) !important;
  color: var(--color-text-muted) !important;
  font-family: var(--font-family-primary);
  white-space: nowrap;
}

:deep(.n-data-table-td) {
  font-family: var(--font-family-primary);
  font-size: 1.05rem;
  padding: 12px 8px !important;
}

:deep(.skill-progress-bar) {
  display: flex;
  width: 100%;
  height: 24px;
  background-color: var(--color-bg-primary);
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid var(--color-border-hover);
}

.skill-bar-segment {
  height: 100%;
}

@media (max-width: 600px) {
  :deep(.skill-progress-bar) {
    max-width: 60vw;
  }
}

.solved-column-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  width: 100%;
}


.total-score {
  font-weight: 900;
  font-size: 1.2rem;
  color: var(--color-accent-warning);
  text-shadow: 0 0 10px rgba(255, 179, 0, 0.2);
}

.total-solved {
  color: var(--color-text-muted);
  font-size: 0.9em;
}

.total-solved::after {
  content: " ✓";
  opacity: 0.7;
}
</style>
