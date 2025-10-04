// src/components/clubPage/PlayerStatsDetail.vue
<script setup lang="ts">
import { type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TeamBattlePlayerSummary } from '../../types/api.types'

const { t } = useI18n()

defineProps({
  player: {
    type: Object as PropType<TeamBattlePlayerSummary>,
    required: true,
  },
})

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <div class="player-detail">
    <!-- Секция медалей -->
    <div class="detail-section medals-section">
      <h4 class="section-title">{{ t('clubPage.details.teamMedals') }}</h4>
      <div class="medals-display">
        <div v-if="player.medals_in_team.gold.count > 0" class="medal-row">
          <template v-for="i in player.medals_in_team.gold.count" :key="`g${i}`">🥇</template>
        </div>
        <div v-if="player.medals_in_team.silver.count > 0" class="medal-row">
          <template v-for="i in player.medals_in_team.silver.count" :key="`s${i}`">🥈</template>
        </div>
        <div v-if="player.medals_in_team.bronze.count > 0" class="medal-row">
          <template v-for="i in player.medals_in_team.bronze.count" :key="`b${i}`">🥉</template>
        </div>
        <div v-if="
          player.medals_in_team.gold.count === 0 &&
          player.medals_in_team.silver.count === 0 &&
          player.medals_in_team.bronze.count === 0
        " class="no-medals">
          {{ t('common.notAvailable') }}
        </div>
      </div>
    </div>

    <!-- Секция ключевых показателей -->
    <div class="detail-section stats-section">
      <h4 class="section-title">{{ t('clubPage.details.keyMetrics') }}</h4>
      <ul>
        <li>
          <strong>VECTOR:</strong> <span>{{ player.vector }}</span>
        </li>
        <li>
          <strong>{{ t('clubPage.table.totalScore') }}:</strong>
          <span>{{ player.total_score }}</span>
        </li>
        <li>
          <strong>{{ t('clubPage.table.gamesPlayed') }}:</strong>
          <span>{{ player.total_games_played }}</span>
        </li>
        <li>
          <strong>{{ t('clubPage.details.winRate') }}:</strong>
          <span>{{ player.win_rate.toFixed(2) }}%</span>
        </li>
        <li>
          <strong>🚀 {{ t('clubPage.table.berserkWins') }}:</strong>
          <span>{{ player.total_berserk_wins }}</span>
        </li>
        <li>
          <strong>🔥 {{ t('clubPage.table.maxWinStreak') }}:</strong>
          <span>{{ player.max_longest_win_streak_ever }}</span>
        </li>
      </ul>
    </div>

    <!-- Секция турниров -->
    <div class="detail-section performance-section">
      <h4 class="section-title">{{ t('clubPage.details.tournamentsPlayed') }}</h4>
      <ul v-if="player.arenas_report && player.arenas_report.length > 0" class="tournaments-list">
        <li v-for="tourn in player.arenas_report" :key="tourn.tournament_url">
          <a :href="tourn.tournament_url" target="_blank">{{ tourn.tournament_name }}</a>
          <span>{{ formatDate(tourn.startsAt) }}</span>
        </li>
      </ul>
      <div v-else class="no-medals">{{ t('common.notAvailable') }}</div>
    </div>
  </div>
</template>

<style scoped>
.player-detail {
  display: grid;
  gap: 15px;
  padding: 15px;
  background-color: var(--color-bg-secondary);
}

.detail-section {
  background-color: var(--color-bg-tertiary);
  border-radius: var(--panel-border-radius);
  padding: 15px;
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.medals-section {
  grid-area: medals;
}

.stats-section {
  grid-area: stats;
}

.performance-section {
  grid-area: tournaments;
}

.section-title {
  margin: 0 0 15px 0;
  font-size: var(--font-size-large);
  color: var(--color-text-default);
  border-bottom: 1px solid var(--color-border-hover);
  padding-bottom: 10px;
  text-align: center;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

li {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-base);
}

.medals-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: var(--font-size-xlarge);
  align-items: center;
  justify-content: center;
  flex-grow: 1;
}

.medal-row {
  word-break: break-all;
  text-align: center;
}

.no-medals {
  color: var(--color-text-muted);
  font-size: var(--font-size-base);
  text-align: center;
  align-self: center;
  margin: auto 0;
}

.tournaments-list {
  max-height: 180px;
  overflow-y: auto;
  padding-right: 10px;
}

.tournaments-list li a {
  white-space: normal;
  text-overflow: ellipsis;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  max-width: 70%;
}

.tournaments-list li span {
  white-space: nowrap;
}

/* Landscape layout */
@media (min-width: 769px) {
  .player-detail {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      'medals stats'
      'tournaments tournaments';
  }
}

/* Portrait layout */
@media (max-width: 768px) {
  .player-detail {
    grid-template-columns: 1fr;
    grid-template-areas:
      'medals'
      'stats'
      'tournaments';
    gap: 10px;
    padding: 10px;
  }

  .detail-section {
    padding: 13px;
  }

  .section-title {
    font-size: var(--font-size-base);
    margin: 0 0 10px 0;
    padding-bottom: 8px;
  }

  ul {
    gap: 8px;
  }

  li {
    font-size: var(--font-size-small);
  }

  .medals-display {
    font-size: var(--font-size-large);
  }
}
</style>
