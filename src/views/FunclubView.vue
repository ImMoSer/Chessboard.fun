<!-- src/views/FunclubView.vue -->
<script setup lang="ts">
import { onMounted, watch, ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useFunclubStore } from '../stores/funclub.store'

// Импорт компонентов
import ClubPageHeader from '../components/clubPage/ClubPageHeader.vue'
import ClubPageTabs from '../components/clubPage/ClubPageTabs.vue'
import ClubStatsTable from '../components/clubPage/ClubStatsTable.vue'
import TournamentHistoryTable from '../components/clubPage/TournamentHistoryTable.vue'
import MedalStandingsTable from '../components/clubPage/MedalStandingsTable.vue'
import type { TeamBattlePlayerSummary } from '../types/api.types'

export type ClubPageTabId = 'overview' | 'key_indicators' | 'play_style' | 'medals'

type ClubStatsTableColumn = {
  key: keyof TeamBattlePlayerSummary
  label: string
  class?: string
}

const funclubStore = useFunclubStore()
const { t } = useI18n()

const { isLoading, error, clubMeta, teamBattleReport, selectedPeriod, periodOptions } =
  storeToRefs(funclubStore)

const activeTab = ref<ClubPageTabId>('overview')

// --- Определения колонок для компонента ClubStatsTable ---
const overviewColumns: ClubStatsTableColumn[] = [
  { key: 'username', label: t('clubPage.table.player'), class: 'text-left' },
  { key: 'vector', label: 'VECTOR', class: 'text-right bold' },
  { key: 'total_score', label: t('clubPage.table.totalScore'), class: 'text-right' },
  { key: 'tournaments_played', label: t('clubPage.table.tournaments'), class: 'text-right' },
  { key: 'total_games_played', label: t('clubPage.table.gamesPlayed'), class: 'text-right' },
]
const mvpColumns: ClubStatsTableColumn[] = [
  { key: 'username', label: t('clubPage.table.player'), class: 'text-left' },
  { key: 'total_score', label: t('clubPage.table.totalScore'), class: 'text-right' },
]
const activeColumns: ClubStatsTableColumn[] = [
  { key: 'username', label: t('clubPage.table.player'), class: 'text-left' },
  { key: 'tournaments_played', label: t('clubPage.table.tournaments'), class: 'text-right' },
]
const gamesColumns: ClubStatsTableColumn[] = [
  { key: 'username', label: t('clubPage.table.player'), class: 'text-left' },
  { key: 'total_games_played', label: t('clubPage.table.gamesPlayed'), class: 'text-right' },
]
const berserkersColumns: ClubStatsTableColumn[] = [
  { key: 'username', label: t('clubPage.table.player'), class: 'text-left' },
  {
    key: 'total_berserk_wins',
    label: `🚀 ${t('clubPage.table.berserkWins')}`,
    class: 'text-right',
  },
]
const winStreaksColumns: ClubStatsTableColumn[] = [
  { key: 'username', label: t('clubPage.table.player'), class: 'text-left' },
  {
    key: 'max_longest_win_streak_ever',
    label: t('clubPage.table.maxWinStreak'),
    class: 'text-right',
  },
]

// Хук для инициализации загрузки данных
onMounted(() => {
  funclubStore.initializePage()
})

// Обработчик смены периода
const handlePeriodChange = (event: Event) => {
  const newPeriod = (event.target as HTMLSelectElement).value
  funclubStore.changePeriod(newPeriod)
}
</script>

<template>
  <div class="club-page">
    <div v-if="isLoading && !teamBattleReport" class="loading-message">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="error" class="club-page__error-message">
      {{ t('common.error') }}: {{ error }}
    </div>
    <div v-else-if="clubMeta && teamBattleReport">
      <ClubPageHeader :club-info="clubMeta" />

      <div class="controls-container">
        <select :value="selectedPeriod" @change="handlePeriodChange" class="period-selector" :disabled="isLoading">
          <option v-for="option in periodOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>

      <ClubPageTabs :active-tab="activeTab" @set-active-tab="(tab) => (activeTab = tab)" />

      <div v-if="isLoading" class="loading-overlay">
        <span>{{ t('common.loading') }}</span>
      </div>

      <div class="club-page__tab-content">
        <div v-if="activeTab === 'overview'">
          <ClubStatsTable :title="t('clubPage.overview.title')" :players="teamBattleReport.players_summary"
            :columns="overviewColumns" sort-key="vector" title-color-class="title-color-secondary" />
        </div>
        <div v-if="activeTab === 'key_indicators'" class="club-page__stats-grid-3-cols">
          <ClubStatsTable :title="t('clubPage.mostValuablePlayersTitle')" :players="teamBattleReport.players_summary"
            :columns="mvpColumns" sort-key="total_score" title-color-class="title-color-primary" />
          <ClubStatsTable :title="t('clubPage.mostActivePlayersTitle')" :players="teamBattleReport.players_summary"
            :columns="activeColumns" sort-key="tournaments_played" title-color-class="title-color-violet" />
          <ClubStatsTable :title="t('clubPage.mostGamesPlayedTitle')" :players="teamBattleReport.players_summary"
            :columns="gamesColumns" sort-key="total_games_played" title-color-class="title-color-primary" />
        </div>
        <div v-if="activeTab === 'play_style'" class="club-page__stats-grid-2-cols">
          <ClubStatsTable :title="t('clubPage.berserkKingsTitle')" :players="teamBattleReport.players_summary"
            :columns="berserkersColumns" sort-key="total_berserk_wins" title-color-class="title-color-primary" />
          <ClubStatsTable :title="t('clubPage.winStreakMastersTitle')" :players="teamBattleReport.players_summary"
            :columns="winStreaksColumns" sort-key="max_longest_win_streak_ever"
            title-color-class="title-color-primary" />
        </div>
        <div v-if="activeTab === 'medals'">
          <MedalStandingsTable :players="teamBattleReport.players_summary" />
        </div>
      </div>

      <TournamentHistoryTable :tournaments="teamBattleReport.played_arenas" />
    </div>
  </div>
</template>

<style scoped>
.club-page {
  padding: 20px;
  box-sizing: border-box;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-default);
  display: flex;
  flex-direction: column;
  gap: 25px;
  width: 80vw;
  max-width: 1000px;
  margin: 20px auto;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
}

.loading-message,
.club-page__error-message {
  color: var(--color-text-error);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-accent-error);
  padding: 10px 15px;
  border-radius: var(--panel-border-radius);
  text-align: center;
  margin: 15px auto;
}

.club-page__tab-content {
  padding-top: 25px;
  position: relative;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(var(--color-bg-primary), 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
  font-size: var(--font-size-large);
  color: var(--color-accent-warning);
  border-radius: var(--panel-border-radius);
}

.club-page__stats-grid-2-cols,
.club-page__stats-grid-3-cols {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.controls-container {
  padding: 10px 0;
}

.period-selector {
  width: 100%;
  padding: 10px;
  font-size: var(--font-size-large);
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-default);
  border: 1px solid var(--color-border-hover);
  border-radius: var(--panel-border-radius);
  font-family: var(--font-family-primary);
}

.period-selector:disabled {
  opacity: 0.5;
}

@media (min-width: 1024px) {
  .club-page__stats-grid-2-cols {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 25px;
  }

  .club-page__stats-grid-3-cols {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 25px;
  }
}

@media (orientation: portrait) {
  .club-page {
    width: 100%;
    padding: 10px;
    margin: 0;
    gap: 10px;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }

  .club-page__stats-grid-2-cols,
  .club-page__stats-grid-3-cols {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .period-selector {
    font-size: var(--font-size-base);
  }
}
</style>
