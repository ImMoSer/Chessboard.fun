<!-- src/views/FinishHimView.vue -->
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFinishHimStore } from '../stores/finishHim.store'
import { useGameStore } from '../stores/game.store'
import { useControlsStore } from '../stores/controls.store'
import { useAnalysisStore } from '../stores/analysis.store'

import GameLayout from '../components/GameLayout.vue'
import ControlPanel from '../components/ControlPanel.vue'
import TopInfoPanel from '../components/TopInfoPanel.vue'
import PuzzleInfo from '../components/PuzzleInfo.vue'
import UserStats from '../components/UserStats.vue'
import AnalysisPanel from '../components/AnalysisPanel.vue'
import logger from '../utils/logger'

const finishHimStore = useFinishHimStore()
const gameStore = useGameStore()
const controlsStore = useControlsStore()
const analysisStore = useAnalysisStore()
const route = useRoute()
const router = useRouter()

onMounted(() => {
  // --- <<< НАЧАЛО ИЗМЕНЕНИЙ: Вызываем инициализацию для проигрывания звука входа >>> ---
  finishHimStore.initialize()
  // --- <<< КОНЕЦ ИЗМЕНЕНИЙ >>> ---
  const puzzleId = route.params.puzzleId as string | undefined
  finishHimStore.loadNewPuzzle(puzzleId)
})

const copyToClipboard = (text: string) => {
  const textArea = document.createElement('textarea')
  textArea.value = text
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  try {
    document.execCommand('copy')
    logger.info('[Share] Ссылка скопирована в буфер обмена:', text)
  } catch (err) {
    logger.error('[Share] Не удалось скопировать ссылку:', err)
  }
  document.body.removeChild(textArea)
}

watch(
  () => finishHimStore.activePuzzle,
  (newPuzzle) => {
    if (newPuzzle && route.params.puzzleId !== newPuzzle.PuzzleId) {
      router.replace({ name: 'finish-him', params: { puzzleId: newPuzzle.PuzzleId } })
    }
  },
)

watch(
  () => [gameStore.gamePhase, gameStore.isGameActive],
  () => {
    const isGameOver = gameStore.gamePhase === 'GAMEOVER'
    const isIdle = gameStore.gamePhase === 'IDLE'
    const isPlaying = gameStore.gamePhase === 'PLAYING'

    controlsStore.setControls({
      canRequestNew: isGameOver || isIdle,
      canRestart:
        (isGameOver || isIdle || !gameStore.isGameActive) && !!finishHimStore.activePuzzle,
      canResign: isPlaying && gameStore.isGameActive,
      canShare: !!finishHimStore.activePuzzle,
      onRequestNew: () => finishHimStore.loadNewPuzzle(),
      onRestart: finishHimStore.handleRestart,
      onResign: finishHimStore.handleResign,
      onShare: () => {
        if (finishHimStore.activePuzzle?.PuzzleId) {
          const shareUrl = `${window.location.origin}/finish-him/${finishHimStore.activePuzzle.PuzzleId}`
          copyToClipboard(shareUrl)
        }
      },
      onExit: finishHimStore.handleExit,
    })
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <GameLayout>
    <template #left-panel>
      <UserStats />
    </template>

    <template #top-info>
      <TopInfoPanel />
    </template>

    <template #center-column> </template>

    <!-- <<< НАЧАЛО ИЗМЕНЕНИЙ: ControlPanel теперь всегда вверху, а PuzzleInfo не скрывается -->
    <template #right-panel>
      <div class="right-panel-content-wrapper">
        <ControlPanel />
        <AnalysisPanel v-if="analysisStore.isPanelVisible" />
        <PuzzleInfo />
      </div>
    </template>
    <!-- <<< КОНЕЦ ИЗМЕНЕНИЙ -->
  </GameLayout>
</template>

<style scoped>
.right-panel-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}
</style>
