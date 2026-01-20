<script setup lang="ts">
import { useControlsStore } from '../stores/controls.store'

const controlsStore = useControlsStore()
</script>

<template>
  <div class="control-panel-container">
    <button
      class="control-panel-button"
      title="New"
      :disabled="!controlsStore.canRequestNew"
      @click="controlsStore.onRequestNew"
    >
      <img src="/buttons/new.svg" alt="New" />
    </button>
    <button
      class="control-panel-button"
      title="Restart"
      :disabled="!controlsStore.canRestart"
      @click="controlsStore.onRestart"
    >
      <img src="/buttons/restart.svg" alt="Restart" />
    </button>
    <button
      class="control-panel-button"
      title="Resign"
      :disabled="!controlsStore.canResign"
      @click="controlsStore.onResign"
    >
      <img src="/buttons/resign.svg" alt="Resign" />
    </button>
    <button
      class="control-panel-button"
      title="Share"
      :disabled="!controlsStore.canShare"
      @click="controlsStore.onShare"
    >
      <img src="/buttons/link.svg" alt="Share" />
    </button>

    <button
      class="control-panel-button"
      title="Info"
      :disabled="!controlsStore.canShowInfo"
      @click="controlsStore.onShowInfo"
    >
      <img src="/buttons/info.svg" alt="Info" />
    </button>
  </div>
</template>

<style scoped>
/* Стили скопированы и адаптированы из old_snabbdom_src/shared/components/controlPanel.css */
.control-panel-container {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 5px 5px;
  gap: 5px;
  border-color: var(--color-border);
  border-style: solid;
  border-width: 1px;
  border-radius: 5px;
}

.control-panel-button {
  background-color: transparent;
  border: none;
  padding: 5px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease;
}

.control-panel-button:hover:not(:disabled) {
  background-color: var(--color-border-hover);
}

.control-panel-button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.control-panel-button img {
  width: 35px;
  height: auto;
}

@media (orientation: portrait) {
  .control-panel-button img {
    width: 32px;
  }
}
</style>
