<!-- src/components/TowerProgress.vue -->
<script setup lang="ts">
import { useTowerStore } from '@/stores/tower.store'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const towerStore = useTowerStore()
const { activeTower, currentPositionIndex, lives, gamePhase } = storeToRefs(towerStore)
const { t } = useI18n()

const towerDefinitions = {
  CM: { nameKey: 'tower.names.CM', color: 'var(--color-accent-primary)' },
  FM: { nameKey: 'tower.names.FM', color: 'var(--color-accent-success)' },
  IM: { nameKey: 'tower.names.IM', color: 'var(--color-accent-warning)' },
  GM: { nameKey: 'tower.names.GM', color: 'var(--color-accent-error)' },
}
</script>

<template>
  <div v-if="activeTower" class="active-tower-info-container">
    <div class="active-tower-name">
      {{
        t(towerDefinitions[activeTower.tower_type].nameKey, {
          defaultValue: activeTower.tower_type,
        })
      }}
    </div>

    <div class="active-tower-progress-bricks">
      <div v-for="(_, index) in activeTower.positions.length" :key="`progress-${index}`" class="progress-brick" :class="{
        completed: index < currentPositionIndex,
        current: index === currentPositionIndex && gamePhase === 'PLAYING',
        failed: index === currentPositionIndex && gamePhase === 'GAMEOVER' && lives === 0,
        pending: index > currentPositionIndex,
      }" :style="{
        backgroundColor:
          index < currentPositionIndex ? towerDefinitions[activeTower.tower_type].color : '',
      }"></div>
    </div>

    <div class="tower-lives-container">
      <span class="lives-label">{{ t('tower.ui.livesLabel') }}:</span>
      <span v-for="i in lives" :key="`life-${i}`" class="life-icon">💊</span>
    </div>
  </div>
</template>

<style scoped>
/* Styles from tower.css */
.active-tower-info-container {
  padding: 5px;
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  display: flex;
  flex-direction: column;
  gap: 5px;
  text-align: center;
}

.active-tower-name {
  font-size: var(--font-size-large);
  font-weight: bold;
  color: var(--color-accent-success);
  display: none;
}

.active-tower-progress-bricks {
  display: flex;
  justify-content: center;
  gap: 5px;
  height: 30px;
  padding-top: 10px;
}

.progress-brick {
  width: 25px;
  height: 15px;
  border-radius: 2px;
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.progress-brick.completed {
  height: 20px;
}

.progress-brick.current {
  height: 25px;
  animation: pulse-current-brick 1.5s infinite ease-in-out;
  box-shadow: 0 0 8px var(--color-accent-secondary);
}

.progress-brick.failed {
  background-color: var(--color-accent-error) !important;
  border-color: var(--color-accent-error) !important;
  height: 22px;
  opacity: 0.8;
}

.progress-brick.pending {
  background-color: var(--color-bg-tertiary);
  opacity: 0.7;
}

@keyframes pulse-current-brick {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.1);
  }
}

.tower-lives-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 2px 0;
}

.lives-label {
  font-weight: bold;
  color: var(--color-text-muted);
}

.life-icon {
  font-size: 1.5rem;
  animation: life-beat 2s infinite ease-in-out;
}

@keyframes life-beat {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.15);
  }
}
</style>
