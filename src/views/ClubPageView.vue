<!-- src/views/ClubPageView.vue -->
<script setup lang="ts">
import { onMounted, watch, ref } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useClubePageStore } from '../stores/clubePage.store'

// Импорт новых компонентов
import ClubPageHeader from '../components/clubPage/ClubPageHeader.vue'
import ClubPageTabs from '../components/clubPage/ClubPageTabs.vue'
import ClubStatsTable from '../components/clubPage/ClubStatsTable.vue'
import TournamentHistoryTable from '../components/clubPage/TournamentHistoryTable.vue'
import MedalStandingsTable from '../components/clubPage/MedalStandingsTable.vue'
import type { PlayerData } from '../types/api.types'

// Определяем тип для вкладок
export type ClubPageTabId = 'overview' | 'key_indicators' | 'play_style' | 'ratings' | 'medals'

// --- <<< НАЧАЛО ИЗМЕНЕНИЙ: Создаем строгий тип для колонок таблицы >>> ---
type ClubStatsTableColumn = {
  key: keyof PlayerData
  label: string
  class?: string
}
// --- <<< КОНЕЦ ИЗМЕНЕНИЙ >>> ---

const clubePageStore = useClubePageStore()
const route = useRoute()
const { t } = useI18n()

const { isLoading, error, clubData } = storeToRefs(clubePageStore)

// Локальное состояние для управления активной вкладкой
const activeTab = ref<ClubPageTabId>('overview')

// --- Определения колонок для универсального компонента ClubStatsTable ---
// --- <<< НАЧАЛО ИЗМЕНЕНИЙ: Применяем новый тип ко всем определениям колонок >>> ---
const overviewColumns: ClubStatsTableColumn[] = [
  { key: 'username', label: t('clubPage.table.player'), class: 'text-left' },
  { key: 'vector', label: 'VECTOR', class: 'text-right bold' },
  { key: 'total_score', label: t('clubPage.table.totalScore'), class: 'text-right' },
  { key: 'tournaments_played', label: t('clubPage.table.tournaments'), class: 'text-right' },
  { key: 'total_games_played', label: t('clubPage.table.gamesPlayed'), class: 'text-right' },
  { key: 'performance_stats', label: t('clubPage.table.avgPerf'), class: 'text-right' },
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
const performanceColumns: ClubStatsTableColumn[] = [
  { key: 'username', label: t('clubPage.table.player'), class: 'text-left' },
  { key: 'performance_stats', label: t('clubPage.table.avgPerf'), class: 'text-right' },
]
const ratingColumns: ClubStatsTableColumn[] = [
  { key: 'username', label: t('clubPage.table.player'), class: 'text-left' },
  { key: 'rating_stats', label: t('clubPage.table.avgRating'), class: 'text-right' },
]
// --- <<< КОНЕЦ ИЗМЕНЕНИЙ >>> ---

// Хук для инициализации загрузки данных при монтировании компонента
onMounted(() => {
  const clubId = route.params.clubId as string
  if (clubId) {
    clubePageStore.initializePage(clubId)
  }
})

// Следим за изменением ID клуба в URL для перезагрузки данных
watch(
  () => route.params.clubId,
  (newClubId) => {
    if (typeof newClubId === 'string' && newClubId) {
      clubePageStore.initializePage(newClubId)
    }
  },
)
</script>

<template>
  <div class="club-page">
    <div v-if="isLoading" class="loading-message">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="error" class="club-page__error-message">
      {{ t('common.error') }}: {{ error }}
    </div>
    <div v-else-if="clubData">
      <!-- Компонент заголовка -->
      <ClubPageHeader :club-info="clubData.club_info" />

      <!-- Компонент вкладок -->
      <ClubPageTabs :active-tab="activeTab" @set-active-tab="(tab) => (activeTab = tab)" />

      <!-- Содержимое вкладок -->
      <div class="club-page__tab-content">
        <div v-if="activeTab === 'overview'">
          <ClubStatsTable
            :title="t('clubPage.overview.title')"
            :players="clubData.players_data"
            :columns="overviewColumns"
            sort-key="vector"
            title-color-class="title-color-secondary"
          />
        </div>
        <div v-if="activeTab === 'key_indicators'" class="club-page__stats-grid-3-cols">
          <ClubStatsTable
            :title="t('clubPage.mostValuablePlayersTitle')"
            :players="clubData.players_data"
            :columns="mvpColumns"
            sort-key="total_score"
            title-color-class="title-color-primary"
          />
          <ClubStatsTable
            :title="t('clubPage.mostActivePlayersTitle')"
            :players="clubData.players_data"
            :columns="activeColumns"
            sort-key="tournaments_played"
            title-color-class="title-color-violet"
          />
          <ClubStatsTable
            :title="t('clubPage.mostGamesPlayedTitle')"
            :players="clubData.players_data"
            :columns="gamesColumns"
            sort-key="total_games_played"
            title-color-class="title-color-primary"
          />
        </div>
        <div v-if="activeTab === 'play_style'" class="club-page__stats-grid-2-cols">
          <ClubStatsTable
            :title="t('clubPage.berserkKingsTitle')"
            :players="clubData.players_data"
            :columns="berserkersColumns"
            sort-key="total_berserk_wins"
            title-color-class="title-color-primary"
          />
          <ClubStatsTable
            :title="t('clubPage.winStreakMastersTitle')"
            :players="clubData.players_data"
            :columns="winStreaksColumns"
            sort-key="max_longest_win_streak_ever"
            title-color-class="title-color-primary"
          />
        </div>
        <div v-if="activeTab === 'ratings'" class="club-page__stats-grid-2-cols">
          <ClubStatsTable
            :title="t('clubPage.performanceLeadersTitle')"
            :players="clubData.players_data"
            :columns="performanceColumns"
            sort-key="performance_stats"
            title-color-class="title-color-secondary"
          />
          <ClubStatsTable
            :title="t('clubPage.ratingLeadersTitle')"
            :players="clubData.players_data"
            :columns="ratingColumns"
            sort-key="rating_stats"
            title-color-class="title-color-secondary"
          />
        </div>
        <div v-if="activeTab === 'medals'">
          <MedalStandingsTable :players="clubData.players_data" />
        </div>
      </div>

      <!-- Компонент истории турниров (отображается всегда) -->
      <TournamentHistoryTable :tournaments="clubData.tournament_history" />
    </div>
    <div v-else-if="!isLoading && !error" class="club-page__no-data-message">
      {{ t('clubPage.error.noDataFound', { clubId: route.params.clubId }) }}
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
.club-page__error-message,
.club-page__no-data-message {
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
}

.club-page__stats-grid-2-cols,
.club-page__stats-grid-3-cols {
  display: flex;
  flex-direction: column;
  gap: 25px;
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
}
</style>
