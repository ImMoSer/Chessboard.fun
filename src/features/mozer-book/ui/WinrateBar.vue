<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  win_p: number
  draw_p: number
  loss_p: number
  turn: 'white' | 'black'
  showScore?: boolean
  mini?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showScore: true,
  mini: false,
})

const calculateScore = computed(() => {
  // Green bar and percentage represent White points (1-0)
  const whiteWins = props.turn === 'white' ? props.win_p : props.loss_p
  return whiteWins + props.draw_p * 0.5
})

const barWidths = computed(() => {
  const whiteWins = props.turn === 'white' ? props.win_p : props.loss_p
  const blackWins = props.turn === 'black' ? props.win_p : props.loss_p

  return {
    w: whiteWins,
    d: props.draw_p,
    l: blackWins,
  }
})
</script>

<template>
  <div class="score-bar-container" :class="{ mini }">
    <div class="score-bar-green" :style="{ width: barWidths.w + '%' }"></div>
    <div class="score-bar-grey" :style="{ width: barWidths.d + '%' }"></div>
    <div class="score-bar-red" :style="{ width: barWidths.l + '%' }"></div>
    <div class="mid-line-static"></div>
    <span v-if="showScore" class="score-text">{{ calculateScore.toFixed(1) }}</span>
  </div>
</template>

<style scoped>
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

.score-bar-container.mini {
  height: 12px;
  border: none;
}

.score-bar-green {
  background: #4caf50;
  height: 100%;
  flex-shrink: 0;
}

.score-bar-grey {
  background: #7e57c2;
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
  /* Centering if needed, though original relied on absolute position */
  left: 5px;
  top: 50%;
  transform: translateY(-50%);
}

.mini .score-text {
  font-size: 9px;
  left: 3px;
}
</style>
