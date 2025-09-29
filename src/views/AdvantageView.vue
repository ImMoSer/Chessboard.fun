<!-- src/views/AdvantageView.vue -->
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdvantageStore } from '../stores/advantage.store'
import { useGameStore } from '../stores/game.store'
import { useControlsStore } from '../stores/controls.store'
import { useAnalysisStore } from '../stores/analysis.store'
import type { AdvantageMode } from '../types/api.types'

import GameLayout from '../components/GameLayout.vue'
import ControlPanel from '../components/ControlPanel.vue'
import TopInfoPanel from '../components/TopInfoPanel.vue'
import PuzzleInfo from '../components/PuzzleInfo.vue'
import UserStats from '../components/UserStats.vue'
import AnalysisPanel from '../components/AnalysisPanel.vue'
import { shareService } from '../services/share.service'

const advantageStore = useAdvantageStore()
const gameStore = useGameStore()
const controlsStore = useControlsStore()
const analysisStore = useAnalysisStore()
const route = useRoute()
const router = useRouter()

const handleRoute = (params: typeof route.params) => {
  const puzzleId = params.puzzleId as string | undefined
  const mode = params.mode as AdvantageMode | undefined

  if (mode) {
    advantageStore.setMode(mode)
    advantageStore.loadNewPuzzle(puzzleId)
  } else {
    // This case should not happen with the new unambiguous routing,
    // but as a fallback, we redirect to the main selection screen.
    router.push({ name: 'advantage-selection' })
  }
}

onMounted(() => {
  advantageStore.initialize()
  handleRoute(route.params)
})

watch(
  () => route.params,
  (newParams) => {
    if (
      newParams.puzzleId &&
      newParams.puzzleId === advantageStore.activePuzzle?.PuzzleId &&
      newParams.mode === advantageStore.mode
    ) {
      return
    }
    handleRoute(newParams)
  },
)

watch(
  () => advantageStore.activePuzzle,
  (newPuzzle) => {
    if (newPuzzle && route.params.puzzleId !== newPuzzle.PuzzleId) {
      router.replace({ name: 'advantage-puzzle', params: { puzzleId: newPuzzle.PuzzleId, mode: advantageStore.mode } })
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
        (isGameOver || isIdle || !gameStore.isGameActive) && !!advantageStore.activePuzzle,
      canResign: isPlaying && gameStore.isGameActive,
      canShare: !!advantageStore.activePuzzle,
      onRequestNew: () => advantageStore.loadNewPuzzle(),
      onRestart: advantageStore.handleRestart,
      onResign: advantageStore.handleResign,
      onShare: () => {
        if (advantageStore.activePuzzle?.PuzzleId && advantageStore.mode) {
          shareService.share('advantage', advantageStore.activePuzzle.PuzzleId, advantageStore.mode)
        }
      },
      onExit: advantageStore.handleExit,
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
