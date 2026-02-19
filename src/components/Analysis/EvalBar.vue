<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  score: {
    type: 'cp' | 'mate'
    value: number
  } | null
  wdl?: {
    win: number
    draw: number
    loss: number
  } | null
  orientation: 'white' | 'black'
  turn?: 'white' | 'black' | null
}

const props = defineProps<Props>()

/**
 * Calculates winning chances from 0 to 100 for White.
 */
const whiteWinningChances = computed(() => {
  // 1. If we have WDL and turn info, use it for the most accurate percentage
  if (props.wdl && props.turn) {
    const { win, draw, loss } = props.wdl
    const total = win + draw + loss
    if (total > 0) {
      // Stockfish WDL is from POV of side to move
      const whiteWinProb = props.turn === 'white' ? win : loss
      const drawProb = draw

      // Expected points for white: (1*win + 0.5*draw + 0*loss) / total
      return ((whiteWinProb + drawProb * 0.5) / total) * 100
    }
  }

  // 2. Fallback to centipawns using Sigmoid (score is already normalized to White in AnalysisService)
  if (!props.score) return 50

  if (props.score.type === 'mate') {
    return props.score.value > 0 ? 100 : 0
  }

  const cp = props.score.value
  // Lichess formula: 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
  // Simplified: 100 / (1 + exp(-0.00368208 * cp))
  return 100 / (1 + Math.exp(-0.00368208 * cp))
})

const barStyle = computed(() => {
  const percent = whiteWinningChances.value
  return {
    height: `${percent}%`,
    [props.orientation === 'white' ? 'bottom' : 'top']: 0,
  }
})
</script>

<template>
  <transition name="fade-eval" appear>
    <div v-if="true" class="eval-bar">
      <div class="eval-bar-fill" :style="barStyle"></div>
    </div>
  </transition>
</template>

<style scoped>
.eval-bar {
  width: 100%;
  height: 100%;
  background-color: #1a1a1a;
  position: relative;
  overflow: hidden;
  user-select: none;
  box-shadow: inset 0 0 5px rgba(0,0,0,0.5);
}

.eval-bar-fill {
  position: absolute;
  left: 0;
  width: 100%;
  background: linear-gradient(to bottom, #ffffff, #dcdcdc);
  box-shadow: 0 0 10px rgba(255,255,255,0.2);
}

.fade-eval-enter-active,
.fade-eval-leave-active {
  transition: opacity 0.5s ease;
}

.fade-eval-enter-from,
.fade-eval-leave-to {
  opacity: 0;
}
</style>
