<!-- src/pages/PracticalChessView.vue -->
<script setup lang="ts">
import { useGameStore } from '@/entities/game'
import { useAnalysisStore } from '@/features/analysis'
import { usePracticalChessStore } from '@/features/practical-chess'
import { useSmartHintStore } from '@/features/smart-hint'
import { shareService } from '@/shared/lib/share.service'
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { AnalysisPanel } from '@/features/analysis'
import { UserProfileWidget, ThemeRoseChart } from '@/features/profile'
import { YouMoveSelection } from '@/features/practical-chess'
import { ControlPanel, GameLayout, TopInfoPanel, useControlsStore } from '@/widgets/game-layout'
import { useDetailedStatsQuery } from '@/shared/api/queries/userCabinet.queries'
import { normalizeProfileStats } from '@/shared/lib/statsNormalizer'
import { useAuthStore } from '@/entities/user'
import type { GameLaunchOptions, PracticalChessDifficulty, PracticalChessCategory } from '@/shared/types/api.types'

const { t } = useI18n()
const practicalStore = usePracticalChessStore()
const gameStore = useGameStore()
const controlsStore = useControlsStore()
const analysisStore = useAnalysisStore()
const smartHintStore = useSmartHintStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const { data: detailedStatsData } = useDetailedStatsQuery()

const normalizedStats = computed(() => {
  const baseRating = authStore.userProfile?.base_puzzle_rating || 1000
  return normalizeProfileStats(detailedStatsData.value || null, baseRating)
})

const currentPracticalThemes = computed(() => {
  if (!normalizedStats.value?.practical?.modes) return []
  return normalizedStats.value.practical.modes[practicalStore.activeDifficulty || 'Novice'] || []
})

const handleImprove = (options: GameLaunchOptions) => {
  if (options.mode === 'practical') {
    if (!options.theme || !options.subMode) {
      throw new Error('[PracticalChessView] handleImprove was called with missing options!')
    }
    practicalStore.selectDifficulty(options.subMode as PracticalChessDifficulty)
    practicalStore.selectCategory(options.theme as PracticalChessCategory)
    practicalStore.loadNewPuzzle()
  }
}

onMounted(() => {
  const id = route.params.id as string
  practicalStore.loadNewPuzzle(id)
})

onBeforeRouteLeave(() => {
  analysisStore.hidePanel()
})

watch(
  () => gameStore.gamePhase,
  (phase) => {
    if (phase === 'LOADING') {
      smartHintStore.resetHints(3)
    }
  }
)

watch(
  () => practicalStore.activePuzzle,
  (newPuzzle) => {
    if (newPuzzle?.puzzle_id && route.params.id !== newPuzzle.puzzle_id) {
      if (route.name === 'practical-chess-play' || route.name === 'practical-chess-puzzle') {
        router.replace({ name: 'practical-chess-puzzle', params: { id: newPuzzle.puzzle_id } })
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
    const isLoading = gameStore.gamePhase === 'LOADING'

    if (isGameOver) {
      analysisStore.showPanel()
    } else if (isLoading || isPlaying) {
      if (analysisStore.isPanelVisible) {
        analysisStore.hidePanel()
      }
    }

    controlsStore.setControls({
      canRequestNew: isGameOver || isIdle,
      canRestart:
        gameStore.gamePhase === 'GAMEOVER' && !!practicalStore.activePuzzle,
      canResign: isPlaying,
      canShare: !!practicalStore.activePuzzle,
      canRequestHint: isPlaying,
      onRequestNew: () => {
        if (route.params.id) {
          router.push({ name: 'practical-chess' })
        } else {
          practicalStore.loadNewPuzzle()
        }
      },
      onRestart: practicalStore.restartPuzzle,
      onShare: async () => {
        if (practicalStore.activePuzzle) {
          await shareService.share('practical-chess', practicalStore.activePuzzle.puzzle_id)
        }
      },
    })
  },
  { immediate: true, deep: true },
)

watch(
  () => route.params.id,
  (newId, oldId) => {
    if (oldId && !newId) {
      practicalStore.loadNewPuzzle()
    }
  },
)
</script>

<template>
  <GameLayout :boardLocked="practicalStore.isWaitingForColorSelection">
    <template #left-panel>
      <UserProfileWidget />
    </template>

    <template #top-info>
      <TopInfoPanel />
    </template>

    <template #center-column> </template>

    <template #controls>
      <YouMoveSelection v-if="practicalStore.isWaitingForColorSelection" />
      <ControlPanel v-else />
    </template>

    <template #right-panel>
      <div class="right-panel-content-wrapper">
        <AnalysisPanel v-if="analysisStore.isPanelVisible" />
        <ThemeRoseChart
          v-if="normalizedStats && normalizedStats.practical"
          :activeMode="practicalStore.activeDifficulty || 'Novice'"
          mode="practical"
          :themes="currentPracticalThemes"
          :title="t('features.userCabinet.stats.modes.practical')"
          @improve="handleImprove"
        />
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
  overflow-y: auto;
}
</style>
