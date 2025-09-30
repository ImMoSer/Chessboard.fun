<!-- src/components/userCabinet/sections/TornadoHighScores.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth.store'
import type { TornadoMode } from '@/types/api.types'

const { t } = useI18n()
const authStore = useAuthStore()
const { userProfile } = storeToRefs(authStore)

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
  <section v-if="sortedTornadoScores.length > 0"
    class="user-cabinet__stats-section user-cabinet__stats-section--tornado">
    <h3 class="user-cabinet__section-title">{{ t('userCabinet.stats.tornadoTitle') }}</h3>
    <ul class="user-cabinet__tornado-list">
      <li v-for="stat in sortedTornadoScores" :key="stat.mode" class="user-cabinet__tornado-item">
        <span class="mode">{{ stat.mode }}</span>
        <span class="score">{{ stat.score }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.user-cabinet__stats-section--tornado {
    background-color: var(--color-bg-tertiary);
    padding: 15px;
    border-radius: var(--panel-border-radius);
    border: 1px solid var(--color-border);
    margin-bottom: 20px;
}

.user-cabinet__section-title {
  font-size: var(--font-size-xlarge);
  color: var(--color-accent-secondary);
  margin-top: 0;
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border-hover);
  text-align: center;
}

.user-cabinet__tornado-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.user-cabinet__tornado-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-bg-secondary);
  padding: 10px 15px;
  border-radius: 6px;
  border: 1px solid var(--color-border-hover);
  font-size: var(--font-size-base);
}

.user-cabinet__tornado-item .mode {
  font-weight: bold;
  text-transform: capitalize;
}

.user-cabinet__tornado-item .score {
  font-weight: bold;
  color: var(--color-accent-warning);
}
</style>
