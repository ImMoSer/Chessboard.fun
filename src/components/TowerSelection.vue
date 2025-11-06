<!-- src/components/TowerSelection.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useTowerStore } from '@/stores/tower.store'
import { useI18n } from 'vue-i18n'
import { TOWER_THEMES, type TowerId, type TowerTheme } from '@/types/api.types'
import { getThemeTranslationKey } from '@/utils/theme-mapper'

const towerStore = useTowerStore()
const { t } = useI18n()

const selectedTowerId = ref<TowerId | null>(null)
const selectedTheme = ref<TowerTheme>('mix')

const towerDefinitions: { id: TowerId; nameKey: string; displayLevels: number; color: string }[] = [
  { id: 'CM', nameKey: 'tower.names.CM', displayLevels: 5, color: 'var(--color-accent-primary)' },
  { id: 'FM', nameKey: 'tower.names.FM', displayLevels: 6, color: 'var(--color-accent-success)' },
  { id: 'IM', nameKey: 'tower.names.IM', displayLevels: 7, color: 'var(--color-accent-warning)' },
  { id: 'GM', nameKey: 'tower.names.GM', displayLevels: 8, color: 'var(--color-accent-error)' },
]

const availableThemes: readonly TowerTheme[] = TOWER_THEMES

const handleSelectTower = (towerId: TowerId) => {
  selectedTowerId.value = towerId
  towerStore.startNewTower(towerId, selectedTheme.value)
}

const handleThemeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  selectedTheme.value = target.value as TowerTheme
}

const getThemeName = (theme: TowerTheme) => {
  return t(`themes.${getThemeTranslationKey(theme)}`)
}
</script>

<template>
  <div class="tower-selection-area">
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

    <div class="towers-visual-container">
      <div
        v-for="towerDef in towerDefinitions"
        :key="towerDef.id"
        class="tower-visual-item"
        :class="{ selected: selectedTowerId === towerDef.id }"
        @click="handleSelectTower(towerDef.id)"
      >
        <div class="tower-bricks">
          <div
            v-for="i in towerDef.displayLevels"
            :key="`${towerDef.id}-brick-${i}`"
            class="tower-brick"
            :style="{ backgroundColor: towerDef.color }"
          ></div>
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
  gap: 15px;
}
.tower-theme-selector-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px;
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
  padding: 8px;
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
  gap: 10px;
  padding: 15px 10px;
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
  width: 50px;
  height: 15px;
  border-radius: 3px;
  box-shadow: inset 0 -1px 1px rgba(0, 0, 0, 0.2);
}
.tower-label {
  font-weight: bold;
  font-size: var(--font-size-small);
  color: var(--color-text-default);
}
</style>
