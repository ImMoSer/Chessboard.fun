<!-- src/components/AnalysisPanel.vue -->
<script setup lang="ts">
import EngineLines from '@/components/Analysis/EngineLines.vue'
import type { PgnNode } from '@/services/PgnService'
import { pgnService, pgnTreeVersion } from '@/services/PgnService'
import { useAnalysisStore } from '@/stores/analysis.store'
import { useBoardStore } from '@/stores/board.store'
import {
    ChevronBackOutline,
    ChevronForwardOutline,
    PlaySkipBackOutline,
    PlaySkipForwardOutline,
} from '@vicons/ionicons5'
import { NButton, NButtonGroup, NScrollbar, NSpace, NText } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed, h, type FunctionalComponent } from 'vue'

const analysisStore = useAnalysisStore()
const boardStore = useBoardStore()

const { isPanelVisible, isAnalysisActive } = storeToRefs(analysisStore)

const pgnRendererComponent = computed(() => {
  const rootNode = pgnService.getRootNode()
  if (!rootNode) return null
  return h(PgnRenderer, { nodes: rootNode.children })
})

const handlePgnMoveClick = (node: PgnNode) => {
  boardStore.navigateToNode(node)
}

const handlePgnWheelNavigation = (event: WheelEvent) => {
  event.preventDefault()
  if (event.deltaY < 0) {
    boardStore.navigatePgn('backward', analysisStore.playerColor)
  } else {
    boardStore.navigatePgn('forward', analysisStore.playerColor)
  }
}

const PgnRenderer: FunctionalComponent<{ nodes: PgnNode[]; pathPrefix?: string }> = (props) => {
  const { nodes, pathPrefix = '' } = props
  if (!nodes || nodes.length === 0) return []

  const currentPath = pgnService.getCurrentPath()
  const mainlineNode = nodes[0]
  if (!mainlineNode) return []

  const variations = nodes.slice(1)
  const elements = []

  const movePath = pathPrefix + mainlineNode.id
  const isCurrent = movePath === currentPath

  if (mainlineNode.ply % 2 !== 0) {
    elements.push(
      h(
        NText,
        { depth: 3, class: 'move-number' },
        { default: () => `${Math.ceil(mainlineNode.ply / 2)}. ` },
      ),
    )
  }

  elements.push(
    h(
      NText,
      {
        strong: isCurrent,
        type: isCurrent ? 'primary' : 'default',
        class: { 'pgn-move': true, current: isCurrent },
        onClick: () => handlePgnMoveClick(mainlineNode),
      },
      { default: () => mainlineNode.san },
    ),
  )

  if (variations.length > 0) {
    variations.forEach((variationNode) => {
      elements.push(
        h('span', { class: 'pgn-variation' }, [
          h(NText, { depth: 3 }, { default: () => ' (' }),
          h(PgnRenderer, { nodes: [variationNode], pathPrefix }),
          h(NText, { depth: 3 }, { default: () => ') ' }),
        ]),
      )
    })
  }

  if (mainlineNode.children.length > 0) {
    elements.push(h('span', null, ' '))
    elements.push(h(PgnRenderer, { nodes: mainlineNode.children, pathPrefix: movePath }))
  }

  return elements
}
</script>

<template>
  <div v-if="isPanelVisible" class="analysis-container">
    <EngineLines />

    <transition name="fade-slide">
      <n-space v-if="isAnalysisActive" vertical class="analysis-body" :size="8">
        <!-- Navigation -->
        <n-button-group class="nav-group">
          <n-button secondary @click="boardStore.navigatePgn('start')">
            <template #icon
              ><n-icon>
                <PlaySkipBackOutline /> </n-icon
            ></template>
          </n-button>
          <n-button
            secondary
            @click="boardStore.navigatePgn('backward', analysisStore.playerColor)"
          >
            <template #icon
              ><n-icon>
                <ChevronBackOutline /> </n-icon
            ></template>
          </n-button>
          <n-button secondary @click="boardStore.navigatePgn('forward', analysisStore.playerColor)">
            <template #icon
              ><n-icon>
                <ChevronForwardOutline /> </n-icon
            ></template>
          </n-button>
          <n-button secondary @click="boardStore.navigatePgn('end')">
            <template #icon
              ><n-icon>
                <PlaySkipForwardOutline /> </n-icon
            ></template>
          </n-button>
        </n-button-group>

        <!-- PGN Display -->
        <div class="pgn-wrapper" @wheel="handlePgnWheelNavigation">
          <n-scrollbar class="pgn-scroll">
            <div class="pgn-content">
              <component :is="pgnRendererComponent" :key="pgnTreeVersion" />
            </div>
          </n-scrollbar>
        </div>
      </n-space>
    </transition>
  </div>
</template>

<style scoped lang="scss">
.analysis-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.toolbar-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.threads-select {
  width: 110px;
}

.nav-group {
  width: 100%;
  display: flex;

  button {
    flex: 1;
  }
}

.lines-wrapper {
  height: 110px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 6px;
  overflow: hidden;
}

.loading-state,
.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.lines-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.line-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);

  .line-depth {
    font-family: monospace;
    font-size: 0.75rem;
    min-width: 20px;
    text-align: right;
  }

  .score-btn {
    min-width: 54px;
    border-radius: 6px;
  }

  .pv-text {
    font-size: 0.85rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;

    &:hover {
      color: var(--color-accent);
    }
  }
}

.pgn-wrapper {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 12px;
  min-height: 80px;
  max-height: 300px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.pgn-scroll {
  flex: 1;
  min-height: 0;
}

.pgn-content {
  line-height: 2;
  font-size: 0.95rem;
}

:deep(.pgn-move) {
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  margin: 0 1px;
  transition: all 0.1s ease;

  &:hover:not(.current) {
    background: rgba(255, 255, 255, 0.08);
  }

  &.current {
    background: var(--color-accent);
    color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
