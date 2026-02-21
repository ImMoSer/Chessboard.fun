<!-- src/views/TornadoView.vue -->
<script setup lang="ts">
import { useControlsStore } from '@/stores/controls.store'
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AnalysisPanel from '@/features/analysis/ui/AnalysisPanel.vue'
import ControlPanel from '../components/ControlPanel.vue'
import GameLayout from '../components/GameLayout.vue'
import TopInfoPanel from '../components/TopInfoPanel.vue'
import UserProfileWidget from '@/features/profile/ui/UserProfileWidget.vue'
import { useGameStore } from '../stores/game.store'
import { useTornadoStore, type TornadoMode } from '../stores/tornado.store'

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
