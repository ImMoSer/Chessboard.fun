<!-- src/components/lichessClubs/ClubWidgets.vue -->
<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'

// Определяем тип для props, чтобы TypeScript знал, какую структуру данных ожидать
interface StatsPayload {
  club_medals: {
    gold: any[]
    silver: any[]
    bronze: any[]
  }
  top_players_by_score: any[]
  top_players_by_medals: any[]
  top_players_by_activity: any[]
}

const { t } = useI18n()

// --- PROPS ---
const props = defineProps({
  statsPayload: {
    type: Object as PropType<StatsPayload>,
    required: true,
  },
})

// --- COMPUTED ---
const hasAnyMedals = computed(() => {
  const medals = props.statsPayload.club_medals
  return (
    (medals.gold?.length || 0) > 0 ||
    (medals.silver?.length || 0) > 0 ||
    (medals.bronze?.length || 0) > 0
  )
})
</script>

<template>
  <div class="club-details-content">
    <!-- Hall of Fame -->
    <div class="widget-container hall-of-fame-widget">
      <h4 class="widget-title">
        {{ t('lichessClubs.widgets.hallOfFameTitle') }}
      </h4>
      <table class="widget-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{{ t('clubPage.table.player') }}</th>
            <th>{{ t('clubPage.table.totalScore') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(player, index) in statsPayload.top_players_by_score" :key="player.lichess_id">
            <td>{{ index + 1 }}</td>
            <td>
              <a :href="`https://lichess.org/@/${player.lichess_id}`" target="_blank">{{
                player.username
              }}</a>
            </td>
            <td>{{ player.total_score }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- Medal Bearers -->
    <div class="widget-container medal-bearers-widget">
      <h4 class="widget-title">
        {{ t('lichessClubs.widgets.medalBearersTitle') }}
      </h4>
      <table class="widget-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{{ t('clubPage.table.player') }}</th>
            <th>{{ t('clubPage.table.medals') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(player, index) in statsPayload.top_players_by_medals"
            :key="player.lichess_id"
          >
            <td>{{ index + 1 }}</td>
            <td>
              <a :href="`https://lichess.org/@/${player.lichess_id}`" target="_blank">{{
                player.username
              }}</a>
            </td>
            <td>
              <!-- --- <<< НАЧАЛО ИЗМЕНЕНИЙ: Условное отображение медалей >>> --- -->
              <span v-if="player.medals.gold > 0">🥇{{ player.medals.gold }} </span>
              <span v-if="player.medals.silver > 0">🥈{{ player.medals.silver }} </span>
              <span v-if="player.medals.bronze > 0">🥉{{ player.medals.bronze }}</span>
              <!-- --- <<< КОНЕЦ ИЗМЕНЕНИЙ >>> --- -->
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- Hard Workers -->
    <div class="widget-container hard-workers-widget">
      <h4 class="widget-title">
        {{ t('lichessClubs.widgets.hardWorkersTitle') }}
      </h4>
      <table class="widget-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{{ t('clubPage.table.player') }}</th>
            <th>{{ t('clubPage.table.tournaments') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(player, index) in statsPayload.top_players_by_activity"
            :key="player.lichess_id"
          >
            <td>{{ index + 1 }}</td>
            <td>
              <a :href="`https://lichess.org/@/${player.lichess_id}`" target="_blank">{{
                player.username
              }}</a>
            </td>
            <td>{{ player.tournaments_played }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- Medal Tournaments -->
    <div v-if="hasAnyMedals" class="medal-tournaments-wrapper">
      <div v-if="statsPayload.club_medals.gold?.length" class="widget-container medal-widget gold">
        <h4 class="widget-title">🥇 {{ t('lichessClubs.medals.gold') }}</h4>
        <ul class="tournament-list">
          <li v-for="tournament in statsPayload.club_medals.gold" :key="tournament.arena_id">
            <a :href="tournament.tournament_url" target="_blank" rel="noopener noreferrer">
              {{ tournament.tournament_name }}
            </a>
          </li>
        </ul>
      </div>
      <div
        v-if="statsPayload.club_medals.silver?.length"
        class="widget-container medal-widget silver"
      >
        <h4 class="widget-title">🥈 {{ t('lichessClubs.medals.silver') }}</h4>
        <ul class="tournament-list">
          <li v-for="tournament in statsPayload.club_medals.silver" :key="tournament.arena_id">
            <a :href="tournament.tournament_url" target="_blank" rel="noopener noreferrer">
              {{ tournament.tournament_name }}
            </a>
          </li>
        </ul>
      </div>
      <div
        v-if="statsPayload.club_medals.bronze?.length"
        class="widget-container medal-widget bronze"
      >
        <h4 class="widget-title">🥉 {{ t('lichessClubs.medals.bronze') }}</h4>
        <ul class="tournament-list">
          <li v-for="tournament in statsPayload.club_medals.bronze" :key="tournament.arena_id">
            <a :href="tournament.tournament_url" target="_blank" rel="noopener noreferrer">
              {{ tournament.tournament_name }}
            </a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.club-details-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 10px;
  padding: 10px;
  background-color: var(--color-bg-primary);
}

.widget-container {
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--panel-border-radius);
  padding: 5px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.widget-title {
  margin: 0 0 10px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border-hover);
  font-size: var(--font-size-large);
  text-align: center;
  color: var(--color-accent-secondary);
}

.widget-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-small);
}
.widget-table th,
.widget-table td {
  padding: 5px 5px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}
.widget-table th {
  color: var(--color-text-muted);
}
.widget-table td:first-child,
.widget-table th:first-child {
  width: 1%;
  text-align: center;
}
.widget-table td:last-child,
.widget-table th:last-child {
  text-align: right;
  font-weight: bold;
}

/* --- Стилизация ссылок и зебры --- */
.widget-table tbody tr:nth-child(odd) {
  background-color: var(--color-bg-secondary);
}

.widget-table td a {
  color: var(--color-text-link);
  text-decoration: none;
  font-weight: bold;
}

.widget-table td a:hover {
  text-decoration: underline;
  color: var(--color-text-link-hover);
}

.medal-tournaments-wrapper {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.medal-widget .widget-title {
  color: var(--color-text-dark);
  font-weight: bold;
  text-align: center;
  border-bottom: 2px solid;
  margin: -5px -5px 5px -5px;
  padding: 10px 15px;
  border-top-left-radius: var(--panel-border-radius);
  border-top-right-radius: var(--panel-border-radius);
}

.medal-widget.gold .widget-title {
  background-color: var(--color-gold);
  border-color: var(--color-gold-border);
}
.medal-widget.silver .widget-title {
  background-color: var(--color-silver);
  border-color: var(--color-silver-border);
}
.medal-widget.bronze .widget-title {
  background-color: var(--color-bronze);
  border-color: var(--color-bronze-border);
}

.medal-widget .tournament-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  max-height: 200px;
  flex-grow: 1;
}

.medal-widget .tournament-list li a {
  display: block;
  padding: 6px 10px;
  background-color: var(--color-bg-secondary);
  border-radius: 4px;
  text-decoration: none;
  color: var(--color-text-link);
  transition:
    background-color 0.2s,
    color 0.2s;
  font-size: var(--font-size-xsmall);
  border: 1px solid var(--color-border);
}

.medal-widget .tournament-list li a:hover {
  background-color: var(--color-border-hover);
  color: var(--color-text-link-hover);
}

@media (max-width: 1200px) {
  .club-details-content {
    grid-template-columns: 1fr;
  }
}

@media (orientation: portrait) {
  .club-details-content {
    padding: 10px;
  }
  .widget-title {
    font-size: var(--font-size-base);
  }
  .widget-table {
    font-size: var(--font-size-xsmall);
  }
  .widget-table th,
  .widget-table td {
    padding: 4px 6px;
  }
}
</style>
