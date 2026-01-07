<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import GameLayout from '@/components/GameLayout.vue'
import StudySidebar from '@/components/study/StudySidebar.vue'
import StudyTree from '@/components/study/StudyTree.vue'
import StudyControls from '@/components/study/StudyControls.vue'
import { useBoardStore } from '@/stores/board.store'
import { useStudyStore } from '@/stores/study.store'

const boardStore = useBoardStore()
const studyStore = useStudyStore()

onMounted(() => {
    boardStore.setAnalysisMode(true)
    // Ensure we have a chapter
    if (!studyStore.activeChapterId) {
        if (studyStore.chapters.length > 0) {
            const first = studyStore.chapters[0]
            if (first) studyStore.setActiveChapter(first.id)
        } else {
            studyStore.createChapter('Chapter 1')
        }
    } else {
        // Re-sync board to active chapter just in case
        studyStore.setActiveChapter(studyStore.activeChapterId)
    }
})

onUnmounted(() => {
    boardStore.setAnalysisMode(false)
})
</script>

<template>
    <GameLayout>
        <template #top-info>
            <StudyControls />
        </template>

        <template #left-panel>
            <StudySidebar />
        </template>

        <!-- Center is auto-filled by GameLayout with WebChessBoard -->

        <template #right-panel>
            <StudyTree />
        </template>
    </GameLayout>
</template>
