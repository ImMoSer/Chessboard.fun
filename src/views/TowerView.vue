<!-- src/views/TowerView.vue -->
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTowerStore } from '../stores/tower.store'
import { useGameStore } from '../stores/game.store'
import { useControlsStore } from '../stores/controls.store'
import { useAnalysisStore } from '../stores/analysis.store'

// Layout and Panels
import GameLayout from '../components/GameLayout.vue'
import ControlPanel from '../components/ControlPanel.vue'
import TopInfoPanel from '../components/TopInfoPanel.vue'
import AnalysisPanel from '../components/AnalysisPanel.vue'

// Tower-specific components
import TowerSelection from '../components/TowerSelection.vue'
import TowerProgress from '../components/TowerProgress.vue'
import UpcomingPositions from '../components/UpcomingPositions.vue'
import PuzzleInfo from '../components/PuzzleInfo.vue'
import UserStats from '../components/UserStats.vue'
// --- НАЧАЛО ИЗМЕНЕНИЙ ---
import { shareService } from '../services/share.service'
// --- КОНЕЦ ИЗМЕНЕНИЙ ---

const towerStore = useTowerStore()
const gameStore = useGameStore()
const controlsStore = useControlsStore()
const analysisStore = useAnalysisStore()
const route = useRoute()
const router = useRouter()

onMounted(() => {
  towerStore.initialize()
  const towerId = route.params.towerId as string | undefined
  if (towerId) {
    towerStore.loadTowerById(towerId)
  }
})

watch(
  () => towerStore.activeTower?.tower_id,
  (newId) => {
    if (newId && route.params.towerId !== newId) {
      router.replace({ name: 'tower', params: { towerId: newId } })
    }
  },
)

watch(
  () => [towerStore.gamePhase, towerStore.lives],
  ([phase, currentLives]) => {
    const isPlaying = phase === 'PLAYING'
    const isGameOver = phase === 'GAMEOVER'
    const isTowerActive = !!towerStore.activeTower
    const hasNoLives = currentLives === 0

    controlsStore.setControls({
      canRequestNew: isGameOver && isTowerActive,
      canRestart: isGameOver && hasNoLives && isTowerActive,
      canResign: isPlaying && isTowerActive,
      canShare: isTowerActive,
      onRequestNew: towerStore.reset,
      onRestart: towerStore.handleRestart,
      onResign: towerStore.handleResign,
      // --- НАЧАЛО ИЗМЕНЕНИЙ: Используем новый сервис ---
      onShare: () => {
        if (towerStore.activeTower?.tower_id) {
          shareService.share('tower', towerStore.activeTower.tower_id)
        }
      },
      // --- КОНЕЦ ИЗМЕНЕНИЙ ---
      onExit: towerStore.handleExit,
    })
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <GameLayout>
    <template #left-panel>
      <div class="left-panel-content-wrapper">
        <UserStats />
        <UpcomingPositions />
      </div>
    </template>

    <template #top-info>
      <TopInfoPanel />
    </template>

    <template #right-panel>
      <div class="right-panel-content-wrapper">
        <ControlPanel />
        <TowerSelection v-if="!towerStore.activeTower" />
        <template v-else>
          <TowerProgress />
          <PuzzleInfo />
          <AnalysisPanel v-if="gameStore.gamePhase === 'GAMEOVER'" />
        </template>
      </div>
    </template>
  </GameLayout>
</template>

<style scoped>
.left-panel-content-wrapper,
.right-panel-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}
</style>
