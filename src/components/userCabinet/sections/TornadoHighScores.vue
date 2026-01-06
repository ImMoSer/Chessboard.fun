<!-- src/components/userCabinet/sections/TornadoHighScores.vue -->
<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth.store'
import type { TornadoMode } from '@/types/api.types'
import { Flash, Timer, Calendar } from '@vicons/ionicons5'

const { t } = useI18n()
const authStore = useAuthStore()
const { userProfile } = storeToRefs(authStore)

const modeMeta: Record<TornadoMode, { color: string; icon: Component }> = {
  bullet: { color: 'var(--color-accent-primary)', icon: Flash },
  blitz: { color: 'var(--color-accent-success)', icon: Flash },
  rapid: { color: 'var(--color-accent-warning)', icon: Timer },
  classic: { color: 'var(--color-accent-error)', icon: Calendar },
}

const sortedTornadoScores = computed(() => {
  if (!userProfile.value?.tornadoHighScores) return []
  const modes: TornadoMode[] = ['bullet', 'blitz', 'rapid', 'classic']
  return modes
    .map((mode) => ({
      mode,
      score: userProfile.value?.tornadoHighScores?.[mode],
    }))
    .filter((item): item is { mode: TornadoMode; score: number } => !!item.score && item.score > 0)
})
</script>

<template>
  <n-card v-if="sortedTornadoScores.length > 0" class="tornado-card">
    <template #header>
      <span class="card-header-text">{{ t('userCabinet.stats.tornadoTitle') }}</span>
    </template>

    <n-grid :cols="2" :x-gap="12" :y-gap="12">
      <n-grid-item v-for="stat in sortedTornadoScores" :key="stat.mode">
        <div class="score-item" :style="{ borderColor: modeMeta[stat.mode].color }">
          <n-icon :component="modeMeta[stat.mode].icon" :color="modeMeta[stat.mode].color" size="20" />
          <div class="score-details">
            <div class="mode-name">{{ stat.mode }}</div>
            <div class="mode-score">{{ stat.score }}</div>
          </div>
        </div>
      </n-grid-item>
    </n-grid>
  </n-card>
</template>

<style scoped>
.tornado-card {
  height: 100%;
  background-color: var(--color-bg-tertiary);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.card-header-text {
  font-family: var(--font-family-primary);
  color: var(--color-accent-secondary);
  font-size: var(--font-size-large);
  font-weight: bold;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background-color: var(--color-bg-secondary);
  border-left: 4px solid;
  border-radius: 6px;
}

.mode-name {
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
  text-transform: capitalize;
}

.mode-score {
  font-weight: bold;
  font-size: var(--font-size-large);
  color: var(--color-accent-warning);
}
</style>
