<!-- src/views/AdvantageSelectionView.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { type TornadoMode, ADVANTAGE_THEMES, type AdvantageTheme } from '@/types/api.types'

const router = useRouter()
const { t } = useI18n()

interface Mode {
  id: TornadoMode
  name: string
  image: string
  alt: string
}

const modes: Mode[] = [
  { id: 'bullet', name: 'Bullet', image: '/png/tornado/tornado_bulet.png', alt: 'Advantage Bullet Mode' },
  { id: 'blitz', name: 'Blitz', image: '/png/tornado/tornado_blitz.png', alt: 'Advantage Blitz Mode' },
  { id: 'rapid', name: 'Rapid', image: '/png/tornado/tornado_rapid.png', alt: 'Advantage Rapid Mode' },
  { id: 'classic', name: 'Classic', image: '/png/tornado/tornado_classic.png', alt: 'Advantage Classic Mode' },
]

const availableThemes = ref<Array<AdvantageTheme | 'automatic'>>([...ADVANTAGE_THEMES])
const selectedTheme = ref<AdvantageTheme | 'automatic'>('automatic')

const selectMode = (modeId: TornadoMode) => {
  router.push(`/advantage/${modeId}/${selectedTheme.value}`)
}
</script>

<template>
  <div class="selection-wrapper">
    <div class="title-container">
      <h2 class="title">{{ t('nav.advantage') }}</h2>
      <p class="subtitle">{{ t('advantage.selection.description') }}</p>
    </div>

    <div class="modes-container">
      <div class="theme-selector-container">
        <label for="theme-select" class="theme-label">{{ t('advantage.selection.themeLabel') }}</label>
        <select id="theme-select" v-model="selectedTheme" class="theme-select">
          <option v-for="theme in availableThemes" :key="theme" :value="theme">
            {{ t(`advantage.themes.${theme}`) }}
          </option>
        </select>
      </div>

      <div class="modes-grid">
        <div v-for="mode in modes" :key="mode.id" class="mode-item" @click="selectMode(mode.id)">
          <img :src="mode.image" :alt="mode.alt" class="mode-emblem" />
          <span class="mode-name">{{ mode.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.selection-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  width: 100%;
}

.title-container {
  text-align: center;
  margin-bottom: 30px;
}

.title {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 600;
  color: var(--color-accent-primary);
}

.subtitle {
  font-size: 1.1rem;
  color: var(--color-text-muted);
  max-width: 600px;
  margin: 10px auto 0;
}

.modes-container {
  background: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  padding: 30px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  border: 1px solid var(--color-border);
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.theme-selector-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.theme-label {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--color-text-default);
}

.theme-select {
  padding: 10px 15px;
  border-radius: 6px;
  border: 1px solid var(--color-border-hover);
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-default);
  font-size: 1rem;
  cursor: pointer;
  min-width: 250px;
  text-align: center;
}

.modes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  width: 100%;
}

.mode-item {
  position: relative;
  aspect-ratio: 1;
  width: 100%;
  cursor: pointer;
  border-radius: var(--panel-border-radius);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 3px solid transparent;
  background: var(--color-bg-tertiary);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  padding-bottom: 15px;
}

.mode-emblem {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
}

.mode-name {
  position: relative;
  z-index: 2;
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  text-shadow: 0 2px 5px rgba(0, 0, 0, 0.8);
  background: rgba(0, 0, 0, 0.5);
  padding: 5px 15px;
  border-radius: 5px;
}

.mode-item:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  border-color: var(--color-accent-primary-hover);
}

.mode-item:hover .mode-emblem {
  transform: scale(1.05);
}

.mode-item:active {
  transform: translateY(-4px) scale(0.98);
  transition: all 0.1s ease;
}

/* Портретная ориентация */
@media (orientation: portrait) {
  .selection-wrapper {
    padding: 15px;
    box-sizing: border-box;
  }

  .title {
    font-size: 1.8rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .modes-container {
    padding: 20px;
    max-width: none;
    width: calc(100% - 10px);
    box-sizing: border-box;
  }

  .modes-grid {
    gap: 15px;
  }
}
</style>
