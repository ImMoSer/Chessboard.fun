<!-- src/components/GameLayout.vue -->
<script setup lang="ts">
import { useAnalysisStore } from '@/stores/analysis.store'
import { useBoardStore } from '@/stores/board.store'
import { useGameStore } from '@/stores/game.store'
import { useThemeStore } from '@/stores/theme.store'
import type { Key } from '@lichess-org/chessground/types'
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import WebChessBoard from './WebChessBoard.vue'

const themeStore = useThemeStore()
const boardStore = useBoardStore()
const gameStore = useGameStore()
const analysisStore = useAnalysisStore()
const route = useRoute()

const isAnimationEnabled = computed(() => themeStore.currentTheme.animationDuration > 0)

// Force analysis mode if we are in study views, to prevent race conditions or store resets
const effectiveAnalysisMode = computed(() => {
  return boardStore.isAnalysisModeActive || route.path.startsWith('/study')
})

const handleUserMove = ({ orig, dest }: { orig: Key; dest: Key }) => {
  if (effectiveAnalysisMode.value) {
    boardStore.handleAnalysisMove({ orig, dest })
  } else {
    gameStore.handleUserMove(orig, dest)
  }
}

const handleBoardWheel = (direction: 'up' | 'down') => {
  if (analysisStore.isAnalysisActive || effectiveAnalysisMode.value) {
    // Разрешаем скролл и в режиме анализа
    if (direction === 'up') {
      boardStore.navigatePgn('backward')
    } else {
      boardStore.navigatePgn('forward')
    }
  }
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    // Don't navigate if user is typing in an input or textarea
    if (['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) {
      return
    }

    event.preventDefault()

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      boardStore.navigatePgn('backward')
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      boardStore.navigatePgn('forward')
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="game-layout">
    <!-- Main Grid Logic -->
    <div class="layout-main">
      <aside class="left-panel">
        <slot name="left-panel"></slot>
      </aside>

      <!-- Center Stage: Top Info -> Board -> Controls -->
      <div class="center-stage" ref="centerColumnRef">
        <div class="cb-top-panel">
          <slot name="top-info"></slot>
        </div>

        <div class="board-aspect-wrapper">
          <WebChessBoard
            :fen="boardStore.fen"
            :orientation="boardStore.orientation"
            :turn-color="boardStore.turn"
            :dests="boardStore.dests"
            :last-move="boardStore.lastMove"
            :check="boardStore.isCheck"
            :promotion-state="boardStore.promotionState"
            :drawable-shapes="boardStore.drawableShapes"
            :is-analysis-mode="effectiveAnalysisMode"
            :animation-enabled="isAnimationEnabled"
            :animation-duration="themeStore.currentTheme.animationDuration"
            @user-move="handleUserMove"
            @check-premove="handleUserMove"
            @complete-promotion="boardStore.completePromotion"
            @cancel-promotion="boardStore.cancelPromotion"
            @wheel-navigate="handleBoardWheel"
          />
          <!-- Center slot for overlays or additional content -->
          <div class="center-column-overlay">
            <slot name="center-column"></slot>
          </div>
        </div>

        <div class="cb-down-panel">
          <slot name="controls"></slot>
        </div>
      </div>

      <aside class="right-panel">
        <slot name="right-panel"></slot>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.game-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  overflow: hidden;
  background-color: var(--color-bg-primary);
}

.layout-main {
  display: grid;
  flex: 1;
  /* Columns: Left (flex) | Center (Auto/Fit Content) | Right (flex) */
  /* Using minmax for center to prevent it from disappearing, but ideally it drives the width */
  grid-template-columns: 2fr auto 3fr;
  gap: 20px;
  min-height: 0;
  justify-content: center;
}

/* --- Center Stage Area --- */
.center-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: min-content; /* Ensure it doesn't shrink below board size */
  height: 100%;
}

.cb-top-panel,
.cb-down-panel {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 40px; /* Base height reserve */
}

/* Board always square, sized by viewport height logic, but constrained by panels */
.board-aspect-wrapper {
  /*
     Calc logic: 100vh - (padding + gaps + top/bottom panels approx height).
     Safety margin to ensure it fits without scrolling on desktop.
     Adjust 140px based on actual panel heights (~50px top + ~50px bottom + 40px paddings/gaps)
  */
  height: calc(100vh - 140px);
  width: calc(100vh - 140px);
  max-width: 100%;
  aspect-ratio: 1 / 1;
  position: relative;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  flex-shrink: 1;
}

.center-column-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.center-column-overlay > * {
  pointer-events: auto;
}

/* --- Side Panels --- */
.left-panel,
.right-panel {
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  padding: 10px;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  scrollbar-width: none;
  height: 100%;
}

/* Hide scrollbars */
.left-panel::-webkit-scrollbar,
.right-panel::-webkit-scrollbar {
  display: none;
}

/* --- Responsive / Mobile --- */

@media (max-width: 1200px) {
  .layout-main {
    /* Shrink side panels on smaller desktops */
    grid-template-columns: 250px auto 300px;
    gap: 10px;
  }
}

@media (orientation: portrait) {
  .game-layout {
    height: 100%;
    overflow-y: auto; /* Enable scroll for the whole page on mobile */
    padding: 10px;
    display: block; /* Stack everything */
  }

  .layout-main {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  /* Reorder for Mobile: Panel -> Board -> Controls -> Left -> Right */
  .center-stage {
    order: 1;
    width: 100%;
    height: auto;
    justify-content: flex-start;
  }

  .left-panel {
    order: 2;
    height: auto;
    min-height: 200px;
  }

  .right-panel {
    order: 3;
    height: auto;
    min-height: 300px;
  }

  .board-aspect-wrapper {
    width: 95vw;
    height: 95vw; /* Maximize width on mobile */
    margin: 5px auto;
  }

  .cb-top-panel,
  .cb-down-panel {
    width: 100%;
    min-height: auto;
  }
}
</style>
