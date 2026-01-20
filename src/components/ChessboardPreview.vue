<!-- src/components/ChessboardPreview.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, shallowRef } from 'vue'
import { Chessground } from '@lichess-org/chessground'
import type { Api } from '@lichess-org/chessground/api'
import type { Config } from '@lichess-org/chessground/config'
import type { Color as ChessgroundColor } from '@lichess-org/chessground/types'

const props = defineProps({
  fen: {
    type: String,
    required: true,
  },
  orientation: {
    type: String as () => ChessgroundColor,
    default: 'white',
  },
})

const chessboardRef = ref<HTMLElement | null>(null)
const groundApi = shallowRef<Api | null>(null)

const initChessground = () => {
  if (chessboardRef.value) {
    const config: Config = {
      fen: props.fen,
      orientation: props.orientation,
      viewOnly: true,
    }
    groundApi.value = Chessground(chessboardRef.value, config)
  }
}

onMounted(() => {
  initChessground()
})

onUnmounted(() => {
  groundApi.value?.destroy()
  groundApi.value = null
})

watch(
  () => props.fen,
  (newFen) => {
    if (groundApi.value) {
      groundApi.value.set({
        fen: newFen,
      })
    }
  },
)

watch(
  () => props.orientation,
  (newOrientation) => {
    if (groundApi.value) {
      groundApi.value.set({
        orientation: newOrientation,
      })
    }
  },
)
</script>

<template>
  <div ref="chessboardRef" class="chessboard-preview"></div>
</template>

<style scoped>
.chessboard-preview {
  width: 100%;
  padding-bottom: 100%;
  /* Соотношение сторон 1:1 */
  position: relative;
  overflow: hidden;
}

.chessboard-preview :deep(.cg-wrap) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
