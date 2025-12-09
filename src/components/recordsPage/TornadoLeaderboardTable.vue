<!-- src/components/recordsPage/TornadoLeaderboardTable.vue -->
<script setup lang="ts">
import { type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TornadoLeaderboardEntry, TornadoMode } from '@/types/api.types'
import InfoIcon from '../InfoIcon.vue'

type TornadoLeaderboards = { [key in TornadoMode]?: TornadoLeaderboardEntry[] }

defineProps({
  title: {
    type: String,
    required: true,
  },
  tornadoData: {
    type: Object as PropType<TornadoLeaderboards>,
    required: true,
  },
  colorClass: {
    type: String,
    required: true,
  },
  infoTopic: { type: String, required: false },
})

const { t } = useI18n()

const TORNADO_DEFINITIONS: {
  id: TornadoMode
  name: string
}[] = [
    { id: 'bullet', name: 'Bullet' },
    { id: 'blitz', name: 'Blitz' },
    { id: 'rapid', name: 'Rapid' },
    { id: 'classic', name: 'Classic' },
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
</script>

<template>
  <div class="records-page__table-container" :class="colorClass">
    <h3 class="records-page__table-title">
      {{ title }}
      <InfoIcon v-if="infoTopic" :topic="infoTopic" />
    </h3>
    <div class="records-page__modes-grid">
      <div v-for="modeDef in TORNADO_DEFINITIONS" :key="modeDef.id" class="records-page__mode-section">
        <table class="records-page__table">
          <thead>
            <tr class="records-page__table-section-header" :class="`header--${modeDef.id}`">
              <th colspan="4">
                {{ modeDef.name }}
              </th>
            </tr>
            <tr>
              <th class="text-center">{{ t('records.table.rank') }}</th>
              <th class="text-left">{{ t('records.table.player') }}</th>
              <th class="text-right">{{ t('tornado.leaderboard.highScore') }}</th>
              <th class="text-right">{{ t('records.table.daysOld') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="tornadoData && tornadoData[modeDef.id] && tornadoData[modeDef.id]!.length > 0">
              <tr v-for="entry in tornadoData[modeDef.id]" :key="entry.lichess_id">
                <td class="text-center">{{ entry.rank }}</td>
                <td class="text-left">
                  <img v-if="getSubscriptionIcon(entry.subscriptionTier)"
                    :src="getSubscriptionIcon(entry.subscriptionTier)!" class="records-page__sub-icon"
                    :alt="entry.subscriptionTier || 'N/A'" />
                  <a :href="`https://lichess.org/@/${entry.lichess_id}`" target="_blank">{{
                    entry.username
                  }}</a>
                </td>
                <td class="text-right">{{ entry.highScore }}</td>
                <td class="text-right">{{ entry.days_old }}d</td>
              </tr>
            </template>
            <template v-else>
              <tr>
                <td colspan="4" class="text-center">{{ t('common.noData') }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.records-page__table-container {
  padding: 0;
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.records-page__modes-grid {
  display: flex;
  /* Default to column for mobile */
  flex-direction: column;
  gap: 20px;
  /* Space between sections */
}

@media (min-width: 768px) {

  /* Apply grid for desktop/landscape */
  .records-page__modes-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    /* 2 columns */
    gap: 20px;
    /* Space between grid items */
  }
}


.records-page__table-title {
  color: var(--color-bg-primary);
  font-size: var(--font-size-large);
  padding: 1px;
  margin: 0;
  text-align: center;
  border-bottom: 1px solid var(--color-border-hover);
  font-weight: var(--font-weight-bold);
}

.tornadoLeaderboard .records-page__table-title {
  background-color: var(--color-accent-error-hover);
}

.advantageLeaderboard .records-page__table-title {
  background-color: var(--color-text-error);
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
  padding: 1px;
  text-align: center;
  font-weight: var(--font-weight-bold);
  border-bottom: 2px solid var(--color-bg-secondary);
  border-top: 2px solid var(--color-bg-secondary);
}

.header--bullet th {
  background-color: var(--color-accent-primary);
}

.header--blitz th {
  background-color: var(--color-accent-success);
}

.header--rapid th {
  background-color: var(--color-accent-warning);
}

.header--classic th {
  background-color: var(--color-accent-error);
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
