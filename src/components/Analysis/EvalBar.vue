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

const displayScore = computed(() => {
  if (!props.score) return ''
  if (props.score.type === 'mate') {
    return `M${Math.abs(props.score.value)}`
  }
  const val = props.score.value / 100
  return (val > 0 ? '+' : '') + val.toFixed(1)
})

const barStyle = computed(() => {
  const percent = whiteWinningChances.value
  return {
    height: `${percent}%`,
    [props.orientation === 'white' ? 'bottom' : 'top']: 0,
  }
})

const textPosition = computed(() => {
  const percent = whiteWinningChances.value
  const isWhiteAdvantage = percent > 50

  if (props.orientation === 'white') {
    return isWhiteAdvantage ? 'bottom' : 'top'
  } else {
    return isWhiteAdvantage ? 'top' : 'bottom'
  }
})
</script>

<template>
  <div class="eval-bar">
    <div class="eval-bar-fill" :style="barStyle"></div>
    <div
      class="eval-score-text"
      :class="textPosition"
    >
      {{ displayScore }}
    </div>
  </div>
</template>

<style scoped>
.eval-bar {
  width: 12px;
  height: 100%;
  background-color: #444444; /* Dark side color */
  position: relative;
  overflow: hidden;
  border-radius: 2px;
  user-select: none;
}

.eval-bar-fill {
  position: absolute;
  left: 0;
  width: 100%;
  background-color: #C0C0C0; /* Light side color */
  transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.eval-score-text {
  position: absolute;
  width: 100%;
  text-align: center;
  font-size: 9px;
  font-weight: 900;
  z-index: 10;
  pointer-events: none;
  font-family: 'Inter', system-ui, sans-serif;
  left: 0;
  right: 0;
}

.eval-score-text.top {
  top: 4px;
  color: #C0C0C0;
  text-shadow: 0 1px 2px rgba(0,0,0,1);
}

.eval-score-text.bottom {
  bottom: 4px;
  color: #444444;
  text-shadow: 0 0px 1px rgba(255,255,255,0.8);
}
</style>
