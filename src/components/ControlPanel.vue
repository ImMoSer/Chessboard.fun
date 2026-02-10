<script setup lang="ts">
import {
    InformationCircleOutline as InfoIcon,
    Add as NewIcon,
    FlagOutline as ResignIcon,
    RefreshOutline as RestartIcon,
    LinkOutline as ShareIcon,
} from '@vicons/ionicons5';
import { NButton, NIcon, NSpace, NTooltip } from 'naive-ui';
import { useControlsStore } from '../stores/controls.store';

const controlsStore = useControlsStore()
</script>

<template>
  <div class="control-panel-container">
    <n-space justify="space-around" align="center" :size="[12, 0]">
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
              <n-icon><NewIcon /></n-icon>
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
              <n-icon><RestartIcon /></n-icon>
            </template>
          </n-button>
        </template>
        {{ $t('controls.restart') }}
      </n-tooltip>

      <!-- Resign -->
      <n-tooltip trigger="hover">
        <template #trigger>
          <n-button
            circle
            quaternary
            size="large"
            :disabled="!controlsStore.canResign"
            @click="controlsStore.onResign"
          >
            <template #icon>
              <n-icon><ResignIcon /></n-icon>
            </template>
          </n-button>
        </template>
        {{ $t('controls.resign') }}
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
              <n-icon><ShareIcon /></n-icon>
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
              <n-icon><InfoIcon /></n-icon>
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
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  backdrop-filter: blur(4px);
  width: fit-content;
  margin: 0 auto;
}

@media (orientation: portrait) {
  .control-panel-container {
    padding: 2px 8px;
    width: 100%;
  }

  :deep(.n-button) {
    --n-height: 40px !important;
    --n-width: 40px !important;
  }
}
</style>
