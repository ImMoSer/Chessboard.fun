<!-- src/views/UserCabinetView.vue -->
<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useUserCabinetStore, type ActivityPeriod } from '@/stores/userCabinet.store'
import type { TornadoMode } from '@/types/api.types'

const { t } = useI18n()
const router = useRouter()

const authStore = useAuthStore()
const { userProfile, isAuthenticated } = storeToRefs(authStore)

const userCabinetStore = useUserCabinetStore()
const {
  isLoading,
  error,
  personalActivityStats,
  isPersonalActivityStatsLoading,
  selectedActivityPeriod,
  lichessActivity,
  isActivityLoading,
} = storeToRefs(userCabinetStore)

onMounted(() => {
  userCabinetStore.initializePage()
})

const handlePeriodChange = (period: ActivityPeriod) => {
  userCabinetStore.setSelectedActivityPeriod(period)
}

const formatTierExpireDate = (isoDate: string | null | undefined) => {
  if (!isoDate) return t('userCabinet.info.tierPermanent')
  const date = new Date(isoDate)
  return t('userCabinet.info.tierExpires', { date: date.toLocaleDateString() })
}

const formatLichessActivityDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const getRatingChange = (rp: { before: number; after: number }) => {
  const diff = rp.after - rp.before
  const sign = diff > 0 ? '+' : ''
  return `${rp.before} → ${rp.after} (${sign}${diff})`
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
  <div class="user-cabinet-container">
    <div v-if="isLoading" class="loading-message">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>
    <div v-else-if="!isAuthenticated || !userProfile" class="login-prompt-container">
      <h3>{{ t('userCabinet.title') }}</h3>
      <p>{{ t('userCabinet.loginPrompt') }}</p>
      <button @click="authStore.login()" class="login-button">
        {{ t('nav.loginWithLichess') }}
      </button>
    </div>
    <div v-else class="user-cabinet-content">
      <header class="user-cabinet__header">
        <h1 class="user-cabinet__page-main-title">
          {{ userProfile.username }}
        </h1>
        <div class="user-cabinet__user-info-basic">
          <div class="user-cabinet__stat-item">
            <span class="user-cabinet__stat-label">{{ t('userCabinet.info.lichessId') }}:</span>
            <span class="user-cabinet__stat-value">{{ userProfile.id }}</span>
          </div>
          <div class="user-cabinet__stat-item">
            <span class="user-cabinet__stat-label">{{ t('userCabinet.info.subscriptionTier') }}:</span>
            <span class="user-cabinet__stat-value">{{ userProfile.subscriptionTier }}
              <span class="tier-expire-date">{{
                formatTierExpireDate(userProfile.TierExpire)
              }}</span></span>
          </div>
          <!-- Обновленные и новые поля -->
          <div class="user-cabinet__stat-item">
            <span class="user-cabinet__stat-label">{{
              t('userCabinet.stats.endgameSkillLabel')
            }}</span>
            <span class="user-cabinet__stat-value">{{ userProfile.endgame_skill }}</span>
          </div>
          <div v-if="userProfile.finishHimRating" class="user-cabinet__stat-item">
            <span class="user-cabinet__stat-label">{{
              t('userCabinet.stats.finishHimRatingLabel')
            }}</span>
            <span class="user-cabinet__stat-value">{{ userProfile.finishHimRating.rating }}</span>
          </div>
          <div class="user-cabinet__stat-item">
            <span class="user-cabinet__stat-label">{{
              t('userCabinet.stats.attackSkillLabel')
            }}</span>
            <span class="user-cabinet__stat-value">{{ userProfile.attack_skill }}</span>
          </div>
          <div v-if="userProfile.attackRating" class="user-cabinet__stat-item">
            <span class="user-cabinet__stat-label">{{
              t('userCabinet.stats.attackRatingLabel')
            }}</span>
            <span class="user-cabinet__stat-value">{{ userProfile.attackRating.rating }}</span>
          </div>
        </div>
      </header>

      <!-- Telegram Section -->
      <section class="user-cabinet__telegram-section">
        <h3 class="user-cabinet__section-title">{{ t('userCabinet.telegram.title') }}</h3>
        <div v-if="userProfile.telegram_id" class="user-cabinet__telegram-status">
          ✅ {{ t('userCabinet.telegram.boundStatusSimple') }}
        </div>
        <button v-else @click="userCabinetStore.handleTelegramBind" class="user-cabinet__telegram-button">
          {{ t('userCabinet.telegram.bindButton') }}
        </button>
      </section>

      <!-- Personal Activity Stats Section -->
      <section class="user-cabinet__personal-activity-stats">
        <h3 class="user-cabinet__section-title">{{ t('userCabinet.stats.global.title') }}</h3>
        <div v-if="isPersonalActivityStatsLoading" class="loading-message">
          {{ t('common.loading') }}
        </div>
        <div v-else-if="personalActivityStats">
          <div class="stats-filters">
            <button class="filter-button" :class="{ active: selectedActivityPeriod === 'daily' }"
              @click="handlePeriodChange('daily')">
              {{ t('userCabinet.stats.periods.day') }}
            </button>
            <button class="filter-button" :class="{ active: selectedActivityPeriod === 'weekly' }"
              @click="handlePeriodChange('weekly')">
              {{ t('userCabinet.stats.periods.week') }}
            </button>
            <button class="filter-button" :class="{ active: selectedActivityPeriod === 'monthly' }"
              @click="handlePeriodChange('monthly')">
              {{ t('userCabinet.stats.periods.month') }}
            </button>
          </div>
          <div class="stats-table-container">
            <table class="user-cabinet__stats-table">
              <thead>
                <tr>
                  <th>{{ t('userCabinet.stats.modes.all') }}</th>
                  <th>{{ t('records.table.requested') }}</th>
                  <th>{{ t('records.table.solved') }}</th>
                  <th>{{ t('records.table.totalSkill') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="mode in ['finishHim', 'attack', 'tower', 'tornado'] as const" :key="mode">
                  <td>
                    {{
                      t(mode === 'tornado' ? 'nav.tornado' : `userCabinet.stats.modes.${mode}`)
                    }}
                  </td>
                  <td>
                    {{ personalActivityStats[selectedActivityPeriod][mode].puzzles_requested }}
                  </td>
                  <td>{{ personalActivityStats[selectedActivityPeriod][mode].puzzles_solved }}</td>
                  <td class="skill-value">
                    {{ personalActivityStats[selectedActivityPeriod][mode].skill_value }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Lichess Activity Section -->
      <section class="user-cabinet__stats-section user-cabinet__stats-section--lichess-activity">
        <h3 class="user-cabinet__section-title">{{ t('userCabinet.activity.title') }}</h3>
        <div v-if="isActivityLoading" class="loading-message">{{ t('common.loading') }}</div>
        <div v-else-if="!lichessActivity || lichessActivity.length === 0" class="no-data-message">
          {{ t('userCabinet.activity.noActivity') }}
        </div>
        <table v-else class="user-cabinet__activity-table">
          <thead>
            <tr>
              <th>{{ t('userCabinet.activity.dateHeader') }}</th>
              <th>{{ t('userCabinet.activity.summaryHeader') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in lichessActivity" :key="entry.interval.start">
              <td class="user-cabinet__activity-date">
                {{ formatLichessActivityDate(entry.interval.start) }}
              </td>
              <td class="user-cabinet__activity-details">
                <div v-if="entry.games">
                  <div v-for="(stats, gameType) in entry.games" :key="gameType" class="activity-detail-item">
                    <strong>{{ gameType }}:</strong> {{ stats.win }}W / {{ stats.loss }}L /
                    {{ stats.draw }}D
                    <br />
                    <span class="rating-change">{{ getRatingChange(stats.rp) }}</span>
                  </div>
                </div>
                <div v-if="entry.puzzles" class="activity-detail-item">
                  <strong>Puzzles:</strong> {{ entry.puzzles.score.win }}W /
                  {{ entry.puzzles.score.loss }}L
                  <br />
                  <span class="rating-change">{{ getRatingChange(entry.puzzles.score.rp) }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Tornado Stats -->
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
    </div>
  </div>
</template>

<style scoped>
/* src/features/userCabinet/userCabinet.css */

.user-cabinet-container {
  padding: 5px;
  box-sizing: border-box;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-default);
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-width: 70vw;
  max-width: 1200px;
  margin: 20px auto;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
}

.loading-message,
.error-message {
  text-align: center;
  padding: 20px;
  font-size: var(--font-size-large);
}

.login-prompt-container {
  text-align: center;
  padding: 40px 20px;
}

.login-button {
  background-color: var(--color-accent-primary);
  color: var(--color-text-dark);
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.login-button:hover {
  background-color: var(--color-accent-primary-hover);
}

.user-cabinet__header {
  padding-bottom: 15px;
  margin-bottom: 20px;
  text-align: center;
}

.user-cabinet__page-main-title {
  font-size: var(--font-size-xxlarge);
  color: var(--color-accent-primary);
  margin-top: 0;
  margin-bottom: 10px;
  font-weight: var(--font-weight-bold);
}

.user-cabinet__user-info-basic {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 15px;
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
}

.user-cabinet__stats-section,
.user-cabinet__club-activity-section,
.user-cabinet__personal-activity-stats,
.user-cabinet__telegram-section {
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

.user-cabinet__stat-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  border-bottom: 1px dotted var(--color-border);
  font-size: var(--font-size-base);
  background-color: var(--color-bg-primary);
  border-radius: 4px;
  align-items: center;
  gap: 10px;
}

.user-cabinet__stat-label {
  color: var(--color-text-muted);
  font-weight: var(--font-weight-normal);
}

.user-cabinet__stat-value {
  color: var(--color-accent-primary);
  font-weight: var(--font-weight-bold);
}

.tier-expire-date {
  font-style: italic;
  font-size: 0.8em;
  margin-left: 5px;
}

.user-cabinet__telegram-section .user-cabinet__section-title {
  color: #2aabee;
  /* Telegram blue */
}

.user-cabinet__telegram-button {
  display: block;
  width: 100%;
  max-width: 300px;
  margin: 10px auto;
  padding: 12px 20px;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: #ffffff;
  background-color: #2aabee;
  border: none;
  border-radius: var(--panel-border-radius);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.1s ease;
}

.user-cabinet__telegram-button:hover:not(:disabled) {
  background-color: #1a94d6;
  transform: translateY(-1px);
}

.user-cabinet__telegram-status {
  text-align: center;
  font-size: var(--font-size-base);
  color: var(--color-text-default);
  background-color: var(--color-bg-secondary);
  padding: 10px;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-accent-success);
}

.user-cabinet__personal-activity-stats .user-cabinet__section-title {
  color: var(--color-accent-success);
}

.stats-filters {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.filter-button {
  padding: 8px 16px;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-muted);
  font-family: var(--font-family-primary);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-button:hover {
  border-color: var(--color-accent-primary);
  color: var(--color-text-default);
}

.filter-button.active {
  background-color: var(--color-accent-primary);
  color: var(--color-text-dark);
  border-color: var(--color-accent-primary);
  font-weight: bold;
}

.stats-table-container {
  overflow-x: auto;
}

.user-cabinet__stats-table {
  width: 100%;
  border-collapse: collapse;
}

.user-cabinet__stats-table th,
.user-cabinet__stats-table td {
  padding: 10px;
  border: 1px solid var(--color-border);
  text-align: center;
}

.user-cabinet__stats-table th {
  background-color: var(--color-bg-secondary);
  font-weight: bold;
}

.user-cabinet__stats-table td:first-child {
  text-align: left;
  font-weight: bold;
}

.user-cabinet__stats-table .skill-value {
  font-weight: bold;
  color: var(--color-accent-success);
}

.user-cabinet__club-activity-section .user-cabinet__section-title {
  color: var(--color-accent-success);
}

.user-cabinet__club-list-section {
  margin-bottom: 15px;
}

.user-cabinet__club-list-section:last-child {
  margin-bottom: 0;
}

.user-cabinet__club-list-title {
  font-size: var(--font-size-large);
  color: var(--color-text-default);
  margin-top: 0;
  margin-bottom: 10px;
  padding-bottom: 5px;
  border-bottom: 1px dashed var(--color-border);
}

.user-cabinet__club-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.user-cabinet__club-list-item a {
  cursor: pointer;
  background-color: var(--color-bg-secondary);
  padding: 5px 10px;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
  color: var(--color-text-link);
  text-decoration: none;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-base);
  display: inline-block;
}

.user-cabinet__club-list-item a:hover {
  background-color: var(--color-border-hover);
  border-color: var(--color-accent-primary);
}

.user-cabinet__stats-section--tornado .user-cabinet__section-title {
  color: var(--color-accent-secondary);
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

.user-cabinet__stats-section--lichess-activity .user-cabinet__section-title {
  color: var(--color-accent-info);
}

.user-cabinet__activity-table {
  width: 100%;
  border-collapse: collapse;
}

.user-cabinet__activity-table th,
.user-cabinet__activity-table td {
  padding: 10px;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.user-cabinet__activity-table th {
  font-weight: bold;
  color: var(--color-text-muted);
}

.user-cabinet__activity-date {
  font-weight: bold;
  white-space: nowrap;
  vertical-align: top;
  width: 1%;
}

.user-cabinet__activity-details .rating-change {
  font-size: 0.9em;
  color: var(--color-text-muted);
}

.user-cabinet__activity-details .rating-change .positive {
  color: var(--color-accent-success);
}

.user-cabinet__activity-details .rating-change .negative {
  color: var(--color-accent-error);
}
</style>
