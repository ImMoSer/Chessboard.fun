<!-- src/components/Chessboard.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef, type PropType } from 'vue'
import { Chessground } from '@lichess-org/chessground'
import type { Api } from '@lichess-org/chessground/api'
import type { Config } from '@lichess-org/chessground/config'
import type { Key, Dests, Color as ChessgroundColor, MoveMetadata } from '@lichess-org/chessground/types'
import PromotionDialog from './PromotionDialog.vue'
import type { Role as ChessopsRole } from 'chessops/types'
import type { DrawShape } from '@lichess-org/chessground/draw'
import logger from '../utils/logger'
import { useBoardStore } from '@/stores/board.store'

const props = defineProps({
  fen: { type: String, required: true },
  orientation: { type: String as PropType<ChessgroundColor>, required: true },
  turnColor: { type: String as PropType<ChessgroundColor>, required: true },
  dests: { type: Map as PropType<Dests>, required: true },
  lastMove: { type: Array as PropType<Key[] | undefined>, default: undefined },
  check: { type: Boolean, default: false },
  promotionState: { type: Object as PropType<any | null>, default: null },
  drawableShapes: { type: Array as PropType<DrawShape[]>, default: () => [] },
  isAnalysisMode: { type: Boolean, default: false },
  // --- НАЧАЛО ИЗМЕНЕНИЙ: Добавлены props для управления анимацией ---
  animationEnabled: { type: Boolean, default: true },
  animationDuration: { type: Number, default: 200 },
  // --- КОНЕЦ ИЗМЕНЕНИЙ ---
})

const emit = defineEmits<{
  (e: 'user-move', payload: { orig: Key; dest: Key; metadata: MoveMetadata }): void
  (e: 'complete-promotion', role: ChessopsRole): void
  (e: 'cancel-promotion'): void
  (e: 'wheel-navigate', direction: 'up' | 'down'): void
}>()

const boardStore = useBoardStore()
const chessboardRef = ref<HTMLElement | null>(null)
const groundApi = shallowRef<Api | null>(null)

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
        free: props.isAnalysisMode,
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
      // --- НАЧАЛО ИЗМЕНЕНИЙ: Используем props для настройки анимации ---
      animation: {
        enabled: props.animationEnabled,
        duration: props.animationDuration,
      },
      // --- КОНЕЦ ИЗМЕНЕНИЙ ---
      highlight: {
        lastMove: true,
        check: true,
      },
      drawable: {
        enabled: true,
        shapes: props.drawableShapes,
      },
    }
    groundApi.value = Chessground(chessboardRef.value, config)
    boardStore.setGroundApi(groundApi.value)
  }
})

onUnmounted(() => {
  groundApi.value?.destroy()
  boardStore.setGroundApi(null)
})

// --- НАЧАЛО ИЗМЕНЕНИЙ: Оптимизированный наблюдатель для обновления доски ---
watch(
  () => [
    props.fen,
    props.dests,
    props.turnColor,
    props.check,
    props.lastMove,
    props.orientation,
    props.isAnalysisMode,
    props.animationEnabled,
    props.animationDuration,
  ],
  () => {
    if (groundApi.value) {
      // Используем api.set() для точечного обновления.
      // Chessground сам смерджит изменения, не удаляя существующие обработчики событий.
      groundApi.value.set({
        fen: props.fen,
        turnColor: props.turnColor,
        check: props.check,
        lastMove: props.lastMove,
        orientation: props.orientation,
        movable: {
          dests: props.dests,
          free: props.isAnalysisMode,
          color: props.isAnalysisMode ? 'both' : props.orientation,
        },
        animation: {
          enabled: props.animationEnabled,
          duration: props.animationDuration,
        },
      })
    }
  },
  { deep: true },
)
// --- КОНЕЦ ИЗМЕНЕНИЙ ---

watch(
  () => props.drawableShapes,
  (newShapes) => {
    groundApi.value?.setShapes(newShapes)
  },
  { deep: true },
)
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
      @close="emit('cancel-promotion')"
    />
  </div>
</template>

<style>
.board-wrapper {
  width: 100%;
  height: 100%;
  position: absolute;
}

.chessboard {
  width: 100%;
  height: 100%;
}
</style>
