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
import { ref, watch } from 'vue'
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
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { isServerEngine } from '@/services/GameplayService'
import i18n from '@/services/i18n'
import type { EngineId, Color as ChessgroundColor } from '@/types/api.types'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const controlsStore = useControlsStore()
const boardStore = useBoardStore()
const analysisStore = useAnalysisStore()
const authStore = useAuthStore()
const uiStore = useUiStore()
const t = i18n.global.t

const fenInput = ref('')

const loadGameFromFen = (fen: string, userColor?: ChessgroundColor) => {
  if (!fen) return
  const formattedFen = fen.replace(/_/g, ' ')
  fenInput.value = formattedFen
  gameStore.startSandboxGame(fen, userColor)
}

const playFen = () => {
  if (fenInput.value) {
    const urlFen = fenInput.value.replace(/ /g, '_')
    const engineId = controlsStore.selectedEngine
    const userColor = route.params.userColor as ChessgroundColor | undefined

    const routeParams: { fen: string; engineId: EngineId; userColor?: ChessgroundColor } = {
      fen: urlFen,
      engineId,
    }
    if (userColor) {
      routeParams.userColor = userColor
    }

    router.push({
      name: userColor ? 'sandbox-with-engine-and-color' : 'sandbox-with-engine',
      params: routeParams,
    })
  }
}

// Centralized logic to handle route changes
watch(
  () => route.fullPath,
  async () => {
    // Wait for auth to be resolved
    while (authStore.isLoading) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    const fen = route.params.fen as string
    const engineIdFromUrl = route.params.engineId as EngineId | undefined
    const userColorFromUrl = route.params.userColor as ChessgroundColor | undefined

    if (engineIdFromUrl) {
      if (isServerEngine(engineIdFromUrl) && !authStore.isAuthenticated) {
        const userConfirmedLogin = await uiStore.showConfirmation(
          t('auth.requiredForAction'),
          t('auth.serverEngineAuth'),
          {
            confirmText: t('nav.loginWithLichess'),
            cancelText: t('gameplay.playWithDefaultEngine'),
            showCancel: true,
          },
        )

        if (userConfirmedLogin === 'confirm') {
          localStorage.setItem('redirect_after_login', route.fullPath)
          authStore.login()
        } else {
          const newParams: any = { engineId: 'SF_2200', fen }
          if (userColorFromUrl) {
            newParams.userColor = userColorFromUrl
          }
          await router.replace({
            name: userColorFromUrl ? 'sandbox-with-engine-and-color' : 'sandbox-with-engine',
            params: newParams,
          })
        }
        return // Stop processing, will be handled by new route
      }
      // URL is valid, sync store and load game
      controlsStore.setEngine(engineIdFromUrl, true)
      loadGameFromFen(fen, userColorFromUrl)
    } else if (fen) {
      // Engine is NOT in URL, determine default and redirect
      const defaultEngineId = authStore.isAuthenticated
        ? controlsStore.selectedEngine
        : 'SF_2200'
      await router.replace({
        name: 'sandbox-with-engine',
        params: { engineId: defaultEngineId, fen },
      })
    }
  },
  { immediate: true },
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
      onRequestNew: () => { },
      onRestart: () => {
        if (route.params.fen) {
          loadGameFromFen(
            route.params.fen as string,
            route.params.userColor as ChessgroundColor | undefined,
          )
        }
      },
      onResign: gameStore.handleGameResignation,
      onShare: () => {
        const urlFen = boardStore.fen.replace(/ /g, '_')
        const engineId = controlsStore.selectedEngine
        const userColor = route.params.userColor as ChessgroundColor | undefined
        shareService.share('sandbox', urlFen, engineId, userColor)
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
  padding: 1px;
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