<!-- src/components/TopInfoPanel.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFinishHimStore } from '../stores/finishHim.store'
import { useAttackStore } from '../stores/attack.store'
import { useTowerStore } from '../stores/tower.store'
import { useTackticsStore } from '../stores/tacktics.store'
import { useControlsStore } from '../stores/controls.store'
import type { EngineId } from '../types/api.types'
import FinishHimSelection from '../components/FinishHimSelection.vue'

const route = useRoute()
const finishHimStore = useFinishHimStore()
const attackStore = useAttackStore()
const towerStore = useTowerStore()
const tackticsStore = useTackticsStore()
const controlsStore = useControlsStore()

const formattedTimer = computed(() => {
  if (route.name === 'attack') {
    return attackStore.formattedTimer
  }
  if (route.name === 'tower') {
    return towerStore.formattedTimer
  }
  // По умолчанию для Finish Him
  return finishHimStore.formattedTimer
})

const containerClass = computed(() => {
  switch (route.name) {
    case 'finish-him':
      return 'mode-finish-him'
    case 'tacktics':
      return 'mode-tacktics'
    default:
      return 'mode-default'
  }
})

const engineNames: Record<EngineId, string> = {
  SF_2200: 'Rbleipzig 2200+',
  SF_2100: 'Krokodil 2100+',
  SF_1900: 'Karde 2000+',
  'MOZER_1900+': 'MoZeR 1900+',
  SF_1700: 'Dimas 1800+',
  SF_1600: 'Darko 1700+',
}

const handleEngineChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  controlsStore.setEngine(target.value as EngineId)
}
</script>

<template>
  <div class="top-info-panel-container" :class="containerClass">
    <!-- Таймер для всех режимов, кроме Тактики -->
    <div v-if="route.name !== 'tacktics'" class="timer-container">
      {{ formattedTimer }}
    </div>

    <!-- Селектор тем для FinishHim -->
    <FinishHimSelection v-if="route.name === 'finish-him'" />

    <!-- Таймер только для Тактики -->
    <div v-if="route.name === 'tacktics'" class="timer-container tacktics-timer">
      {{ tackticsStore.formattedTimer }}
    </div>

    <!-- Селектор движка для всех режимов, кроме Тактики -->
    <div v-if="route.name !== 'tacktics'" class="engine-selector-container">
      <img src="/buttons/robot.svg" alt="Select Engine" class="robot-icon" />
      <select
        class="engine-select"
        :value="controlsStore.selectedEngine"
        @change="handleEngineChange"
      >
        <option
          v-for="engineId in controlsStore.availableEngines"
          :key="engineId"
          :value="engineId"
        >
          {{ engineNames[engineId] }}
        </option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.top-info-panel-container {
  width: 100%;
  height: 100%;
  display: grid;
  align-items: center;
  gap: 10px;
  padding: 5px;
  box-sizing: border-box;
}

.top-info-panel-container.mode-default {
  /* attack, tower */
  grid-template-columns: 1fr 1fr;
}

.top-info-panel-container.mode-finish-him {
  grid-template-columns: 1fr 1fr 1fr; /* Centered middle column */
}

/* --- НАЧАЛО ИЗМЕНЕНИЙ --- */
.top-info-panel-container.mode-finish-him .timer-container {
  justify-content: center;
}
.top-info-panel-container.mode-finish-him .engine-selector-container {
  justify-content: center;
}

.top-info-panel-container.mode-tacktics {
  grid-template-columns: 1fr;
  justify-content: center;
}

.timer-container,
.engine-selector-container {
  display: flex;
  align-items: center;
}

.timer-container {
  font-size: var(--font-size-xlarge);
  font-weight: bold;
  color: var(--color-accent-warning);
  justify-content: center;
  align-items: center;
}

.engine-selector-container {
  justify-content: flex-end;
  gap: 5px;
}

.robot-icon {
  width: 35px;
  height: auto;
}

.engine-select {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-default);
  border: 1px solid var(--color-border);
  border-radius: var(--panel-border-radius);
  padding: 8px 4px;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}
</style>
