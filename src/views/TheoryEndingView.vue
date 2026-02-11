<!-- src/views/TheoryEndingView.vue -->
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { shareService } from '../services/share.service'
import { useAnalysisStore } from '../stores/analysis.store'
import { useControlsStore } from '../stores/controls.store'
import { useGameStore } from '../stores/game.store'
import { useTheoryEndingsStore } from '../stores/theoryEndings.store'

import type { TheoryEndingType } from '../types/api.types'

import AnalysisPanel from '../components/AnalysisPanel.vue'
import ControlPanel from '../components/ControlPanel.vue'
import GameLayout from '../components/GameLayout.vue'
import PuzzleInfo from '../components/PuzzleInfo.vue'
import TopInfoPanel from '../components/TopInfoPanel.vue'
import UserStats from '../components/UserStats.vue'

const theoryStore = useTheoryEndingsStore()
const gameStore = useGameStore()
const controlsStore = useControlsStore()
const analysisStore = useAnalysisStore()
const router = useRouter()
const route = useRoute()

onMounted(() => {
  const type = route.params.type as TheoryEndingType
  const puzzleId = route.params.puzzleId as string

  if (!type && !theoryStore.activeType) {
    router.push('/theory-endings')
    return
  }
  theoryStore.loadNewPuzzle(type, puzzleId)
})

watch(
  () => [gameStore.gamePhase, gameStore.isGameActive],
  () => {
    const isGameOver = gameStore.gamePhase === 'GAMEOVER'
    const isIdle = gameStore.gamePhase === 'IDLE'
    const isPlaying = gameStore.gamePhase === 'PLAYING'

    controlsStore.setControls({
      canRequestNew: isGameOver || isIdle,
      canRestart: (isGameOver || isIdle || !gameStore.isGameActive) && !!theoryStore.activePuzzle,
      canResign: isPlaying && gameStore.isGameActive,
      canShare: !!theoryStore.activePuzzle,
      onRequestNew: () => {
        if (route.params.puzzleId) {
          router.push({ name: 'theory-endings-play' })
        } else {
          theoryStore.loadNewPuzzle()
        }
      },
      onRestart: () => {
        if (theoryStore.activePuzzle) {
          theoryStore.loadNewPuzzle(theoryStore.activeType!, theoryStore.activePuzzle.puzzle_id)
        }
      },
      onResign: theoryStore.handleResign,
      onShare: async () => {
        if (theoryStore.activePuzzle && theoryStore.activeType) {
          await shareService.share('theory-endings', theoryStore.activePuzzle.puzzle_id, {
            theoryType: theoryStore.activeType,
          })
        }
      },
    })
  },
  { immediate: true, deep: true },
)

watch(
  () => route.params.puzzleId,
  (newId, oldId) => {
    if (oldId && !newId) {
      theoryStore.loadNewPuzzle()
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

    <template #center-column>
      <!-- Custom overlay for type/difficulty if needed -->
    </template>

    <template #controls>
      <ControlPanel />
    </template>

    <template #right-panel>
      <div class="right-panel-content-wrapper">
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
