<script setup lang="ts">
import EngineLines from '@/components/Analysis/EngineLines.vue'
import GameLayout from '@/components/GameLayout.vue'
import StudyControls from '@/components/study/StudyControls.vue'
import StudyOpeningExplorer from '@/components/study/StudyOpeningExplorer.vue'
import StudySidebar from '@/components/study/StudySidebar.vue'
import StudyTree from '@/components/study/StudyTree.vue'
import { useBoardStore } from '@/stores/board.store'
import { useStudyStore } from '@/stores/study.store'
import { onMounted, onUnmounted, ref } from 'vue'

import { pgnService } from '@/services/PgnService'
import { useAnalysisStore } from '@/stores/analysis.store'
import { watch } from 'vue'

const boardStore = useBoardStore()
const studyStore = useStudyStore()
const analysisStore = useAnalysisStore()
const isSidebarCollapsed = ref(false)

onMounted(async () => {
    boardStore.setAnalysisMode(true)
    await analysisStore.showPanel() // Initialize analysis (threads, etc.) and set visible flag for watcher
    await studyStore.initialize()
})

onUnmounted(() => {
    boardStore.setAnalysisMode(false)
    analysisStore.resetAnalysisState()
})

// Auto-update node evaluation from engine
watch(() => analysisStore.analysisLines, (lines) => {
    if (analysisStore.isAnalysisActive && lines.length > 0) {
        const topMove = lines[0];
        const currentNode = pgnService.getCurrentNode();
        if (topMove && currentNode && currentNode.id !== '__ROOT__') {
            // Convert score to centipawns or mate value
            let scoreVal = topMove.score.value;
            if (topMove.score.type === 'mate') {
                scoreVal = topMove.score.value > 0 ? 100000 + topMove.score.value : -100000 - topMove.score.value;
            }
            pgnService.updateNode(currentNode, { eval: scoreVal });
        }
    }
}, { deep: true });
</script>

<template>
    <GameLayout>
        <template #top-info>
            <StudyControls />
        </template>

        <template #left-panel>
            <div class="left-panel-content">
                <StudySidebar class="sidebar-component" :collapsed="isSidebarCollapsed"
                    @toggle="isSidebarCollapsed = !isSidebarCollapsed" />
                <StudyOpeningExplorer class="explorer-component" :class="{ 'expanded': isSidebarCollapsed }" />
            </div>
        </template>

        <!-- Center is auto-filled by GameLayout with WebChessBoard -->

        <template #right-panel>
            <div class="right-panel-content">
                <StudyTree />
                <EngineLines />
            </div>
        </template>
    </GameLayout>
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

.explorer-component {
    flex-shrink: 0;
    max-height: 40%;
    overflow-y: auto;
    transition: all 0.3s ease;
}

.explorer-component.expanded {
    flex: 1;
    max-height: 100%;
}

.right-panel-content {
    display: flex;
    flex-direction: column;
    height: 100%;
}

:deep(.study-tree) {
    flex: 1;
    overflow-y: auto;
}
</style>
