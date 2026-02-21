<!-- src/pages/PracticalChessView.vue -->
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { shareService } from '../services/share.service'
import { useAnalysisStore } from '../stores/analysis.store'
import { useControlsStore } from '../stores/controls.store'
import { useGameStore } from '../stores/game.store'
import { usePracticalChessStore } from '../stores/practicalChess.store'

import AnalysisPanel from '@/features/analysis/ui/AnalysisPanel.vue'
import ControlPanel from '../widgets/game-layout/ControlPanel.vue'
import GameLayout from '../widgets/game-layout/GameLayout.vue'
import TopInfoPanel from '../widgets/game-layout/TopInfoPanel.vue'
import UserProfileWidget from '@/features/profile/ui/UserProfileWidget.vue'
import YouMoveSelection from '../features/practical-chess/ui/YouMoveSelection.vue'

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
  () => practicalStore.activePuzzle,
  (newPuzzle) => {
    if (newPuzzle?.puzzle_id && route.params.id !== newPuzzle.puzzle_id) {
      if (route.name === 'practical-chess-play' || route.name === 'practical-chess-puzzle') {
        router.replace({ name: 'practical-chess-puzzle', params: { id: newPuzzle.puzzle_id } })
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
        (isGameOver || isIdle || !gameStore.isGameActive) && !!practicalStore.activePuzzle,
      canResign: isPlaying,
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
      <UserProfileWidget />
    </template>

    <template #top-info>
      <TopInfoPanel />
    </template>

    <template #center-column> </template>

    <template #controls>
      <YouMoveSelection v-if="practicalStore.isWaitingForColorSelection" />
      <ControlPanel v-else />
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
