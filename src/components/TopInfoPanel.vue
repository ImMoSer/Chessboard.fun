<!-- src/components/TopInfoPanel.vue -->
<script setup lang="ts">

import { computed } from 'vue'
import { useRoute } from 'vue-router'

import EngineSelector from '@/components/EngineSelector.vue'
import { useControlsStore } from '@/stores/controls.store'
import { useTornadoStore } from '@/stores/tornado.store'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const route = useRoute()

const tornadoStore = useTornadoStore()
useControlsStore()

const formattedTimer = computed(() => {
  if (route.name === 'tornado') {
    return tornadoStore.formattedTimer
  }
  return '--:--'
})

const containerClass = computed(() => {
  switch (route.name) {
    case 'finish-him':
    case 'finish-him-play':
    case 'finish-him-puzzle':
      return 'mode-finish-him'
    case 'tornado':
      return 'mode-tornado'
    default:
      return 'mode-default'
  }
})
</script>

<template>
  <div class="top-info-panel-container" :class="containerClass">
    <!-- Таймер для Торнадо -->
    <div v-if="route.name === 'tornado'" class="timer-container">
      <div class="tornado-info-container">
        <span v-if="tornadoStore.sessionTheme" class="session-theme-label">
          {{ t('tornado.ui.themeLabel') }}: {{ t('themes.' + tornadoStore.sessionTheme) }}
        </span>
        <span class="session-rating-label">
          {{ t('tornado.ui.ratingLabel') }}: {{ tornadoStore.sessionRating }}
        </span>
      </div>
      {{ formattedTimer }}
    </div>



    <div v-if="
      [
        'finish-him-play',
        'finish-him-puzzle',

        'sandbox',
        'sandbox-with-engine',
        'sandbox-with-engine-and-color',
      ].includes(route.name as string)
    " class="engine-selector-container">
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

.tornado-info-container,
.advantage-info-container {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-right: 15px;
}

.session-theme-label {
  font-size: var(--font-size-large);
  color: var(--color-text-link);
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

  .tornado-info-container {
    flex-direction: column;
    gap: 2px;
    margin-right: 0;
  }

  .session-theme-label {
    font-size: var(--font-size-base);
  }
}
</style>
