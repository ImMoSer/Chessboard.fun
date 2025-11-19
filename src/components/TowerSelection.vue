<!-- src/components/TowerSelection.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useTowerStore } from '@/stores/tower.store'
import { useI18n } from 'vue-i18n'
import { TOWER_THEMES, type TowerId, type TowerTheme, type TowerMode } from '@/types/api.types'
import { getThemeTranslationKey } from '@/utils/theme-mapper'

const towerStore = useTowerStore()
const { t } = useI18n()

const selectedTowerId = ref<TowerId | null>(null)
const selectedTheme = ref<TowerTheme>('mix')
const selectedMode = ref<TowerMode>(
  (localStorage.getItem('tower_mode_preference') as TowerMode) || 'tactical',
)

const handleModeChange = (mode: TowerMode) => {
  selectedMode.value = mode
  localStorage.setItem('tower_mode_preference', mode)
}

const towerDefinitions: { id: TowerId; nameKey: string; displayLevels: number; color: string }[] = [
  { id: 'CM', nameKey: 'tower.names.CM', displayLevels: 5, color: 'var(--color-accent-primary)' },
  { id: 'FM', nameKey: 'tower.names.FM', displayLevels: 6, color: 'var(--color-accent-success)' },
  { id: 'IM', nameKey: 'tower.names.IM', displayLevels: 7, color: 'var(--color-accent-warning)' },
  { id: 'GM', nameKey: 'tower.names.GM', displayLevels: 8, color: 'var(--color-accent-error)' },
]

// const availableThemes: readonly TowerTheme[] = TOWER_THEMES

const handleSelectTower = (towerId: TowerId) => {
  selectedTowerId.value = towerId
  towerStore.startNewTower(towerId, selectedTheme.value, selectedMode.value)
}

/*
const handleThemeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  selectedTheme.value = target.value as TowerTheme
}

const getThemeName = (theme: TowerTheme) => {
  return t(`themes.${getThemeTranslationKey(theme)}`)
}
*/
</script>

<template>
  <div class="tower-selection-area">
    <div class="tower-mode-selector-container">
      <label class="selector-label">{{ t('tower.ui.modeLabel') }}</label>
      <div class="mode-buttons">
        <button class="mode-button" :class="{ active: selectedMode === 'tactical' }"
          @click="handleModeChange('tactical')">
          {{ t('tower.mode.tactical') }}
        </button>
        <button class="mode-button" :class="{ active: selectedMode === 'positional' }"
          @click="handleModeChange('positional')">
          {{ t('tower.mode.positional') }}
        </button>
      </div>
    </div>
    <!--
    <div class="tower-theme-selector-container">
      <label class="selector-label" for="tower-theme-select">{{ t('tower.ui.themeLabel') }}</label>
      <select
        id="tower-theme-select"
        class="custom-select"
        v-model="selectedTheme"
        @change="handleThemeChange"
      >
        <option v-for="theme in availableThemes" :key="theme" :value="theme">
          {{ getThemeName(theme) }}
        </option>
      </select>
    </div>
    -->

    <div class="towers-visual-container">
      <div v-for="towerDef in towerDefinitions" :key="towerDef.id" class="tower-visual-item"
        :class="{ selected: selectedTowerId === towerDef.id }" @click="handleSelectTower(towerDef.id)">
        <div class="tower-bricks">
          <div v-for="i in towerDef.displayLevels" :key="`${towerDef.id}-brick-${i}`" class="tower-brick"
            :style="{ backgroundColor: towerDef.color }"></div>
        </div>
        <div class="tower-label">{{ t(towerDef.nameKey) }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Styles from tower.css */
.tower-selection-area {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.tower-theme-selector-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 5px;
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
}

.selector-label {
  font-weight: bold;
  color: var(--color-text-default);
  text-align: center;
}

.custom-select {
  width: 100%;
  padding: 5px;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-default);
  font-size: var(--font-size-base);
  cursor: pointer;
}

.towers-visual-container {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  gap: 5px;
  padding: 5px 5px;
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  overflow-x: auto;
}

.tower-visual-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 5px;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.tower-visual-item:hover:not(.disabled) {
  background-color: var(--color-bg-tertiary);
}

.tower-visual-item.selected {
  border-color: var(--color-accent-primary);
  background-color: rgba(var(--color-accent-primary-rgb, 19, 173, 246), 0.15);
}

.tower-bricks {
  display: flex;
  flex-direction: column-reverse;
  gap: 2px;
}

.tower-brick {
  width: 40px;
  height: 10px;
  border-radius: 2px;
  box-shadow: inset 0 -1px 1px rgba(0, 0, 0, 0.2);
}

.tower-label {
  font-weight: bold;
  font-size: var(--font-size-small);
  color: var(--color-text-default);
}

.tower-mode-selector-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 5px;
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
}

.mode-buttons {
  display: flex;
  gap: 5px;
}

.mode-button {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-default);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.mode-button:hover {
  background-color: var(--color-bg-primary);
  border-color: var(--color-border-hover);
}

.mode-button.active {
  background-color: var(--color-accent-primary);
  color: white;
  border-color: var(--color-accent-primary);
}
</style>
