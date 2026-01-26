<script setup lang="ts">
import { NTooltip } from 'naive-ui'
import { computed } from 'vue'
import type { BrilliantBookMove } from '../../types/brilliant-book'
import TrapBar from './TrapBar.vue'
import { getNagColor, getNagSymbol } from '../MozerBook/utils'

interface Props {
  move: BrilliantBookMove
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

function handleClick() {
  emit('select', props.move.uci)
}

const formatRate = (rate: number) => (rate > 0 ? rate : '-')
</script>

<template>
  <div class="move-row" @click="handleClick">
    <div class="col-move">
      <span class="move-text" :style="{ color: getNagColor(move.nag) }">
        {{ formatMove }}
      </span>
    </div>

    <div class="col-n">{{ move.total }}</div>

    <div class="col-pct cell-pct">
      <TrapBar 
        :w="move.w_cnt" 
        :b="move.b_cnt" 
      />
    </div>

    <div class="col-rate">{{ formatRate(move.w_rate) }}</div>
    <div class="col-rate">{{ formatRate(move.b_rate) }}</div>
  </div>
</template>

<style scoped>
.move-row {
  display: flex;
  padding: 6px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  align-items: center;
  text-align: right;
  cursor: pointer;
  transition: background 0.2s;
  font-family: 'Fira Code', monospace;
  font-size: 13px;
}

.move-row:hover {
  background: rgba(var(--color-accent-rgb), 0.1);
}

.col-move {
  width: 90px;
  justify-content: flex-start;
  text-align: left;
  display: flex;
}

.col-n {
  width: 60px;
  padding-right: 8px;
}

.col-pct {
  width: 120px;
  padding: 0 8px;
}

.col-rate {
  width: 45px;
  text-align: center;
  color: var(--color-text-secondary);
}

.move-text {
  font-weight: bold;
}
</style>
