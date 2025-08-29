<!-- src/components/GameLayout.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useBoardStore } from '@/stores/board.store'
import { useGameStore } from '@/stores/game.store'
import { useAnalysisStore } from '@/stores/analysis.store'
import { useThemeStore } from '@/stores/theme.store'
import Chessboard from './Chessboard.vue'
import type { Key } from 'chessground/types'

const boardStore = useBoardStore()
const gameStore = useGameStore()
const analysisStore = useAnalysisStore()
const themeStore = useThemeStore()

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
  <div class="game-layout">
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

    <div class="center-column">
      <div class="board-aspect-wrapper">
        <Chessboard
          :fen="boardStore.fen"
          :orientation="boardStore.orientation"
          :turn-color="boardStore.turn"
          :dests="boardStore.dests"
          :last-move="boardStore.lastMove"
          :check="boardStore.isCheck"
          :promotion-state="boardStore.promotionState"
          :drawable-shapes="boardStore.drawableShapes"
          :is-analysis-mode="boardStore.isAnalysisModeActive"
          :animation-enabled="isAnimationEnabled"
          :animation-duration="themeStore.currentTheme.animationDuration"
          @user-move="handleUserMove"
          @complete-promotion="boardStore.completePromotion"
          @cancel-promotion="boardStore.cancelPromotion"
          @wheel-navigate="handleBoardWheel"
        />
        <slot name="center-column"></slot>
      </div>
    </div>

    <aside class="right-panel">
      <slot name="right-panel"></slot>
    </aside>

    <!-- --- НАЧАЛО ИЗМЕНЕНИЙ: Нижняя строка сетки удалена --- -->
    <!-- --- КОНЕЦ ИЗМЕНЕНИЙ --- -->
  </div>
</template>

<style scoped>
.game-layout {
  /* CSS переменные для управления сеткой */
  --side-panel-width: 20vw;
  --board-side: 80vh;
  --top-bottom-height: 5vh;

  display: grid;
  width: 100%;
  max-width: 100vw;

  /* --- НАЧАЛО ИЗМЕНЕНИЙ: Обновлена структура сетки --- */
  /* Сетка: 2 строки, 3 колонки */
  grid-template-rows: var(--top-bottom-height) var(--board-side);
  grid-template-columns: var(--side-panel-width) var(--board-side) var(--side-panel-width);

  grid-template-areas:
    'top-left top-info top-right'
    'left-panel center-column right-panel';
  /* --- КОНЕЦ ИЗМЕНЕНИЙ --- */

  gap: 1vh;
  padding: 10px;
  box-sizing: border-box;
  overflow: hidden;
  justify-content: center; /* Центрируем всю сетку горизонтально */
}

/* Первая строка */
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

/* Вторая строка (основная) */
.left-panel {
  grid-area: left-panel;
}

.right-panel {
  grid-area: right-panel;
}

/* --- НАЧАЛО ИЗМЕНЕНИЙ: Стили для удаленной третьей строки убраны --- */
/* --- КОНЕЦ ИЗМЕНЕНИЙ --- */

/* Стили для боковых панелей */
.left-panel,
.right-panel {
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  padding: 10px;
  overflow-y: auto;
  min-width: 0;

  /* Скрываем полосу прокрутки */
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}

/* Скрываем полосу прокрутки для WebKit браузеров */
.left-panel::-webkit-scrollbar,
.right-panel::-webkit-scrollbar {
  display: none;
}

/* Центральная колонка */
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
  position: sticky;
}

/* --- НАЧАЛО ИЗМЕНЕНИЙ: Обновлены стили для строк --- */
/* Стили для верхней строки */
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
/* --- КОНЕЦ ИЗМЕНЕНИЙ --- */

/* Мобильная версия с Flexbox */
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
    width: 97vw;
    height: auto;
    min-height: 100vh;
    margin: 0 auto;
    padding: 10px 0;
    gap: 5px;
    grid-template-areas: none;
    grid-template-rows: none;
    grid-template-columns: none;
    overflow-x: hidden;
    overflow-y: hidden;
    -ms-overflow-style: none;
    scrollbar-width: none;
    box-sizing: border-box;
    contain: layout style;
  }

  .game-layout::-webkit-scrollbar {
    display: none;
  }

  /* Скрываем ненужные элементы */
  .top-left,
  .top-right,
  .bottom-left, /* Оставляем на случай, если где-то используется */
  .bottom-right,
  .bottom-info {
    display: none;
  }

  /* Стили для отображаемых элементов */
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
    min-height: 150px;
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

  /* Убираем grid-area для мобильных */
  .top-info-container,
  .center-column,
  .right-panel,
  .left-panel {
    grid-area: unset;
  }
}
</style>
