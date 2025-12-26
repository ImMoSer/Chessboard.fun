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
    return (line.score.value / 100).toFixed(2)
  }
  return t('analysis.mateInShort', { value: Math.abs(line.score.value) })
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

const handleThreadsChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  analysisStore.setThreads(Number(target.value))
}

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
    elements.push(h('span', { class: 'move-number' }, `${Math.ceil(mainlineNode.ply / 2)}. `))
  }

  elements.push(
    h(
      'span',
      {
        class: { 'pgn-move': true, current: isCurrent },
        onClick: () => handlePgnMoveClick(mainlineNode),
      },
      mainlineNode.san,
    ),
  )

  if (variations.length > 0) {
    variations.forEach((variationNode) => {
      elements.push(
        h('span', { class: 'pgn-variation' }, [
          ' (',
          h(PgnRenderer, { nodes: [variationNode], pathPrefix }),
          ') ',
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
  <div v-if="isPanelVisible" class="analysis-panel-wrapper">
    <div class="analysis-controls-container">
      <div class="control-group">
        <label class="control-label">{{ t('analysis.engine') }}</label>
        <label class="toggle-switch">
          <input
            type="checkbox"
            :checked="isAnalysisActive"
            @change="analysisStore.toggleAnalysis"
          />
          <span class="slider round"></span>
        </label>
      </div>
      <div class="control-group">
        <label class="control-label">{{ t('analysis.threads') }}</label>
        <!-- <<< НАЧАЛО ИЗМЕНЕНИЙ: Добавлен класс threads-select -->
        <select
          class="threads-select"
          :disabled="!isMultiThreadAvailable"
          :value="numThreads"
          @change="handleThreadsChange"
        >
          <option v-for="n in maxThreads" :key="n" :value="n">{{ n }}</option>
        </select>
        <!-- <<< КОНЕЦ ИЗМЕНЕНИЙ -->
      </div>
    </div>

    <div v-if="isAnalysisActive" class="analysis-panel-main-content">
      <div class="pgn-navigation-controls">
        <button class="pgn-nav-button" @click="boardStore.navigatePgn('start')">|◀</button>
        <button class="pgn-nav-button" @click="boardStore.navigatePgn('backward', analysisStore.playerColor)">◀</button>
        <button class="pgn-nav-button" @click="boardStore.navigatePgn('forward', analysisStore.playerColor)">▶</button>
        <button class="pgn-nav-button" @click="boardStore.navigatePgn('end')">▶|</button>
      </div>

      <div class="analysis-lines-section">
        <div v-if="isLoading" class="loading-message">{{ t('analysis.loading') }}</div>
        <div v-else-if="isAnalysisActive && analysisLines.length > 0">
          <div v-for="(line, index) in analysisLines" :key="line.id" class="analysis-line-entry">
            <span class="line-depth">{{ line.depth }}</span>
            <button
              @click="handleLineClick(line)"
              :class="[
                'analysis-score-button',
                {
                  'best-line-score': index === 0,
                  'second-line-score': index === 1,
                  'third-line-score': index === 2,
                },
              ]"
            >
              {{ formatScore(line) }}
            </button>
            <span class="analysis-pv-text" :title="formatPv(line)">{{ formatPv(line) }}</span>
          </div>
        </div>
        <div v-else-if="isAnalysisActive && !isLoading" class="loading-message">
          {{ t('analysis.makeMove') }}
        </div>
      </div>

      <div class="pgn-display-container" @wheel="handlePgnWheelNavigation">
        <component :is="pgnRendererComponent" :key="pgnTreeVersion" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.analysis-panel-wrapper {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.analysis-panel-main-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 5px;
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  flex-grow: 1;
  min-height: 0;
}

.pgn-navigation-controls {
  display: flex;
  gap: 5px;
  justify-content: space-between;
}

.pgn-nav-button {
  flex-grow: 1;
  padding: 3px;
  font-size: var(--font-size-base);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-default);
  border-radius: var(--panel-border-radius);
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s;
}
.pgn-nav-button:hover:not(:disabled) {
  background-color: var(--color-border-hover);
  border-color: var(--color-accent-info);
}
.pgn-nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.analysis-lines-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: var(--font-size-small);
  height: 130px;
  border: 1px solid var(--color-border);
  border-radius: var(--panel-border-radius);
  background-color: var(--color-bg-primary);
}

.analysis-line-entry {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 5px;
  border-radius: 4px;
  background-color: var(--color-bg-tertiary);
  border: 0.5px solid var(--color-border);
  overflow: hidden;
  min-height: 25px;
  margin: 5px;
}

.line-depth {
  font-size: var(--font-size-small);
  font-weight: bold;
  color: var(--color-text-muted);
  min-width: 25px;
  text-align: center;
  flex-shrink: 0;
}

.analysis-score-button {
  font-family: var(--font-family-primary);
  font-weight: var(--font-weight-bold);
  padding: 4px 8px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--color-text-dark);
  min-width: 60px;
  text-align: center;
  flex-shrink: 0;
}
.best-line-score {
  background-color: var(--color-accent-success);
}
.second-line-score {
  background-color: var(--color-accent-warning);
}
.third-line-score {
  background-color: var(--color-accent-secondary);
}

.analysis-pv-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
  color: var(--color-text-default);
}

.loading-message {
  padding: 10px;
  text-align: center;
  color: var(--color-text-muted);
  font-style: italic;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pgn-display-container {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--panel-border-radius);
  padding: 10px;
  line-height: 1.8;
  font-size: var(--font-size-small);
  flex-grow: 1;
  height: 200px;
  overflow-y: auto;
  user-select: none;
  white-space: normal;
}

:deep(.pgn-move) {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  margin: 0 1px;
  transition: background-color 0.2s ease;
}
:deep(.pgn-move.current) {
  background-color: var(--color-accent-primary);
  color: var(--color-text-on-accent);
}
:deep(.pgn-move:not(.current):hover) {
  background-color: var(--color-border-hover);
}
:deep(.pgn-variation) {
  color: var(--color-text-muted);
}
:deep(.pgn-variation .pgn-move.current) {
  background-color: var(--color-accent-secondary);
}

.analysis-controls-container {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 15px;
  padding: 8px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-muted);
}

.control-label {
  font-size: var(--font-size-small);
  white-space: nowrap;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
  flex-shrink: 0;
}
.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #555;
  transition: 0.4s;
  border-radius: 28px;
}
.slider:before {
  position: absolute;
  content: '';
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}
input:checked + .slider {
  background-color: var(--color-accent-success);
}
input:disabled + .slider {
  cursor: not-allowed;
  opacity: 0.5;
}
input:checked + .slider:before {
  transform: translateX(22px);
}

/* <<< НАЧАЛО ИЗМЕНЕНИЙ: Удалены старые стили и добавлены новые */
.threads-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-default);
  border: 1px solid var(--color-border-hover);
  border-radius: 5px;
  padding: 5px 30px 5px 10px;
  font-family: var(--font-family-primary);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23B5B5B5' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 1em;
}

.threads-select:hover {
  border-color: var(--color-accent-primary);
}

.threads-select:focus {
  outline: none;
  border-color: var(--color-accent-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-accent-primary-rgb), 0.3);
}

.threads-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--color-bg-tertiary);
}
/* <<< КОНЕЦ ИЗМЕНЕНИЙ */
</style>
