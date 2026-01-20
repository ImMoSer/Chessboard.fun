<script setup lang="ts">
import { NTooltip } from 'naive-ui'
import { computed } from 'vue'
import { type MozerBookMove } from '../../services/OpeningApiService'
import WinrateBar from './WinrateBar.vue'
import { getNagColor, getNagSymbol } from './utils'

interface Props {
  move: MozerBookMove
  turn: 'white' | 'black'
  fullMoveNumber: number
}

const props = defineProps<Props>()
const emit = defineEmits(['select'])

const formatMove = computed(() => {
  const prefix = props.turn === 'white' ? `${props.fullMoveNumber}.` : `${props.fullMoveNumber}...`
  const nag = getNagSymbol(props.move.nag)
  return `${prefix}${props.move.san}${nag}`
})

const totalN = computed(() => props.move.w + props.move.d + props.move.l)
const drawPct = computed(() =>
  totalN.value > 0 ? ((props.move.d / totalN.value) * 100).toFixed(1) : '0.0',
)

function handleClick() {
  emit('select', props.move.uci)
}
</script>

<template>
  <div class="move-row" @click="handleClick">
    <div class="col-move">
      <n-tooltip
        trigger="hover"
        placement="right"
        :style="{
          width: 'max-content',
          maxWidth: 'none',
          backgroundColor: '#1a1a1a',
          padding: '12px',
        }"
      >
        <template #trigger>
          <span class="move-text" :style="{ color: getNagColor(move.nag) }">
            {{ formatMove }}
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
            <span class="marker">{{
              idx === (move.children?.length || 0) - 1 ? '│ └──' : '│ ├──'
            }}</span>
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

    <div class="col-n">{{ totalN }}</div>

    <div class="col-pct cell-pct">
      <WinrateBar :w="move.w" :d="move.d" :l="move.l" :turn="turn" />
    </div>

    <div class="col-draw">{{ drawPct }}</div>
    <div class="col-av">{{ Math.round(move.av) }}</div>
    <div class="col-perf">{{ Math.round(move.perf) }}</div>
  </div>
</template>

<style scoped>
.move-row {
  display: flex;
  padding: 4px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  align-items: center;
  text-align: right;
  cursor: pointer;
  transition: background 0.2s;
}

.move-row > div {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.move-row:hover {
  background: rgba(var(--color-accent-rgb), 0.1);
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

.move-text {
  font-weight: bold;
  font-size: 14px;
}

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
</style>
