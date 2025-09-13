<!-- src/views/AdvantageView.vue -->
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAdvantageStore } from '../stores/advantage.store'
import { useGameStore } from '../stores/game.store'
import { useControlsStore } from '../stores/controls.store'
import { shareService } from '../services/share.service'
import type { TornadoMode, AdvantageTheme } from '../types/api.types'

// Layout and Panels
import GameLayout from '../components/GameLayout.vue'
import ControlPanel from '../components/ControlPanel.vue'
import TopInfoPanel from '../components/TopInfoPanel.vue'
import AnalysisPanel from '../components/AnalysisPanel.vue'
import PuzzleInfo from '../components/PuzzleInfo.vue'
import UserStats from '../components/UserStats.vue'
import AdvantageStats from '../components/AdvantageStats.vue'
import { useAnalysisStore } from '@/stores/analysis.store'

const advantageStore = useAdvantageStore()
const gameStore = useGameStore()
const controlsStore = useControlsStore()
const analysisStore = useAnalysisStore()
const route = useRoute()

onMounted(() => {
  const mode = route.params.mode as TornadoMode
  const theme = route.params.theme as AdvantageTheme | 'automatic'
  if (mode && theme) {
    advantageStore.startNextPuzzle(mode, theme)
  }
})

watch(
  () => [gameStore.gamePhase, advantageStore.activePuzzle],
  () => {
    const isGameOver = gameStore.gamePhase === 'GAMEOVER'
    const isPuzzleLoaded = !!advantageStore.activePuzzle

    controlsStore.setControls({
      canRequestNew: isGameOver && isPuzzleLoaded,
      canRestart: false, // Restart is not applicable in this mode
      canResign: false, // Resign is not applicable for a single-move puzzle
      canShare: isPuzzleLoaded,
      onRequestNew: () => {
        if (advantageStore.currentMode && advantageStore.currentTheme) {
          advantageStore.startNextPuzzle(advantageStore.currentMode, advantageStore.currentTheme)
        }
      },
      onShare: () => {
        if (advantageStore.activePuzzle?.PuzzleId) {
          // Assuming 'advantage' is a valid share mode
          shareService.share('advantage' as any, advantageStore.activePuzzle.PuzzleId)
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
      <div class="panel-content-wrapper">
        <UserStats />
        <AdvantageStats />
      </div>
    </template>

    <template #top-info>
      <TopInfoPanel />
    </template>

    <template #right-panel>
      <div class="panel-content-wrapper">
        <ControlPanel />
        <PuzzleInfo />
        <AnalysisPanel v-if="analysisStore.isPanelVisible" />
      </div>
    </template>
  </GameLayout>
</template>

<style scoped>
.panel-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}
</style>
