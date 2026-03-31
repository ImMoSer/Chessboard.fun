<!-- src/pages/TornadoView.vue -->
<script setup lang="ts">
import { useBoardStore, useGameStore } from '@/entities/game'
import { AnalysisPanel } from '@/features/analysis'
import { UserProfileWidget, ThemeRoseChart } from '@/features/profile'
import { useTornadoStore, type TornadoMode } from '@/features/tornado'
import { useSmartHintStore } from '@/features/smart-hint'
import ChessboardPreview from '@/shared/ui/board-preview/ChessboardPreview.vue'
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ControlPanel, GameLayout, TopInfoPanel, useControlsStore } from '@/widgets/game-layout'
import { useDetailedStatsQuery } from '@/shared/api/queries/userCabinet.queries'
import { normalizeProfileStats } from '@/shared/lib/statsNormalizer'
import { useAuthStore } from '@/entities/user'
import type { GameLaunchOptions } from '@/shared/types/api.types'

const tornadoStore = useTornadoStore()
const controlsStore = useControlsStore()
const smartHintStore = useSmartHintStore()
const gameStore = useGameStore()
const boardStore = useBoardStore()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const { data: detailedStatsData } = useDetailedStatsQuery()

const normalizedStats = computed(() => {
  const baseRating = authStore.userProfile?.base_puzzle_rating || 1000
  return normalizeProfileStats(detailedStatsData.value || null, baseRating)
})

const activeModeStr = computed({
  get: () => route.params.mode as string,
  set: (val: string) => {
    // Wenn der User über die Radio-Buttons im Chart den Modus wechselt,
    // navigieren wir einfach dorthin.
    router.push({ name: 'tornado', params: { mode: val } })
  }
})

const currentTornadoThemes = computed(() => {
  const mode = route.params.mode as TornadoMode
  if (!normalizedStats.value?.tornado?.modes) return []
  return normalizedStats.value.tornado.modes[mode] || []
})

const handleImprove = (options: GameLaunchOptions) => {
  if (options.mode === 'tornado') {
    if (!options.subMode) {
      throw new Error('[TornadoView] handleImprove was called without a subMode!')
    }
    
    // Tornado restart logic uses router or store
    router.push({
      name: 'tornado',
      params: { mode: options.subMode },
      query: options.theme ? { theme: options.theme } : {},
    }).then(() => {
      // Wichtig: Da wir auf der gleichen Route bleiben (nur params/query ändern sich),
      // müssen wir den Store manuell neustarten, da onMounted nicht feuert.
      tornadoStore.startSession(options.subMode as TornadoMode, options.theme)
    })
  }
}

onMounted(() => {
  const mode = route.params.mode as TornadoMode
  const theme = route.query.theme as string | undefined

  if (mode) {
    tornadoStore.startSession(mode, theme)
  }
})

watch(
  () => tornadoStore.isSessionActive,
  (isActive, wasActive) => {
    if (isActive && !wasActive) {
      smartHintStore.resetHints(3)
    }
  }
)

watch(
  () => [tornadoStore.isSessionActive, gameStore.gamePhase],
  () => {
    const isPlaying = gameStore.gamePhase === 'PLAYING'

    controlsStore.setControls({
      canRequestNew: true,
      canRestart: true,
      canResign: tornadoStore.isSessionActive && isPlaying,
      canShare: !!tornadoStore.activePuzzle,
      canRequestHint: tornadoStore.isSessionActive && isPlaying,
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
        <ChessboardPreview
          v-if="tornadoStore.fenFinal"
          :fen="tornadoStore.fenFinal"
          :orientation="boardStore.orientation"
          class="final-position-preview"
        />
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
        <AnalysisPanel v-if="gameStore.gamePhase === 'GAMEOVER' || gameStore.gamePhase === 'IDLE'" />
        <ThemeRoseChart
          v-if="normalizedStats && normalizedStats.tornado"
          v-model:activeMode="activeModeStr"
          mode="tornado"
          :modes="['bullet', 'blitz', 'rapid', 'classic']"
          :themes="currentTornadoThemes"
          :title="t('features.userCabinet.stats.modes.tornado')"
          @improve="handleImprove"
        />
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
  overflow-y: auto;
  overflow-x: hidden;
}

.final-position-preview {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}
</style>
