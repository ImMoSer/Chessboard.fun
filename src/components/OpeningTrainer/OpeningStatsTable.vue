<script setup lang="ts">
import { computed, h } from 'vue';
import type { LichessMove } from '../../services/OpeningApiService';
import { useI18n } from 'vue-i18n';
import { NDataTable, NText } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { useBoardStore } from '../../stores/board.store';

const props = defineProps<{
  moves: LichessMove[];
  isReviewMode: boolean;
  // Current position stats
  white?: number;
  draws?: number;
  black?: number;
}>();

const emit = defineEmits<{
  (e: 'select-move', uci: string): void
}>();

const { t } = useI18n();
const boardStore = useBoardStore();

const rowProps = (row: LichessMove) => {
  return {
    style: 'cursor: pointer;',
    onClick: () => {
      emit('select-move', row.uci);
    }
  };
};

const formatTotal = (total: number) => {
  if (total >= 1000000) return (total / 1000000).toFixed(1) + 'M';
  if (total >= 1000) return (total / 1000).toFixed(1) + 'K';
  return total.toString();
};

const totalGames = computed(() => (props.white || 0) + (props.draws || 0) + (props.black || 0) || 1);
const whitePct = computed(() => ((props.white || 0) / totalGames.value) * 100);
const drawsPct = computed(() => ((props.draws || 0) / totalGames.value) * 100);
const blackPct = computed(() => ((props.black || 0) / totalGames.value) * 100);

const columns = computed<DataTableColumns<LichessMove>>(() => [
  {
    title: t('openingTrainer.stats.move'),
    key: 'san',
    width: '20%',
    render(row) {
      return h(
        NText,
        { strong: true, type: 'primary', style: { fontSize: '0.8rem' } },
        { default: () => row.san }
      );
    }
  },
  {
    title: t('openingTrainer.stats.games'),
    key: 'total',
    width: '30%',
    render(row) {
      const total = row.white + row.draws + row.black;
      const popularity = Math.round((total / totalGames.value) * 100);
      return h('div', { style: { fontSize: '0.8rem', whiteSpace: 'nowrap' } }, [
        h('span', { style: { fontWeight: 'bold' } }, formatTotal(total)),
        h('span', { style: { opacity: 0.6, marginLeft: '4px' } }, `(${popularity}%)`)
      ]);
    }
  },
  {
    title: t('openingTrainer.stats.winRate'),
    key: 'winrate',
    width: '25%',
    render(row) {
      const total = row.white + row.draws + row.black || 1;
      const w = (row.white / total) * 100;
      const d = (row.draws / total) * 100;
      const b = (row.black / total) * 100;

      const score = boardStore.turn === 'white'
        ? (row.white + row.draws * 0.5) / total * 100
        : (row.black + row.draws * 0.5) / total * 100;

      return h('div', { class: 'winrate-cell' }, [
        h('div', { class: 'winrate-text' }, `${Math.round(score)}%`),
        h('div', { class: 'mini-winrate-bar' }, [
          h('div', { class: 'segment white', style: { width: `${w}%` } }),
          h('div', { class: 'segment draw', style: { width: `${d}%` } }),
          h('div', { class: 'segment black', style: { width: `${b}%` } })
        ])
      ]);
    }
  },
  {
    title: t('openingTrainer.stats.avgRating'),
    key: 'averageRating',
    width: '25%',
    render(row) {
      return h(NText, { depth: 3, style: { fontSize: '0.8rem' } }, { default: () => row.averageRating || '-' });
    }
  }
]);

</script>

<template>
  <div class="stats-container" :class="{ 'blurred': !isReviewMode }">
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

    <n-data-table :columns="columns" :data="moves" :pagination="false" :bordered="false" size="small"
      class="stats-table" :row-props="rowProps" />
  </div>
</template>

<style scoped lang="scss">
.stats-container {
  position: relative;
  background: var(--color-bg-secondary);
  border-radius: 12px;
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
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--color-border);

  .winrate-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    font-weight: 800;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;

    .label-white {
      color: #fff;
      text-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
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
    height: 14px;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
  }
}

.winrate-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.winrate-text {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--color-text-primary);
  line-height: 1;
}

.mini-winrate-bar {
  display: flex;
  height: 6px;
  width: 100%;
  min-width: 60px;
  border-radius: 2px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
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
    padding: 6px 4px !important;
  }

  .n-data-table-th {
    font-size: 0.8rem;
    padding: 8px 4px !important;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-text-secondary);
    background-color: rgba(255, 255, 255, 0.03);
  }

  .n-data-table-tr:hover {
    .n-data-table-td {
      background-color: rgba(255, 255, 255, 0.03) !important;
    }
  }
}
</style>
