<!-- src/components/FinishHimSelection.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useFinishHimStore } from '@/stores/finishHim.store'
// --- НАЧАЛО ИЗМЕНЕНИЙ ---
import { useGameStore } from '@/stores/game.store'
// --- КОНЕЦ ИЗМЕНЕНИЙ ---
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { TOWER_THEMES, type TowerTheme } from '@/types/api.types'

const finishHimStore = useFinishHimStore()
// --- НАЧАЛО ИЗМЕНЕНИЙ ---
const gameStore = useGameStore()
const { selectedTheme } = storeToRefs(finishHimStore)
const { isGameActive } = storeToRefs(gameStore)
// --- КОНЕЦ ИЗМЕНЕНИЙ ---
const { t } = useI18n()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const availableThemes: TowerTheme[] = [...TOWER_THEMES]

const selectedThemeName = computed(() => {
  return t(`tower.themes.${selectedTheme.value}`)
})

const toggleDropdown = () => {
  // --- НАЧАЛО ИЗМЕНЕНИЙ ---
  if (isGameActive.value) return
  // --- КОНЕЦ ИЗМЕНЕНИЙ ---
  isOpen.value = !isOpen.value
}

const handleThemeSelect = (theme: TowerTheme) => {
  finishHimStore.setThemeAndLoadPuzzle(theme)
  isOpen.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
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
    <!-- --- НАЧАЛО ИЗМЕНЕНИЙ --- -->
    <button class="selector-toggle" @click="toggleDropdown" :disabled="isGameActive">
      <!-- --- КОНЕЦ ИЗМЕНЕНИЙ --- -->
      <span class="selector-text-desktop">{{ selectedThemeName }}</span>
      <span class="selector-text-mobile">{{ t('tower.ui.themeLabel') }}</span>
      <span class="selector-arrow" :class="{ 'is-open': isOpen }">▼</span>
    </button>
    <div v-if="isOpen" class="theme-dropdown">
      <button
        v-for="theme in availableThemes"
        :key="theme"
        class="theme-item"
        :class="{ active: theme === selectedTheme }"
        @click="handleThemeSelect(theme)"
      >
        {{ t(`tower.themes.${theme}`) }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.finish-him-selection {
  position: relative;
  display: flex;
  /* --- НАЧАЛО ИЗМЕНЕНИЙ --- */
  justify-content: center; /* Center the button */
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
  max-width: 250px; /* Limit width on desktop */
  transition:
    border-color 0.2s ease,
    opacity 0.2s ease; /* Added opacity transition */
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
  z-index: 1010; /* Increased z-index */
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
    max-width: none; /* Full width on mobile */
    justify-content: center;
  }
  .theme-dropdown {
    max-width: none; /* Full width on mobile */
    min-width: 280px;
  }
  .selector-text-desktop {
    display: none;
  }
  .selector-text-mobile {
    display: block;
  }
}
</style>
