<!-- src/components/TopInfoPanel.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import EngineSelector from '@/components/EngineSelector.vue'
import { useControlsStore } from '@/stores/controls.store'
import { useFinishHimStore } from '@/stores/finishHim.store'
import { useTheoryEndingsStore } from '@/stores/theoryEndings.store'
import { useTornadoStore } from '@/stores/tornado.store'
import { getThemeTranslationKey } from '@/utils/theme-mapper'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const route = useRoute()

const tornadoStore = useTornadoStore()
const finishHimStore = useFinishHimStore()
const theoryStore = useTheoryEndingsStore()
useControlsStore()

const activePuzzle = computed(() => {
  if (route.name === 'tornado') return tornadoStore.activePuzzle
  if (route.name?.toString().startsWith('theory-endings')) return theoryStore.activePuzzle
  return finishHimStore.activePuzzle
})

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
      <div class="tornado-info-left">
        <span class="session-rating-label">
          {{ t('tornado.ui.ratingLabel') }}: {{ tornadoStore.sessionRating }}
        </span>
        <span
          v-if="tornadoStore.sessionTheme || activePuzzle?.theme_key"
          class="session-theme-label"
        >
          {{
            t(
              'chess.themes.' +
                getThemeTranslationKey(
                  activePuzzle?.theme_key || tornadoStore.sessionTheme || 'auto',
                ),
            )
          }}
        </span>
      </div>
      <div class="tornado-timer">
        {{ formattedTimer }}
      </div>
    </div>

    <!-- Общий заголовок для других режимов (Finish Him, Theory) -->
    <div
      v-else-if="activePuzzle?.theme_key || (activePuzzle as any)?.meta?.theme_key"
      class="puzzle-title-container"
    >
      <span class="puzzle-title-label">
        {{
          t(
            'chess.themes.' +
              getThemeTranslationKey(
                activePuzzle?.theme_key || (activePuzzle as any)?.meta?.theme_key || 'auto',
              ),
          )
        }}
      </span>
    </div>

    <div
      v-if="
        ['sandbox', 'sandbox-with-engine', 'sandbox-with-engine-and-color'].includes(
          route.name as string,
        )
      "
      class="engine-selector-container"
    >
      <img src="/buttons/robot.svg" alt="Select Engine" class="robot-icon" />
      <EngineSelector />
    </div>
  </div>
</template>

<style scoped>
.top-info-panel-container {
  width: 100%;
  height: 100%;
  display: flex; /* Changed from Grid to Flex for better centering/distribution */
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  box-sizing: border-box;
  position: relative;
}

/* --- TORNADO MODE --- */
.timer-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 600px; /* Constrain width on large screens */
}

/* Group Info and Rating together on the left */
.tornado-info-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.tornado-timer {
  font-size: var(--font-size-xlarge);
  font-weight: bold;
  font-variant-numeric: tabular-nums; /* Monospaced numbers for timer */
  color: var(--color-accent-warning);
}

.session-rating-label {
  font-size: var(--font-size-large);
  color: var(--color-accent-success);
  font-weight: bold;
}

.session-theme-label {
  font-size: var(--font-size-base);
  color: var(--color-text-link);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

/* --- OTHER MODES --- */
.puzzle-title-container {
  flex: 1;
  display: flex;
  justify-content: center;
}

.puzzle-title-label {
  font-size: var(--font-size-large);
  font-weight: 800;
  color: var(--color-accent-primary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.engine-selector-container {
  position: absolute;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.robot-icon {
  width: 24px;
  height: 24px;
}

/* --- MOBILE ADAPTATION --- */
@media (orientation: portrait) {
  .top-info-panel-container {
    padding: 0 5px;
  }

  /* Tornado: Compact Row */
  .timer-container {
    justify-content: space-between;
  }

  .tornado-timer {
    font-size: 1.5rem; /* Slightly smaller but still prominent */
  }

  .tornado-info-left {
    max-width: 60%; /* Prevent overlapping timer */
  }

  .session-rating-label {
    font-size: 1rem;
  }

  .session-theme-label {
    font-size: 0.8rem;
    max-width: 150px;
  }

  .engine-selector-container {
    position: relative; /* On mobile, let it flow or be placed specifically */
    right: auto;
  }
}
</style>
