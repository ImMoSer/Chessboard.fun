<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import { NDataTable, NText } from 'naive-ui'
import { computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LichessMove } from '../../services/LichessApiService'
import { useBoardStore } from '../../stores/board.store'

const props = defineProps<{
  moves: LichessMove[]
  isReviewMode: boolean
  // Current position stats
  white?: number
  draws?: number
  black?: number
  avgElo?: number
  avgDraw?: number
  avgScore?: number
}>()

const emit = defineEmits<{
  (e: 'select-move', uci: string): void
}>()

const { t } = useI18n()
const boardStore = useBoardStore()

const formatTotal = (total: number) => {
  if (total >= 1000000) return (total / 1000000).toFixed(1) + 'M'
  if (total >= 1000) return (total / 1000).toFixed(1) + 'K'
  return total.toString()
}

const formatMove = (san: string) => {
  const parts = boardStore.fen.split(' ')
  const moveNumber = parts[5]
  const turn = parts[1]
  if (turn === 'w') {
    return `${moveNumber}. ${san}`
  } else {
    return `${moveNumber}... ${san}`
  }
}

const summaryAvgScore = computed(() => {
  if (props.avgScore !== undefined) return props.avgScore
  const total = (props.white || 0) + (props.draws || 0) + (props.black || 0)
  if (total === 0) return 0
  return (((props.white || 0) + 0.5 * (props.draws || 0)) / total) * 100
})

const summaryAvgDraw = computed(() => {
  if (props.avgDraw !== undefined) return props.avgDraw
  const total = (props.white || 0) + (props.draws || 0) + (props.black || 0)
  if (total === 0) return 0
  return ((props.draws || 0) / total) * 100
})

const summaryAvgElo = computed(() => {
  if (props.avgElo !== undefined) return props.avgElo
  if (props.moves.length === 0) return 0
  const totalGames = props.moves.reduce((sum, m) => sum + m.white + m.draws + m.black, 0)
  if (totalGames === 0) return 0
  const weightedRating = props.moves.reduce(
    (sum, m) => sum + m.averageRating * (m.white + m.draws + m.black),
    0,
  )
  return Math.round(weightedRating / totalGames)
})

const totalGamesCount = computed(
  () => (props.white || 0) + (props.draws || 0) + (props.black || 0) || 1,
)
const whitePct = computed(() => ((props.white || 0) / totalGamesCount.value) * 100)
const drawsPct = computed(() => ((props.draws || 0) / totalGamesCount.value) * 100)
const blackPct = computed(() => ((props.black || 0) / totalGamesCount.value) * 100)

const tableData = computed(() => {
  const totalPosGames = (props.white || 0) + (props.draws || 0) + (props.black || 0) || 1

  const summaryRow = {
    key: 'summary',
    uci: '',
    san: '',
    n: totalPosGames,
    score: summaryAvgScore.value,
    drawPct: summaryAvgDraw.value,
    avgElo: summaryAvgElo.value,
    isSummary: true,
    white: props.white || 0,
    draws: props.draws || 0,
    black: props.black || 0,
  }

  const moveRows = props.moves.map((m) => {
    const total = m.white + m.draws + m.black || 1
    const score =
      boardStore.turn === 'white'
        ? ((m.white + m.draws * 0.5) / total) * 100
        : ((m.black + m.draws * 0.5) / total) * 100
    const drawPct = (m.draws / total) * 100

    return {
      key: m.uci,
      uci: m.uci,
      san: formatMove(m.san),
      n: total,
      score,
      drawPct,
      avgElo: m.averageRating,
      isSummary: false,
      white: m.white,
      draws: m.draws,
      black: m.black,
    }
  })

  return [summaryRow, ...moveRows]
})

const rowProps = (row: any) => {
  if (row.isSummary) {
    return {
      class: 'summary-row',
    }
  }
  return {
    style: 'cursor: pointer;',
    onClick: () => {
      emit('select-move', row.uci)
    },
  }
}

const renderWinrateBar = (white: number, draws: number, black: number) => {
  const total = white + draws + black || 1
  const w = (white / total) * 100
  const d = (draws / total) * 100
  const b = (black / total) * 100

  return h('div', { class: 'mini-winrate-bar' }, [
    h('div', { class: 'segment white', style: { width: `${w}%` } }),
    h('div', { class: 'segment draw', style: { width: `${d}%` } }),
    h('div', { class: 'segment black', style: { width: `${b}%` } }),
  ])
}

const columns = computed<DataTableColumns<any>>(() => [
  {
    title: t('openingTrainer.stats.move'),
    key: 'san',
    width: 90,
    render(row) {
      if (row.isSummary) return null
      return h(NText, { strong: true, style: { fontSize: '0.8rem' } }, { default: () => row.san })
    },
  },
  {
    title: 'N',
    key: 'n',
    width: 60,
    align: 'right',
    render(row) {
      return h('span', { style: { fontSize: '0.8rem' } }, formatTotal(row.n))
    },
  },
  {
    title: '%',
    key: 'score',
    width: 80,
    align: 'right',
    render(row) {
      return h('div', { class: 'score-cell' }, [
        h('span', { style: { fontSize: '0.8rem', fontWeight: 'bold' } }, row.score.toFixed(1)),
        renderWinrateBar(row.white, row.draws, row.black),
      ])
    },
  },
  {
    title: '=%',
    key: 'drawPct',
    width: 50,
    align: 'right',
    render(row) {
      return h('span', { style: { fontSize: '0.8rem', opacity: 0.8 } }, row.drawPct.toFixed(1))
    },
  },
  {
    title: 'Av',
    key: 'avgElo',
    width: 60,
    align: 'right',
    render(row) {
      return h(
        NText,
        { depth: 3, style: { fontSize: '0.8rem' } },
        { default: () => row.avgElo || '-' },
      )
    },
  },
])
</script>

<template>
  <div class="stats-container" :class="{ blurred: !isReviewMode }">
    <div v-if="!isReviewMode" class="overlay">
      <n-text strong depth="1">{{ t('openingTrainer.stats.reviewModeOverlay') }}</n-text>
    </div>

    <!-- Global Winrate Bar -->
    <div v-if="white !== undefined" class="global-winrate">
      <div class="winrate-labels">
        <span class="label-white">{{ Math.round(whitePct) }}%</span>
        <span class="label-draw">{{ Math.round(drawsPct) }}%</span>
        <span class="label-black">{{ Math.round(blackPct) }}%</span>
      </div>
      <div class="winrate-bar-wrapper">
        <div class="segment white" :style="{ width: whitePct + '%' }"></div>
        <div class="segment draw" :style="{ width: drawsPct + '%' }"></div>
        <div class="segment black" :style="{ width: blackPct + '%' }"></div>
      </div>
    </div>

    <n-data-table
      :columns="columns"
      :data="tableData"
      :pagination="false"
      :bordered="false"
      size="small"
      class="stats-table"
      :row-props="rowProps"
    />
  </div>
</template>

<style scoped lang="scss">
.stats-container {
  position: relative;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  overflow: hidden;
  transition: all 0.3s ease;
}

.blurred {
  .stats-table,
  .global-winrate {
    filter: blur(12px);
    opacity: 0.4;
    pointer-events: none;
  }
}

.overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  background: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4px);
}

.global-winrate {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--color-border);

  .winrate-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    font-weight: 800;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;

    .label-white {
      color: #fff;
    }

    .label-draw {
      color: #888;
    }

    .label-black {
      color: #444;
    }
  }

  .winrate-bar-wrapper {
    display: flex;
    height: 8px;
    border-radius: 2px;
    overflow: hidden;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
  }
}

.score-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
}

.score-text-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.draw-pct-label {
  font-size: 0.7rem;
  opacity: 0.5;
  margin-left: 4px;
}

.mini-winrate-bar {
  display: flex;
  height: 4px;
  width: 100%;
  border-radius: 1px;
  overflow: hidden;
}

.segment {
  height: 100%;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);

  &.white {
    background: #f0f0f0;
  }

  &.draw {
    background: #888888;
  }

  &.black {
    background: #262421;
  }
}

:deep(.stats-table) {
  .n-data-table-td {
    background-color: transparent;
    padding: 4px 6px !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .n-data-table-th {
    font-size: 0.75rem;
    padding: 6px 6px !important;
    font-weight: bold;
    color: var(--color-text-secondary);
    background-color: rgba(255, 255, 255, 0.03);
    border-bottom: 2px solid var(--color-border);
  }

  .summary-row {
    .n-data-table-td {
      background-color: rgba(255, 255, 255, 0.05) !important;
      font-weight: bold;
      border-bottom: 2px solid var(--color-border);
      padding: 8px 6px !important;
    }
  }

  .n-data-table-tr:hover:not(.summary-row) {
    .n-data-table-td {
      background-color: rgba(255, 255, 255, 0.08) !important;
    }
  }
}
</style>
