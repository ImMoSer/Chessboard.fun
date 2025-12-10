<!-- src/components/PromotionDialog.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { Role as ChessopsRole } from 'chessops/types'
import type { Key } from '@lichess-org/chessground/types'
import { key2pos } from '@lichess-org/chessground/util'

const props = defineProps<{
  dest: Key
  color: 'white' | 'black'
  orientation: 'white' | 'black'
}>()

const emit = defineEmits<{
  (e: 'piece-selected', role: ChessopsRole): void
  (e: 'close'): void
}>()

const promotionRoles: ChessopsRole[] = ['queen', 'knight', 'rook', 'bishop']

const squareStyles = computed(() => {
  const [file, rank] = key2pos(props.dest) // file: 0..7, rank: 0..7

  return (role: ChessopsRole) => {
    const roleIndex = promotionRoles.indexOf(role)

    // Calculate Grid Positions (1-based)
    let col: number
    let row: number

    if (props.orientation === 'white') {
      col = file + 1
      // If white promotes (rank 7 or 8 -> top), direction is downwards.
      // If black promotes (rank 0 or 1 -> bottom), direction is upwards.
      // Wait, usually promotion happens at ends.
      // White promotes at rank 7 (8th rank). Pieces appear at 8, 7, 6, 5.
      // CSS Grid Row 1 is top (Rank 8). Row 8 is bottom (Rank 1).

      // If white promotes (rank 7 or 8 -> top), direction is downwards.
      // key2pos: 'a1' -> [0, 0]. 'a8' -> [0, 7].

      // GRID: Row 1 = Rank 8 (index 7). Row 8 = Rank 1 (index 0).
      // Formula: gridRow = 8 - rankIndex.

      // Start position:
      const startRankIdx = rank

      // Direction: White promotes at rank 7. Spreads to 6, 5, 4. (Downwards visually)
      // Black promotes at rank 0. Spreads to 1, 2, 3. (Upwards visually)

      // But we iterate roleIndex 0, 1, 2, 3.
      // White: rankIdx = 7, 6, 5, 4.
      // Black: rankIdx = 0, 1, 2, 3.

      let targetRankIdx: number
      if (props.color === 'white') {
        targetRankIdx = startRankIdx - roleIndex
      } else {
        targetRankIdx = startRankIdx + roleIndex
      }

      row = 8 - targetRankIdx

    } else {
      // Orientation Black
      // Files: h->a. Col 1 = h(7), Col 8 = a(0).
      // Grid Col = 8 - file.
      col = 8 - file

      // Ranks: 1->8. Row 1 = Rank 1 (index 0). Row 8 = Rank 8 (index 7).
      // Grid Row = rank + 1.

      const startRankIdx = rank

      let targetRankIdx: number
      if (props.color === 'white') {
         // White promotes at rank 7. Displaces to 6, 5, 4.
         targetRankIdx = startRankIdx - roleIndex
      } else {
         // Black promotes at rank 0. Displaces to 1, 2, 3.
         targetRankIdx = startRankIdx + roleIndex
      }

      row = targetRankIdx + 1
    }

    return {
      gridColumn: col,
      gridRow: row
    }
  }
})

function onPieceSelected(role: ChessopsRole) {
  emit('piece-selected', role)
}
</script>

<template>
  <div class="promotion-overlay" @click.self="emit('close')">
    <div
      v-for="role in promotionRoles"
      :key="role"
      class="promotion-square"
      :style="squareStyles(role)"
      @click="onPieceSelected(role)"
    >
      <piece :class="`${color} ${role}`"></piece>
    </div>
  </div>
</template>

<style scoped>
.promotion-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  z-index: 100;
  background-color: rgba(0,0,0,0.5); /* Dim the board slightly */
}

.promotion-square {
  cursor: pointer;
  border-radius: 50%;
  background-color: var(--color-background-soft, #f8f9fa);
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s;
  /* Ensure pieces don't overflow */
  overflow: hidden;
  /* Add margin to stay within square bounds visibly - optional, but helps aesthetics */
  margin: 2px;
}

.promotion-square:hover {
  transform: scale(1.1);
  background-color: var(--color-primary-light, #e9ecef);
}

.promotion-square piece {
  width: 100%;
  height: 100%;
  background-size: cover;
}
</style>
