<!-- src/components/recordsPage/TowerLeaderboardTable.vue -->
<script setup lang="ts">
import { type PropType } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { TowerLeaderboardEntry, TowerId } from '@/types/api.types'

type TowerLeaderboards = { [key in TowerId]?: TowerLeaderboardEntry[] }

defineProps({
  title: {
    type: String,
    required: true,
  },
  towerData: {
    type: Object as PropType<TowerLeaderboards>,
    required: true,
  },
  colorClass: {
    type: String,
    required: true,
  },
})

const router = useRouter()
const { t } = useI18n()

const TOWER_DEFINITIONS: {
  id: TowerId
  nameKey: string
}[] = [
    { id: 'CM', nameKey: 'tower.names.CM' },
    { id: 'FM', nameKey: 'tower.names.FM' },
    { id: 'IM', nameKey: 'tower.names.IM' },
    { id: 'GM', nameKey: 'tower.names.GM' },
  ]

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

const handleChallengeClick = (towerId?: string) => {
  if (towerId) {
    router.push({ name: 'tower', params: { towerId } })
  }
}
</script>

<template>
  <div class="records-page__table-container" :class="colorClass">
    <h3 class="records-page__table-title">{{ title }}</h3>
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
      <tbody v-for="towerDef in TOWER_DEFINITIONS" :key="towerDef.id">
        <template v-if="towerData && towerData[towerDef.id] && towerData[towerDef.id]!.length > 0">
          <tr class="records-page__table-section-header" :class="`header--${towerDef.id}`">
            <th colspan="5">
              {{ t(towerDef.nameKey) }}
            </th>
          </tr>
          <tr v-for="entry in towerData[towerDef.id]" :key="entry.tower_id + entry.lichess_id">
            <td class="text-center">{{ entry.rank }}</td>
            <td class="text-left">
              <img v-if="getSubscriptionIcon(entry.subscriptionTier)"
                :src="getSubscriptionIcon(entry.subscriptionTier)!" class="records-page__sub-icon"
                :alt="entry.subscriptionTier || 'N/A'" />
              <a :href="`https://lichess.org/@/${entry.lichess_id}`" target="_blank">{{
                entry.username
              }}</a>
            </td>
            <td class="text-right">{{ formatTime(entry.best_time) }}</td>
            <td class="text-right">{{ entry.days_old }}d</td>
            <td class="text-center">
              <button class="records-page__challenge-button" @click="handleChallengeClick(entry.tower_id)">
                {{ t('records.table.challenge') }}
              </button>
            </td>
          </tr>
        </template>
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

.towerLeaderboard .records-page__table-title {
  background-color: var(--color-violett-lichess);
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

.records-page__table-section-header th {
  font-size: var(--font-size-base);
  color: var(--color-bg-primary);
  padding: 8px 10px;
  text-align: center;
  font-weight: var(--font-weight-bold);
  border-bottom: 2px solid var(--color-bg-secondary);
  border-top: 2px solid var(--color-bg-secondary);
}

.header--CM th {
  background-color: var(--color-accent-primary);
}

.header--FM th {
  background-color: var(--color-accent-success);
}

.header--IM th {
  background-color: var(--color-accent-warning);
}

.header--GM th {
  background-color: var(--color-accent-error);
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
