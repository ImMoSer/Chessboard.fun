<!-- src/components/WebChessBoard.vue -->
<script setup lang="ts">
import type { PromotionState } from '@/entities/board/board.store'
import PromotionDialog from '@/entities/board/PromotionDialog.vue'
import { Chessground } from '@lichess-org/chessground'
import type { Api } from '@lichess-org/chessground/api'
import type { Config } from '@lichess-org/chessground/config'
import type { DrawShape } from '@lichess-org/chessground/draw'
import type {
    Color as ChessgroundColor,
    Dests,
    Key,
    MoveMetadata,
} from '@lichess-org/chessground/types'
import type { Role as ChessopsRole } from 'chessops/types'
import { onMounted, onUnmounted, ref, shallowRef, watch, type PropType } from 'vue'

const props = defineProps({
  fen: { type: String, required: true },
  orientation: { type: String as PropType<ChessgroundColor>, required: true },
  turnColor: { type: String as PropType<ChessgroundColor>, required: true },
  dests: { type: Map as PropType<Dests>, required: true },
  lastMove: { type: Array as PropType<Key[] | undefined>, default: undefined },
  check: { type: Boolean, default: false },
  promotionState: { type: Object as PropType<PromotionState | null>, default: null },
  drawableShapes: { type: Array as PropType<DrawShape[]>, default: () => [] },
  isAnalysisMode: { type: Boolean, default: false },
  animationEnabled: { type: Boolean, default: true },
  animationDuration: { type: Number, default: 200 },
})

const emit = defineEmits<{
  (e: 'user-move', payload: { orig: Key; dest: Key; metadata: MoveMetadata }): void
  (e: 'check-premove', payload: { orig: Key; dest: Key }): void
  (e: 'complete-promotion', role: ChessopsRole): void
  (e: 'wheel-navigate', direction: 'up' | 'down'): void
}>()

const chessboardRef = ref<HTMLElement | null>(null)
const ground = shallowRef<Api | null>(null)

const handleWheel = (event: WheelEvent) => {
  emit('wheel-navigate', event.deltaY > 0 ? 'down' : 'up')
}

onMounted(() => {
  if (chessboardRef.value) {
    const config: Config = {
      fen: props.fen,
      orientation: props.orientation,
      turnColor: props.turnColor,
      check: props.check,
      lastMove: props.lastMove,
      movable: {
        free: false,
        color: props.isAnalysisMode ? 'both' : props.orientation,
        dests: props.dests,
        showDests: true,
        events: {
          after: (orig, dest, metadata) => {
            emit('user-move', { orig, dest, metadata })
          },
        },
      },
      premovable: {
        enabled: true,
        showDests: true,
        castle: true,
      },
      animation: {
        enabled: props.animationEnabled,
        duration: props.animationDuration,
      },
      highlight: {
        lastMove: true,
        check: true,
      },
      drawable: {
        enabled: true,
        shapes: props.drawableShapes,
      },
    }
    ground.value = Chessground(chessboardRef.value, config)
  }
})

onUnmounted(() => {
  ground.value?.destroy()
  ground.value = null
})

// --- Atomic Watchers ---

// 1. Critical Position Update and Premove Check
watch(
  () => props.fen,
  (newFen) => {
    if (!ground.value) return

    ground.value.set({
      fen: newFen,
      turnColor: props.turnColor, // Ensure turn color is synced with FEN
    })

    // Premove Logic
    const premove = ground.value.state.premovable.current
    if (premove) {
      const [orig, dest] = premove
      emit('check-premove', { orig, dest })
    }
  },
)

// 2. Orientation
watch(
  () => props.orientation,
  (newOri) => {
    ground.value?.set({ orientation: newOri })
  },
)

// 3. Move Configuration
watch(
  [() => props.dests, () => props.turnColor, () => props.isAnalysisMode],
  ([dests, turnColor, isAnalysis]) => {
    ground.value?.set({
      turnColor,
      movable: {
        color: isAnalysis ? 'both' : props.orientation,
        dests: dests,
        free: false,
      },
    })
  },
)

// 4. Visuals (Last Move, Check)
watch(
  () => props.lastMove,
  (lm) => {
    ground.value?.set({ lastMove: lm })
  },
)

watch(
  () => props.check,
  (val) => {
    ground.value?.set({ check: val })
  },
)

// 5. Shapes
watch(
  () => props.drawableShapes,
  (shapes) => {
    ground.value?.setShapes(shapes)
  },
  { deep: true },
)

// 6. Animation Settings
watch([() => props.animationEnabled, () => props.animationDuration], ([enabled, duration]) => {
  ground.value?.set({
    animation: { enabled, duration },
  })
})
</script>

<template>
  <div class="board-wrapper" @wheel.passive="handleWheel">
    <div ref="chessboardRef" class="chessboard"></div>
    <PromotionDialog
      v-if="promotionState"
      :dest="promotionState.dest"
      :color="promotionState.color"
      :orientation="orientation"
      @piece-selected="(role) => emit('complete-promotion', role)"
    />
  </div>
</template>

<style scoped>
.board-wrapper {
  width: 100%;
  height: 100%;
  position: absolute;
  /* Блокируем системный скролл на доске */
  touch-action: none;
}

.chessboard {
  width: 100%;
  height: 100%;
}
</style>
