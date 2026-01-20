<!-- src/components/study/StudyLayout.vue -->
<script setup lang="ts">
import { useBoardStore } from '@/stores/board.store'
import { useThemeStore } from '@/stores/theme.store'
import type { Key } from '@lichess-org/chessground/types'
import { computed, onMounted, onUnmounted } from 'vue'
import WebChessBoard from '../WebChessBoard.vue'

const themeStore = useThemeStore()
const boardStore = useBoardStore()

const isAnimationEnabled = computed(() => themeStore.currentTheme.animationDuration > 0)

const handleUserMove = ({ orig, dest }: { orig: Key; dest: Key }) => {
  // В студии всегда режим анализа
  boardStore.handleAnalysisMove({ orig, dest })
}

const handleBoardWheel = (direction: 'up' | 'down') => {
  if (direction === 'up') {
    boardStore.navigatePgn('backward')
  } else {
    boardStore.navigatePgn('forward')
  }
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
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
  <div class="study-layout">
    <!-- Верхняя строка -->
    <div class="top-info-container">
      <slot name="top-info"></slot>
    </div>

    <!-- Основная сетка -->
    <div class="layout-main">
      <aside class="left-panel">
        <slot name="left-panel"></slot>
      </aside>

      <div class="center-column">
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
            :is-analysis-mode="true"
            :animation-enabled="isAnimationEnabled"
            :animation-duration="themeStore.currentTheme.animationDuration"
            @user-move="handleUserMove"
            @check-premove="handleUserMove"
            @complete-promotion="boardStore.completePromotion"
            @cancel-promotion="boardStore.cancelPromotion"
            @wheel-navigate="handleBoardWheel"
          />
        </div>
      </div>

      <aside class="right-panel">
        <slot name="right-panel"></slot>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.study-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  background-color: var(--color-bg-primary);
  overflow: hidden;
}

.top-info-container {
  height: 50px;
  margin-bottom: 10px;
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.layout-main {
  display: grid;
  flex: 1;
  /* Левая панель 350px, Центр 90vh (под размер доски), Правая забирает всё остальное */
  grid-template-columns: 2fr 90vh 3fr;
  gap: 10px;
  min-height: 0;
}

.center-column {
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 0;
}

/* Контейнер для доски, который всегда остается квадратным и вписывается в экран */
.board-aspect-wrapper {
  height: 90vh;
  width: 90vh;
  max-width: 100%;
  /* Защита от выхода за пределы колонки */
  aspect-ratio: 1 / 1;
  position: relative;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.left-panel,
.right-panel {
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  padding: 10px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* Запрещаем скролл самого контейнера */
}

/* Скрываем скроллбары для красоты как в оригинале */
.left-panel::-webkit-scrollbar,
.right-panel::-webkit-scrollbar {
  display: none;
}

.left-panel,
.right-panel {
  scrollbar-width: none;
}

@media (max-width: 1200px) {
  .layout-main {
    grid-template-columns: 300px 1fr 380px;
  }
}

/* Адаптивность для мобилок (портрет) оставляем как в GameLayout или упрощаем */
@media (orientation: portrait) {
  .study-layout {
    height: 100%;
    overflow-y: auto;
  }

  .layout-main {
    display: flex;
    flex-direction: column;
    grid-template-columns: none;
  }

  .board-aspect-wrapper {
    width: 95vw;
    height: 95vw;
    margin: 10px auto;
  }

  .left-panel,
  .right-panel {
    height: 400px;
    /* Фиксированная высота для списков на мобилках */
    flex-shrink: 0;
  }
}
</style>
