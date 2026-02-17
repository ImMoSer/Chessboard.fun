<!-- src/views/TornadoView.vue -->
<script setup lang="ts">
import { useControlsStore } from '@/stores/controls.store'
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AnalysisPanel from '../components/AnalysisPanel.vue'
import ControlPanel from '../components/ControlPanel.vue'
import GameLayout from '../components/GameLayout.vue'
import TopInfoPanel from '../components/TopInfoPanel.vue'
import UserStats from '../components/UserStats.vue'
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
