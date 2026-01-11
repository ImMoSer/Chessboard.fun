<script setup lang="ts">
import {
  BarChartOutline,
  CloseOutline,
  HardwareChipOutline,
  PlayOutline,
  SettingsOutline,
  StopOutline,
  TimerOutline
} from '@vicons/ionicons5'
import {
  NButton,
  NIcon,
  NModal,
  NProgress,
  NSlider,
  NSpace,
  NTag,
  NText,
  NTooltip
} from 'naive-ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { pgnService } from '../services/PgnService'
import { useRetroAnalysisStore } from '../stores/retroAnalysis.store'

const { t } = useI18n()
const retroStore = useRetroAnalysisStore()

const maxThreads = computed(() => navigator.hardwareConcurrency || 4)
const maxHash = 1024 // Ограничим 1ГБ для WASM

const isReportReady = computed(() => !!retroStore.report)

async function startAnalysis() {
  const rootNode = pgnService.getRootNode()
  if (!rootNode) return

  const mainLineNodes = pgnService.getMainlineNodes()
  // Для анализа хода нам нужен FEN позиции ДО хода
  const fens = mainLineNodes.map(node => node.fenBefore)
  const movesSan = mainLineNodes.map(node => node.san)

  retroStore.saveSettings()
  await retroStore.startAnalysis(fens, movesSan)
}

function handleClose() {
  retroStore.closeModal()
}
</script>

<template>
  <n-modal
    v-model:show="retroStore.isModalOpen"
    preset="card"
    :style="{ width: '550px', borderRadius: '16px' }"
    class="retro-modal"
    :title="t('retroAnalysis.title')"
    :bordered="false"
    closable
    @close="handleClose"
  >
    <template #header-extra>
      <n-icon size="24" color="var(--color-accent)">
        <BarChartOutline />
      </n-icon>
    </template>

    <div class="modal-content">
      <!-- SETTINGS VIEW -->
      <n-space v-if="!retroStore.isAnalyzing && !isReportReady" vertical :size="24">
        <n-text depth="3">
          {{ t('retroAnalysis.description') }}
        </n-text>

        <div class="setting-item">
          <n-space align="center" justify="space-between">
            <n-space align="center" :size="8">
              <n-icon><HardwareChipOutline /></n-icon>
              <n-text strong>{{ t('retroAnalysis.threads') }}</n-text>
            </n-space>
            <n-tag :bordered="false" type="info">{{ retroStore.settings.threads }}</n-tag>
          </n-space>
          <n-slider v-model:value="retroStore.settings.threads" :min="1" :max="maxThreads" :step="1" />
        </div>

        <div class="setting-item">
          <n-space align="center" justify="space-between">
            <n-space align="center" :size="8">
              <n-icon><SettingsOutline /></n-icon>
              <n-text strong>{{ t('retroAnalysis.hash') }}</n-text>
            </n-space>
            <n-tag :bordered="false" type="info">{{ retroStore.settings.hash }} MB</n-tag>
          </n-space>
          <n-slider v-model:value="retroStore.settings.hash" :min="16" :max="maxHash" :step="16" />
        </div>

        <div class="setting-item">
          <n-space align="center" justify="space-between">
            <n-space align="center" :size="8">
              <n-icon><BarChartOutline /></n-icon>
              <n-text strong>{{ t('retroAnalysis.depth') }}</n-text>
            </n-space>
            <n-tag :bordered="false" type="warning">{{ retroStore.settings.depth }}</n-tag>
          </n-space>
          <n-slider v-model:value="retroStore.settings.depth" :min="10" :max="24" :step="1" />
        </div>

        <div class="setting-item">
          <n-space align="center" justify="space-between">
            <n-space align="center" :size="8">
              <n-icon><TimerOutline /></n-icon>
              <n-text strong>{{ t('retroAnalysis.movetime') }}</n-text>
            </n-space>
            <n-tag :bordered="false" type="warning">{{ retroStore.settings.movetime }} ms</n-tag>
          </n-space>
          <n-slider v-model:value="retroStore.settings.movetime" :min="100" :max="3000" :step="100" />
        </div>
      </n-space>

      <!-- ANALYZING VIEW -->
      <div v-else-if="retroStore.isAnalyzing" class="analyzing-state">
        <n-space vertical align="center" :size="20">
          <n-progress
            type="circle"
            :percentage="retroStore.progress"
            :color="'var(--color-accent)'"
            :rail-color="'rgba(255, 255, 255, 0.1)'"
          >
            <span style="text-align: center; font-size: 1.2rem; font-weight: bold">
              {{ retroStore.progress }}%
            </span>
          </n-progress>
          <n-text strong>
            {{ t('retroAnalysis.analyzing', { current: retroStore.currentStep, total: retroStore.totalSteps }) }}
          </n-text>
          <n-button secondary type="error" @click="retroStore.stopAnalysis">
            <template #icon><n-icon><StopOutline /></n-icon></template>
            {{ t('common.stop') }}
          </n-button>
        </n-space>
      </div>

      <!-- REPORT VIEW -->
      <div v-else-if="isReportReady" class="report-state">
         <n-space vertical :size="20">
            <div class="accuracy-header">
                <n-text class="accuracy-label">{{ t('retroAnalysis.accuracy') }}</n-text>
                <div class="accuracy-value" :style="{ color: getAccuracyColor(retroStore.report!.accuracy) }">
                    {{ retroStore.report?.accuracy }}%
                </div>
            </div>

            <n-space justify="space-around">
                <div class="stat-box">
                    <n-text depth="3">{{ t('retroAnalysis.blunders') }}</n-text>
                    <n-text class="stat-count blunder">{{ retroStore.report?.counts.blunder }}</n-text>
                </div>
                <div class="stat-box">
                    <n-text depth="3">{{ t('retroAnalysis.mistakes') }}</n-text>
                    <n-text class="stat-count mistake">{{ retroStore.report?.counts.mistake }}</n-text>
                </div>
                <div class="stat-box">
                    <n-text depth="3">{{ t('retroAnalysis.inaccuracies') }}</n-text>
                    <n-text class="stat-count inaccuracy">{{ retroStore.report?.counts.inaccuracy }}</n-text>
                </div>
            </n-space>

            <n-button block secondary type="primary" @click="isReportReady ? retroStore.report = null : null">
                {{ t('retroAnalysis.reanalyze') }}
            </n-button>
         </n-space>
      </div>
    </div>

    <template #footer>
      <n-button
        v-if="!retroStore.isAnalyzing && !isReportReady"
        type="primary"
        size="large"
        block
        strong
        class="start-btn"
        @click="startAnalysis"
      >
        <template #icon>
          <n-icon>
            <PlayOutline />
          </n-icon>
        </template>
        {{ t('retroAnalysis.run') }}
      </n-button>
      <n-button v-else-if="isReportReady" block @click="handleClose">
        {{ t('common.close') }}
      </n-button>
    </template>
  </n-modal>
</template>

<script lang="ts">
function getAccuracyColor(acc: number) {
    if (acc >= 90) return '#4caf50'
    if (acc >= 75) return '#8bc34a'
    if (acc >= 50) return '#ffc107'
    return '#f44336'
}
</script>

<style scoped lang="scss">
.retro-modal {
  background: var(--color-bg-secondary);
}

.modal-content {
  padding: 10px 0;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
  border-radius: 12px;
}

.analyzing-state {
  padding: 20px 0;
}

.accuracy-header {
    text-align: center;
    background: rgba(255, 255, 255, 0.05);
    padding: 20px;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.accuracy-label {
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 0.8rem;
}

.accuracy-value {
    font-size: 3rem;
    font-weight: 800;
}

.stat-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

.stat-count {
    font-size: 1.5rem;
    font-weight: bold;
    
    &.blunder { color: #f44336; }
    &.mistake { color: #ff9800; }
    &.inaccuracy { color: #ffeb3b; }
}

.start-btn {
  height: 52px;
  border-radius: 12px;
  background-color: var(--color-accent) !important;
}
</style>