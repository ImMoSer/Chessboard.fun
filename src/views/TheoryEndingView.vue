<!-- src/views/TheoryEndingView.vue -->
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTheoryEndingsStore } from '../stores/theoryEndings.store'
import { useGameStore } from '../stores/game.store'
import { useControlsStore } from '../stores/controls.store'
import { useAnalysisStore } from '../stores/analysis.store'

import GameLayout from '../components/GameLayout.vue'
import ControlPanel from '../components/ControlPanel.vue'
import TopInfoPanel from '../components/TopInfoPanel.vue'
import PuzzleInfo from '../components/PuzzleInfo.vue'
import UserStats from '../components/UserStats.vue'
import AnalysisPanel from '../components/AnalysisPanel.vue'

const theoryStore = useTheoryEndingsStore()
const gameStore = useGameStore()
const controlsStore = useControlsStore()
const analysisStore = useAnalysisStore()
const router = useRouter()

onMounted(() => {
    if (!theoryStore.activeType) {
        router.push('/theory-endings')
        return
    }
    theoryStore.loadNewPuzzle()
})

watch(
    () => [gameStore.gamePhase, gameStore.isGameActive],
    () => {
        const isGameOver = gameStore.gamePhase === 'GAMEOVER'
        const isIdle = gameStore.gamePhase === 'IDLE'
        const isPlaying = gameStore.gamePhase === 'PLAYING'

        controlsStore.setControls({
            canRequestNew: isGameOver || isIdle,
            canRestart:
                (isGameOver || isIdle || !gameStore.isGameActive) && !!theoryStore.activePuzzle,
            canResign: isPlaying && gameStore.isGameActive,
            canShare: !!theoryStore.activePuzzle,
            onRequestNew: () => theoryStore.loadNewPuzzle(),
            onRestart: theoryStore.handleRestart,
            onResign: theoryStore.handleResign,
            onShare: () => {
                // share not implemented yet for this mode but let's keep it
            },
        })
    },
    { immediate: true, deep: true },
)
</script>

<template>
    <GameLayout>
        <template #left-panel>
            <UserStats />
        </template>

        <template #top-info>
            <TopInfoPanel />
        </template>

        <template #center-column>
            <!-- Custom overlay for type/difficulty if needed -->
        </template>

        <template #right-panel>
            <div class="right-panel-content-wrapper">
                <ControlPanel />
                <AnalysisPanel v-if="analysisStore.isPanelVisible" />
                <PuzzleInfo />
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
}
</style>
