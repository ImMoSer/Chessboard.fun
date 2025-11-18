<!-- src/components/GameLayout.vue -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue' // --- ИЗМЕНЕНИЕ: Добавлен watch
import { useBoardStore } from '@/stores/board.store'
import { useGameStore } from '@/stores/game.store'
import { useAnalysisStore } from '@/stores/analysis.store'
import { useThemeStore } from '@/stores/theme.store'
import Chessboard from './Chessboard.vue'
import type { Key } from 'chessground/types'
import { useBoardResizer } from '../composables/useBoardResizer'

const centerColumnRef = ref<HTMLElement | null>(null)

// --- НАЧАЛО ИЗМЕНЕНИЙ: Интеграция с themeStore ---
const themeStore = useThemeStore()

// Инициализируем наш composable, передавая начальный размер из themeStore
// и функцию для сохранения нового размера
const { size: boardSize, startResize } = useBoardResizer(
  centerColumnRef,
  themeStore.currentTheme.boardSize,
  (newSize) => themeStore.setBoardSize(newSize), // Колбэк для сохранения
  400,
  1200,
)

// Наблюдаем за изменениями в store (например, из другого компонента или настроек)
// и синхронизируем локальный размер
watch(
  () => themeStore.currentTheme.boardSize,
  (newSize) => {
    boardSize.value = newSize
  },
)

// Создаем вычисляемое свойство для динамического обновления CSS переменной
const layoutStyle = computed(() => ({
  '--board-side': `${boardSize.value}px`,
}))
// --- КОНЕЦ ИЗМЕНЕНИЙ ---

const boardStore = useBoardStore()
const gameStore = useGameStore()
const analysisStore = useAnalysisStore()

const isAnimationEnabled = computed(() => themeStore.currentTheme.animationDuration > 0)

const handleUserMove = ({ orig, dest }: { orig: Key; dest: Key }) => {
  if (boardStore.isAnalysisModeActive) {
    boardStore.handleAnalysisMove({ orig, dest })
  } else {
    gameStore.handleUserMove(orig, dest)
  }
}

const handleBoardWheel = (direction: 'up' | 'down') => {
  if (analysisStore.isAnalysisActive) {
    if (direction === 'up') {
      boardStore.navigatePgn('backward')
    } else {
      boardStore.navigatePgn('forward')
    }
  }
}
</script>

<template>
  <div class="game-layout" :style="layoutStyle">
    <!-- Верхняя строка сетки -->
    <div class="top-left">
      <slot name="top-left"></slot>
    </div>

    <div class="top-info-container">
      <slot name="top-info"></slot>
    </div>

    <div class="top-right">
      <slot name="top-right"></slot>
    </div>

    <!-- Средняя строка сетки -->
    <aside class="left-panel">
      <slot name="left-panel"></slot>
    </aside>

    <div class="center-column" ref="centerColumnRef">
      <div class="board-aspect-wrapper">
        <Chessboard :fen="boardStore.fen" :orientation="boardStore.orientation" :turn-color="boardStore.turn"
          :dests="boardStore.dests" :last-move="boardStore.lastMove" :check="boardStore.isCheck"
          :promotion-state="boardStore.promotionState" :drawable-shapes="boardStore.drawableShapes"
          :is-analysis-mode="boardStore.isAnalysisModeActive" :animation-enabled="isAnimationEnabled"
          :animation-duration="themeStore.currentTheme.animationDuration" @user-move="handleUserMove"
          @complete-promotion="boardStore.completePromotion" @cancel-promotion="boardStore.cancelPromotion"
          @wheel-navigate="handleBoardWheel" />
        <slot name="center-column"></slot>
      </div>
      <div class="board-resizer" @mousedown="startResize"></div>
    </div>

    <aside class="right-panel">
      <slot name="right-panel"></slot>
    </aside>
  </div>
</template>

<style scoped>
.game-layout {
  --side-panel-width: 300px;
  --top-bottom-height: 5vh;

  display: grid;
  width: 100%;
  max-width: 100vw;

  grid-template-rows: var(--top-bottom-height) var(--board-side);
  grid-template-columns: var(--side-panel-width) var(--board-side) var(--side-panel-width);

  grid-template-areas:
    'top-left top-info top-right'
    'left-panel center-column right-panel';

  gap: 1vh;
  padding: 10px;
  box-sizing: border-box;
  overflow: hidden;
  justify-content: center;
}

.top-left {
  grid-area: top-left;
}

.top-info-container {
  grid-area: top-info;
  min-height: var(--top-bottom-height);
  width: 100%;
}

.top-right {
  grid-area: top-right;
}

.left-panel {
  grid-area: left-panel;
}

.right-panel {
  grid-area: right-panel;
}

.left-panel,
.right-panel {
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  padding: 10px;
  overflow-y: auto;
  min-width: 0;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.left-panel::-webkit-scrollbar,
.right-panel::-webkit-scrollbar {
  display: none;
}

.center-column {
  grid-area: center-column;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.board-aspect-wrapper {
  width: 100%;
  aspect-ratio: 1 / 1;
  position: relative;
}

.board-resizer {
  position: absolute;
  right: -5px;
  bottom: -5px;
  width: 20px;
  height: 20px;
  cursor: se-resize;
  z-index: 100;
}

@media (orientation: portrait) {
  .board-resizer {
    display: none;
  }
}

.top-left,
.top-right {
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  padding: 5px;
}

.top-info-container {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  padding: 0px;
}

@media (orientation: portrait) {
  .top-info-container {
    order: 0;
  }

  .center-column {
    order: 1;
  }

  .right-panel {
    order: 2;
  }

  .left-panel {
    order: 3;
  }

  .game-layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    width: 97vw;
    height: auto;

    margin: 0 auto;
    padding: 10px 0;
    gap: 5px;
    grid-template-areas: none;
    grid-template-rows: none;
    grid-template-columns: none;
    overflow-x: hidden;
    overflow-y: auto;
    -ms-overflow-style: none;
    scrollbar-width: none;
    box-sizing: border-box;
    contain: layout style;
  }

  .game-layout::-webkit-scrollbar {
    display: none;
  }

  .top-left,
  .top-right,
  .bottom-left,
  .bottom-right,
  .bottom-info {
    display: none;
  }

  .top-info-container {
    width: 100%;
    min-height: 60px;
    margin: 0;
    flex-shrink: 0;
    max-width: 100%;
    box-sizing: border-box;
  }

  .center-column {
    width: 100%;
    padding: 0;
    margin: 0;
    flex-shrink: 0;
    max-width: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }

  .board-aspect-wrapper {
    width: 100%;
    box-sizing: border-box;
    border-radius: 10px;
  }

  .right-panel,
  .left-panel {
    width: 100%;
    margin: 0;
    min-height: 50px;
    max-height: 1000px;
    flex-shrink: 0;
    overflow-y: auto;
    -ms-overflow-style: none;
    scrollbar-width: none;
    max-width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .right-panel::-webkit-scrollbar,
  .left-panel::-webkit-scrollbar {
    display: none;
  }

  .top-info-container,
  .center-column,
  .right-panel,
  .left-panel {
    grid-area: unset;
  }
}
</style>
