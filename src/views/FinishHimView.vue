<!-- src/views/FinishHimView.vue -->
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFinishHimStore } from '../stores/finishHim.store'
import { useGameStore } from '../stores/game.store'
import { useControlsStore } from '../stores/controls.store'
import { useAnalysisStore } from '../stores/analysis.store'
import { shareService } from '../services/share.service'
import type { AdvantageMode } from '@/types/api.types'

import GameLayout from '../components/GameLayout.vue'
import ControlPanel from '../components/ControlPanel.vue'
import TopInfoPanel from '../components/TopInfoPanel.vue'
import PuzzleInfo from '../components/PuzzleInfo.vue'
import UserStats from '../components/UserStats.vue'
import AnalysisPanel from '../components/AnalysisPanel.vue'

const finishHimStore = useFinishHimStore()
const gameStore = useGameStore()
const controlsStore = useControlsStore()
const analysisStore = useAnalysisStore()
const route = useRoute()
const router = useRouter()

onMounted(() => {
  finishHimStore.initialize()
  const puzzleId = route.params.puzzleId as string | undefined
  const mode = route.params.mode as AdvantageMode | undefined

  if (mode) {
    finishHimStore.setMode(mode)
    finishHimStore.loadNewPuzzle()
  } else if (puzzleId) {
    finishHimStore.loadNewPuzzle(puzzleId)
  } else {
    // If accessed without mode or puzzleId, redirect to selection
    router.push('/finish-him')
  }
})

// Removed watcher that updates route to puzzleId to preserve mode in URL
/*
watch(
  () => finishHimStore.activePuzzle,
  (newPuzzle) => {
    if (newPuzzle && route.params.puzzleId !== newPuzzle.PuzzleId) {
      router.replace({ name: 'finish-him', params: { puzzleId: newPuzzle.PuzzleId } })
    }
  },
)
*/

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
          shareService.share('finish-him', finishHimStore.activePuzzle.PuzzleId)
        }
      },
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
