<!-- src/components/clubPage/ClubStatsTable.vue -->
<script setup lang="ts">
import { ref, computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TeamBattlePlayerSummary } from '../../types/api.types'
import PlayerStatsDetail from './PlayerStatsDetail.vue'

const { t } = useI18n()
const VISIBLE_COUNT_INCREMENT = 10

// --- PROPS ---
const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  players: {
    type: Array as PropType<TeamBattlePlayerSummary[]>,
    required: true,
  },
  columns: {
    type: Array as PropType<{ key: keyof TeamBattlePlayerSummary; label: string; class?: string }[]>,
    required: true,
  },
  sortKey: {
    type: String as PropType<keyof TeamBattlePlayerSummary>,
    required: true,
  },
  titleColorClass: {
    type: String,
    default: 'default-title-color',
  },
})

// --- LOCAL STATE ---
const visiblePlayerCount = ref(VISIBLE_COUNT_INCREMENT)
const expandedPlayerId = ref<string | null>(null)

// --- COMPUTED ---
const sortedPlayers = computed(() => {
  return [...props.players].sort((a, b) => {
    const valA = a[props.sortKey]
    const valB = b[props.sortKey]
    if (typeof valA === 'object' && valA !== null && 'avg' in valA) {
      return (valB as any).avg - (valA as any).avg
    }
    if (typeof valA === 'number' && typeof valB === 'number') {
      return valB - valA
    }
    return 0
  })
})

const visiblePlayers = computed(() => {
  return sortedPlayers.value.slice(0, visiblePlayerCount.value)
})

const hasMorePlayers = computed(() => {
  return visiblePlayerCount.value < sortedPlayers.value.length
})

// --- METHODS ---
const showMore = () => {
  visiblePlayerCount.value += VISIBLE_COUNT_INCREMENT
}

const toggleDetails = (playerId: string) => {
  if (expandedPlayerId.value === playerId) {
    expandedPlayerId.value = null
  } else {
    expandedPlayerId.value = playerId
  }
}

const getFlairIconUrl = (flair?: string | null) => {
  if (!flair) return null
  return `https://lichess1.org/assets/flair/img/${flair}.webp`
}

const renderPlayerCell = (player: TeamBattlePlayerSummary) => {
  const flairHtml = player.flair
    ? `<img src="${getFlairIconUrl(player.flair)}" alt="Flair" title="${
        player.flair
      }" class="club-page__flair-icon" />`
    : ''
  return `<a href="https://lichess.org/@/${player.lichess_id}" target="_blank">${player.username}</a>${flairHtml}`
}

const getCellValue = (player: TeamBattlePlayerSummary, key: keyof TeamBattlePlayerSummary) => {
  const value = player[key]
  if (typeof value === 'object' && value !== null && 'avg' in value) {
    return (value as any).avg
  }
  return value
}
</script>

<template>
  <div class="club-page__table-container">
    <h3 class="club-page__table-title" :class="titleColorClass">{{ title }}</h3>
    <table class="club-page__table">
      <thead>
        <tr>
          <th class="text-center">#</th>
          <th v-for="col in columns" :key="col.key" :class="col.class || 'text-left'">
            {{ col.label }}
          </th>
          <th class="text-center info-col-header"></th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(player, index) in visiblePlayers" :key="player.lichess_id">
          <tr>
            <td class="text-center">{{ index + 1 }}</td>
            <td v-for="col in columns" :key="col.key" :class="col.class || 'text-left'">
              <span v-if="col.key === 'username'" v-html="renderPlayerCell(player)"></span>
              <span v-else>{{ getCellValue(player, col.key) }}</span>
            </td>
            <td class="text-center">
              <button @click="toggleDetails(player.lichess_id)" class="info-button">
                i
              </button>
            </td>
          </tr>
          <tr v-if="expandedPlayerId === player.lichess_id" class="player-details-row">
            <td :colspan="columns.length + 2">
              <PlayerStatsDetail :player="player" />
            </td>
          </tr>
        </template>
      </tbody>
    </table>
    <div v-if="hasMorePlayers" class="club-page__show-more-container">
      <button class="club-page__show-more-button" @click="showMore">
        {{ t('clubPage.button.showMore') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.club-page__table-container {
  padding: 0;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.club-page__table-title {
  font-size: var(--font-size-xlarge);
  color: var(--color-text-dark);
  margin: 0;
  padding: 10px 10px;
  border-bottom: 1px solid var(--color-border-hover);
}

.title-color-primary {
  background-color: var(--color-accent-primary);
}
.title-color-secondary {
  background-color: var(--color-accent-secondary);
}
.title-color-violet {
  background-color: var(--color-violett-lichess);
}
.default-title-color {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-default);
}

.club-page__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-base);
}

.club-page__table th,
.club-page__table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-default);
  white-space: nowrap;
}

.club-page__table .text-left {
  text-align: left;
}
.club-page__table .text-center {
  text-align: center;
}
.club-page__table .text-right {
  text-align: right;
}

.club-page__table thead th {
  background-color: var(--color-bg-secondary);
  font-weight: var(--font-weight-bold);
}

.club-page__table > tbody > tr:not(.player-details-row):nth-child(odd) {
  background-color: var(--color-bg-tertiary);
}
.club-page__table > tbody > tr:not(.player-details-row):nth-child(even) {
  background-color: var(--color-bg-secondary);
}
.club-page__table tbody tr:not(.player-details-row):hover {
  background-color: var(--color-border-hover);
}

.player-details-row > td {
  padding: 0;
  border-bottom: 1px solid var(--color-border-hover);
}

.info-button {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-hover);
  color: var(--color-text-default);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-weight: bold;
  font-style: italic;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}
.info-button:hover {
  background-color: var(--color-border-hover);
}
.info-col-header {
  width: 40px;
}

:deep(a) {
  color: var(--color-text-link);
  text-decoration: none;
}
:deep(a:hover) {
  text-decoration: underline;
}
:deep(.club-page__flair-icon) {
  height: 15px;
  vertical-align: -0.15em;
  margin-left: 6px;
}

.club-page__show-more-container {
  padding: 10px;
  text-align: center;
  background-color: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
}

.club-page__show-more-button {
  width: 100%;
  padding: 10px;
  background-color: var(--color-accent-primary);
  color: var(--color-text-on-accent);
  border: none;
  border-radius: var(--panel-border-radius);
  cursor: pointer;
  font-weight: var(--font-weight-bold);
  transition: background-color 0.2s ease;
}
.club-page__show-more-button:hover {
  background-color: var(--color-accent-primary-hover);
}

@media (orientation: portrait) {
  .club-page__table-title {
    font-size: var(--font-size-base);
    padding: 8px 10px;
  }
  .club-page__table,
  .club-page__show-more-button {
    font-size: var(--font-size-xsmall);
  }
  .club-page__table th,
  .club-page__table td {
    padding: 5px;
  }
}
</style>
