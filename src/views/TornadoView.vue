<!-- src/views/TornadoView.vue -->
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTornadoStore, type TornadoMode } from '../stores/tornado.store'
import GameLayout from '../components/GameLayout.vue'
import ControlPanel from '../components/ControlPanel.vue'
import AnalysisPanel from '../components/AnalysisPanel.vue'
import TornadoStats from '../components/TornadoStats.vue'
import PuzzleInfo from '../components/PuzzleInfo.vue'
import TopInfoPanel from '../components/TopInfoPanel.vue'
import UserStats from '../components/UserStats.vue'
import { useControlsStore } from '@/stores/controls.store'

const tornadoStore = useTornadoStore()
const controlsStore = useControlsStore()
const route = useRoute()

onMounted(() => {
  const mode = route.params.mode as TornadoMode
  if (mode) {
    tornadoStore.startSession(mode)
  }
})

watch(
  () => tornadoStore.isSessionActive,
  () => {
    controlsStore.setControls({
      canRequestNew: true, // Always active
      canRestart: true, // Always active
      canResign: false, // Not used in Tornado
      canShare: !!tornadoStore.activePuzzle,
      onRequestNew: tornadoStore.handleNew,
      onRestart: tornadoStore.handleRestart,
    })
  },
  { immediate: true },
)
</script>

<template>
  <GameLayout>
    <template #left-panel>
      <div class="panel-content-wrapper">
        <UserStats />
        <TornadoStats />
      </div>
    </template>

    <template #top-info>
      <TopInfoPanel />
    </template>

    <template #right-panel>
      <div class="panel-content-wrapper">
        <ControlPanel />
        <PuzzleInfo />
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
