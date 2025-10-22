// src/views/SandboxView.vue
<template>
  <GameLayout>
    <template #top-left>
      <div class="fen-input-container">
        <input v-model="fenInput" type="text" placeholder="Enter FEN here" />
        <button @click="playFen">Play</button>
      </div>
    </template>
    <template #top-info>
      <TopInfoPanel />
    </template>
    <template #right-panel>
      <div class="right-panel-content-wrapper">
        <ControlPanel />
        <AnalysisPanel v-if="analysisStore.isPanelVisible" />
      </div>
    </template>
  </GameLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GameLayout from '../components/GameLayout.vue'
import ControlPanel from '../components/ControlPanel.vue'
import AnalysisPanel from '../components/AnalysisPanel.vue'
import TopInfoPanel from '../components/TopInfoPanel.vue'
import { useGameStore } from '../stores/game.store'
import { useControlsStore } from '../stores/controls.store'
import { useBoardStore } from '../stores/board.store'
import { useAnalysisStore } from '../stores/analysis.store'
import { shareService } from '../services/share.service'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const controlsStore = useControlsStore()
const boardStore = useBoardStore()
const analysisStore = useAnalysisStore()

const fenInput = ref('')

const loadGameFromFen = (fen: string) => {
  const formattedFen = fen.replace(/_/g, ' ')
  fenInput.value = formattedFen
  gameStore.startSandboxGame(fen)
}

const playFen = () => {
  if (fenInput.value) {
    const urlFen = fenInput.value.replace(/ /g, '_')
    router.push({ name: 'sandbox', params: { fen: urlFen } })
  }
}

onMounted(() => {
  if (route.params.fen) {
    loadGameFromFen(route.params.fen as string)
  }
})

watch(
  () => route.params.fen,
  (newFen) => {
    if (newFen) {
      loadGameFromFen(newFen as string)
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
      canRequestNew: false,
      canRestart: isGameOver || isIdle || !gameStore.isGameActive,
      canResign: isPlaying && gameStore.isGameActive,
      canShare: true,
      onRequestNew: () => {},
      onRestart: () => {
        if (route.params.fen) {
          loadGameFromFen(route.params.fen as string)
        }
      },
      onResign: gameStore.handleGameResignation,
      onShare: () => {
        const urlFen = boardStore.fen.replace(/ /g, '_')
        shareService.share('sandbox', urlFen)
      },
    })
  },
  { immediate: true, deep: true },
)
</script>

<style scoped>
.fen-input-container {
  display: flex;
  gap: 10px;
  padding: 10px;
  background-color: var(--color-background-mute);
  border-radius: 8px;
  margin: 0 auto;
  max-width: 800px;
}

input {
  flex-grow: 1;
  font-family: monospace;
  font-size: 14px;
  padding: 8px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background);
  color: var(--color-text);
  border-radius: 4px;
}

button {
  padding: 8px 16px;
  border: none;
  background-color: var(--color-primary);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

button:hover {
  background-color: var(--color-primary-hover);
}
</style>
