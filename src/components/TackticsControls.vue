<!-- src/components/TackticsControls.vue -->
<script setup lang="ts">
import { useTackticsStore, type TacticalLevel } from '@/stores/tacktics.store'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const tackticsStore = useTackticsStore()
const { selectedLevel, isAutoLoadEnabled } = storeToRefs(tackticsStore)
const { t } = useI18n()

const levels: TacticalLevel[] = ['easy', 'normal', 'hard']

const handleLevelChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  tackticsStore.selectedLevel = target.value as TacticalLevel
}

const handleToggleAutoLoad = () => {
  tackticsStore.isAutoLoadEnabled = !isAutoLoadEnabled.value
}
</script>

<template>
  <div class="tacktics-controls-container">
    <div class="tacktics-controls-header">
      <div class="tacktics-level-selector">
        <h5>{{ t('tacktics.controls.levelTitle') }}</h5>
        <select class="level-select" :value="selectedLevel" @change="handleLevelChange">
          <option v-for="level in levels" :key="level" :value="level">
            {{ t(`tacktics.controls.levels.${level}`) }}
          </option>
        </select>
      </div>
      <div class="tacktics-auto-load-toggle">
        <label class="toggle-label">{{ t('tacktics.controls.autoLoad') }}</label>
        <label class="toggle-switch">
          <input type="checkbox" :checked="isAutoLoadEnabled" @change="handleToggleAutoLoad" />
          <span class="slider round"></span>
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Styles from tacktics.css */
.tacktics-controls-container {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--panel-border-radius);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  flex-shrink: 0;
}
.tacktics-controls-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.tacktics-level-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tacktics-level-selector h5 {
  margin: 0;
  font-size: var(--font-size-small);
  font-weight: bold;
  color: var(--color-text-default);
  white-space: nowrap;
}
.level-select {
  width: auto;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-default);
  font-size: var(--font-size-base);
  font-family: var(--font-family-primary);
  cursor: pointer;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23A0A0A0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 1em;
  padding-right: 2em;
}
.tacktics-auto-load-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
}
.toggle-label {
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
  white-space: nowrap;
}
/* Using global toggle-switch styles from main.css */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
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
}
.slider.round {
  border-radius: 28px;
}
.slider.round:before {
  border-radius: 50%;
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
}
input:checked + .slider {
  background-color: var(--color-accent-success);
}
input:checked + .slider:before {
  transform: translateX(22px);
}
</style>
