<!-- src/components/clubPage/TournamentHistoryTable.vue -->
<script setup lang="ts">
import { h, ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DataTableColumns } from 'naive-ui'
import { NDataTable } from 'naive-ui' // Явный импорт для использования в render
import type { TeamBattlePlayedArena, TournamentPlayer } from '../../types/api.types'

const { t } = useI18n()

defineProps({
  tournaments: {
    type: Array as PropType<TeamBattlePlayedArena[]>,
    required: true,
  },
})

const expandedRowKeys = ref<string[]>([])

const formatDateForUser = (isoDateString: string): string => {
  try {
    const date = new Date(isoDateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear().toString().slice(-2)
    return `${day}.${month}.${year}`
  } catch {
    return isoDateString
  }
}

const calculateTeamScore = (tournament: TeamBattlePlayedArena) => {
  return tournament.players_in_arena
    .filter((p) => p.isScoringPlayer)
    .reduce((sum, player) => sum + (player.calculatedStats?.pointsTotal || 0), 0)
}

// --- Колонки вложенной таблицы (игроки) ---
const playerColumns: DataTableColumns<TournamentPlayer> = [
  { title: '#', key: 'rank_in_club', align: 'center', width: 50 },
  {
    title: t('clubPage.table.player'),
    key: 'username',
    render(row) {
      const elements = []
      if (row.isScoringPlayer) {
        elements.push(
          h('img', {
            src: '/flair/objects.crown.webp',
            style: { width: '18px', marginRight: '8px', verticalAlign: 'middle' },
            alt: 'Crown',
          }),
        )
      }
      elements.push(
        h(
          'a',
          {
            href: `https://lichess.org/@/${row.lichess_id}`,
            target: '_blank',
            style: { color: 'var(--color-text-link)', textDecoration: 'none' },
          },
          row.username,
        ),
      )

      if (row.flair) {
        elements.push(
          h('img', {
            src: `https://lichess1.org/assets/flair/img/${row.flair}.webp`,
            style: { height: '14px', marginLeft: '6px', verticalAlign: 'middle' },
            alt: 'Flair',
          }),
        )
      }
      return elements
    },
  },
  {
    title: t('clubPage.table.score'),
    key: 'points',
    align: 'right',
    render(row) {
      return h('span', { style: { fontWeight: 'bold' } }, row.calculatedStats.pointsTotal)
    },
  },
  {
    title: 'W/D/L',
    key: 'wdl',
    align: 'center',
    render(row) {
      return h('div', [
        h(
          'span',
          { style: { color: 'var(--color-accent-success)', fontWeight: 'bold' } },
          row.calculatedStats.wins,
        ),
        ' / ',
        h('span', { style: { color: 'var(--color-text-muted)' } }, row.calculatedStats.draws),
        ' / ',
        h('span', { style: { color: 'var(--color-accent-error)' } }, row.calculatedStats.losses),
      ])
    },
  },
  { title: t('clubPage.table.performance'), key: 'performance', align: 'right' },
  {
    title: '🚀',
    key: 'berserk',
    align: 'center',
    render: (row) => row.calculatedStats.berserkWins,
  },
  { title: t('clubPage.table.arenaRank'), key: 'rank_in_arena', align: 'right' },
]

// --- Колонки основной таблицы ---
const columns: DataTableColumns<TeamBattlePlayedArena> = [
  {
    type: 'expand',
    renderExpand: (row) => {
      return h('div', { style: { padding: '16px', backgroundColor: 'var(--color-bg-primary)' } }, [
        h(NDataTable, {
          size: 'small',
          columns: playerColumns,
          data: row.players_in_arena,
          rowKey: (r: TournamentPlayer) => r.lichess_id,
          striped: true,
        }),
      ])
    },
  },
  {
    title: t('clubPage.table.date'),
    key: 'startsAt',
    render(row) {
      return formatDateForUser(row.startsAt)
    },
  },
  {
    title: t('clubPage.table.tournamentName'),
    key: 'tournament_name',
    render(row) {
      return h(
        'a',
        {
          href: row.tournament_url,
          target: '_blank',
          style: { color: 'var(--color-text-link)', textDecoration: 'none' },
          onClick: (e) => e.stopPropagation(), // Чтобы клик по ссылке не закрывал строку
        },
        row.tournament_name.replace(/ Team Battle$/, ''),
      )
    },
  },
  {
    title: t('clubPage.table.clubRank'),
    key: 'club_in_arena_rank',
    align: 'right',
    render(row) {
      return row.club_in_arena_rank || '-'
    },
  },
  {
    title: t('clubPage.table.clubScore'),
    key: 'score',
    align: 'right',
    render(row) {
      return calculateTeamScore(row)
    },
  },
]

// Обработчик клика по строке
const rowProps = (row: TeamBattlePlayedArena) => {
  return {
    style: { cursor: 'pointer' },
    onClick: () => {
      const key = row.arena_id
      const index = expandedRowKeys.value.indexOf(key)
      if (index > -1) {
        expandedRowKeys.value.splice(index, 1)
      } else {
        expandedRowKeys.value.push(key)
      }
    },
  }
}
</script>

<template>
  <div v-if="tournaments && tournaments.length > 0" class="history-card">
    <div class="card-header">
      <n-h3 class="card-title">{{ t('clubPage.tournamentHistoryTitle') }}</n-h3>
    </div>
    <n-data-table
      v-model:expanded-row-keys="expandedRowKeys"
      :columns="columns"
      :data="tournaments"
      :row-key="(row: TeamBattlePlayedArena) => row.arena_id"
      :row-props="rowProps"
      striped
      class="history-table"
    />
  </div>
</template>

<style scoped>
.history-card {
  background-color: var(--color-bg-tertiary);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.card-header {
  background-color: var(--color-violett-lichess);
  padding: 12px 16px;
}

.card-title {
  margin: 0;
  color: white;
  font-family: var(--font-family-primary);
}

.history-table {
  --n-th-font-weight: bold;
  --n-td-color-hover: var(--color-border-hover);
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

@media (max-width: 768px) {
  :deep(.n-data-table-td),
  :deep(.n-data-table-th) {
    font-size: var(--font-size-xsmall);
    padding: 8px 4px;
  }
}
</style>
