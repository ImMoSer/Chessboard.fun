<!-- src/views/ModeSelectionView.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { type TornadoMode } from '@/types/api.types'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const gameMode = computed(() => route.meta.gameMode as 'tornado' | 'advantage')

const title = computed(() => {
  return t(`${gameMode.value}.selection.title`)
})

interface Mode {
  id: TornadoMode
  image: string
  alt: string
}

const modes: Mode[] = [
  { id: 'bullet', image: '/png/tornado/tornado_bulet.png', alt: 'Bullet Mode' },
  { id: 'blitz', image: '/png/tornado/tornado_blitz.png', alt: 'Blitz Mode' },
  { id: 'rapid', image: '/png/tornado/tornado_rapid.png', alt: 'Rapid Mode' },
  { id: 'classic', image: '/png/tornado/tornado_classic.png', alt: 'Classic Mode' },
]

const selectMode = (modeId: TornadoMode) => {
  const puzzleId = route.params.puzzleId as string | undefined
  if (gameMode.value === 'advantage' && puzzleId) {
    router.push(`/advantage/puzzle/${puzzleId}/${modeId}`)
  } else if (puzzleId) {
    router.push(`/${gameMode.value}/${puzzleId}/${modeId}`)
  } else {
    router.push(`/${gameMode.value}/${modeId}`)
  }
}
</script>

<template>
  <div class="selection-wrapper">
    <div class="title-container">
      <h2 class="title">{{ title }}</h2>
    </div>

    <div class="modes-container">
      <div class="modes-grid">
        <div v-for="mode in modes" :key="mode.id" class="mode-item" @click="selectMode(mode.id)">
          <img :src="mode.image" :alt="mode.alt" class="mode-emblem" />
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
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: var(--panel-border-radius);
  padding: 15px 30px;
  margin-bottom: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-accent-warning);
  width: 100%;
  max-width: 700px;
}

.title {
  margin: 0;
  text-align: center;
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-accent-warning);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.modes-container {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(15px);
  border-radius: var(--panel-border-radius);
  padding: 30px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  border: 1px solid var(--color-accent-warning);
  width: 100%;
  max-width: 700px;
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
  max-width: 400px;
  width: 100%;
  cursor: pointer;
  border-radius: var(--panel-border-radius);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 3px solid transparent;
  background: var(--color-accent-warning);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.mode-emblem {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--panel-border-radius);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.mode-item:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  border-color: var(--color-accent-error-hover);
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

  .title-container {
    margin-bottom: 20px;
    padding: 12px 20px;
    max-width: none;
    width: calc(100% - 10px);
    box-sizing: border-box;
  }

  .title {
    font-size: 1.5rem;
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

  .mode-item {
    max-width: none;
  }
}
</style>