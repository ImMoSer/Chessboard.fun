<!-- src/components/AnalysisPanel.vue -->
<script setup lang="ts">
import EngineLines from '@/components/Analysis/EngineLines.vue'
import type { PgnNode } from '@/services/PgnService'
import { pgnService, pgnTreeVersion } from '@/services/PgnService'
import { useAnalysisStore } from '@/stores/analysis.store'
import { useRetroAnalysisStore } from '@/stores/retroAnalysis.store'
import { useBoardStore } from '@/stores/board.store'
import {
  ChevronBackOutline,
  ChevronForwardOutline,
  PlaySkipBackOutline,
  PlaySkipForwardOutline
} from '@vicons/ionicons5'
import {
  NButton, NButtonGroup, NIcon, NScrollbar,
  NSpace, NText
} from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed, h, type FunctionalComponent } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const analysisStore = useAnalysisStore()
const retroStore = useRetroAnalysisStore()
const boardStore = useBoardStore()

const {
  isPanelVisible,
  isAnalysisActive,
} = storeToRefs(analysisStore)

const selectedRetroStep = computed(() => {
  const node = pgnService.getCurrentNode()
  if (!node || !retroStore.report) return null
  
  const step = retroStore.report.steps.find(s => s.ply === node.ply - 1)
  if (!step) return null

  // Показываем детали только если цвет хода совпадает с цветом игрока
  const isPlayerMove = (node.ply % 2 !== 0 && retroStore.report.playerColor === 'white') ||
                       (node.ply % 2 === 0 && retroStore.report.playerColor === 'black')
                       
  return isPlayerMove ? step : null
})

const CLASSIFICATION_SYMBOLS: Record<string, string> = {
  blunder: '??',
  mistake: '?',
  inaccuracy: '?!',
  brilliant: '!!',
  great: '!',
}

const CLASSIFICATION_TYPES: Record<string, 'error' | 'warning' | 'info' | 'success' | 'default'> = {
  blunder: 'error',
  mistake: 'warning',
  inaccuracy: 'warning',
  brilliant: 'success',
  great: 'success',
}

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

const formatScore = (score: number) => {
  const val = (score / 100).toFixed(1)
  return score > 0 ? `+${val}` : val
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

  // Ретроанализ: ищем данные для текущего полухода
  const stepIdx = mainlineNode.ply - 1
  const retroStep = retroStore.report?.steps.find(s => s.ply === stepIdx)
  
  const isPlayerMove = retroStore.report && (
    (mainlineNode.ply % 2 !== 0 && retroStore.report.playerColor === 'white') ||
    (mainlineNode.ply % 2 === 0 && retroStore.report.playerColor === 'black')
  )

  const marker = (retroStep && isPlayerMove) ? CLASSIFICATION_SYMBOLS[retroStep.classification] : null
  const markerType = (retroStep && isPlayerMove) ? CLASSIFICATION_TYPES[retroStep.classification] : 'default'

  if (mainlineNode.ply % 2 !== 0) {
    elements.push(h(NText, { depth: 3, class: 'move-number' }, { default: () => `${Math.ceil(mainlineNode.ply / 2)}. ` }))
  }

  elements.push(
    h('span', { class: 'pgn-move-container' }, [
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
      marker ? h(
        NText,
        {
          type: markerType,
          class: 'pgn-marker',
          strong: true
        },
        { default: () => marker }
      ) : null
    ])
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
      <div v-if="selectedRetroStep" class="retro-details-card">
        <n-space justify="space-between" align="center">
          <n-text strong :type="CLASSIFICATION_TYPES[selectedRetroStep.classification]">
            {{ CLASSIFICATION_SYMBOLS[selectedRetroStep.classification] }} 
            {{ t(`retroAnalysis.${selectedRetroStep.classification}`) }}
          </n-text>
          <n-text depth="3" class="score-diff">
            {{ formatScore(selectedRetroStep.score) }} 
            <span class="loss-text">(-{{ (selectedRetroStep.loss / 100).toFixed(1) }})</span>
          </n-text>
        </n-space>
        
        <div class="advice-text">
            {{ t('retroAnalysis.bestWas') }} 
            <n-button text type="primary" strong @click="boardStore.applyUciMove(selectedRetroStep.bestMoveUci)">
                {{ selectedRetroStep.bestMoveSan }}
            </n-button>
        </div>
      </div>
    </transition>

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

.retro-details-card {
    background: rgba(var(--color-accent-rgb, 100, 100, 255), 0.1);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 4px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-left: 4px solid var(--color-accent);
}

.score-diff {
    font-family: monospace;
    font-size: 0.9rem;
}

.loss-text {
    color: var(--color-error);
    font-weight: bold;
}

.advice-text {
    font-size: 0.9rem;
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
  line-height: 2.2;
  font-size: 0.95rem;
}

.pgn-move-container {
  display: inline-flex;
  align-items: center;
  position: relative;
}

.pgn-marker {
  font-size: 0.75rem;
  margin-left: -2px;
  margin-right: 4px;
  background: rgba(0, 0, 0, 0.3);
  padding: 0 4px;
  border-radius: 4px;
  line-height: 1.2;
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