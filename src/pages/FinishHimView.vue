<!-- src/pages/FinishHimView.vue -->
<script setup lang="ts">
import { useGameStore } from '@/entities/game'
import { useAnalysisStore } from '@/features/analysis'
import { useFinishHimStore } from '@/features/finish-him'
import { shareService } from '@/shared/lib/share.service'
import { useControlsStore } from '@/widgets/game-layout/model/controls.store'
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { AnalysisPanel } from '@/features/analysis'
import { UserProfileWidget } from '@/features/profile'
import ControlPanel from '../widgets/game-layout/ControlPanel.vue'
import GameLayout from '../widgets/game-layout/GameLayout.vue'
import TopInfoPanel from '../widgets/game-layout/TopInfoPanel.vue'

const finishHimStore = useFinishHimStore()
const gameStore = useGameStore()
const controlsStore = useControlsStore()
const analysisStore = useAnalysisStore()
const route = useRoute()
const router = useRouter()

onMounted(() => {
  finishHimStore.initialize()
  const puzzleId = route.params.puzzleId as string | undefined
  const fen = route.params.fen as string | undefined
  const color = route.params.color as 'white' | 'black' | undefined

  if (fen && color) {
    finishHimStore.startPlayoutFromFen(fen.replace(/_/g, ' '), color)
  } else if (puzzleId) {
    finishHimStore.loadNewPuzzle(puzzleId)
  } else if (finishHimStore.selectedTheme) {
    finishHimStore.loadNewPuzzle()
  } else {
    // If accessed without parameters, redirect to selection
    router.push('/finish-him')
  }
})

watch(
  () => finishHimStore.activePuzzle,
  (newPuzzle) => {
    if (newPuzzle?.puzzle_id && route.params.puzzleId !== newPuzzle.puzzle_id) {
      if (route.name === 'finish-him-play' || route.name === 'finish-him-puzzle') {
        router.replace({ name: 'finish-him-puzzle', params: { puzzleId: newPuzzle.puzzle_id } })
      }
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
      canResign: isPlaying,
      canShare: !!finishHimStore.activePuzzle,
      onRequestNew: () => finishHimStore.loadNewPuzzle(),
      onRestart: finishHimStore.handleRestart,
      onResign: finishHimStore.handleResign,
      onShare: () => {
        if (finishHimStore.activePuzzle?.puzzle_id) {
          shareService.share('finish-him', finishHimStore.activePuzzle.puzzle_id)
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
      <UserProfileWidget />
    </template>

    <template #top-info>
      <TopInfoPanel />
    </template>

    <template #center-column> </template>

    <template #controls>
      <ControlPanel />
    </template>

    <template #right-panel>
      <div class="right-panel-content-wrapper">
        <AnalysisPanel v-if="analysisStore.isPanelVisible" />
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
