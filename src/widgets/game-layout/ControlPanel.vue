<script setup lang="ts">
import {
  AnalyticsOutline as AnalysisIcon,
  InformationCircleOutline as InfoIcon,
  PlayCircleOutline as NewIcon,
  FlagOutline as ResignIcon,
  RefreshOutline as RestartIcon,
  LinkOutline as ShareIcon,
} from '@vicons/ionicons5';
import { NButton, NIcon, NSpace, NTooltip } from 'naive-ui';
import { useAnalysisStore } from '@/features/analysis';
import { useControlsStore } from '@/widgets/game-layout/model/controls.store';

const controlsStore = useControlsStore()
const analysisStore = useAnalysisStore()

const toggleAnalysis = () => {
  if (analysisStore.isAnalysisActive) {
    analysisStore.hidePanel()
  } else {
    analysisStore.showPanel(true)
  }
}
</script>

<template>
  <div class="control-panel-container">
    <n-space justify="center" align="center" :size="[8, 0]">
      <!-- New Game -->
      <n-tooltip trigger="hover">
        <template #trigger>
          <n-button
            circle
            quaternary
            size="large"
            :disabled="!controlsStore.canRequestNew"
            @click="controlsStore.onRequestNew"
          >
            <template #icon>
              <n-icon class="icon-new" :class="{ 'pulse-active': controlsStore.canRequestNew }">
                <NewIcon />
              </n-icon>
            </template>
          </n-button>
        </template>
        {{ $t('controls.new') }}
      </n-tooltip>

      <!-- Restart -->
      <n-tooltip trigger="hover">
        <template #trigger>
          <n-button
            circle
            quaternary
            size="large"
            :disabled="!controlsStore.canRestart"
            @click="controlsStore.onRestart"
          >
            <template #icon>
              <n-icon class="icon-restart"><RestartIcon /></n-icon>
            </template>
          </n-button>
        </template>
        {{ $t('controls.restart') }}
      </n-tooltip>

      <!-- Resign OR Analysis Toggle -->
      <n-tooltip trigger="hover">
        <template #trigger>
          <n-button
            v-if="controlsStore.canResign"
            circle
            quaternary
            size="large"
            @click="controlsStore.onResign"
          >
            <template #icon>
              <n-icon><ResignIcon /></n-icon>
            </template>
          </n-button>

          <n-switch
            v-else
            :value="analysisStore.isAnalysisActive"
            size="medium"
            @update:value="toggleAnalysis"
          >
            <template #checked-icon>
              <n-icon class="icon-analysis-active"><AnalysisIcon /></n-icon>
            </template>
            <template #unchecked-icon>
              <n-icon><AnalysisIcon /></n-icon>
            </template>
          </n-switch>
        </template>
        {{ controlsStore.canResign ? $t('controls.resign') : $t('analysis.engine') }}
      </n-tooltip>

      <!-- Share -->
      <n-tooltip trigger="hover">
        <template #trigger>
          <n-button
            circle
            quaternary
            size="large"
            :disabled="!controlsStore.canShare"
            @click="controlsStore.onShare"
          >
            <template #icon>
              <n-icon class="icon-share"><ShareIcon /></n-icon>
            </template>
          </n-button>
        </template>
        {{ $t('controls.share') }}
      </n-tooltip>

      <!-- Info -->
      <n-tooltip trigger="hover">
        <template #trigger>
          <n-button
            circle
            quaternary
            size="large"
            :disabled="!controlsStore.canShowInfo"
            @click="controlsStore.onShowInfo"
          >
            <template #icon>
              <n-icon class="icon-info"><InfoIcon /></n-icon>
            </template>
          </n-button>
        </template>
        {{ $t('controls.info') }}
      </n-tooltip>
    </n-space>
  </div>
</template>

<style scoped>
.control-panel-container {
  padding: 2px 12px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  backdrop-filter: var(--glass-blur);
  width: fit-content;
  margin: 5px auto 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  min-height: 40px;
}

.icon-info {
  color: var(--color-neon-cyan);
}

.icon-restart {
  color: var(--color-neon-orange);
}

.icon-share {
  color: var(--color-neon-purple);
}

.icon-analysis-active {
  color: var(--color-neon-cyan);
  filter: drop-shadow(0 0 4px var(--color-neon-cyan));
}

:deep(.n-switch.n-switch--active) {
  --n-button-box-shadow: 0 0 8px var(--color-neon-cyan);
}

.pulse-active {
  animation: rainbow-pulse 4s infinite ease-in-out;
}

@keyframes rainbow-pulse {
  0% {
    color: var(--color-neon-pink);
    transform: scale(1);
    filter: drop-shadow(0 0 2px var(--color-neon-pink));
  }
  33% {
    color: var(--color-neon-purple);
    filter: drop-shadow(0 0 4px var(--color-neon-purple));
  }
  50% {
    transform: scale(1.15);
  }
  66% {
    color: var(--color-neon-orange);
    filter: drop-shadow(0 0 4px var(--color-neon-orange));
  }
  100% {
    color: var(--color-neon-pink);
    transform: scale(1);
    filter: drop-shadow(0 0 2px var(--color-neon-pink));
  }
}

:deep(.n-button.n-button--disabled) .n-icon {
  color: var(--color-text-muted) !important;
  animation: none !important;
  filter: none !important;
  opacity: 0.5;
}

@media (orientation: portrait) {
  .control-panel-container {
    padding: 0 4px;
    width: 100%;
    border-radius: 8px;
    min-height: 44px;
    justify-content: space-around;
  }

  :deep(.n-button) {
    --n-height: 44px !important;
    --n-width: 44px !important;
  }
}
</style>
