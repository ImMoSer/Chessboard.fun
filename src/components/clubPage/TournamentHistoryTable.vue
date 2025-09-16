<!-- src/components/clubPage/TournamentHistoryTable.vue -->
<script setup lang="ts">
import { ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
// --- НАЧАЛО ИЗМЕНЕНИЙ: Импортируем правильный тип ---
import type { TeamBattlePlayedArena } from '../../types/api.types'
// --- КОНЕЦ ИЗМЕНЕНИЙ ---

const { t } = useI18n()

// --- PROPS ---
defineProps({
  tournaments: {
    // --- НАЧАЛО ИЗМЕНЕНИЙ: Используем правильный тип ---
    type: Array as PropType<TeamBattlePlayedArena[]>,
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---
    required: true,
  },
})

// --- LOCAL STATE ---
const expandedBattleId = ref<string | null>(null)

// --- METHODS ---
const toggleTournamentDetails = (arenaId: string) => {
  expandedBattleId.value = expandedBattleId.value === arenaId ? null : arenaId
}

// --- НАЧАЛО ИЗМЕНЕНИЙ: Метод для вычисления общего счета команды ---
const calculateTeamScore = (tournament: TeamBattlePlayedArena) => {
  return tournament.players_in_arena
    .filter((p) => p.isScoringPlayer)
    .reduce((sum, player) => sum + (player.scores ? player.scores.length : 0), 0) // Примерный расчет, возможно, нужно будет уточнить
}
// --- КОНЕЦ ИЗМЕНЕНИЙ ---

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

const renderCrownIcon = () => {
  const crownUrl = `/flair/objects.crown.webp`
  return `<img src="${crownUrl}" alt="Crown" title="${t(
    'clubPage.table.cronePlayer',
  )}" class="crown-icon" />`
}
</script>

<template>
  <div v-if="tournaments && tournaments.length > 0"
    class="club-page__table-container club-page__table-container--history">
    <h3 class="club-page__table-title">{{ t('clubPage.tournamentHistoryTitle') }}</h3>
    <table class="club-page__table club-page__table--history">
      <thead>
        <tr>
          <th class="text-left">{{ t('clubPage.table.date') }}</th>
          <th class="text-left">{{ t('clubPage.table.tournamentName') }}</th>
          <th class="text-right">{{ t('clubPage.table.clubRank') }}</th>
          <th class="text-right">{{ t('clubPage.table.clubScore') }}</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="tournament in tournaments" :key="tournament.arena_id">
          <tr class="club-page__expandable-row" :class="{ expanded: expandedBattleId === tournament.arena_id }"
            @click="toggleTournamentDetails(tournament.arena_id)">
            <!-- --- НАЧАЛО ИЗМЕНЕНИЙ: Исправлены поля в шаблоне --- -->
            <td class="text-left">{{ formatDateForUser(tournament.startsAt) }}</td>
            <td class="text-left">
              <a :href="tournament.tournament_url" target="_blank" rel="noopener noreferrer">
                {{ tournament.tournament_name.replace(/ Team Battle$/, '') }}
              </a>
            </td>
            <td class="text-right">
              {{ tournament.club_in_arena_rank ? tournament.club_in_arena_rank : '-' }}
            </td>
            <td class="text-right">{{ calculateTeamScore(tournament) }}</td>
          </tr>
          <tr v-if="expandedBattleId === tournament.arena_id" class="club-page__details-row">
            <td colspan="4" class="club-page__sub-table-container">
              <table class="club-page__table club-page__table--sub">
                <thead>
                  <tr>
                    <th class="text-center">#</th>
                    <th class="text-left">{{ t('clubPage.table.player') }}</th>
                    <th class="text-right">{{ t('clubPage.table.score') }}</th>
                    <th class="text-center">W/D/L</th>
                    <th class="text-right">{{ t('clubPage.table.performance') }}</th>
                    <th class="text-center">🚀</th>
                    <th class="text-right">{{ t('clubPage.table.arenaRank') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="player in tournament.players_in_arena" :key="player.lichess_id">
                    <td class="text-center">{{ player.rank_in_club }}</td>
                    <td class="text-left">
                      <span v-if="player.isScoringPlayer" v-html="renderCrownIcon()"></span>
                      <a :href="`https://lichess.org/@/${player.lichess_id}`" target="_blank"
                        rel="noopener noreferrer">{{ player.username }}</a>
                      <img v-if="getFlairIconUrl(player.flair)" :src="getFlairIconUrl(player.flair)!" alt="Flair"
                        class="club-page__flair-icon" />
                    </td>
                    <td class="text-right bold">{{ player.scores.length }}</td>
                    <td class="text-center">
                      <span class="win-color">{{ player.calculatedStats.wins }}</span>
                      /
                      <span class="draw-color">{{ player.calculatedStats.draws }}</span>
                      /
                      <span class="loss-color">{{ player.calculatedStats.losses }}</span>
                    </td>
                    <td class="text-right">{{ player.performance }}</td>
                    <td class="text-center">{{ player.calculatedStats.berserkWins }}</td>
                    <td class="text-right">{{ player.rank_in_arena }}</td>
                    <!-- --- КОНЕЦ ИЗМЕНЕНИЙ --- -->
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
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

.club-page__table-container--history .club-page__table-title {
  background-color: var(--color-violett-lichess);
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

.club-page__table .text-right {
  text-align: right;
}

.club-page__table thead th {
  background-color: var(--color-bg-secondary);
  font-weight: var(--font-weight-bold);
}

.club-page__table>tbody>tr:nth-child(odd) {
  background-color: var(--color-bg-tertiary);
}

.club-page__table>tbody>tr:nth-child(even) {
  background-color: var(--color-bg-secondary);
}

.club-page__table--history tbody tr:hover {
  background-color: var(--color-border-hover);
}

.club-page__table td a {
  color: var(--color-text-link);
  text-decoration: none;
}

.club-page__table td a:hover {
  text-decoration: underline;
}

.club-page__expandable-row {
  cursor: pointer;
}

.club-page__expandable-row.expanded {
  background-color: var(--color-border-hover) !important;
}

.club-page__details-row td {
  padding: 0;
  border-bottom: 1px solid var(--color-border-hover);
}

.club-page__sub-table-container {
  padding: 15px;
  background-color: var(--color-bg-primary);
}

.club-page__table--sub {
  font-size: var(--font-size-xsmall);
}

.club-page__table--sub th,
.club-page__table--sub td {
  padding: 4px 6px;
}

.club-page__table--sub tbody tr:nth-child(odd) {
  background-color: var(--color-bg-tertiary);
}

.club-page__table--sub tbody tr:nth-child(even) {
  background-color: var(--color-bg-secondary);
}

.club-page__table--sub tbody tr:hover {
  background-color: var(--color-border-hover);
}

:deep(.club-page__flair-icon) {
  height: 15px;
  vertical-align: -0.15em;
  margin-left: 6px;
}

:deep(.crown-icon) {
  width: 20px;
  height: auto;
  vertical-align: -0.3em;
  margin-right: 10px;
}

.win-color {
  color: var(--color-accent-success);
  font-weight: bold;
}

.draw-color {
  color: var(--color-text-muted);
}

.loss-color {
  color: var(--color-accent-error);
}

@media (orientation: portrait) {
  .club-page__table-title {
    font-size: var(--font-size-base);
  }

  .club-page__table,
  .club-page__table--sub {
    font-size: var(--font-size-xsmall);
  }

  .club-page__table th,
  .club-page__table td {
    padding: 5px;
  }
}
</style>
