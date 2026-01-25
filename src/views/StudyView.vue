<script setup lang="ts">
import EngineLines from '@/components/Analysis/EngineLines.vue'
import LichessOpeningExplorer from '@/components/OpeningTrainer/LichessOpeningExplorer.vue'
import MozerBook from '@/components/OpeningTrainer/MozerBook.vue'
import StudyControls from '@/components/study/StudyControls.vue'
import StudyLayout from '@/components/study/StudyLayout.vue'
import StudySidebar from '@/components/study/StudySidebar.vue'
import StudyTree from '@/components/study/StudyTree.vue'
import { useBoardStore } from '@/stores/board.store'
import { useStudyStore } from '@/stores/study.store'
import { onMounted, onUnmounted, ref } from 'vue'

import { pgnService } from '@/services/PgnService'
import { useAnalysisStore } from '@/stores/analysis.store'
import { watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const boardStore = useBoardStore()
const studyStore = useStudyStore()
const analysisStore = useAnalysisStore()
const isSidebarCollapsed = ref(true) // По умолчанию свернута
const autoCollapseTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const explorerMode = ref<'lichess' | 'mozer'>('mozer')

const startAutoCollapseTimer = () => {
  cancelAutoCollapseTimer()
  autoCollapseTimer.value = setTimeout(() => {
    isSidebarCollapsed.value = true
  }, 10000) // 10 секунд
}

const cancelAutoCollapseTimer = () => {
  if (autoCollapseTimer.value) {
    clearTimeout(autoCollapseTimer.value)
    autoCollapseTimer.value = null
  }
}

onMounted(async () => {
  boardStore.setAnalysisMode(true)
  await analysisStore.showPanel() // Initialize analysis (threads, etc.) and set visible flag for watcher
  await studyStore.initialize()

  if (route.params.slug) {
    await studyStore.loadFromCloud(route.params.slug as string)
  }

  // Запускаем таймер при загрузке, чтобы если она была открыта (например, через стор), она закрылась
  if (!isSidebarCollapsed.value) {
    startAutoCollapseTimer()
  }
})

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
  <StudyLayout>
    <template #top-info>
      <StudyControls />
    </template>

    <template #left-panel>
      <div
        class="left-panel-content"
        @mouseenter="cancelAutoCollapseTimer"
        @mouseleave="startAutoCollapseTimer"
      >
        <StudySidebar
          class="sidebar-component"
          :collapsed="isSidebarCollapsed"
          @toggle="isSidebarCollapsed = !isSidebarCollapsed"
        />

        <div class="explorer-container" :class="{ expanded: isSidebarCollapsed }">
          <div class="explorer-toggle">
            <button :class="{ active: explorerMode === 'mozer' }" @click="explorerMode = 'mozer'">
              MozerBook
            </button>
            <button
              :class="{ active: explorerMode === 'lichess' }"
              @click="explorerMode = 'lichess'"
            >
              Lichess
            </button>
          </div>
          <MozerBook v-if="explorerMode === 'mozer'" class="explorer-component" />
          <LichessOpeningExplorer v-else mode="study" class="explorer-component" />
        </div>
      </div>
    </template>

    <!-- Center is auto-filled by StudyLayout with WebChessBoard -->

    <template #right-panel>
      <div class="right-panel-content">
        <EngineLines />
        <StudyTree />
      </div>
    </template>
  </StudyLayout>
</template>

<style scoped>
.left-panel-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 10px;
}

.sidebar-component {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.explorer-container {
  flex-shrink: 0;
  max-height: 45%;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.explorer-container.expanded {
  flex: 1;
  max-height: 100%;
}

.explorer-toggle {
  display: flex;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-bottom: none;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  overflow: hidden;
}

.explorer-toggle button {
  flex: 1;
  padding: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.explorer-toggle button.active {
  background: var(--color-accent);
  color: white;
}

.explorer-component {
  flex: 1;
  min-height: 0;
}

.right-panel-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

:deep(.study-tree-container) {
  flex: 1;
  min-height: 0;
}
</style>
