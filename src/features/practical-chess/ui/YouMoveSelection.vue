<!-- src/features/practical-chess/ui/YouMoveSelection.vue -->
<script setup lang="ts">
import { usePracticalChessStore } from '@/features/practical-chess/model/practicalChess.store';

const practicalStore = usePracticalChessStore()

const handleSelection = (color: 'white' | 'black') => {
  practicalStore.startYouMoveGame(color)
}
</script>

<template>
  <div class="you-move-bar">
    <button class="side-btn black" @click="handleSelection('black')">
      BLACK
    </button>

    <div class="center-text">
       CHOOSE SIDE
    </div>

    <button class="side-btn white" @click="handleSelection('white')">
      WHITE
    </button>
  </div>
</template>

<style scoped>
.you-move-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  padding: 0 20px;
  box-sizing: border-box;
  gap: 15px;
}

.center-text {
  font-size: 1.4rem;
  font-weight: 900;
  letter-spacing: 2px;
  color: var(--color-accent-primary);
  text-transform: uppercase;
  white-space: nowrap;
  text-shadow: 0 0 10px rgba(0, 242, 255, 0.4);
}

.side-btn {
  flex: 1;
  max-width: 180px;
  height: 42px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  font-weight: 800;
  text-transform: uppercase;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  letter-spacing: 1px;
}

.side-btn.black {
  background: rgba(0, 0, 0, 0.6);
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.3);
}

.side-btn.black:hover {
  background: rgba(251, 191, 36, 0.2);
  border-color: #fbbf24;
  box-shadow: 0 0 15px rgba(251, 191, 36, 0.4);
}

.side-btn.white {
  background: rgba(255, 255, 255, 0.9);
  color: #000;
  border-color: #fff;
}

.side-btn.white:hover {
  background: #fff;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

@media (max-width: 600px) {
  .center-text {
    font-size: 1rem;
    letter-spacing: 1px;
  }
  .side-btn {
    font-size: 0.75rem;
    padding: 0 10px;
  }
}
</style>
