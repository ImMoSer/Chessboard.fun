<script setup lang="ts">
import { pgnService, pgnTreeVersion } from '@/shared/lib/pgn/PgnService'
import { computed } from 'vue'
import StudyCandidateMoves from './StudyCandidateMoves.vue'
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
    <div class="sticky-candidates">
      <StudyCandidateMoves />
    </div>
  </div>
</template>

<style scoped>
.study-tree-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-secondary);
  padding: 0;
  font-family: 'Noto Sans', sans-serif;
  color: var(--color-text-primary, #ccc);

  /* --- НАСТРОЙКА ШРИФТА --- */
  line-height: 1.2;
  /* Общий межстрочный интервал для всего дерева */
  letter-spacing: -0.01em;
  /* Общее расстояние между буквами */
}

.tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.sticky-candidates {
  flex-shrink: 0;
  border-top: 1px solid var(--color-border);
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
