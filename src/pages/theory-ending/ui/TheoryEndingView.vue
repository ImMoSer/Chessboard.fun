<!-- src/pages/TheoryEndingView.vue -->
<script setup lang="ts">
import { useGameStore } from '@/entities/game'
import { useAnalysisStore } from '@/features/analysis'
import { useTheoryEndingsStore } from '@/features/theory-endings'
import { useSmartHintStore } from '@/features/smart-hint'
import { shareService } from '@/shared/lib/share.service'
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { TheoryEndingType, GameLaunchOptions, TheoryEndingDifficulty, TheoryEndingCategory } from '@/shared/types/api.types'

import { AnalysisPanel } from '@/features/analysis'
import { UserProfileWidget, TheoryStackbarChart } from '@/features/profile'
import { ControlPanel, GameLayout, TopInfoPanel, useControlsStore } from '@/widgets/game-layout'
import { useDetailedStatsQuery } from '@/shared/api/queries/userCabinet.queries'
import { normalizeProfileStats } from '@/shared/lib/statsNormalizer'
import { useAuthStore } from '@/entities/user'

const theoryStore = useTheoryEndingsStore()
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

const handleImprove = (options: GameLaunchOptions) => {
  if (options.mode === 'theory') {
    if (!options.theme || !options.difficulty || !options.type) {
      throw new Error('[TheoryEndingView] handleImprove was called with missing options!')
    }
    theoryStore.setParams(
      options.type as TheoryEndingType,
      options.difficulty as TheoryEndingDifficulty,
      options.theme as TheoryEndingCategory,
    )
    theoryStore.loadNewPuzzle(options.type as TheoryEndingType)
  }
}

onMounted(() => {
  const type = route.params.type as TheoryEndingType
  const puzzleId = route.params.puzzleId as string

  if (!type && !theoryStore.activeType) {
    router.push('/theory-endings')
    return
  }
  theoryStore.loadNewPuzzle(type, puzzleId)
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
  () => theoryStore.activePuzzle,
  (newPuzzle) => {
    if (newPuzzle?.puzzle_id && route.params.puzzleId !== newPuzzle.puzzle_id) {
      if (route.name === 'theory-endings-play' || route.name === 'theory-endings-puzzle') {
        router.replace({
          name: 'theory-endings-puzzle',
          params: {
            type: theoryStore.activeType || 'win',
            puzzleId: newPuzzle.puzzle_id,
          },
        })
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
    } else if (isLoading && analysisStore.isPanelVisible) {
      analysisStore.hidePanel()
    }

    controlsStore.setControls({
      canRequestNew: isGameOver || isIdle,
      canRestart: (isGameOver || isIdle || !gameStore.isGameActive) && !!theoryStore.activePuzzle,
      canResign: isPlaying,
      canShare: !!theoryStore.activePuzzle,
      canRequestHint: isPlaying,
      onRequestNew: () => {
        if (route.params.puzzleId) {
          router.push({ name: 'theory-endings-play' })
        } else {
          theoryStore.loadNewPuzzle()
        }
      },
      onRestart: () => {
        if (theoryStore.activePuzzle) {
          theoryStore.loadNewPuzzle(theoryStore.activeType!, theoryStore.activePuzzle.puzzle_id)
        }
      },
      onResign: theoryStore.handleResign,
      onShare: async () => {
        if (theoryStore.activePuzzle && theoryStore.activeType) {
          await shareService.share('theory-endings', theoryStore.activePuzzle.puzzle_id, {
            theoryType: theoryStore.activeType,
          })
        }
      },
    })
  },
  { immediate: true, deep: true },
)

watch(
  () => route.params.puzzleId,
  (newId, oldId) => {
    if (oldId && !newId) {
      theoryStore.loadNewPuzzle()
    }
  },
)
</script>

<template>
  <GameLayout>
    <template #left-panel>
      <UserProfileWidget />
    </template>

    <template #top-info>
      <TopInfoPanel />
    </template>

    <template #center-column>
      <!-- Custom overlay for type/difficulty if needed -->
    </template>

    <template #controls>
      <ControlPanel />
    </template>

    <template #right-panel>
      <div class="right-panel-content-wrapper">
        <AnalysisPanel v-if="analysisStore.isPanelVisible" />
        <TheoryStackbarChart
          v-if="normalizedStats && normalizedStats.theory"
          :stats="normalizedStats.theory.stats"
          mode="theory"
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
