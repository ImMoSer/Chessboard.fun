<script setup lang="ts">
import { computed } from 'vue'
import { pgnService, pgnTreeVersion } from '@/services/PgnService'
import StudyTreeNode from './StudyTreeNode.vue'

// Re-compute root children when tree version changes
const rootNode = computed(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const v = pgnTreeVersion.value
    return pgnService.getRootNode()
})

const gameResult = computed(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const v = pgnTreeVersion.value
    return pgnService.getGameResult()
})

</script>

<template>
    <div class="study-tree-container">
        <div class="tree-content">
            <div v-if="!rootNode" class="empty-tree">
                <p>Start moving on the board to create lines!</p>
            </div>

            <div v-else>
                <StudyTreeNode :node="rootNode" />
            </div>

            <div class="game-result">
                {{ gameResult }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.study-tree-container {
    height: 100%;
    overflow-y: auto;
    background: var(--color-bg-secondary);
    padding: 10px;
    font-family: 'Noto Sans', sans-serif;
    color: var(--color-text-primary, #ccc);
}

.empty-tree {
    opacity: 0.5;
    text-align: center;
    margin-top: 20px;
}

.root-variation {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--color-border, #444);
}

.game-result {
    margin-top: 20px;
    font-weight: bold;
    text-align: center;
    opacity: 0.7;
}
</style>
