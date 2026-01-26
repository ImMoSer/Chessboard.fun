<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { brilliantBookService } from '../../services/brilliantBookService'
import type { BrilliantBookStats } from '../../types/brilliant-book'
import { useBoardStore } from '../../stores/board.store'
import BrilliantBookRow from './BrilliantBookRow.vue'
import { NText } from 'naive-ui'

const props = defineProps<{
  blurred?: boolean
}>()

const emit = defineEmits(['select-move'])

const boardStore = useBoardStore()
const stats = ref<BrilliantBookStats | null>(null)
const loading = ref(false)

async function fetchStats() {
  if (!boardStore.fen) return
  loading.value = true
  try {
    stats.value = await brilliantBookService.getStats(boardStore.fen)
  } catch (e) {
    console.error('[BrilliantBookExplorer] Failed to fetch stats:', e)
  } finally {
    loading.value = false
  }
}

watch(() => boardStore.fen, fetchStats)

onMounted(fetchStats)

function handleSelect(uci: string) {
  emit('select-move', uci)
}

const turn = computed(() => {
  if (!boardStore.fen) return 'white'
  return boardStore.fen.split(' ')[1] === 'w' ? 'white' : 'black'
})

const fullMoveNumber = computed(() => {
  if (!boardStore.fen) return 1
  const parts = boardStore.fen.split(' ')
  return parts.length > 5 ? parseInt(parts[5] || '1') : 1
})

import { computed } from 'vue'
</script>

<template>
  <div class="brilliant-explorer">
    <div class="table-header">
      <div class="col-move">Move</div>
      <div class="col-n">Total</div>
      <div class="col-pct">Gradients (W/B)</div>
      <div class="col-rate" title="White Avg Rating">RW</div>
      <div class="col-rate" title="Black Avg Rating">RB</div>
    </div>

    <div class="table-body">
      <div v-if="loading && !stats" class="loading-state">
        <div class="spinner-tiny"></div>
      </div>

      <template v-if="stats && stats.moves.length > 0">
        <BrilliantBookRow
          v-for="move in stats.moves"
          :key="move.uci"
          :move="move"
          :turn="turn"
          :full-move-number="fullMoveNumber"
          @select="handleSelect"
        />
      </template>

      <div v-else-if="!loading" class="empty-state">
        <n-text depth="3">No Brilliant Book data for this position</n-text>
      </div>
    </div>
  </div>
</template>

<style scoped>
.brilliant-explorer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.table-header {
  display: flex;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: bold;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
}

.table-header > div {
  text-align: right;
}

.col-move { width: 90px; text-align: left !important; }
.col-n { width: 60px; padding-right: 8px; }
.col-pct { width: 120px; text-align: center !important; }
.col-rate { width: 45px; text-align: center !important; }

.table-body {
  flex: 1;
  overflow-y: auto;
}

.loading-state, .empty-state {
  padding: 40px 20px;
  text-align: center;
}

.spinner-tiny {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
