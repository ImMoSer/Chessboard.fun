<!-- src/components/lichessClubs/ClubsListTable.vue -->
<script setup lang="ts">
import { ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import type { ListedClub } from '../../types/api.types'
import ClubWidgets from './ClubWidgets.vue'

const { t } = useI18n()

// --- PROPS ---
defineProps({
  clubsData: {
    type: Array as PropType<ListedClub[]>,
    required: true,
  },
})

// --- LOCAL STATE ---
const expandedClubId = ref<string | null>(null)

// --- METHODS ---
const toggleClubDetails = (clubId: string) => {
  expandedClubId.value = expandedClubId.value === clubId ? null : clubId
}

const getFlairIconUrl = (flair?: string | null) => {
  if (!flair) return null
  return `https://lichess1.org/assets/flair/img/${flair}.webp`
}

const tableHeaders = [
  { key: 'club_name', labelKey: 'lichessClubs.table.clubName', class: 'text-left' },
  {
    key: 'active_players_count',
    labelKey: 'lichessClubs.table.activePlayers',
    class: 'text-right',
  },
  {
    key: 'tournaments_played',
    labelKey: 'lichessClubs.table.tournamentsPlayed',
    class: 'text-right',
  },
  { key: 'total_score', labelKey: 'lichessClubs.table.totalScore', class: 'text-right' },
  { key: 'average_score', labelKey: 'lichessClubs.table.averageScore', class: 'text-right' },
  { key: 'gold_medals', label: '🥇', class: 'text-center' },
  { key: 'silver_medals', label: '🥈', class: 'text-center' },
  { key: 'bronze_medals', label: '🥉', class: 'text-center' },
]
</script>

<template>
  <div class="lichess-clubs-page__table-container">
    <table class="lichess-clubs-page__table">
      <thead>
        <tr>
          <th v-for="header in tableHeaders" :key="header.key" :class="header.class">
            {{ header.labelKey ? t(header.labelKey) : header.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="club in clubsData" :key="club.club_id">
          <tr
            class="club-row expandable"
            :class="{ expanded: expandedClubId === club.club_id }"
            @click="toggleClubDetails(club.club_id)"
          >
            <td class="text-left">
              <!-- --- НАЧАЛО ИЗМЕНЕНИЙ --- -->
              <router-link
                v-if="club.is_active"
                :to="`/clubs/${club.club_id}`"
                class="club-link"
                @click.stop
              >
                <img
                  v-if="getFlairIconUrl(club.club_flair)"
                  :src="getFlairIconUrl(club.club_flair)!"
                  alt="Flair"
                  :title="club.club_flair || ''"
                  class="club-flair-icon"
                />
                <span class="club-name-text">{{ club.club_name }}</span>
              </router-link>
              <div v-else class="club-link inactive">
                <img
                  v-if="getFlairIconUrl(club.club_flair)"
                  :src="getFlairIconUrl(club.club_flair)!"
                  alt="Flair"
                  :title="club.club_flair || ''"
                  class="club-flair-icon"
                />
                <span class="club-name-text">{{ club.club_name }}</span>
              </div>
              <!-- --- КОНЕЦ ИЗМЕНЕНИЙ --- -->
            </td>
            <td class="text-right">{{ club.active_players_count }}</td>
            <td class="text-right">{{ club.tournaments_played }}</td>
            <td class="text-right">{{ club.total_score }}</td>
            <td class="text-right">{{ Math.round(club.average_score) }}</td>
            <td class="text-center">{{ club.gold_medals }}</td>
            <td class="text-center">{{ club.silver_medals }}</td>
            <td class="text-center">{{ club.bronze_medals }}</td>
          </tr>
          <tr
            v-if="expandedClubId === club.club_id"
            :key="`details-${club.club_id}`"
            class="club-details-row"
          >
            <td :colspan="tableHeaders.length">
              <ClubWidgets :stats-payload="club.statistics_payload" />
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.lichess-clubs-page__table-container {
  padding: 0;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.lichess-clubs-page__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-base);
}

.lichess-clubs-page__table th,
.lichess-clubs-page__table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-default);
  white-space: nowrap;
}

.lichess-clubs-page__table .text-left {
  text-align: left;
}
.lichess-clubs-page__table .text-center {
  text-align: center;
}
.lichess-clubs-page__table .text-right {
  text-align: right;
}

.lichess-clubs-page__table thead th {
  background-color: var(--color-bg-secondary);
  font-weight: var(--font-weight-bold);
}

.lichess-clubs-page__table tbody tr:nth-child(odd) {
  background-color: var(--color-bg-tertiary);
}
.lichess-clubs-page__table tbody tr:nth-child(even) {
  background-color: var(--color-bg-secondary);
}

.club-row.expandable {
  cursor: pointer;
}
.club-row.expandable:hover {
  background-color: var(--color-border-hover);
}
.club-row.expandable.expanded {
  background-color: var(--color-accent-primary) !important;
}
.club-row.expandable.expanded td,
.club-row.expandable.expanded .club-name-text {
  color: var(--color-text-dark);
  font-weight: bold;
}

.club-details-row td {
  padding: 0;
  border-bottom: 2px solid var(--color-accent-primary);
}

/* --- НАЧАЛО ИЗМЕНЕНИЙ --- */
.club-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  color: var(--color-text-link);
}

.club-link:hover .club-name-text {
  text-decoration: underline;
}

.club-link.inactive {
  color: var(--color-text-default);
  cursor: default;
}

.club-link.inactive:hover .club-name-text {
  text-decoration: none;
}
/* --- КОНЕЦ ИЗМЕНЕНИЙ --- */

.club-flair-icon {
  width: 25px;
  height: auto;
  vertical-align: -0.3em;
  margin-right: 10px;
}

@media (orientation: portrait) {
  .lichess-clubs-page__table {
    font-size: var(--font-size-xsmall);
    white-space: normal;
  }
  .lichess-clubs-page__table th,
  .lichess-clubs-page__table td {
    padding: 8px 6px;
    white-space: normal;
  }
}
</style>
