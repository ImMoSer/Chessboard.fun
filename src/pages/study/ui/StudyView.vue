<script setup lang="ts">
import { useBoardStore } from '@/entities/game'
import { AnalysisPanel, useAnalysisStore } from '@/features/analysis'
import { MozerBook } from '@/features/mozer-book'
import { LichessOpeningExplorer } from '@/features/opening-explorer'
import { StudyControls, StudyHeader, StudyTree, useStudyStore, StudySidebar } from '@/features/study'
import { pgnService } from '@/shared/lib/pgn/PgnService'
import { GameLayout } from '@/widgets/game-layout'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const boardStore = useBoardStore()
const studyStore = useStudyStore()
const analysisStore = useAnalysisStore()

const explorerMode = ref<'lichess' | 'mozer' | 'study'>('study')

const handleToggleAnalysis = () => {
  if (analysisStore.isAnalysisActive) {
    analysisStore.hidePanel()
  } else {
    analysisStore.showPanel(true)
  }
}

onMounted(async () => {
  boardStore.setAnalysisMode(true)
  await analysisStore.showPanel() // Initialize analysis (threads, etc.) and set visible flag for watcher
  await studyStore.initialize()

  if (route.params.id) {
    studyStore.setActiveChapter(route.params.id as string)
  } else if (studyStore.activeChapterId) {
    // Redirect to active chapter URL if we just hit /study
    updateUrl(studyStore.activeChapterId)
  }
})

function updateUrl(id: string) {
  const chapter = studyStore.chapters.find((c) => c.id === id)
  if (!chapter) return

  router.replace({ name: 'study-local', params: { id: chapter.id } })
}

// Watch for active chapter changes to update URL
watch(
  () => studyStore.activeChapterId,
  (newId) => {
    if (newId) updateUrl(newId)
  },
)

onUnmounted(() => {
  boardStore.setAnalysisMode(false)
  analysisStore.resetAnalysisState()
})

// Auto-update node evaluation from engine
watch(
  () => analysisStore.analysisLines,
  (lines) => {
    if (analysisStore.isAnalysisActive && lines.length > 0) {
      const topMove = lines[0]
      const currentNode = pgnService.getCurrentNode()
      if (topMove && currentNode && currentNode.id !== '__ROOT__') {
        // Convert score to centipawns or mate value
        let scoreVal = topMove.score.value
        if (topMove.score.type === 'mate') {
          scoreVal =
            topMove.score.value > 0 ? 100000 + topMove.score.value : -100000 - topMove.score.value
        }
        pgnService.updateNode(currentNode, { eval: scoreVal })
      }
    }
  },
  { deep: true },
)
</script>

<template>
  <GameLayout>
    <template #top-info>
      <StudyHeader />
    </template>

    <template #left-panel>
      <div class="explorer-wrapper">
        <div class="explorer-toggle">
          <button :class="{ active: explorerMode === 'study' }" @click="explorerMode = 'study'">
            Study
          </button>
          <button :class="{ active: explorerMode === 'mozer' }" @click="explorerMode = 'mozer'">
            MozerBook
          </button>
          <button :class="{ active: explorerMode === 'lichess' }" @click="explorerMode = 'lichess'">
            Lichess
          </button>
        </div>
        <StudySidebar v-if="explorerMode === 'study'" class="explorer-component" />
        <MozerBook v-else-if="explorerMode === 'mozer'" class="explorer-component" />
        <LichessOpeningExplorer v-else class="explorer-component" />
      </div>
    </template>

    <template #controls>
      <StudyControls
        :is-analysis-active="analysisStore.isAnalysisActive"
        @toggle-analysis="handleToggleAnalysis"
      />
    </template>

    <template #right-panel>
      <div class="right-panel-content">
        <AnalysisPanel :show-pgn="false" />
        <StudyTree />
      </div>
    </template>
  </GameLayout>
</template>

<style scoped>
/* Explorer Styles */
.explorer-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.explorer-toggle {
  display: flex;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.explorer-toggle button {
  flex: 1;
  padding: 8px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  font-weight: bold;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.explorer-toggle button.active {
  color: var(--color-accent-primary);
  border-bottom-color: var(--color-accent-primary);
}

.explorer-component {
  flex: 1;
  min-height: 0;
}

/* Right Panel */
.right-panel-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 10px;
}

:deep(.study-tree-container) {
  flex: 1;
  min-height: 0;
}
</style>
