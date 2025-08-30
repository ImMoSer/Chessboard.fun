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
import UserStats from '../components/UserStats.vue'
// --- НАЧАЛО ИЗМЕНЕНИЙ ---
import { shareService } from '../services/share.service'
// --- КОНЕЦ ИЗМЕНЕНИЙ ---

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
      canResign: false,
      canShare: !!tackticsStore.activePuzzle,
      onRequestNew: () => tackticsStore.loadNewPuzzle(),
      onRestart: tackticsStore.handleRestart,
      onResign: () => {},
      // --- НАЧАЛО ИЗМЕНЕНИЙ: Используем новый сервис ---
      onShare: () => {
        if (tackticsStore.activePuzzle?.PuzzleId) {
          shareService.share('tacktics', tackticsStore.activePuzzle.PuzzleId)
        }
      },
      // --- КОНЕЦ ИЗМЕНЕНИЙ ---
      onExit: tackticsStore.handleExit,
    })
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <GameLayout>
    <template #left-panel>
      <div class="left-panel-content-wrapper">
        <UserStats />
        <TackticsStats />
      </div>
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
.left-panel-content-wrapper,
.right-panel-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}
</style>
