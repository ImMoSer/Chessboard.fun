<!-- src/views/AttackView.vue -->
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAttackStore } from '../stores/attack.store'
import { useGameStore } from '../stores/game.store'
import { useControlsStore } from '../stores/controls.store'
import { useAnalysisStore } from '../stores/analysis.store'

import GameLayout from '../components/GameLayout.vue'
import ControlPanel from '../components/ControlPanel.vue'
import TopInfoPanel from '../components/TopInfoPanel.vue'
import PuzzleInfo from '../components/PuzzleInfo.vue'
import UserStats from '../components/UserStats.vue'
import AnalysisPanel from '../components/AnalysisPanel.vue'
// --- НАЧАЛО ИЗМЕНЕНИЙ ---
import { shareService } from '../services/share.service'
// --- КОНЕЦ ИЗМЕНЕНИЙ ---

const attackStore = useAttackStore()
const gameStore = useGameStore()
const controlsStore = useControlsStore()
const analysisStore = useAnalysisStore()
const route = useRoute()
const router = useRouter()

onMounted(() => {
  attackStore.initialize()
  const puzzleId = route.params.puzzleId as string | undefined
  attackStore.loadNewPuzzle(puzzleId)
})

watch(
  () => attackStore.activePuzzle,
  (newPuzzle) => {
    if (newPuzzle && route.params.puzzleId !== newPuzzle.PuzzleId) {
      router.replace({ name: 'attack', params: { puzzleId: newPuzzle.PuzzleId } })
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
      canRestart: (isGameOver || isIdle || !gameStore.isGameActive) && !!attackStore.activePuzzle,
      canResign: isPlaying && gameStore.isGameActive,
      canShare: !!attackStore.activePuzzle,
      onRequestNew: () => attackStore.loadNewPuzzle(),
      onRestart: attackStore.handleRestart,
      onResign: attackStore.handleResign,
      // --- НАЧАЛО ИЗМЕНЕНИЙ: Используем новый сервис ---
      onShare: () => {
        if (attackStore.activePuzzle?.PuzzleId) {
          shareService.share('attack', attackStore.activePuzzle.PuzzleId)
        }
      },
      // --- КОНЕЦ ИЗМЕНЕНИЙ ---
      onExit: attackStore.handleExit,
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

    <template #right-panel>
      <div class="right-panel-content-wrapper">
        <ControlPanel />
        <AnalysisPanel v-if="analysisStore.isPanelVisible" />
        <PuzzleInfo />
      </div>
    </template>
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
