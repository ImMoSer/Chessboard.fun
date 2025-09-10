<!-- src/views/TornadoSelectionView.vue -->
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { type TornadoMode } from '@/types/api.types'

const router = useRouter()

interface Mode {
  id: TornadoMode
  image: string
  alt: string
}

const modes: Mode[] = [
  { id: 'bullet', image: '/png/tornado/tornado_bulet.png', alt: 'Tornado Bullet Mode' },
  { id: 'blitz', image: '/png/tornado/tornado_blitz.png', alt: 'Tornado Blitz Mode' },
  { id: 'rapid', image: '/png/tornado/tornado_rapid.png', alt: 'Tornado Rapid Mode' },
  { id: 'classic', image: '/png/tornado/tornado_classic.png', alt: 'Tornado Classic Mode' },
]

const selectMode = (modeId: TornadoMode) => {
  router.push(`/tornado/${modeId}`)
}
</script>

<template>
  <div class="selection-container">
    <div class="modes-grid-container">
      <img
        v-for="mode in modes"
        :key="mode.id"
        :src="mode.image"
        :alt="mode.alt"
        class="mode-emblem"
        @click="selectMode(mode.id)"
      />
    </div>
  </div>
</template>

<style scoped>
.selection-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  width: 100%;
  max-width: 1200px;
  margin: 20px auto;
}

.modes-grid-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  width: 100%;
  max-width: 800px; /* Ограничиваем максимальную ширину для лучшего вида на десктопе */
}

.mode-emblem {
  width: 100%;
  height: auto;
  cursor: pointer;
  border-radius: 15px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  border: 3px solid transparent;
}

.mode-emblem:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  border-color: var(--color-accent-primary);
}
</style>

