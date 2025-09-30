<!-- src/components/userCabinet/sections/LichessActivity.vue -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useUserCabinetStore } from '@/stores/userCabinet.store'

const { t } = useI18n()
const userCabinetStore = useUserCabinetStore()
const { lichessActivity, isActivityLoading } = storeToRefs(userCabinetStore)

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
</script>

<template>
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
</template>

<style scoped>
.user-cabinet__stats-section--lichess-activity {
    background-color: var(--color-bg-tertiary);
    padding: 15px;
    border-radius: var(--panel-border-radius);
    border: 1px solid var(--color-border);
    margin-bottom: 20px;
}
.user-cabinet__section-title {
  font-size: var(--font-size-xlarge);
  color: var(--color-accent-info);
  margin-top: 0;
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border-hover);
  text-align: center;
}

.loading-message,
.no-data-message {
  text-align: center;
  padding: 20px;
  font-size: var(--font-size-large);
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
