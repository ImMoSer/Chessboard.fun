<!-- src/components/clubPage/LatestBattleReport.vue -->
<script setup lang="ts">
import { type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LatestTeamBattleReport } from '../../types/api.types'

const { t } = useI18n()

defineProps({
  report: {
    type: Object as PropType<LatestTeamBattleReport>,
    required: true,
  },
})

// Хелпер для форматирования числовых значений с разделителями
const formatNumber = (num: number) => new Intl.NumberFormat('ru-RU').format(num)
</script>

<template>
  <div class="battle-report-container" id="battle-report-capture-node">
    <!-- Заголовок турнира -->
    <header class="report-header">
      <h1 class="tournament-name">🏆 {{ report.tournament_info.name }} 🏆</h1>
      <a
        :href="report.tournament_info.url"
        target="_blank"
        rel="noopener noreferrer"
        class="tournament-link"
      >
        {{ t('latestBattle.linkToTournament') }}
      </a>
    </header>

    <!-- Секция статистики команды -->
    <section class="report-section team-stats-section">
      <h2 class="section-title">📊 {{ t('latestBattle.teamStatsTitle') }} 📊</h2>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">🏆 {{ t('latestBattle.rankInTournament') }}:</span>
          <span class="stat-value">{{ report.team_stats.rank_in_tournament }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">👥 {{ t('latestBattle.playersCount') }}:</span>
          <span class="stat-value">{{ report.team_stats.players_count }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">🎲 {{ t('latestBattle.totalGames') }}:</span>
          <span class="stat-value">{{ report.team_stats.total_games }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">📈 {{ t('latestBattle.totalScore') }}:</span>
          <span class="stat-value">{{ report.team_stats.total_score }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">🎯 {{ t('latestBattle.winRatePercent') }}:</span>
          <span class="stat-value">{{ report.team_stats.win_rate_percent.toFixed(1) }}%</span>
        </div>
      </div>
    </section>

    <!-- Таблица игроков -->
    <section class="report-section players-table-section">
      <table class="players-table">
        <thead>
          <tr>
            <th>{{ t('latestBattle.table.rank') }}</th>
            <th>{{ t('latestBattle.table.player') }}</th>
            <th>{{ t('latestBattle.table.score') }}</th>
            <th>{{ t('latestBattle.table.games') }}</th>
            <th>{{ t('latestBattle.table.performance') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="player in report.players_table" :key="player.rank">
            <td class="rank">{{ player.rank }}</td>
            <td class="player-name">{{ player.username }}</td>
            <td class="score">{{ player.score }}</td>
            <td class="games">{{ player.games }}</td>
            <td class="performance">{{ formatNumber(player.performance) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Секция медалей и номинаций -->
    <div class="awards-grid">
      <!-- Медали -->
      <section class="report-section medals-section">
        <h2 class="section-title">🔥🔥🔥 {{ t('latestBattle.medalsTitle') }} 🔥🔥🔥</h2>
        <ul class="awards-list">
          <li>
            🥇 {{ t('latestBattle.goldMedal') }}: <span>{{ report.medals.gold }}</span>
          </li>
          <li>
            🥈 {{ t('latestBattle.silverMedal') }}: <span>{{ report.medals.silver }}</span>
          </li>
          <li>
            🥉 {{ t('latestBattle.bronzeMedal') }}: <span>{{ report.medals.bronze }}</span>
          </li>
        </ul>
      </section>

      <!-- Номинации -->
      <section class="report-section nominations-section">
        <h2 class="section-title">🔥🔥🔥 {{ t('latestBattle.nominationsTitle') }} 🔥🔥🔥</h2>
        <ul class="awards-list">
          <li>
            ⚡️ {{ t('latestBattle.berserker') }}:
            <span
              >{{ report.nominations.berserker.username }} ({{ report.nominations.berserker.value }}
              {{ t('latestBattle.winsUnit') }})</span
            >
          </li>
          <li>
            💪 {{ t('latestBattle.workhorse') }}:
            <span
              >{{ report.nominations.workhorse.username }} ({{ report.nominations.workhorse.value }}
              {{ t('latestBattle.gamesUnit') }})</span
            >
          </li>
          <li>
            🔥 {{ t('latestBattle.winStreaker') }}:
            <span
              >{{ report.nominations.win_streaker.username }} ({{ t('latestBattle.streakUnit') }}
              {{ report.nominations.win_streaker.value }})</span
            >
          </li>
          <li>
            👌 {{ t('latestBattle.performer') }}:
            <span
              >{{ report.nominations.performer.username }} ({{ t('latestBattle.perfUnit') }}
              {{ formatNumber(report.nominations.performer.value) }})</span
            >
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.battle-report-container {
  background-color: var(--color-bg-primary);
  color: var(--color-text-default);
  font-family: var(--font-family-primary);
  padding: 25px;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  width: 800px;
  margin: 20px auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.report-header {
  text-align: center;
  margin-bottom: 20px;
  border-bottom: 2px dashed var(--color-border);
  padding-bottom: 15px;
}

.tournament-name {
  font-size: 1.8em;
  color: var(--color-accent-warning);
  margin: 0 0 10px 0;
}

.tournament-link {
  color: var(--color-text-link);
  text-decoration: none;
}

.tournament-link:hover {
  text-decoration: underline;
}

.report-section {
  margin-bottom: 25px;
  padding: 15px;
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
}

.section-title {
  font-size: 1.4em;
  color: var(--color-accent-warning);
  text-align: center;
  margin: 0 0 15px 0;
  border-bottom: 1px solid var(--color-border-hover);
  padding-bottom: 10px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
}

.stat-label {
  color: var(--color-text-muted);
}

.stat-value {
  color: var(--color-text-default);
  font-weight: bold;
}

.players-table-section {
  padding: 0;
}

.players-table {
  width: 100%;
  border-collapse: collapse;
}

.players-table th,
.players-table td {
  padding: 8px 12px;
  text-align: left;
  border: 1px solid var(--color-border);
}

.players-table thead {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-default);
}

.players-table tbody tr:nth-child(even) {
  background-color: var(--color-bg-tertiary);
}

.players-table .rank,
.players-table .score,
.players-table .games {
  text-align: right;
}

.players-table .performance {
  text-align: right;
  color: var(--color-accent-success);
}

.players-table .player-name {
  font-weight: bold;
}

.awards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.awards-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.awards-list li {
  margin-bottom: 8px;
  line-height: 1.5;
}

.awards-list li span {
  font-weight: bold;
  color: var(--color-text-default);
}
</style>
