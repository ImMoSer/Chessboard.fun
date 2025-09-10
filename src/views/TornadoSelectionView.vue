<!-- src/views/TornadoSelectionView.vue -->
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { type TornadoMode } from '@/types/api.types'

const router = useRouter()

interface Mode {
  id: TornadoMode
  name: string
  time: string
  icon: string
}

const modes: Mode[] = [
  { id: 'bullet', name: 'Bullet', time: '1+1', icon: 'bullet.svg' },
  { id: 'blitz', name: 'Blitz', time: '3+2', icon: 'blitz.svg' },
  { id: 'rapid', name: 'Rapid', time: '5+3', icon: 'rapid.svg' },
  { id: 'classic', name: 'Classic', time: '10+5', icon: 'classical.svg' },
]

const selectMode = (modeId: TornadoMode) => {
  router.push(`/tornado/${modeId}`)
}
</script>

<template>
  <div class="selection-container">
    <h1 class="title">Режим "Торнадо"</h1>
    <p class="subtitle">Выберите контроль времени, чтобы начать сессию</p>
    <div class="modes-grid">
      <div v-for="mode in modes" :key="mode.id" class="mode-card" @click="selectMode(mode.id)">
        <img :src="`/timeControls/${mode.icon}`" :alt="mode.name" class="mode-icon" />
        <h3 class="mode-name">{{ mode.name }}</h3>
        <p class="mode-time">{{ mode.time }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.selection-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-default);
  width: 70vw;
  max-width: 800px;
  margin: 40px auto;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
}

.title {
  font-size: var(--font-size-xxlarge);
  color: var(--color-accent-primary);
  margin-bottom: 10px;
}

.subtitle {
  font-size: var(--font-size-large);
  color: var(--color-text-muted);
  margin-bottom: 40px;
  text-align: center;
}

.modes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 30px;
  width: 100%;
}

.mode-card {
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--panel-border-radius);
  padding: 30px;
  text-align: center;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.mode-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
  border-color: var(--color-accent-success);
}

.mode-icon {
  width: 80px;
  height: 80px;
  margin-bottom: 20px;
}

.mode-name {
  font-size: var(--font-size-xlarge);
  margin: 0 0 10px 0;
  color: var(--color-text-default);
}

.mode-time {
  font-size: var(--font-size-large);
  margin: 0;
  color: var(--color-accent-success);
  font-weight: bold;
}

@media (max-width: 768px) {
  .selection-container {
    width: 100%;
    margin: 10px 0;
    padding: 20px 10px;
  }
  .modes-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .title {
    font-size: var(--font-size-xlarge);
  }
  .subtitle {
    font-size: var(--font-size-base);
  }
}
</style>

