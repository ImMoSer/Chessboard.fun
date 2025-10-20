<!-- src/components/EngineSelector.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useControlsStore } from '@/stores/controls.store'
import type { EngineId } from '@/types/api.types'

const controlsStore = useControlsStore()

const availableEngines = computed(() => controlsStore.availableEngines)
const selectedEngine = computed(() => controlsStore.selectedEngine)

const engineNames: Record<EngineId, string> = {
  SF_2200: 'Rbleipzig 2350+',
  SF_2100: 'Krokodil 2200+',
  SF_1900: 'Karde 2100+',
  'MOZER_2000+': 'MoZeR 2000+',
  'MOZER_1900+': 'MoZeR 1900+',
  SF_1700: 'Dimas 1800+',
  SF_1600: 'Darko 1700+',
}

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const selectEngine = (engine: EngineId) => {
  controlsStore.setEngine(engine)
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
  <div class="engine-selector" ref="dropdownRef">
    <button class="selector-toggle" @click="toggleDropdown">
      {{ engineNames[selectedEngine] }}
      <span class="selector-arrow" :class="{ 'is-open': isOpen }">▼</span>
    </button>
    <div v-if="isOpen" class="engine-dropdown">
      <button v-for="engine in availableEngines" :key="engine" class="engine-item"
        :class="{ active: engine === selectedEngine }" @click="selectEngine(engine)">
        {{ engineNames[engine] }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.engine-selector {
  position: relative;
  display: flex;
  justify-content: flex-end;
  width: 100%;
  max-width: 250px;
}

.selector-toggle {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-default);
  border: 1px solid var(--color-border);
  border-radius: var(--panel-border-radius);
  padding: 10px 10px;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  transition:
    border-color 0.2s ease,
    opacity 0.2s ease;
}

.selector-toggle:hover {
  border-color: var(--color-accent-primary);
}

.selector-arrow {
  margin-left: 0px;
  font-size: var(--font-size-xsmall);
  transition: transform 0.2s ease;
}

.selector-arrow.is-open {
  transform: rotate(180deg);
}

.engine-dropdown {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-hover);
  border-radius: var(--panel-border-radius);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  z-index: 1010;
  width: 100%;
  max-height: 60vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.engine-item {
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

.engine-item:hover {
  background-color: var(--color-border-hover);
}

.engine-item.active {
  background-color: var(--color-accent-primary);
  color: var(--color-text-dark);
  font-weight: bold;
}

/* Скрываем полосу прокрутки */
.engine-dropdown::-webkit-scrollbar {
  width: 5px;
}

.engine-dropdown::-webkit-scrollbar-track {
  background: transparent;
}

.engine-dropdown::-webkit-scrollbar-thumb {
  background: var(--color-border-hover);
  border-radius: 5px;
}

@media (orientation: portrait) {

  .selector-toggle,
  .engine-item {
    padding: 5px 5px;
    font-size: var(--font-size-xsmall);
  }
}
</style>
