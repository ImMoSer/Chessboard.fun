<!-- src/pages/TornadoView.vue -->
<script setup lang="ts">
import { useGameStore } from '@/entities/game'
import AnalysisPanel from '@/features/analysis/ui/AnalysisPanel.vue'
import UserProfileWidget from '@/features/profile/ui/UserProfileWidget.vue'
import { useTornadoStore, type TornadoMode } from '@/features/tornado/model/tornado.store'
import { useControlsStore } from '@/widgets/game-layout/model/controls.store'
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import ControlPanel from '../widgets/game-layout/ControlPanel.vue'
import GameLayout from '../widgets/game-layout/GameLayout.vue'
import TopInfoPanel from '../widgets/game-layout/TopInfoPanel.vue'

const tornadoStore = useTornadoStore()
const controlsStore = useControlsStore()
const route = useRoute()

onMounted(() => {
  const mode = route.params.mode as TornadoMode
  const theme = route.query.theme as string | undefined

  if (mode) {
    tornadoStore.startSession(mode, theme)
  }
})

const gameStore = useGameStore()

watch(
  () => [tornadoStore.isSessionActive, gameStore.gamePhase],
  () => {
    const isPlaying = gameStore.gamePhase === 'PLAYING'

    controlsStore.setControls({
      canRequestNew: true,
      canRestart: true,
      canResign: tornadoStore.isSessionActive && isPlaying,
      canShare: !!tornadoStore.activePuzzle,
      onRequestNew: tornadoStore.handleNew,
      onRestart: tornadoStore.handleRestart,
      onResign: tornadoStore.handleResign,
    })
  },
  { immediate: true },
)
</script>

<template>
  <GameLayout>
    <template #left-panel>
      <div class="panel-content-wrapper">
        <UserProfileWidget />
      </div>
    </template>

    <template #top-info>
      <TopInfoPanel />
    </template>

    <template #controls>
      <ControlPanel />
    </template>

    <template #right-panel>
      <div class="panel-content-wrapper">
        <AnalysisPanel />
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
