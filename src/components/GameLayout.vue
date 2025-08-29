<!-- src/components/GameLayout.vue -->
<script setup lang="ts">
import { computed } from 'vue' // --- НАЧАЛО ИЗМЕНЕНИЙ: Импортируем computed ---
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

// --- НАЧАЛО ИЗМЕНЕНИЙ: Создаем вычисляемое свойство для animationEnabled ---
const isAnimationEnabled = computed(() => themeStore.currentTheme.animationDuration > 0)
// --- КОНЕЦ ИЗМЕНЕНИЙ ---

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
        <!-- --- НАЧАЛО ИЗМЕНЕНИЙ: Используем новое вычисляемое свойство --- -->
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
        <!-- --- КОНЕЦ ИЗМЕНЕНИЙ --- -->
        <slot name="center-column"></slot>
      </div>
    </div>

    <aside class="right-panel">
      <slot name="right-panel"></slot>
    </aside>

    <!-- Нижняя строка сетки -->
    <div class="bottom-left">
      <slot name="bottom-left"></slot>
    </div>

    <div class="bottom-info">
      <slot name="bottom-info"></slot>
    </div>

    <div class="bottom-right">
      <slot name="bottom-right"></slot>
    </div>
  </div>
</template>

<style scoped>
.game-layout {
  /* CSS переменные для управления сеткой из JS */
  --side-panel-width: 20vw;
  --center-column-width: 78vh; /* Квадратная ячейка = высота средней строки */
  --top-bottom-height: 5vh;
  --middle-height: var(--center-column-width);

  display: grid;
  width: 100%;
  max-width: 100vw;

  /* Сетка: 3 строки, 3 колонки */
  grid-template-rows: var(--top-bottom-height) var(--middle-height) var(--top-bottom-height);
  grid-template-columns: var(--side-panel-width) var(--center-column-width) var(--side-panel-width);

  grid-template-areas:
    'top-left top-info top-right'
    'left-panel center-column right-panel'
    'bottom-left bottom-info bottom-right';

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

/* Третья строка */
.bottom-left {
  grid-area: bottom-left;
}

.bottom-info {
  grid-area: bottom-info;
}

.bottom-right {
  grid-area: bottom-right;
}

/* Стили для боковых панелей */
.left-panel,
.right-panel {
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  padding: 10px;
  overflow-y: auto;
  min-width: 0; /* Убираем min-width: 200px для гибкости */

  /* Скрываем полосу прокрутки */
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}

/* Скрываем полосу прокрутки для WebKit браузеров (Chrome, Safari) */
.left-panel::-webkit-scrollbar,
.right-panel::-webkit-scrollbar {
  display: none;
}

/* Центральная колонка - квадратная */
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
  border-radius: 20px;
  overflow: hidden;
}

/* Стили для верхней и нижней строк */
.top-left,
.top-right,
.bottom-left,
.bottom-right {
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  padding: 5px;
}

.top-info-container,
.bottom-info {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  padding: 0px;
}

/* Мобильная версия с Flexbox */
@media (orientation: portrait) {
  .top-info-container {
    order: 0;
  }

  .center-column {
    order: 1; /* будет выше top-info */
  }

  .right-panel {
    order: 2;
  }

  .left-panel {
    order: 3;
  }
  .game-layout {
    /* Отключаем Grid и включаем Flexbox */
    display: flex;
    flex-direction: column;

    /* Размеры и позиционирование */
    width: 97vw;

    height: auto;
    min-height: 100vh;
    margin: 0 auto; /* Центрируем по горизонтали */

    /* Отступы и промежутки */
    padding: 10px 0;
    gap: 5px;

    /* Убираем ограничения Grid */
    grid-template-areas: none;
    grid-template-rows: none;
    grid-template-columns: none;

    /* Прокрутка */
    overflow-x: hidden;
    overflow-y: hidden;

    /* Скрываем полосу прокрутки, но оставляем функциональность */
    -ms-overflow-style: none;
    scrollbar-width: none;
    box-sizing: border-box;

    /* Строгий контроль границ контейнера */
    contain: layout style;
  }

  /* Скрываем полосу прокрутки для WebKit */
  .game-layout::-webkit-scrollbar {
    display: none;
  }

  /* Скрываем ненужные элементы */
  .top-left,
  .top-right,
  .bottom-left,
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

    /* Предотвращаем переполнение */
    max-width: 100%;
    box-sizing: border-box;
  }

  .center-column {
    width: 100%;
    padding: 0;
    margin: 0;
    flex-shrink: 0;

    /* Предотвращаем переполнение */
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

    /* Обеспечиваем правильную прокрутку для панелей */
    overflow-y: auto;
    -ms-overflow-style: none;
    scrollbar-width: none;

    /* Предотвращаем переполнение */
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
