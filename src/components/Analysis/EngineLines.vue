<script setup lang="ts">
import type { EvaluatedLineWithSan } from '@/services/AnalysisService'
import { useAnalysisStore } from '@/stores/analysis.store'
import { useBoardStore } from '@/stores/board.store'
import { BarChartOutline, TerminalOutline } from '@vicons/ionicons5'
import { NButton, NCard, NIcon, NSelect, NSpace, NSwitch, NText, NTooltip } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const analysisStore = useAnalysisStore()
const boardStore = useBoardStore()
const { t } = useI18n()

const {
  isAnalysisActive,
  analysisLines,
  isMultiThreadAvailable,
  maxThreads,
  numThreads,
} = storeToRefs(analysisStore)

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

// Computed property to safely access WDL stats for the best line (first line)
// This fixes TypeScript errors in the template by ensuring we work with a defined object
const bestLineWdl = computed(() => {
  const line = analysisLines.value[0]
  if (!line || !line.wdl) return null
  return line.wdl
})

const threadOptions = computed(() => {
  return Array.from({ length: maxThreads.value }, (_, i) => ({
    label: `${i + 1}`,
    value: i + 1,
  }))
})

const handleLineClick = (line: EvaluatedLineWithSan) => {
  const uciMove = line.pvUci[0]
  if (uciMove) {
    boardStore.applyUciMove(uciMove)
  }
}
</script>

<template>
  <div class="engine-lines-container">
    <!-- Top Toolbar -->
    <n-card class="toolbar-card" :bordered="false" size="small">
      <n-space align="center" justify="space-between">
        <n-space align="center" :size="12">
          <n-icon size="18" color="var(--color-accent)">
            <BarChartOutline />
          </n-icon>
          <n-text strong>{{ t('analysis.engine') }}</n-text>
          <n-switch
            :value="isAnalysisActive"
            size="small"
            @update:value="analysisStore.toggleAnalysis"
          />
        </n-space>

        <n-space align="center" :size="8">
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-icon size="16" depth="3" class="toolbar-icon">
                <TerminalOutline />
              </n-icon>
            </template>
            {{ t('analysis.threads') }}
          </n-tooltip>
          <n-select
            class="threads-select"
            size="small"
            :disabled="!isMultiThreadAvailable"
            :value="numThreads"
            :options="threadOptions"
            @update:value="analysisStore.setThreads"
          />
        </n-space>
      </n-space>
      
      <!-- WDL Bar (Best Line Stats) -->
      <transition name="fade">
        <div v-if="bestLineWdl" class="wdl-container">
          <div class="wdl-bar">
            <div class="wdl-segment win" :style="{ width: (bestLineWdl.win / 10) + '%' }"></div>
            <div class="wdl-segment draw" :style="{ width: (bestLineWdl.draw / 10) + '%' }"></div>
            <div class="wdl-segment loss" :style="{ width: (bestLineWdl.loss / 10) + '%' }"></div>
          </div>
          <div class="wdl-labels">
            <span class="win-text">{{ Math.round(bestLineWdl.win / 10) }}%</span>
            <span class="draw-text">{{ Math.round(bestLineWdl.draw / 10) }}%</span>
            <span class="loss-text">{{ Math.round(bestLineWdl.loss / 10) }}%</span>
          </div>
        </div>
      </transition>
    </n-card>

    <transition name="fade-slide">
      <div v-if="isAnalysisActive" class="lines-wrapper">
        <div v-if="analysisLines.length > 0" class="lines-list">
          <div v-for="(line, index) in analysisLines.slice(0, 3)" :key="line.id" class="line-item">
            <n-text class="line-depth" depth="3">{{ line.depth }}</n-text>
            <n-button
              size="tiny"
              :type="getScoreType(index)"
              class="score-btn"
              strong
              @click="handleLineClick(line)"
            >
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
    </transition>
  </div>
</template>

<style scoped lang="scss">
.engine-lines-container {
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

.profile-select {
  width: 95px;
}

.threads-select {
  width: 60px;
}

.toolbar-icon {
  cursor: help;
}

.lines-wrapper {
  // Fixed height to prevent jumping, but allows scrolling if many lines (though we limit to 3)
  min-height: 110px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 6px;
  overflow: hidden;
}

.loading-state,
.empty-state {
  height: 110px; // Match min-height of wrapper
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

  .wdl-container {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%; /* Ensure it takes full width */
  }

  .wdl-bar {
    display: flex;
    height: 8px; /* Slightly taller */
    width: 100%;
    border-radius: 4px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.1); /* Fallback background */
    
    .wdl-segment {
      height: 100%;
      transition: width 0.3s ease;
      /* Remove flex-grow to rely strictly on width % */
    }
    
    .win { background-color: var(--color-success, #63e2b7); }
    .draw { background-color: var(--color-text-3, #ffffff80); opacity: 0.5; }
    .loss { background-color: var(--color-error, #e88080); }
  }
  
  .wdl-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--color-text-3);
    padding: 0 1px;
    font-variant-numeric: tabular-nums; /* Monospace numbers for stability */
    
    .win-text { color: var(--color-success, #63e2b7); }
    .loss-text { color: var(--color-error, #e88080); }
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
