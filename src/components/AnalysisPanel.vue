<!-- src/components/AnalysisPanel.vue -->
<script setup lang="ts">
import { computed, h, type FunctionalComponent } from 'vue'
import { useAnalysisStore } from '@/stores/analysis.store'
import { useBoardStore } from '@/stores/board.store'
import { pgnService, pgnTreeVersion } from '@/services/PgnService'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import type { EvaluatedLineWithSan } from '@/services/AnalysisService'
import type { PgnNode } from '@/services/PgnService'
import {
  NSwitch, NSelect, NButton, NButtonGroup, NScrollbar,
  NSpace, NText, NIcon, NCard, NSpin, NTag, NTooltip
} from 'naive-ui'
import {
  ChevronBackOutline,
  ChevronForwardOutline,
  PlaySkipBackOutline,
  PlaySkipForwardOutline,
  SettingsOutline,
  BarChartOutline,
  TerminalOutline
} from '@vicons/ionicons5'

const analysisStore = useAnalysisStore()
const boardStore = useBoardStore()
const { t } = useI18n()

const {
  isPanelVisible,
  isAnalysisActive,
  isLoading,
  analysisLines,
  isMultiThreadAvailable,
  maxThreads,
  numThreads,
} = storeToRefs(analysisStore)

const pgnRendererComponent = computed(() => {
  const _fenTrigger = boardStore.fen
  const rootNode = pgnService.getRootNode()
  if (!rootNode) return null
  return h(PgnRenderer, { nodes: rootNode.children })
})

const formatScore = (line: EvaluatedLineWithSan) => {
  if (line.score.type === 'cp') {
    const val = line.score.value / 100
    return (val > 0 ? '+' : '') + val.toFixed(2)
  }
  return t('analysis.mateInShort', { value: Math.abs(line.score.value) })
}

const getScoreType = (index: number) => {
  if (index === 0) return 'success'
  if (index === 1) return 'warning'
  return 'info'
}

const formatPv = (line: EvaluatedLineWithSan) => {
  let pvString = ''
  let currentMoveNumber = line.initialFullMoveNumber
  let turnForPv = line.initialTurn
  line.pvSan.forEach((san, sanIndex) => {
    if (turnForPv === 'white') {
      pvString += `${currentMoveNumber}. ${san} `
    } else if (sanIndex === 0) {
      pvString += `${currentMoveNumber}...${san} `
    } else {
      pvString += `${san} `
    }
    if (turnForPv === 'black') {
      currentMoveNumber++
    }
    turnForPv = turnForPv === 'white' ? 'black' : 'white'
  })
  return pvString.trim()
}

const threadOptions = computed(() => {
  return Array.from({ length: maxThreads.value }, (_, i) => ({
    label: `${i + 1} ${t('analysis.threads')}`,
    value: i + 1
  }))
})

const handleLineClick = (line: EvaluatedLineWithSan) => {
  const uciMove = line.pvUci[0]
  if (uciMove) {
    boardStore.applyUciMove(uciMove)
  }
}

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
    elements.push(h(NText, { depth: 3, class: 'move-number' }, { default: () => `${Math.ceil(mainlineNode.ply / 2)}. ` }))
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
      { default: () => mainlineNode.san }
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
    <!-- Top Toolbar -->
    <n-card class="toolbar-card" :bordered="false" size="small">
      <n-space align="center" justify="space-between">
        <n-space align="center" :size="12">
          <n-icon size="18" color="var(--color-accent)">
            <BarChartOutline />
          </n-icon>
          <n-text strong>{{ t('analysis.engine') }}</n-text>
          <n-switch :value="isAnalysisActive" size="small" @update:value="analysisStore.toggleAnalysis" />
        </n-space>

        <n-space align="center" :size="8">
          <n-icon size="16" depth="3">
            <TerminalOutline />
          </n-icon>
          <n-select class="threads-select" size="small" :disabled="!isMultiThreadAvailable" :value="numThreads"
            :options="threadOptions" @update:value="analysisStore.setThreads" />
        </n-space>
      </n-space>
    </n-card>

    <transition name="fade-slide">
      <n-space v-if="isAnalysisActive" vertical class="analysis-body" :size="8">
        <!-- Navigation -->
        <n-button-group class="nav-group">
          <n-button secondary @click="boardStore.navigatePgn('start')">
            <template #icon><n-icon>
                <PlaySkipBackOutline />
              </n-icon></template>
          </n-button>
          <n-button secondary @click="boardStore.navigatePgn('backward', analysisStore.playerColor)">
            <template #icon><n-icon>
                <ChevronBackOutline />
              </n-icon></template>
          </n-button>
          <n-button secondary @click="boardStore.navigatePgn('forward', analysisStore.playerColor)">
            <template #icon><n-icon>
                <ChevronForwardOutline />
              </n-icon></template>
          </n-button>
          <n-button secondary @click="boardStore.navigatePgn('end')">
            <template #icon><n-icon>
                <PlaySkipForwardOutline />
              </n-icon></template>
          </n-button>
        </n-button-group>

        <!-- Lines -->
        <div class="lines-wrapper">
          <div v-if="isLoading" class="loading-state">
            <n-spin size="small" />
            <n-text depth="3" italic>{{ t('analysis.loading') }}</n-text>
          </div>

          <div v-else-if="analysisLines.length > 0" class="lines-list">
            <div v-for="(line, index) in analysisLines.slice(0, 3)" :key="line.id" class="line-item">
              <n-text class="line-depth" depth="3">{{ line.depth }}</n-text>
              <n-button size="tiny" :type="getScoreType(index)" class="score-btn" strong @click="handleLineClick(line)">
                {{ formatScore(line) }}
              </n-button>
              <n-tooltip trigger="hover">
                <template #trigger>
                  <n-text class="pv-text" @click="handleLineClick(line)">{{ formatPv(line) }}</n-text>
                </template>
                {{ formatPv(line) }}
              </n-tooltip>
            </div>
          </div>

          <div v-else class="empty-state">
            <n-text depth="3" italic>{{ t('analysis.makeMove') }}</n-text>
          </div>
        </div>

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
  height: 240px;
  transition: all 0.3s ease;
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
