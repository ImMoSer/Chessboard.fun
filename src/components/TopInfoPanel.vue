<!-- src/components/TopInfoPanel.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFinishHimStore } from '@/stores/finishHim.store'
import { useAttackStore } from '@/stores/attack.store'
import { useTowerStore } from '@/stores/tower.store'
import { useTackticsStore } from '@/stores/tacktics.store'
import { useControlsStore } from '@/stores/controls.store'
import FinishHimSelection from '@/components/FinishHimSelection.vue'
import EngineSelector from '@/components/EngineSelector.vue' // 🔥 новый компонент

const route = useRoute()
const finishHimStore = useFinishHimStore()
const attackStore = useAttackStore()
const towerStore = useTowerStore()
const tackticsStore = useTackticsStore()
useControlsStore() // только инициализация, сама логика в EngineSelector.vue

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

    <!-- Новый кастомный EngineSelector для всех режимов, кроме Тактики -->
    <div v-if="route.name !== 'tacktics'" class="engine-selector-container">
      <img src="/buttons/robot.svg" alt="Select Engine" class="robot-icon" />
      <EngineSelector />
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

/* Макеты под разные режимы */
.top-info-panel-container.mode-default {
  grid-template-columns: 1fr 1fr; /* attack, tower */
}

.top-info-panel-container.mode-finish-him {
  grid-template-columns: 1fr 2fr 2fr; /* Centered middle column */
}

.top-info-panel-container.mode-tacktics {
  grid-template-columns: 1fr;
  justify-content: center;
}

/* Таймер */
.timer-container {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: var(--font-size-xlarge);
  font-weight: bold;
  color: var(--color-accent-warning);
}

/* Контейнер под селектор движка */
.engine-selector-container {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 5px;
}

.robot-icon {
  width: 30px;
  height: auto;
}

@media (orientation: portrait) {
  .top-info-panel-container.mode-finish-him {
    grid-template-columns: 1fr 2fr 2fr; /* Centered middle column */
  }
}
</style>
