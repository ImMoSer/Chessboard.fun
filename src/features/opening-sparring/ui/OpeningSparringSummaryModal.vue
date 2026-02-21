<script setup lang="ts">
import {
    BarChartOutline,
    CheckmarkDoneOutline,
    CloseOutline,
    PlayOutline,
    PulseOutline,
    RefreshOutline,
    SearchOutline,
    TrendingUpOutline,
} from '@vicons/ionicons5'
import {
    NButton,
    NGrid,
    NGridItem,
    NIcon,
    NModal,
    NProgress,
    NSpace,
    NStatistic,
    NTag,
    NText
} from 'naive-ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOpeningSparringStore } from '@/stores/openingSparring.store'
import EngineSelector from '@/features/engine/ui/EngineSelector.vue'

const openingStore = useOpeningSparringStore()
const { t } = useI18n()

defineProps<{
  show: boolean
}>()

const emit = defineEmits(['close', 'playout', 'analyze', 'restart'])

const evalText = computed(() => {
  if (!openingStore.finalEval) return ''
  const val = openingStore.finalEval.value
  if (openingStore.finalEval.type === 'mate') {
    return `Mate in ${Math.abs(val)}`
  }
  const score = (val / 100).toFixed(2)
  return score.startsWith('-') ? score : `+${score}`
})

const evalStatus = computed(() => {
  if (!openingStore.finalEval) return 'default'
  const val = openingStore.finalEval.value
  const isWhite = openingStore.playerColor === 'white'

  if (val === 0) return 'default'

  // Positive score is good for white
  const isGood = isWhite ? val > 0 : val < 0
  const isVeryGood = isWhite ? val > 150 : val < -150
  const isBad = isWhite ? val < -100 : val > 100

  if (isVeryGood) return 'success'
  if (isGood) return 'info'
  if (isBad) return 'error'
  return 'warning'
})

const progressPercent = computed(() => {
    return Math.min(100, (openingStore.finalEvalDepth / 20) * 100)
})
</script>

<template>
  <n-modal
    :show="show"
    preset="card"
    :style="{ width: '500px', borderRadius: '20px' }"
    class="summary-modal"
    :title="t('openingTrainer.header.bookEnded')"
    :bordered="false"
    :closable="false"
    :mask-closable="false"
  >
    <div class="summary-content">
      <n-space vertical :size="24">
        <!-- Stats Grid -->
        <n-grid :cols="3" :x-gap="12">
          <n-grid-item>
            <div class="stat-box">
              <n-statistic :label="t('openingTrainer.header.accuracy')" :value="openingStore.averageAccuracy">
                <template #prefix>
                   <n-icon class="stat-icon acc"><PulseOutline /></n-icon>
                </template>
                <template #suffix>%</template>
              </n-statistic>
            </div>
          </n-grid-item>
          <n-grid-item>
            <div class="stat-box">
              <n-statistic :label="t('openingTrainer.header.winRate')" :value="openingStore.averageWinRate">
                <template #prefix>
                   <n-icon class="stat-icon win"><TrendingUpOutline /></n-icon>
                </template>
                <template #suffix>%</template>
              </n-statistic>
            </div>
          </n-grid-item>
          <n-grid-item>
            <div class="stat-box">
              <n-statistic :label="t('openingTrainer.header.avgRating')" :value="openingStore.averageRating">
                 <template #prefix>
                   <n-icon class="stat-icon rat"><BarChartOutline /></n-icon>
                </template>
              </n-statistic>
            </div>
          </n-grid-item>
        </n-grid>

        <!-- Engine Evaluation Section -->
        <div class="engine-eval-section" :class="{ loading: openingStore.isFinalEvaluating }">
            <div class="section-header">
                <n-text strong depth="2">{{ t('analysis.engine') }} Assessment</n-text>
                <n-tag v-if="!openingStore.isFinalEvaluating" :type="evalStatus" round size="small" class="eval-tag">
                    {{ evalText }}
                </n-tag>
            </div>

            <div v-if="openingStore.isFinalEvaluating" class="eval-loading">
                <n-progress
                    type="line"
                    :percentage="progressPercent"
                    :show-indicator="false"
                    processing
                    status="info"
                    :height="4"
                    border-radius="4px"
                    class="eval-progress"
                />
                <n-text depth="3" class="depth-text">Analyzing depth: {{ openingStore.finalEvalDepth }} / 20</n-text>
            </div>

            <div v-else class="eval-result" :class="evalStatus">
                 <n-icon size="24" class="status-icon">
                    <CheckmarkDoneOutline v-if="evalStatus === 'success' || evalStatus === 'info'" />
                    <CloseOutline v-else-if="evalStatus === 'error'" />
                    <SearchOutline v-else />
                 </n-icon>
                 <n-text v-if="evalStatus === 'success'" class="result-msg">Exited opening with a great advantage!</n-text>
                 <n-text v-else-if="evalStatus === 'info'" class="result-msg">Solid position out of the opening.</n-text>
                 <n-text v-else-if="evalStatus === 'error'" class="result-msg">Slightly worse position. Don't worry!</n-text>
                 <n-text v-else class="result-msg">Equality has been maintained.</n-text>
            </div>
        </div>

        <!-- Engine Selection for Playout -->
        <div class="engine-selection-block">
            <n-text depth="3" class="selection-hint">
                {{ t('openingTrainer.settings.engineHint', 'Choose the engine for playout mode.') }}
            </n-text>
            <div class="engine-selector-wrapper">
                <EngineSelector />
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="modal-actions">
           <n-space vertical :size="12">
                <n-grid :cols="2" :x-gap="12">
                    <n-grid-item>
                         <n-button
                            block
                            secondary
                            type="success"
                            size="large"
                            :disabled="openingStore.isFinalEvaluating"
                            @click="emit('playout')"
                        >
                            <template #icon><n-icon><PlayOutline /></n-icon></template>
                            Playout
                        </n-button>
                    </n-grid-item>
                    <n-grid-item>
                         <n-button
                            block
                            secondary
                            type="info"
                            size="large"
                            :disabled="openingStore.isFinalEvaluating"
                            @click="emit('analyze')"
                        >
                            <template #icon><n-icon><SearchOutline /></n-icon></template>
                            Analyze
                        </n-button>
                    </n-grid-item>
                </n-grid>

                <n-button
                    block
                    quaternary
                    size="large"
                    @click="emit('restart')"
                >
                    <template #icon><n-icon><RefreshOutline /></n-icon></template>
                    {{ t('openingTrainer.header.newSession') }}
                </n-button>
           </n-space>
        </div>
      </n-space>
    </div>
  </n-modal>
</template>

<style scoped lang="scss">
.summary-modal {
  :deep(.n-card-header) {
    padding-bottom: 0;
  }
}

.summary-content {
  padding: 8px 0;
}

.stat-box {
    background: rgba(255, 255, 255, 0.03);
    padding: 16px 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    text-align: center;

    .stat-icon {
        margin-right: 4px;
        font-size: 1.1rem;

        &.acc { color: var(--color-accent-warning); }
        &.win { color: #4caf50; }
        &.rat { color: var(--color-accent); }
    }
}

.engine-eval-section {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 16px;
    padding: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;

    &.loading {
        background: rgba(var(--color-accent-rgb), 0.05);
        border-color: rgba(var(--color-accent-rgb), 0.2);
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
    }
}

.eval-tag {
    font-family: 'Fira Code', monospace;
    font-weight: bold;
    font-size: 1rem;
    padding: 4px 12px;
}

.eval-loading {
    .depth-text {
        display: block;
        text-align: center;
        margin-top: 12px;
        font-size: 0.8rem;
    }
}

.eval-result {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border-radius: 8px;

    &.success { color: #4caf50; background: rgba(76, 175, 80, 0.1); }
    &.info { color: #2196f3; background: rgba(33, 150, 243, 0.1); }
    &.warning { color: #ff9800; background: rgba(255, 152, 0, 0.1); }
    &.error { color: #f44336; background: rgba(244, 67, 54, 0.1); }

    .result-msg {
        font-weight: 500;
        font-size: 0.95rem;
    }
}

.modal-actions {
    margin-top: 8px;
}

.engine-selection-block {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.selection-hint {
    font-size: 0.8rem;
    text-align: center;
}

.engine-selector-wrapper {
    width: 100%;

    :deep(.engine-selector) {
        width: 100%;
        max-width: 100%;
        justify-content: center;
    }

    :deep(.selector-toggle) {
        width: 100%;
        background-color: rgba(255, 255, 255, 0.04);
        padding: 10px 16px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: all 0.2s ease;

        &:hover {
            background-color: rgba(255, 255, 255, 0.08);
            border-color: rgba(var(--color-accent-rgb), 0.3);
        }
    }

    :deep(.engine-dropdown) {
        width: 100%;
    }
}

:deep(.n-statistic) {
  .n-statistic-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .n-statistic-value__content {
    font-size: 1.4rem;
    font-weight: 800;
  }
}
</style>
