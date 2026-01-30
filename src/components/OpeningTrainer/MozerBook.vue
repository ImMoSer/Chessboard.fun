<script setup lang="ts">
import { InformationCircleOutline, LeafOutline } from '@vicons/ionicons5'
import { NIcon, NSpin, NText } from 'naive-ui'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { pgnTreeVersion } from '../../services/PgnService'
import { useBoardStore } from '../../stores/board.store'
import { useMozerBookStore } from '../../stores/mozerBook.store'
import MozerBookFooter from '../MozerBook/MozerBookFooter.vue'
import MozerBookRow from '../MozerBook/MozerBookRow.vue'
import TheoryExplorerModal from '../MozerBook/TheoryExplorerModal.vue'
import { type TheoryItemWithChildren } from '../MozerBook/types'

defineProps<{
  blurred?: boolean
}>()

const { t } = useI18n()
const boardStore = useBoardStore()
const mozerStore = useMozerBookStore()

const stats = computed(() => mozerStore.currentStats)
const loading = computed(() => mozerStore.isLoading)

const currentFen = computed(() => mozerStore.currentFen)

const turn = computed(() => {
  const parts = currentFen.value.split(' ')
  return parts[1] === 'w' ? 'white' : 'black'
})

const fullMoveNumber = computed(() => {
  const parts = currentFen.value.split(' ')
  const moveNumStr = parts[5]
  return moveNumStr ? parseInt(moveNumStr) || 1 : 1
})

const showTheory = ref(false)

function handleSelectMove(uci: string) {
  boardStore.applyUciMove(uci)
  showTheory.value = false
}

// Watch both version and the fen property from store
watch(
  [pgnTreeVersion, () => boardStore.fen],
  () => {
    mozerStore.fetchStats()
    showTheory.value = false // Close theory when position changes
  },
  { immediate: true },
)

onMounted(() => {
  mozerStore.fetchStats()
})

const theoryWithChildren = computed<TheoryItemWithChildren[]>(() => {
  if (!stats.value?.theory) return []

  return stats.value.theory
    .map((tItem) => {
      // Find matching move in stats to get children and statistics
      const matchingMove = stats.value?.moves.find((m) => m.uci === tItem.uci)
      const count = matchingMove ? matchingMove.total : 0

      return {
        ...tItem,
        nag: matchingMove?.nag || 0,
        total: count,
        w_pct: matchingMove?.w_pct || 0,
        d_pct: matchingMove?.d_pct || 0,
        l_pct: matchingMove?.l_pct || 0,
        perf: matchingMove?.perf || 0,
        wt: matchingMove?.wt || 0,
        bt: matchingMove?.bt || 0,
        children: matchingMove?.children || [],
      } as TheoryItemWithChildren
    })
    .sort((a, b) => b.total - a.total) // Sort by popularity
})
</script>

<template>
  <div class="mozer-book" :class="{ blurred: blurred }">
    <div v-if="blurred" class="overlay">
      <n-text strong depth="1">{{ t('openingTrainer.stats.reviewModeOverlay') }}</n-text>
    </div>

    <div class="book-header">
      <div class="header-main">
        <n-icon size="18" class="tree-icon">
          <LeafOutline />
        </n-icon>
        <span class="book-title">MozerBook</span>
        <span class="header-n" v-if="stats?.summary">
          (N={{ (stats.summary.w + stats.summary.d + stats.summary.l).toLocaleString() }})</span
        >
      </div>
      <div class="header-actions">
        <n-icon
          size="18"
          class="info-icon"
          :class="{ active: showTheory }"
          @click.stop="showTheory = !showTheory"
        >
          <InformationCircleOutline />
        </n-icon>
      </div>
    </div>

    <!-- Full Theory Modal Component -->
    <TheoryExplorerModal
      v-model:show="showTheory"
      :theory-items="theoryWithChildren"
      :turn="turn"
      @select="handleSelectMove"
    />

    <div class="table-labels">
      <div class="col-move"></div>
      <div class="col-n">N</div>
      <div class="col-pct">%</div>
      <div class="col-draw">=%</div>
      <div class="col-perf">Perf</div>
      <div class="col-trap">WTrp</div>
      <div class="col-trap">BTrp</div>
    </div>

    <div class="book-body">
      <div v-if="loading" class="loading-overlay">
        <n-spin size="medium" />
      </div>

      <MozerBookRow
        v-for="move in stats?.moves"
        :key="move.uci"
        :move="move"
        :turn="turn"
        :full-move-number="fullMoveNumber"
        @select="handleSelectMove"
      />

      <div v-if="!loading && (!stats || stats.moves.length === 0)" class="empty-state">No data</div>
    </div>

    <MozerBookFooter v-if="stats?.summary" :summary="stats.summary" :turn="turn" />
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
  position: relative;
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

.header-actions {
  display: flex;
  align-items: center;
}

.info-icon {
  cursor: pointer;
  transition: color 0.2s;
  opacity: 0.7;
}

.info-icon:hover,
.info-icon.active {
  color: #2e7d32;
  opacity: 1;
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

.table-labels > div {
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
  padding-right: 4px;
}

.col-trap {
  width: 40px;
  padding-right: 4px;
}

.book-body {
  flex: 1;
  overflow-y: auto;
  position: relative;
  background: transparent;
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

.empty-state {
  padding: 20px;
  text-align: center;
  color: #888;
}
</style>
