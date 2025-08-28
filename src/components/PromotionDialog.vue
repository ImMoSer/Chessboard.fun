<!-- src/components/PromotionDialog.vue -->
<script setup lang="ts">
import { computed, type PropType } from 'vue'
import type { Role as ChessopsRole } from 'chessops/types'
import type { Key, Color as ChessgroundColor } from 'chessground/types'
import { key2pos } from 'chessground/util'

const props = defineProps({
  dest: {
    type: String as PropType<Key>,
    required: true,
  },
  color: {
    type: String as PropType<ChessgroundColor>,
    required: true,
  },
  orientation: {
    type: String as PropType<ChessgroundColor>,
    required: true,
  },
})

const emit = defineEmits<{
  (e: 'piece-selected', role: ChessopsRole): void
  (e: 'close'): void
}>()

const promotionRoles: ChessopsRole[] = ['queen', 'rook', 'bishop', 'knight']

function onPieceSelected(role: ChessopsRole) {
  emit('piece-selected', role)
}

// Логика позиционирования, перенесенная из старого promotionView.ts
const promotionStyle = computed(() => {
  const [fileIndex] = key2pos(props.dest)

  const columnLeft = (props.orientation === 'white' ? fileIndex : 7 - fileIndex) * 12.5

  return (role: ChessopsRole) => {
    const roleIndex = promotionRoles.indexOf(role)
    let rowTop: number

    if (props.orientation === 'white') {
      rowTop = props.color === 'white' ? roleIndex * 12.5 : (7 - roleIndex) * 12.5
    } else {
      // orientation is black
      rowTop = props.color === 'white' ? (7 - roleIndex) * 12.5 : roleIndex * 12.5
    }

    return {
      top: `${rowTop}%`,
      left: `${columnLeft}%`,
    }
  }
})
</script>

<template>
  <div class="promotion-dialog-overlay" @click="emit('close')">
    <div
      v-for="role in promotionRoles"
      :key="role"
      class="promotion-square"
      :style="promotionStyle(role)"
      @click.stop="onPieceSelected(role)"
    >
      <!-- Теперь Vue знает, что <piece> - это кастомный тег -->
      <piece :class="`${color} ${role}`"></piece>
    </div>
  </div>
</template>

<style scoped>
/* Стили из старого promotion.css */
.promotion-dialog-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(22, 21, 18, 0.85);
  z-index: 200;
  pointer-events: auto;
}

.promotion-square {
  position: absolute;
  width: 12.5%;
  height: 12.5%;
  cursor: pointer;
  background-color: var(--color-text-default, white);
  border-radius: 45%;
  box-shadow: inset 0 0 15px 2px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease-in-out;
  pointer-events: auto;
}

.promotion-square:hover {
  border-radius: 35%;
  box-shadow: inset 0 0 30px 5px rgba(19, 173, 246, 0.75);
  z-index: 201;
  transform: scale(1.05);
}

.promotion-square piece {
  width: 85%;
  height: 85%;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  pointer-events: none;
}
</style>
