<script setup lang="ts">
import { pgnService } from '@/services/PgnService'
import { useBoardStore } from '@/stores/board.store'
import { useStudyStore } from '@/stores/study.store'
import { NTooltip, useMessage } from 'naive-ui'

const boardStore = useBoardStore()
const studyStore = useStudyStore()
const message = useMessage()

const handleFlip = () => {
  boardStore.flipBoard()
}

const handleStart = () => boardStore.navigatePgn('start')
const handlePrev = () => boardStore.navigatePgn('backward')
const handleNext = () => boardStore.navigatePgn('forward')
const handleEnd = () => boardStore.navigatePgn('end')

const handleDelete = () => {
  pgnService.deleteCurrentNode()
  boardStore.syncBoardWithPgn()
}

const handleCopyFen = () => {
  const fen = pgnService.getCurrentNavigatedFen()
  navigator.clipboard.writeText(fen)
  message.success('FEN copied!')
}

const handleCopyPgn = () => {
  const pgn = pgnService.getFullPgn({})
  navigator.clipboard.writeText(pgn)
  message.success('PGN copied!')
}
</script>

<template>
  <div class="study-controls">
    <div class="control-group">
      <n-tooltip v-if="!studyStore.activeChapter?.color" trigger="hover">
        <template #trigger>
          <button @click="handleFlip">🔄</button>
        </template>
        Flip Board
      </n-tooltip>
      <n-tooltip trigger="hover">
        <template #trigger>
          <button @click="handleCopyFen">FEN</button>
        </template>
        Copy FEN
      </n-tooltip>
      <n-tooltip trigger="hover">
        <template #trigger>
          <button @click="handleCopyPgn">PGN</button>
        </template>
        Copy PGN
      </n-tooltip>
    </div>

    <div class="control-group navigation">
      <button @click="handleStart" title="Start">|&lt;</button>
      <button @click="handlePrev" title="Previous">&lt;</button>
      <button @click="handleNext" title="Next">&gt;</button>
      <button @click="handleEnd" title="End">&gt;|</button>
    </div>

    <div class="control-group actions">
      <n-tooltip trigger="hover">
        <template #trigger>
          <button @click="handleDelete" class="delete-btn">🗑️</button>
        </template>
        Delete current move & branch
      </n-tooltip>
    </div>
  </div>
</template>

<style scoped>
.study-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 15px;
  height: 100%;
  background: rgba(26, 26, 26, 0.4);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  color: var(--color-text-primary);
}

.control-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

button {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--color-text-secondary);
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 1em;
  display: flex;
  align-items: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text-primary);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

.navigation button {
  font-weight: bold;
  min-width: 36px;
  justify-content: center;
}

.delete-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
}
</style>
