<!-- src/components/FinishHimSelection.vue -->
<script setup lang="ts">
import { useFinishHimStore } from '@/stores/finishHim.store'
import { useGameStore } from '@/stores/game.store'
import { ADVANTAGE_THEMES } from '@/types/api.types'
import { getThemeTranslationKey } from '@/utils/theme-mapper'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const finishHimStore = useFinishHimStore()
const gameStore = useGameStore()
const { selectedTheme } = storeToRefs(finishHimStore)
const { isGameActive } = storeToRefs(gameStore)
const { t } = useI18n()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const availableThemes: string[] = ['auto', ...ADVANTAGE_THEMES]

const selectedThemeName = computed(() => {
  return t(`chess.themes.${getThemeTranslationKey(selectedTheme.value)}`)
})

const toggleDropdown = () => {
  if (isGameActive.value) return
  isOpen.value = !isOpen.value
}

const handleThemeSelect = (theme: string) => {
  // Casting or ensure store accepts string or AdvantageTheme
  finishHimStore.setThemeAndLoadPuzzle(theme)
  isOpen.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

const getThemeName = (theme: string) => {
  return t(`chess.themes.${getThemeTranslationKey(theme)}`)
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="finish-him-selection" ref="dropdownRef">
    <button class="selector-toggle" @click="toggleDropdown" :disabled="isGameActive">
      <span class="selector-text-desktop">{{ selectedThemeName }}</span>
      <span class="selector-text-mobile">{{ t('welcome.buttons.tacktics') }}</span>
      <span class="selector-arrow" :class="{ 'is-open': isOpen }">▼</span>
    </button>
    <div v-if="isOpen" class="theme-dropdown">
      <button v-for="theme in availableThemes" :key="theme" class="theme-item"
        :class="{ active: theme === selectedTheme }" @click="handleThemeSelect(theme)">
        {{ getThemeName(theme) }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.finish-him-selection {
  position: relative;
  display: flex;
  /* --- НАЧАЛО ИЗМЕНЕНИЙ --- */
  justify-content: center;
  /* Center the button */
  /* --- КОНЕЦ ИЗМЕНЕНИЙ --- */
  width: 100%;
}

.selector-toggle {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-default);
  border: 1px solid var(--color-border);
  border-radius: var(--panel-border-radius);
  padding: 8px 12px;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 250px;
  /* Limit width on desktop */
  transition:
    border-color 0.2s ease,
    opacity 0.2s ease;
  /* Added opacity transition */
}

/* --- НАЧАЛО ИЗМЕНЕНИЙ --- */
.selector-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* --- КОНЕЦ ИЗМЕНЕНИЙ --- */

.selector-toggle:hover:not(:disabled) {
  border-color: var(--color-accent-primary);
}

.selector-text-desktop {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selector-text-mobile {
  display: none;
}

.selector-arrow {
  display: inline-block;
  transition: transform 0.2s ease;
  font-size: 0.8em;
  margin-left: 8px;
}

.selector-arrow.is-open {
  transform: rotate(180deg);
}

.theme-dropdown {
  position: absolute;
  top: calc(100% + 5px);

  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-hover);
  border-radius: var(--panel-border-radius);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  z-index: 1010;
  /* Increased z-index */
  width: 100%;
  min-width: 280px;
  max-height: 70vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.theme-item {
  background: none;
  border: none;
  color: var(--color-text-default);
  padding: 10px 15px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  font-size: var(--font-size-small);
  transition: background-color 0.2s ease;
}

.theme-item:hover {
  background-color: var(--color-border-hover);
}

.theme-item.active {
  background-color: var(--color-accent-primary);
  color: var(--color-text-dark);
  font-weight: bold;
}

/* Hide scrollbar */
.theme-dropdown::-webkit-scrollbar {
  width: 5px;
}

.theme-dropdown::-webkit-scrollbar-track {
  background: transparent;
}

.theme-dropdown::-webkit-scrollbar-thumb {
  background: var(--color-border-hover);
  border-radius: 5px;
}

@media (orientation: portrait) {
  .selector-toggle {
    max-width: none;
    /* Full width on mobile */
    justify-content: center;
  }

  .theme-dropdown {
    max-width: none;
    /* Full width on mobile */
    min-width: 280px;
  }

  .selector-text-desktop {
    display: none;
  }

  .selector-text-mobile {
    display: block;
  }

  .theme-item {
    font-size: var(--font-size-xsmall);
  }
}
</style>
