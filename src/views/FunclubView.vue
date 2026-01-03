<!-- src/views/FunclubView.vue -->
<script setup lang="ts">
import { onMounted, ref, computed, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useFunclubStore } from '../stores/funclub.store'
import { ChevronBack, ChevronForward } from '@vicons/ionicons5'

// Импорт компонентов
import ClubTrophies from '../components/clubPage/ClubTrophies.vue'
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

const {
  isLoading,
  error,
  clubMeta,
  teamBattleReport,
  periodOptions,
  selectedPeriodIndex,
} = storeToRefs(funclubStore)

const activeTab = ref<ClubPageTabId>('overview')
const scrollPosition = ref(0)

const currentPeriodLabel = computed(() => {
  return periodOptions.value[selectedPeriodIndex.value]?.label || '...'
})

// Сохранение скролла при загрузке новых данных
watch(isLoading, (loading) => {
  if (!loading) {
    nextTick(() => {
      window.scrollTo(0, scrollPosition.value)
    })
  }
})

function handleSelectNext() {
  scrollPosition.value = window.scrollY
  funclubStore.selectNextPeriod()
}

function handleSelectPrevious() {
  scrollPosition.value = window.scrollY
  funclubStore.selectPreviousPeriod()
}

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

onMounted(() => {
  funclubStore.initializePage()
})
</script>

<template>
  <div class="club-page">
    <n-alert v-if="error" type="error" title="Ошибка" closable class="club-page__error">
      {{ error }}
    </n-alert>

    <div v-if="isLoading && !teamBattleReport" class="loading-container">
      <n-spin size="large" />
    </div>

    <div v-else-if="clubMeta && teamBattleReport">
      <ClubTrophies :players="teamBattleReport.players_summary" sort-key="vector" />

      <div class="period-switcher">
        <n-button circle @click="handleSelectPrevious" :disabled="isLoading">
          <template #icon>
            <n-icon><ChevronBack /></n-icon>
          </template>
        </n-button>
        <n-h3 class="period-label">{{ currentPeriodLabel }}</n-h3>
        <n-button circle @click="handleSelectNext" :disabled="isLoading">
          <template #icon>
            <n-icon><ChevronForward /></n-icon>
          </template>
        </n-button>
      </div>

      <n-tabs v-model:value="activeTab" type="segment" animated class="club-tabs">
        <n-tab-pane name="overview" :tab="t('clubPage.tabs.overview')">
          <div class="tab-content">
            <ClubStatsTable :title="t('clubPage.overview.title')" :players="teamBattleReport.players_summary"
              :columns="overviewColumns" sort-key="vector" title-color-class="title-color-secondary"
              info-topic="overview" />
          </div>
        </n-tab-pane>

        <n-tab-pane name="key_indicators" :tab="t('clubPage.tabs.keyIndicators')">
          <div class="tab-content">
            <n-grid x-gap="20" y-gap="20" cols="1 m:3" responsive="screen">
              <n-grid-item>
                <ClubStatsTable :title="t('clubPage.mostValuablePlayersTitle')"
                  :players="teamBattleReport.players_summary" :columns="mvpColumns" sort-key="total_score"
                  title-color-class="title-color-primary" info-topic="mostValuablePlayers" />
              </n-grid-item>
              <n-grid-item>
                <ClubStatsTable :title="t('clubPage.mostActivePlayersTitle')"
                  :players="teamBattleReport.players_summary" :columns="activeColumns" sort-key="tournaments_played"
                  title-color-class="title-color-violet" info-topic="mostActivePlayers" />
              </n-grid-item>
              <n-grid-item>
                <ClubStatsTable :title="t('clubPage.mostGamesPlayedTitle')"
                  :players="teamBattleReport.players_summary" :columns="gamesColumns" sort-key="total_games_played"
                  title-color-class="title-color-primary" info-topic="mostGamesPlayed" />
              </n-grid-item>
            </n-grid>
          </div>
        </n-tab-pane>

        <n-tab-pane name="play_style" :tab="t('clubPage.tabs.playStyle')">
          <div class="tab-content">
            <n-grid x-gap="20" y-gap="20" cols="1 m:2" responsive="screen">
              <n-grid-item>
                <ClubStatsTable :title="t('clubPage.berserkKingsTitle')" :players="teamBattleReport.players_summary"
                  :columns="berserkersColumns" sort-key="total_berserk_wins" title-color-class="title-color-primary"
                  info-topic="berserkKings" />
              </n-grid-item>
              <n-grid-item>
                <ClubStatsTable :title="t('clubPage.winStreakMastersTitle')"
                  :players="teamBattleReport.players_summary" :columns="winStreaksColumns"
                  sort-key="max_longest_win_streak_ever" title-color-class="title-color-primary"
                  info-topic="winStreakMasters" />
              </n-grid-item>
            </n-grid>
          </div>
        </n-tab-pane>

        <n-tab-pane name="medals" :tab="t('clubPage.tabs.medals')">
          <div class="tab-content">
            <MedalStandingsTable :report="teamBattleReport.medals_report" />
          </div>
        </n-tab-pane>
      </n-tabs>

      <div class="history-section">
        <TournamentHistoryTable :tournaments="teamBattleReport.played_arenas" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.club-page {
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.period-switcher {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background-color: var(--color-bg-secondary);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.period-label {
  margin: 0;
  min-width: 200px;
  text-align: center;
  font-family: var(--font-family-primary);
}

.club-tabs {
  margin-top: 10px;
}

.tab-content {
  padding-top: 20px;
}

.history-section {
  margin-top: 20px;
}

:deep(.n-tabs-tab-wrapper) {
  font-family: var(--font-family-primary);
  font-size: var(--font-size-large);
}

@media (max-width: 768px) {
  .club-page {
    padding: 12px;
  }

  .period-label {
    font-size: var(--font-size-base);
    min-width: 140px;
  }
}
</style>