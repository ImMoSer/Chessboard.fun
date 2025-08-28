<!-- src/views/TackticsView.vue -->
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTackticsStore } from '../stores/tacktics.store'
import { useGameStore } from '../stores/game.store'
import { useControlsStore } from '../stores/controls.store'
import { useAnalysisStore } from '../stores/analysis.store'

import GameLayout from '../components/GameLayout.vue'
import ControlPanel from '../components/ControlPanel.vue'
import AnalysisPanel from '../components/AnalysisPanel.vue'
import TackticsStats from '../components/TackticsStats.vue'
import TackticsControls from '../components/TackticsControls.vue'
import PuzzleInfo from '../components/PuzzleInfo.vue'
import TopInfoPanel from '../components/TopInfoPanel.vue'
// --- НАЧАЛО ИЗМЕНЕНИЙ: Импортируем UserStats ---
import UserStats from '../components/UserStats.vue'
// --- КОНЕЦ ИЗМЕНЕНИЙ ---
import logger from '../utils/logger'

const tackticsStore = useTackticsStore()
const gameStore = useGameStore()
const controlsStore = useControlsStore()
const analysisStore = useAnalysisStore()
const route = useRoute()
const router = useRouter()

onMounted(() => {
  tackticsStore.initialize()
  const puzzleId = route.params.puzzleId as string | undefined
  tackticsStore.loadNewPuzzle(puzzleId)
})

const copyToClipboard = (text: string) => {
  const textArea = document.createElement('textarea')
  textArea.value = text
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()
  try {
    document.execCommand('copy')
    logger.info('[Share] Link copied to clipboard:', text)
  } catch (err) {
    logger.error('[Share] Could not copy link:', err)
  }
  document.body.removeChild(textArea)
}

watch(
  () => tackticsStore.activePuzzle,
  (newPuzzle) => {
    if (newPuzzle && route.params.puzzleId !== newPuzzle.PuzzleId) {
      router.replace({ name: 'tacktics', params: { puzzleId: newPuzzle.PuzzleId } })
    }
  },
)

watch(
  () => [gameStore.gamePhase, gameStore.isGameActive],
  () => {
    const isGameOver = gameStore.gamePhase === 'GAMEOVER'
    const isIdle = gameStore.gamePhase === 'IDLE'

    controlsStore.setControls({
      canRequestNew: isGameOver || isIdle,
      canRestart: (isGameOver || isIdle) && !!tackticsStore.activePuzzle,
      canResign: false, // No resign in tacktics
      canShare: !!tackticsStore.activePuzzle,
      onRequestNew: () => tackticsStore.loadNewPuzzle(),
      onRestart: tackticsStore.handleRestart,
      onResign: () => {},
      onShare: () => {
        if (tackticsStore.activePuzzle?.PuzzleId) {
          const shareUrl = `${window.location.origin}/#/tacktics/${tackticsStore.activePuzzle.PuzzleId}`
          copyToClipboard(shareUrl)
        }
      },
      onExit: tackticsStore.handleExit,
    })
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <GameLayout>
    <template #left-panel>
      <!-- --- НАЧАЛО ИЗМЕНЕНИЙ: Добавляем обертку и UserStats --- -->
      <div class="left-panel-content-wrapper">
        <UserStats />
        <TackticsStats />
      </div>
      <!-- --- КОНЕЦ ИЗМЕНЕНИЙ --- -->
    </template>

    <template #top-info>
      <TopInfoPanel />
    </template>

    <template #right-panel>
      <div class="right-panel-content-wrapper">
        <ControlPanel />
        <TackticsControls />
        <PuzzleInfo />
        <AnalysisPanel v-if="analysisStore.isPanelVisible" />
      </div>
    </template>
  </GameLayout>
</template>

<style scoped>
/* --- НАЧАЛО ИЗМЕНЕНИЙ: Добавляем стили для обертки --- */
.left-panel-content-wrapper,
/* --- КОНЕЦ ИЗМЕНЕНИЙ --- */
.right-panel-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}
</style>
