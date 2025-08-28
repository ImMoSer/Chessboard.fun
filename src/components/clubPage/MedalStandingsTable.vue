<!-- src/components/clubPage/MedalStandingsTable.vue -->
<script setup lang="ts">
import { ref, computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PlayerData } from '../../types/api.types'

const { t } = useI18n()

// --- PROPS ---
const props = defineProps({
  players: {
    type: Array as PropType<PlayerData[]>,
    required: true,
  },
})

// --- LOCAL STATE ---
const expandedMedalInfoKey = ref<string | null>(null)

// --- METHODS ---
const toggleMedalDetails = (key: string) => {
  expandedMedalInfoKey.value = expandedMedalInfoKey.value === key ? null : key
}

const getMedalSum = (player: PlayerData, type: 'team' | 'arena') => {
  const medals = type === 'team' ? player.medals_in_team : player.medals_in_arena
  return (medals.gold?.count || 0) + (medals.silver?.count || 0) + (medals.bronze?.count || 0)
}

const formatDateForUser = (isoDateString: string): string => {
  try {
    const date = new Date(isoDateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear().toString().slice(-2)
    return `${day}.${month}.${year}`
  } catch (e) {
    return isoDateString
  }
}

const getFlairIconUrl = (flair?: string | null) => {
  if (!flair) return null
  return `https://lichess1.org/assets/flair/img/${flair}.webp`
}

const renderPlayerCell = (player: PlayerData) => {
  const flairHtml = player.flair
    ? `<img src="${getFlairIconUrl(player.flair)}" alt="Flair" title="${
        player.flair
      }" class="club-page__flair-icon" />`
    : ''
  return `<a href="https://lichess.org/@/${player.lichess_id}" target="_blank">${player.username}</a>${flairHtml}`
}

// --- COMPUTED ---
const sortedMedalPlayers = computed(() => (type: 'team' | 'arena') => {
  return [...props.players]
    .filter((p) => getMedalSum(p, type) > 0)
    .sort((a, b) => getMedalSum(b, type) - getMedalSum(a, type))
})
</script>

<template>
  <div class="club-page__stats-grid-2-cols">
    <!-- Team Medals Table -->
    <div class="club-page__table-container club-page__table-container--team-medals">
      <h3 class="club-page__table-title">{{ t('clubPage.medalStandings.teamTitle') }}</h3>
      <table class="club-page__table">
        <thead>
          <tr>
            <th class="text-center">#</th>
            <th class="text-left">{{ t('clubPage.table.player') }}</th>
            <th class="text-center">🥇</th>
            <th class="text-center">🥈</th>
            <th class="text-center">🥉</th>
            <th class="text-center">Σ</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(player, index) in sortedMedalPlayers('team')" :key="player.lichess_id">
            <tr>
              <td class="text-center">{{ index + 1 }}</td>
              <td class="text-left" v-html="renderPlayerCell(player)"></td>
              <td
                class="text-center club-page__medal-cell--expandable"
                :class="{ expanded: expandedMedalInfoKey === `${player.lichess_id}::team::gold` }"
                @click="toggleMedalDetails(`${player.lichess_id}::team::gold`)"
              >
                <span>{{ player.medals_in_team.gold?.count || '0' }}</span>
                <span v-if="player.medals_in_team.gold?.count > 0" class="expand-arrow">▼</span>
              </td>
              <td
                class="text-center club-page__medal-cell--expandable"
                :class="{ expanded: expandedMedalInfoKey === `${player.lichess_id}::team::silver` }"
                @click="toggleMedalDetails(`${player.lichess_id}::team::silver`)"
              >
                <span>{{ player.medals_in_team.silver?.count || '0' }}</span>
                <span v-if="player.medals_in_team.silver?.count > 0" class="expand-arrow">▼</span>
              </td>
              <td
                class="text-center club-page__medal-cell--expandable"
                :class="{ expanded: expandedMedalInfoKey === `${player.lichess_id}::team::bronze` }"
                @click="toggleMedalDetails(`${player.lichess_id}::team::bronze`)"
              >
                <span>{{ player.medals_in_team.bronze?.count || '0' }}</span>
                <span v-if="player.medals_in_team.bronze?.count > 0" class="expand-arrow">▼</span>
              </td>
              <td class="text-center bold">
                {{ getMedalSum(player, 'team') }}
              </td>
            </tr>
            <!-- Expanded Rows for Team Medals -->
            <tr v-if="expandedMedalInfoKey === `${player.lichess_id}::team::gold`">
              <td colspan="6" class="club-page__medal-details-row">
                <ul class="club-page__medal-tournament-list">
                  <li v-for="t in player.medals_in_team.gold.tournaments" :key="t.name">
                    <a :href="t.url" target="_blank" rel="noopener noreferrer">{{ t.name }}</a>
                    <span class="date">({{ formatDateForUser(t.date) }})</span>
                  </li>
                </ul>
              </td>
            </tr>
            <tr v-if="expandedMedalInfoKey === `${player.lichess_id}::team::silver`">
              <td colspan="6" class="club-page__medal-details-row">
                <ul class="club-page__medal-tournament-list">
                  <li v-for="t in player.medals_in_team.silver.tournaments" :key="t.name">
                    <a :href="t.url" target="_blank" rel="noopener noreferrer">{{ t.name }}</a>
                    <span class="date">({{ formatDateForUser(t.date) }})</span>
                  </li>
                </ul>
              </td>
            </tr>
            <tr v-if="expandedMedalInfoKey === `${player.lichess_id}::team::bronze`">
              <td colspan="6" class="club-page__medal-details-row">
                <ul class="club-page__medal-tournament-list">
                  <li v-for="t in player.medals_in_team.bronze.tournaments" :key="t.name">
                    <a :href="t.url" target="_blank" rel="noopener noreferrer">{{ t.name }}</a>
                    <span class="date">({{ formatDateForUser(t.date) }})</span>
                  </li>
                </ul>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Arena Medals Table -->
    <div class="club-page__table-container club-page__table-container--arena-medals">
      <h3 class="club-page__table-title">{{ t('clubPage.medalStandings.arenaTitle') }}</h3>
      <table class="club-page__table">
        <thead>
          <tr>
            <th class="text-center">#</th>
            <th class="text-left">{{ t('clubPage.table.player') }}</th>
            <th class="text-center">🥇</th>
            <th class="text-center">🥈</th>
            <th class="text-center">🥉</th>
            <th class="text-center">Σ</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(player, index) in sortedMedalPlayers('arena')" :key="player.lichess_id">
            <tr>
              <td class="text-center">{{ index + 1 }}</td>
              <td class="text-left" v-html="renderPlayerCell(player)"></td>
              <td
                class="text-center club-page__medal-cell--expandable"
                :class="{ expanded: expandedMedalInfoKey === `${player.lichess_id}::arena::gold` }"
                @click="toggleMedalDetails(`${player.lichess_id}::arena::gold`)"
              >
                <span>{{ player.medals_in_arena.gold?.count || '0' }}</span>
                <span v-if="player.medals_in_arena.gold?.count > 0" class="expand-arrow">▼</span>
              </td>
              <td
                class="text-center club-page__medal-cell--expandable"
                :class="{
                  expanded: expandedMedalInfoKey === `${player.lichess_id}::arena::silver`,
                }"
                @click="toggleMedalDetails(`${player.lichess_id}::arena::silver`)"
              >
                <span>{{ player.medals_in_arena.silver?.count || '0' }}</span>
                <span v-if="player.medals_in_arena.silver?.count > 0" class="expand-arrow">▼</span>
              </td>
              <td
                class="text-center club-page__medal-cell--expandable"
                :class="{
                  expanded: expandedMedalInfoKey === `${player.lichess_id}::arena::bronze`,
                }"
                @click="toggleMedalDetails(`${player.lichess_id}::arena::bronze`)"
              >
                <span>{{ player.medals_in_arena.bronze?.count || '0' }}</span>
                <span v-if="player.medals_in_arena.bronze?.count > 0" class="expand-arrow">▼</span>
              </td>
              <td class="text-center bold">
                {{ getMedalSum(player, 'arena') }}
              </td>
            </tr>
            <!-- Expanded Rows for Arena Medals -->
            <tr v-if="expandedMedalInfoKey === `${player.lichess_id}::arena::gold`">
              <td colspan="6" class="club-page__medal-details-row">
                <ul class="club-page__medal-tournament-list">
                  <li v-for="t in player.medals_in_arena.gold.tournaments" :key="t.name">
                    <a :href="t.url" target="_blank" rel="noopener noreferrer">{{ t.name }}</a>
                    <span class="date">({{ formatDateForUser(t.date) }})</span>
                  </li>
                </ul>
              </td>
            </tr>
            <tr v-if="expandedMedalInfoKey === `${player.lichess_id}::arena::silver`">
              <td colspan="6" class="club-page__medal-details-row">
                <ul class="club-page__medal-tournament-list">
                  <li v-for="t in player.medals_in_arena.silver.tournaments" :key="t.name">
                    <a :href="t.url" target="_blank" rel="noopener noreferrer">{{ t.name }}</a>
                    <span class="date">({{ formatDateForUser(t.date) }})</span>
                  </li>
                </ul>
              </td>
            </tr>
            <tr v-if="expandedMedalInfoKey === `${player.lichess_id}::arena::bronze`">
              <td colspan="6" class="club-page__medal-details-row">
                <ul class="club-page__medal-tournament-list">
                  <li v-for="t in player.medals_in_arena.bronze.tournaments" :key="t.name">
                    <a :href="t.url" target="_blank" rel="noopener noreferrer">{{ t.name }}</a>
                    <span class="date">({{ formatDateForUser(t.date) }})</span>
                  </li>
                </ul>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
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
}

.club-page__table-container--team-medals .club-page__table-title {
  background-color: var(--color-accent-success);
}
.club-page__table-container--arena-medals .club-page__table-title {
  background-color: var(--color-accent-secondary);
}

.club-page__table-title {
  font-size: var(--font-size-xlarge);
  color: var(--color-text-dark);
  margin: 0;
  padding: 12px 15px;
  border-bottom: 1px solid var(--color-border-hover);
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
.club-page__table .bold {
  font-weight: var(--font-weight-bold);
}
.club-page__table .text-left {
  text-align: left;
}
.club-page__table .text-center {
  text-align: center;
}

.club-page__table thead th {
  background-color: var(--color-bg-secondary);
  font-weight: var(--font-weight-bold);
}

.club-page__table > tbody > tr:nth-child(odd) {
  background-color: var(--color-bg-tertiary);
}
.club-page__table > tbody > tr:nth-child(even) {
  background-color: var(--color-bg-secondary);
}

.club-page__table tbody tr:hover {
  background-color: var(--color-border-hover);
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

.club-page__medal-cell--expandable {
  cursor: pointer;
  user-select: none;
}
.club-page__medal-cell--expandable .expand-arrow {
  display: inline-block;
  transition: transform 0.2s ease;
  font-size: 0.7em;
  margin-left: 4px;
}
.club-page__medal-cell--expandable.expanded .expand-arrow {
  transform: rotate(180deg);
}

.club-page__medal-details-row td {
  padding: 0;
  border-bottom: 1px solid var(--color-border-hover);
  background-color: var(--color-bg-primary);
}

.club-page__medal-tournament-list {
  list-style: none;
  padding: 10px 20px;
  margin: 0;
}
.club-page__medal-tournament-list li {
  padding: 4px 0;
  font-size: var(--font-size-xsmall);
}
.club-page__medal-tournament-list .date {
  color: var(--color-text-muted);
  margin-left: 8px;
}

@media (orientation: portrait) {
  .club-page__table-title {
    font-size: var(--font-size-base);
  }
  .club-page__table {
    font-size: var(--font-size-xsmall);
  }
  .club-page__table th,
  .club-page__table td {
    padding: 5px;
  }
}
</style>
