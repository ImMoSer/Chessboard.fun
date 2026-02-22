<!-- src/pages/TheoryEndingView.vue -->
<script setup lang="ts">
import { useGameStore } from '@/entities/game'
import { useAnalysisStore } from '@/features/analysis/model/analysis.store'
import { useTheoryEndingsStore } from '@/features/theory-endings/model/theoryEndings.store'
import { shareService } from '@/shared/lib/share.service'
import { useControlsStore } from '@/widgets/game-layout/model/controls.store'
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { TheoryEndingType } from '@/shared/types/api.types'

import AnalysisPanel from '@/features/analysis/ui/AnalysisPanel.vue'
import UserProfileWidget from '@/features/profile/ui/UserProfileWidget.vue'
import ControlPanel from '../widgets/game-layout/ControlPanel.vue'
import GameLayout from '../widgets/game-layout/GameLayout.vue'
import TopInfoPanel from '../widgets/game-layout/TopInfoPanel.vue'

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
  () => theoryStore.activePuzzle,
  (newPuzzle) => {
    if (newPuzzle?.puzzle_id && route.params.puzzleId !== newPuzzle.puzzle_id) {
      if (route.name === 'theory-endings-play' || route.name === 'theory-endings-puzzle') {
        router.replace({
          name: 'theory-endings-puzzle',
          params: {
            type: theoryStore.activeType || 'win',
            puzzleId: newPuzzle.puzzle_id,
          },
        })
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
      canRestart: (isGameOver || isIdle || !gameStore.isGameActive) && !!theoryStore.activePuzzle,
      canResign: isPlaying,
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
      <UserProfileWidget />
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
