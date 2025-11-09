<!-- src/components/TopInfoPanel.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFinishHimStore } from '@/stores/finishHim.store'
import { useAttackStore } from '@/stores/attack.store'
import { useTowerStore } from '@/stores/tower.store'
import { useTornadoStore } from '@/stores/tornado.store'
import { useAdvantageStore } from '@/stores/advantage.store'
import { useControlsStore } from '@/stores/controls.store'
import FinishHimSelection from '@/components/FinishHimSelection.vue'
import EngineSelector from '@/components/EngineSelector.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const route = useRoute()
const finishHimStore = useFinishHimStore()
const attackStore = useAttackStore()
const towerStore = useTowerStore()
const tornadoStore = useTornadoStore()
const advantageStore = useAdvantageStore()
useControlsStore()

const formattedTimer = computed(() => {
  if (route.name === 'attack') {
    return attackStore.formattedTimer
  }
  if (route.name === 'tower') {
    return towerStore.formattedTimer
  }
  if (route.name === 'tornado') {
    return tornadoStore.formattedTimer
  }
  if (['advantage', 'advantage-puzzle'].includes(route.name as string)) {
    return advantageStore.formattedTimer
  }
  return finishHimStore.formattedTimer
})

const containerClass = computed(() => {
  switch (route.name) {
    case 'finish-him':
      return 'mode-finish-him'
    case 'tornado':
      return 'mode-tornado'
    case 'advantage':
    case 'advantage-puzzle':
      return 'mode-default'
    default:
      return 'mode-default'
  }
})
</script>

<template>
  <div class="top-info-panel-container" :class="containerClass">
    <!-- Таймер для всех режимов, кроме выбора Торнадо -->
    <div v-if="route.name !== 'tornado-selection'" class="timer-container">
      <span v-if="route.name === 'tornado'" class="session-rating-label">
        {{ t('tornado.ui.ratingLabel') }}: {{ tornadoStore.sessionRating }}
      </span>
      {{ formattedTimer }}
    </div>

    <!-- Селектор тем для FinishHim -->
    <FinishHimSelection v-if="route.name === 'finish-him'" />

    <!-- Селектор движка для режимов с ботом -->
    <div
      v-if="['finish-him', 'attack', 'tower', 'advantage', 'advantage-puzzle', 'sandbox', 'sandbox-with-engine'].includes(route.name as string)"
      class="engine-selector-container">
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
  gap: 2px;
  padding: 1px;
  box-sizing: border-box;
}

/* Макеты под разные режимы */
.top-info-panel-container.mode-default {
  grid-template-columns: 1fr 1fr;
  /* attack, tower */
}

.top-info-panel-container.mode-finish-him {
  grid-template-columns: 1fr 2fr 2fr;
  /* Centered middle column */
}

.top-info-panel-container.mode-tornado {
  grid-template-columns: 1fr;
  justify-content: center;
}

/* Таймер */
.timer-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  font-size: var(--font-size-xlarge);
  font-weight: bold;
  color: var(--color-accent-warning);
}

.session-rating-label {
  font-size: var(--font-size-large);
  color: var(--color-accent-success);
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
    grid-template-columns: 1fr 2fr 2fr;
    /* Centered middle column */
  }

  .timer-container {
    flex-direction: column;
    gap: 5px;
    font-size: var(--font-size-large);
  }

  .session-rating-label {
    font-size: var(--font-size-base);
  }
}
</style>
