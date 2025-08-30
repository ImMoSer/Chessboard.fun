<!-- src/components/UserStats.vue -->
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import type { PuzzlesSolvedToday } from '@/types/api.types'

const authStore = useAuthStore()
const { userProfile, isAuthenticated } = storeToRefs(authStore)
const { t } = useI18n()

const handleLogin = () => {
  authStore.login()
}

// Вычисляемое свойство для отображения времени сброса в локальной зоне пользователя
const localResetTimeMessage = computed(() => {
  const now = new Date()
  const tomorrowUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  )
  const localTime = tomorrowUTC.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
  // Новый ключ: userCabinet.stats.activity.titleWithTime
  return t('userCabinet.stats.activity.titleWithTime', { time: localTime })
})

// Хелпер для итерации и отображения детальной статистики
const activityModes: {
  key: keyof Omit<PuzzlesSolvedToday, 'total'>
  label: string
  icon: string
}[] = [
  { key: 'finishHim', label: t('nav.finishHim'), icon: '🎯' },
  { key: 'tower', label: t('nav.tower'), icon: '🏁' },
  { key: 'attack', label: t('nav.attack'), icon: '⚔️' },
  { key: 'tacticalTrainer', label: t('nav.tacktics'), icon: '🧩' },
]
</script>

<template>
  <div class="user-stats-container">
    <div v-if="isAuthenticated && userProfile" class="stats-view">
      <div class="stats-grid">
        <div class="stat-item">
          <!-- Новый ключ: userCabinet.stats.funcoinsLabel -->
          <span class="stat-label">{{ t('userCabinet.stats.funcoinsLabel') }}</span>
          <span class="stat-value funcoins">{{ userProfile.FunCoins }}</span>
        </div>
        <div class="stat-item">
          <!-- Новый ключ: userCabinet.stats.endgameSkillLabel -->
          <span class="stat-label">{{ t('userCabinet.stats.endgameSkillLabel') }}</span>
          <span class="stat-value">{{ userProfile.endgame_skill }}</span>
        </div>
        <div class="stat-item">
          <!-- Новый ключ: userCabinet.stats.attackSkillLabel -->
          <span class="stat-label">{{ t('userCabinet.stats.attackSkillLabel') }}</span>
          <span class="stat-value">{{ userProfile.attack_skill }}</span>
        </div>
      </div>

      <div v-if="userProfile.today_activity" class="today-activity">
        <h5 class="activity-title">{{ localResetTimeMessage }}</h5>

        <!-- Детальная статистика по решенным задачам -->
        <div class="activity-section">
          <div class="total-stat-item">
            <!-- Новый ключ: userCabinet.stats.puzzlesSolved -->
            <span class="stat-label">{{ t('userCabinet.stats.puzzlesSolved') }}</span>
            <span class="stat-value highlight total">
              {{ userProfile.today_activity.puzzles_solved_today.total }}
            </span>
          </div>
          <div class="details-grid">
            <div v-for="mode in activityModes" :key="mode.key" class="detail-item">
              <span class="detail-label">{{ mode.icon }} {{ mode.label }}:</span>
              <span class="detail-value">{{
                userProfile.today_activity.puzzles_solved_today[mode.key] ?? 0
              }}</span>
            </div>
          </div>
        </div>

        <!-- Детальная статистика по полученному скиллу -->
        <div class="activity-section">
          <div class="total-stat-item">
            <!-- Новый ключ: userCabinet.stats.skillEarned -->
            <span class="stat-label">{{ t('userCabinet.stats.skillEarned') }}</span>
            <span class="stat-value highlight total">
              {{ userProfile.today_activity.skill_earned_today.total }}
            </span>
          </div>
          <div class="details-grid">
            <div v-for="mode in activityModes" :key="mode.key" class="detail-item">
              <span class="detail-label">{{ mode.icon }} {{ mode.label }}:</span>
              <span class="detail-value">{{
                userProfile.today_activity.skill_earned_today[mode.key] ?? 0
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="login-view">
      <h4>{{ t('userCabinet.title') }}</h4>
      <p>
        {{ t('userCabinet.loginPrompt') }}
      </p>
      <button @click="handleLogin" class="login-button">
        {{ t('nav.loginWithLichess') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Стили без изменений */
.user-stats-container {
  color: var(--color-text-default);
  padding: 5px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.stats-view,
.login-view {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-base);
  background-color: var(--color-bg-tertiary);
  padding: 5px 8px;
  border-radius: 4px;
}

.stat-label {
  color: var(--color-text-muted);
}

.stat-value {
  font-weight: bold;
  font-size: var(--font-size-base);
}

.stat-value.funcoins {
  color: var(--color-accent-warning);
}

.today-activity {
  margin-top: 0px;
  border-top: 1px dashed var(--color-border-hover);
  padding-top: 5px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.activity-title {
  margin: 0;
  text-align: center;
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
}

.activity-section {
  background-color: var(--color-bg-tertiary);
  padding: 8px;
  border-radius: 4px;
}

.total-stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-base);
  padding-bottom: 5px;
  margin-bottom: 0;
  border-bottom: 1px solid var(--color-border);
}

.stat-value.highlight.total {
  font-size: var(--font-size-large);
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 5px 20px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-base);
}

.detail-label {
  color: var(--color-text-muted);
}

.detail-value {
  font-weight: bold;
}

.stat-value.highlight {
  color: var(--color-accent-primary);
}

.login-view {
  text-align: center;
  justify-content: center;
  flex-grow: 1;
}

.login-view h4 {
  margin-top: 0;
  color: var(--color-accent-warning);
}

.login-button {
  background-color: var(--color-accent-primary);
  color: var(--color-text-dark);
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.login-button:hover {
  background-color: var(--color-accent-primary-hover);
}

@media (orientation: portrait) {
  .board-resizer {
    display: none;
  }
}
</style>
