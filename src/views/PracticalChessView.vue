<!-- src/views/PracticalChessView.vue -->
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { shareService } from '../services/share.service'
import { useAnalysisStore } from '../stores/analysis.store'
import { useControlsStore } from '../stores/controls.store'
import { useGameStore } from '../stores/game.store'
import { usePracticalChessStore } from '../stores/practicalChess.store'

import AnalysisPanel from '../components/AnalysisPanel.vue'
import ControlPanel from '../components/ControlPanel.vue'
import GameLayout from '../components/GameLayout.vue'
import PuzzleInfo from '../components/PuzzleInfo.vue'
import TopInfoPanel from '../components/TopInfoPanel.vue'
import UserStats from '../components/UserStats.vue'

const practicalStore = usePracticalChessStore()
const gameStore = useGameStore()
const controlsStore = useControlsStore()
const analysisStore = useAnalysisStore()
const router = useRouter()
const route = useRoute()

onMounted(() => {
  const id = route.params.id as string
  practicalStore.loadNewPuzzle(id)
})

watch(
  () => [gameStore.gamePhase, gameStore.isGameActive],
  () => {
    const isGameOver = gameStore.gamePhase === 'GAMEOVER'
    const isIdle = gameStore.gamePhase === 'IDLE'
    const isPlaying = gameStore.gamePhase === 'PLAYING'

    controlsStore.setControls({
      canRequestNew: isGameOver || isIdle,
      canRestart:
        (isGameOver || isIdle || !gameStore.isGameActive) && !!practicalStore.activePuzzle,
      canResign: isPlaying && gameStore.isGameActive,
      canShare: !!practicalStore.activePuzzle,
      onRequestNew: () => {
        if (route.params.id) {
          router.push({ name: 'practical-chess' })
        } else {
          practicalStore.loadNewPuzzle()
        }
      },
      onRestart: () => {
        practicalStore.restartPuzzle()
      },
      onResign: practicalStore.handleResign,
      onShare: async () => {
        if (practicalStore.activePuzzle) {
          await shareService.share('practical-chess', practicalStore.activePuzzle.puzzle_id)
        }
      },
    })
  },
  { immediate: true, deep: true },
)

watch(
  () => route.params.id,
  (newId, oldId) => {
    if (oldId && !newId) {
      practicalStore.loadNewPuzzle()
    }
  },
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
