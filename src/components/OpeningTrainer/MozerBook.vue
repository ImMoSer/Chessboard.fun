<script setup lang="ts">
import { CloseOutline, InformationCircleOutline, LeafOutline } from '@vicons/ionicons5';
import { NIcon, NModal, NScrollbar, NText, NTooltip } from 'naive-ui';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { type MozerBookMove, type MozerBookTheoryItem } from '../../services/OpeningApiService';
import { pgnTreeVersion } from '../../services/PgnService';
import { useBoardStore } from '../../stores/board.store';
import { useMozerBookStore } from '../../stores/mozerBook.store';

defineProps<{
  blurred?: boolean
}>();

const { t } = useI18n();
const boardStore = useBoardStore();
const mozerStore = useMozerBookStore();

const stats = computed(() => mozerStore.currentStats);
const loading = computed(() => mozerStore.isLoading);

const currentFen = computed(() => mozerStore.currentFen);

const turn = computed(() => {
  const parts = currentFen.value.split(' ');
  return parts[1] === 'w' ? 'white' : 'black';
});

const fullMoveNumber = computed(() => {
  const parts = currentFen.value.split(' ');
  const moveNumStr = parts[5];
  return moveNumStr ? (parseInt(moveNumStr) || 1) : 1;
});

const showTheory = ref(false);

function handleSelectMove(uci: string) {
  boardStore.applyUciMove(uci);
  showTheory.value = false;
}

// Watch both version and the fen property from store
watch([pgnTreeVersion, () => boardStore.fen], () => {
  mozerStore.fetchStats();
  showTheory.value = false; // Close theory when position changes
}, { immediate: true });

onMounted(() => {
  mozerStore.fetchStats();
});

// Helpers
const getNagSymbol = (nag: number) => {
  const map: Record<number, string> = {
    1: '!',
    2: '?',
    3: '!!',
    4: '??',
    5: '!?',
    6: '?!',
    7: '□'
  };
  return map[nag] || '';
};

const getNagColor = (nag: number) => {
  switch (nag) {
    case 1: return '#4caf50'; // Green
    case 3: return '#00e676'; // Bright Green
    case 2: return '#f44336'; // Red
    case 4: return '#b71c1c'; // Dark Red
    case 5: return '#2196f3'; // Blue/Green
    case 6: return '#ff9800'; // Orange
    case 7: return '#3f51b5'; // Blue
    default: return 'inherit';
  }
};

const calculateScore = (move: MozerBookMove | { w: number, d: number, l: number }) => {
  const total = move.w + move.d + move.l;
  if (total === 0) return 0;

  // To match your request: Green bar and percentage should always represent White points (1-0)
  // If it's White's turn, 'w' is White wins. If Black's turn, 'l' is White wins.
  const whiteWins = turn.value === 'white' ? move.w : move.l;
  return ((whiteWins + move.d * 0.5) / total) * 100;
};

const getBarWidths = (move: MozerBookMove | { w: number, d: number, l: number }) => {
  const total = move.w + move.d + move.l;
  if (total === 0) return { w: 0, d: 0, l: 0 };

  const whiteWins = turn.value === 'white' ? move.w : move.l;
  const blackWins = turn.value === 'black' ? move.w : move.l;

  return {
    w: (whiteWins / total) * 100,
    d: (move.d / total) * 100,
    l: (blackWins / total) * 100
  };
};

const formatMove = (move: MozerBookMove | MozerBookTheoryItem) => {
  const prefix = turn.value === 'white' ? `${fullMoveNumber.value}.` : `${fullMoveNumber.value}...`;
  const nag = 'nag' in move ? getNagSymbol(move.nag) : '';
  return `${prefix}${move.san}${nag}`;
};

const theoryWithChildren = computed(() => {
  if (!stats.value?.theory) return [];

  return stats.value.theory.map(tItem => {
    // Find matching move in stats to get children and popularity
    const matchingMove = stats.value?.moves.find(m => m.uci === tItem.uci);
    return {
      ...tItem,
      children: matchingMove?.children || [],
      count: matchingMove ? (matchingMove.w + matchingMove.d + matchingMove.l) : 0
    };
  }).sort((a, b) => b.count - a.count); // Sort by popularity
});
</script>

<template>
  <div class="mozer-book" :class="{ 'blurred': blurred }">
    <div v-if="blurred" class="overlay">
      <n-text strong depth="1">{{ t('openingTrainer.stats.reviewModeOverlay') }}</n-text>
    </div>

    <div class="book-header">
      <div class="header-main">
        <n-icon size="18" class="tree-icon">
          <LeafOutline />
        </n-icon>
        <span class="book-title">MozerBook</span>
        <span class="header-n" v-if="stats?.summary"> (N={{ (stats.summary.w + stats.summary.d +
          stats.summary.l).toLocaleString()
        }})</span>
      </div>
      <div class="header-actions">
        <n-icon size="18" class="info-icon" :class="{ 'active': showTheory }" @click.stop="showTheory = !showTheory">
          <InformationCircleOutline />
        </n-icon>
      </div>
    </div>

    <!-- Full Theory Modal -->
    <n-modal v-model:show="showTheory" transform-origin="center">
      <div class="theory-modal-content">
        <div class="modal-header">
          <div class="header-title">
            <n-icon size="24" color="#2e7d32">
              <LeafOutline />
            </n-icon>
            <div class="title-text">
              <div class="main-title">Theoretical Explorer</div>
              <div class="sub-title">Theoretical continuations for the current position</div>
            </div>
          </div>
          <n-icon class="modal-close" size="24" @click="showTheory = false">
            <CloseOutline />
          </n-icon>
        </div>

        <n-scrollbar style="max-height: 70vh" trigger="none">
          <div class="modal-body">
            <div v-if="theoryWithChildren.length > 0" class="theory-grid">
              <div v-for="item in theoryWithChildren" :key="item.uci" class="theory-card"
                @click="handleSelectMove(item.uci)">
                <div class="card-main-info">
                  <div class="card-move-header">
                    <span class="card-eco">{{ item.eco }}</span>
                    <span class="card-san">{{ item.san }}</span>
                    <span class="card-popularity" v-if="item.count > 0">N={{ item.count.toLocaleString() }}</span>
                  </div>
                  <div class="card-name">{{ item.name }}</div>
                </div>

                <div class="card-children" v-if="item.children.length > 0">
                  <div v-for="(child, idx) in item.children" :key="child.uci" class="modal-hierarchy-line">
                    <span class="marker">{{ idx === item.children.length - 1 ? '└──' : '├──' }}</span>
                    <span class="child-san">{{ child.san }}</span>
                    <span class="child-eco">({{ child.eco }})</span>
                    <span class="child-name">{{ child.name }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty-theory-modal">
              <n-text depth="3">No theoretical data available for this position.</n-text>
            </div>
          </div>
        </n-scrollbar>
      </div>
    </n-modal>

    <div class="table-labels">
      <div class="col-move"></div>
      <div class="col-n">N</div>
      <div class="col-pct">%</div>
      <div class="col-draw">=%</div>
      <div class="col-av">Av</div>
      <div class="col-perf">Perf</div>
    </div>

    <div class="book-body">
      <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
      </div>

      <div v-for="move in stats?.moves" :key="move.uci" class="move-row" @click="handleSelectMove(move.uci)">
        <div class="col-move">
          <n-tooltip trigger="hover" placement="right"
            :style="{ maxWidth: '450px', backgroundColor: '#1a1a1a', padding: '12px' }">
            <template #trigger>
              <span class="move-text" :style="{ color: getNagColor(move.nag) }">
                {{ formatMove(move) }}
              </span>
            </template>
            <div class="hierarchy-tooltip">
              <div class="hierarchy-line parent">
                <span class="marker">├──</span>
                <span class="move-san">{{ move.san }}</span>
                <span class="move-eco">({{ move.eco }})</span>
                <span class="move-name">- {{ move.name }}</span>
              </div>
              <div v-for="(child, idx) in move.children" :key="child.uci" class="hierarchy-line child">
                <span class="marker">{{ idx === (move.children?.length || 0) - 1 ? '│ └──' : '│ ├──' }}</span>
                <span class="move-san">{{ child.san }}</span>
                <span class="move-eco">({{ child.eco }})</span>
                <span class="move-name">- {{ child.name }}</span>
              </div>
              <div v-if="!move.children?.length" class="no-children">
                <span class="marker">│ └──</span>
                <span class="no-data-text">No theoretical continuations found</span>
              </div>
            </div>
          </n-tooltip>
        </div>

        <div class="col-n">{{ move.w + move.d + move.l }}</div>

        <div class="col-pct cell-pct">
          <div class="score-bar-container">
            <div class="score-bar-green" :style="{ width: getBarWidths(move).w + '%' }"></div>
            <div class="score-bar-grey" :style="{ width: getBarWidths(move).d + '%' }"></div>
            <div class="score-bar-red" :style="{ width: getBarWidths(move).l + '%' }"></div>
            <div class="mid-line-static"></div>
            <span class="score-text">{{ calculateScore(move).toFixed(1) }}</span>
          </div>
        </div>

        <div class="col-draw">{{ ((move.d / (move.w + move.d + move.l)) * 100).toFixed(1) }}</div>
        <div class="col-av">{{ Math.round(move.av) }}</div>
        <div class="col-perf">{{ Math.round(move.perf) }}</div>
      </div>

      <div v-if="!loading && (!stats || stats.moves.length === 0)" class="empty-state">
        No data
      </div>
    </div>

    <div class="book-footer" v-if="stats?.summary">
      <div class="footer-bars">
        <!-- Green Bar: Always 1-0 (White Wins) -->
        <div class="bar-row">
          <div class="bar white"
            :style="{ width: ((turn === 'white' ? stats.summary.w : stats.summary.l) / (stats.summary.w + stats.summary.d + stats.summary.l) * 100) + '%' }">
          </div>
        </div>
        <!-- Grey Bar: Always Draws -->
        <div class="bar-row">
          <div class="bar draw"
            :style="{ width: (stats.summary.d / (stats.summary.w + stats.summary.d + stats.summary.l) * 100) + '%' }">
          </div>
        </div>
        <!-- Red Bar: Always 0-1 (Black Wins) -->
        <div class="bar-row">
          <div class="bar black"
            :style="{ width: ((turn === 'black' ? stats.summary.w : stats.summary.l) / (stats.summary.w + stats.summary.d + stats.summary.l) * 100) + '%' }">
          </div>
        </div>
      </div>
      <div class="footer-legend">
        <!-- If white turn: w = 1-0, l = 0-1. If black turn: w = 0-1, l = 1-0 -->
        <div class="legend-item">
          1-0: {{ turn === 'white' ? stats.summary.w : stats.summary.l }} =
          {{ ((turn === 'white' ? stats.summary.w : stats.summary.l) / (stats.summary.w + stats.summary.d +
            stats.summary.l)
            * 100).toFixed(0) }}%
        </div>
        <div class="legend-item">
          1/2: {{ stats.summary.d }} =
          {{ (stats.summary.d / (stats.summary.w + stats.summary.d + stats.summary.l) * 100).toFixed(0) }}%
        </div>
        <div class="legend-item">
          0-1: {{ turn === 'black' ? stats.summary.w : stats.summary.l }} =
          {{ ((turn === 'black' ? stats.summary.w : stats.summary.l) / (stats.summary.w + stats.summary.d +
            stats.summary.l)
            * 100).toFixed(0) }}%
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mozer-book {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 13px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  height: 100%;
  min-height: 0;
}

.blurred {
  filter: blur(8px);
  pointer-events: none;
  opacity: 0.6;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 10;
}

.book-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid var(--color-border);
  font-weight: bold;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tree-icon {
  color: #2e7d32;
}

.header-n {
  font-size: 12px;
  font-weight: normal;
  opacity: 0.7;
}

.score-bar-container.mini {
  height: 16px;
  width: 60px;
  border-radius: 3px;
  overflow: hidden;
}

.score-textMini {
  position: absolute;
  z-index: 2;
  font-size: 10px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
}

.table-labels {
  display: flex;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--color-border);
  font-size: 11px;
  font-weight: bold;
  text-align: right;
  color: var(--color-text-secondary);
}

.table-labels>div {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.col-move {
  width: 80px;
  justify-content: flex-start !important;
  text-align: left;
}

.col-n {
  width: 60px;
  padding-right: 8px;
}

.col-pct {
  width: 80px;
  padding: 0 4px;
}

.col-draw {
  width: 45px;
  padding-right: 4px;
}

.col-av {
  width: 40px;
  padding-right: 4px;
}

.col-perf {
  width: 40px;
  padding-right: 8px;
}

.book-body {
  flex: 1;
  overflow-y: auto;
  position: relative;
  background: transparent;
}

.move-row {
  display: flex;
  padding: 4px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  align-items: center;
  text-align: right;
  cursor: pointer;
  transition: background 0.2s;
}

.move-row>div {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.move-row:hover {
  background: rgba(var(--color-accent-rgb), 0.1);
}

.move-text {
  font-weight: bold;
  font-size: 14px;
}

.cell-pct {
  padding: 0 4px;
}

.score-bar-container {
  height: 18px;
  width: 100%;
  background: #333;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  border-radius: 3px;
  overflow: hidden;
}

.score-bar-green {
  background: #4caf50;
  height: 100%;
  flex-shrink: 0;
}

.score-bar-grey {
  background: #7E57C2;
  height: 100%;
  flex-shrink: 0;
}

.score-bar-red {
  background: #f44336;
  height: 100%;
  flex-shrink: 0;
}

.mid-line-static {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1;
}

.score-text {
  position: absolute;
  z-index: 2;
  font-size: 11px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
}

.book-footer {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: 15px;
  align-items: center;
}

.footer-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bar-row {
  height: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.bar {
  height: 100%;
}

.bar.white {
  background: #4caf50;
}

.bar.draw {
  background: #7E57C2;
}

.bar.black {
  background: #f44336;
}

.footer-legend {
  font-size: 11px;
  font-family: 'Fira Code', monospace;
  white-space: nowrap;
  color: var(--color-text-secondary);
}

/* Tooltip Styles */
.hierarchy-tooltip {
  font-family: 'Fira Code', 'Courier New', Courier, monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #eee;
}

.hierarchy-line {
  display: flex;
  white-space: nowrap;
  gap: 6px;
}

.marker {
  color: #666;
  font-weight: bold;
}

.move-san {
  color: #4caf50;
  font-weight: bold;
}

.move-eco {
  color: #888;
  font-size: 11px;
}

.move-name {
  color: #ccc;
}

.no-children {
  display: flex;
  gap: 6px;
  opacity: 0.6;
}

/* Modal Styles */
.theory-modal-content {
  width: 90vw;
  max-width: 800px;
  background: rgba(24, 24, 28, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-text {
  display: flex;
  flex-direction: column;
}

.main-title {
  font-size: 20px;
  font-weight: bold;
  color: #fff;
}

.sub-title {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.modal-close {
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.2s;
}

.modal-close:hover {
  opacity: 1;
  transform: rotate(90deg);
}

.modal-body {
  padding: 24px;
}

.theory-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.theory-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.theory-card:hover {
  background: rgba(var(--color-accent-rgb), 0.08);
  border-color: var(--color-accent);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.card-move-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.card-eco {
  font-family: 'Fira Code', monospace;
  color: #888;
  font-size: 14px;
}

.card-san {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-accent);
}

.card-popularity {
  font-size: 11px;
  color: #666;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: auto;
}

.card-name {
  font-size: 14px;
  color: #ccc;
  margin-bottom: 12px;
}

.card-children {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modal-hierarchy-line {
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #aaa;
}

.modal-hierarchy-line .marker {
  color: #444;
  font-weight: bold;
}

.child-san {
  color: #fff;
  font-weight: bold;
  width: 50px;
}

.child-eco {
  color: #666;
  font-size: 11px;
}

.child-name {
  color: #888;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-theory-modal {
  padding: 60px;
  text-align: center;
}

/* Animations */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: #888;
}
</style>
