<!-- src/components/recordsPage/SimpleLeaderboardTable.vue -->
<script setup lang="ts">
import { type PropType } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { FinishHimLeaderboardEntry } from '@/types/api.types'
import InfoIcon from '../InfoIcon.vue'

type LeaderboardEntry = FinishHimLeaderboardEntry

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  entries: {
    type: Array as PropType<LeaderboardEntry[]>,
    required: true,
  },
  mode: {
    type: String as PropType<'finish-him'>,
    required: true,
  },
  colorClass: {
    type: String,
    required: true,
  },
  infoTopic: { type: String, required: false },
})

const router = useRouter()
const { t } = useI18n()

const tierToPieceMap: { [key: string]: string } = {
  Pawn: 'wP.svg',
  Knight: 'wN.svg',
  Bishop: 'wB.svg',
  Rook: 'wR.svg',
  Queen: 'wQ.svg',
  King: 'wK.svg',
}

const getSubscriptionIcon = (tier?: string) => {
  if (!tier || !tierToPieceMap[tier]) {
    return null
  }
  return `/piece/alpha/${tierToPieceMap[tier]}`
}

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const paddedSeconds = seconds < 10 ? `0${seconds}` : seconds
  return `${minutes}:${paddedSeconds}`
}

const handleChallengeClick = (puzzleId?: string) => {
  if (puzzleId) {
    router.push({ name: props.mode, params: { puzzleId } })
  }
}
</script>

<template>
  <div class="records-page__table-container" :class="colorClass">
    <h3 class="records-page__table-title">
      {{ title }}
      <InfoIcon v-if="infoTopic" :topic="infoTopic" />
    </h3>
    <table class="records-page__table">
      <thead>
        <tr>
          <th class="text-center">{{ t('records.table.rank') }}</th>
          <th class="text-left">{{ t('records.table.player') }}</th>
          <th class="text-right">{{ t('records.table.time') }}</th>
          <th class="text-right">{{ t('records.table.daysOld') }}</th>
          <th class="text-center">{{ t('records.table.action') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in entries" :key="entry.puzzle_id + entry.lichess_id">
          <td class="text-center">{{ entry.rank }}</td>
          <td class="text-left">
            <img
              v-if="getSubscriptionIcon(entry.subscriptionTier)"
              :src="getSubscriptionIcon(entry.subscriptionTier)!"
              class="records-page__sub-icon"
              :alt="entry.subscriptionTier || 'N/A'"
            />
            <a :href="`https://lichess.org/@/${entry.lichess_id}`" target="_blank">{{
              entry.username
            }}</a>
          </td>
          <td class="text-right">{{ formatTime(entry.best_time) }}</td>
          <td class="text-right">{{ entry.days_old }}d</td>
          <td class="text-center">
            <button
              class="records-page__challenge-button"
              @click="handleChallengeClick(entry.puzzle_id)"
            >
              {{ t('records.table.challenge') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* Стили скопированы из RecordsPageView для консистентности */
.records-page__table-container {
  padding: 0;
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.records-page__table-title {
  color: var(--color-bg-primary);
  font-size: var(--font-size-large);
  padding: 10px 10px;
  margin: 0;
  text-align: center;
  border-bottom: 1px solid var(--color-border-hover);
  font-weight: var(--font-weight-bold);
}

.finishHimLeaderboard .records-page__table-title {
  background-color: var(--color-accent-secondary);
}

.records-page__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-base);
}

.records-page__table th,
.records-page__table td {
  padding: 3px 3px;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.records-page__table th {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-muted);
  font-weight: var(--font-weight-bold);
}

.records-page__table tbody tr:nth-child(even) {
  background-color: var(--color-bg-tertiary);
}
.records-page__table tbody tr:hover {
  background-color: var(--color-border-hover);
}
.records-page__table td a {
  color: var(--color-text-link);
  text-decoration: none;
  font-weight: var(--font-weight-bold);
}
.records-page__table td a:hover {
  text-decoration: underline;
}
.records-page__sub-icon {
  width: auto;
  height: 1.7em;
  vertical-align: -0.4em;
  margin-right: 6px;
}
.records-page__challenge-button {
  background-color: var(--color-accent-success);
  color: var(--color-text-dark);
  border: 1px solid transparent;
  padding: 6px 14px;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  border-radius: var(--panel-border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
}
.records-page__challenge-button:hover:not(:disabled) {
  background-color: var(--color-accent-success-hover);
  transform: translateY(-1px);
}
.text-left {
  text-align: left;
}
.text-center {
  text-align: center;
}
.text-right {
  text-align: right;
}
</style>