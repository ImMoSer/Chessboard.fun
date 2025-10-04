<!-- src/views/RecordsPageView.vue -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRecordsStore } from '../stores/records.store'
import { storeToRefs } from 'pinia'
import type { SkillPeriod } from '../types/api.types'

// Импорт дочерних компонентов
import SkillLeaderboardTable from '../components/recordsPage/SkillLeaderboardTable.vue'
import SimpleLeaderboardTable from '../components/recordsPage/SimpleLeaderboardTable.vue'
import TowerLeaderboardTable from '../components/recordsPage/TowerLeaderboardTable.vue'
// --- НАЧАЛО ИЗМЕНЕНИЙ ---
import TornadoLeaderboardTable from '../components/recordsPage/TornadoLeaderboardTable.vue'
// --- КОНЕЦ ИЗМЕНЕНИЙ ---

const recordsStore = useRecordsStore()
const { t } = useI18n()

const { isLoading, isSkillLeaderboardLoading, error, leaderboards, selectedSkillPeriod } =
  storeToRefs(recordsStore)

onMounted(() => {
  recordsStore.fetchLeaderboards()
})

const handleSkillPeriodChange = (period: SkillPeriod) => {
  recordsStore.changeSkillPeriod(period)
}
</script>

<template>
  <div class="records-page">
    <img
      class="records-page__banner"
      src="/svg/ChessBoardLeader.svg"
      :alt="t('records.bannerAlt')"
    />

    <div v-if="isLoading" class="loading-message">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="error" class="records-page__error-message">
      {{ t('common.error') }}: {{ error }}
    </div>

    <div v-else-if="leaderboards" class="records-page__grid">
      <!-- Skill Streak Mega Leaderboard -->
      <SkillLeaderboardTable
        v-if="leaderboards.skillStreakMegaLeaderboard && leaderboards.skillStreakMegaLeaderboard.length > 0"
        :title="t('records.titles.skillStreakMega')"
        :entries="leaderboards.skillStreakMegaLeaderboard"
        color-class="skillStreakMega"
        :show-streak="true"
        info-topic="skillStreakMega"
      />

      <!-- Skill Streak Leaderboard -->
      <SkillLeaderboardTable
        v-if="leaderboards.skillStreakLeaderboard && leaderboards.skillStreakLeaderboard.length > 0"
        :title="t('records.titles.skillStreak')"
        :entries="leaderboards.skillStreakLeaderboard"
        color-class="skillStreak"
        :show-streak="true"
        info-topic="skillStreak"
      />

      <!-- Top Today Leaderboard -->
      <SkillLeaderboardTable
        v-if="leaderboards.topTodayLeaderboard && leaderboards.topTodayLeaderboard.length > 0"
        :title="t('records.titles.topToday')"
        :entries="leaderboards.topTodayLeaderboard"
        color-class="topToday"
        :show-timer="true"
        info-topic="topToday"
      />

      <!-- Tornado Leaderboard -->
      <TornadoLeaderboardTable
        v-if="leaderboards.tornadoLeaderboard"
        :title="t('nav.tornado')"
        :tornado-data="leaderboards.tornadoLeaderboard"
        color-class="tornadoLeaderboard"
        info-topic="tornadoLeaderboard"
      />

      <!-- Advantage Leaderboard -->
      <TornadoLeaderboardTable
        v-if="leaderboards.advantageLeaderboard"
        :title="t('nav.advantage')"
        :tornado-data="leaderboards.advantageLeaderboard"
        color-class="advantageLeaderboard"
        info-topic="advantageLeaderboard"
      />

      <!-- Tower Leaderboards -->
      <TowerLeaderboardTable
        v-if="leaderboards.towerLeaderboards"
        :title="t('records.titles.towerLeaderboard')"
        :tower-data="leaderboards.towerLeaderboards"
        color-class="towerLeaderboard"
        info-topic="towerLeaderboard"
      />

      <!-- Finish Him Leaderboard -->
      <SimpleLeaderboardTable
        v-if="leaderboards.finishHimLeaderboard && leaderboards.finishHimLeaderboard.length > 0"
        :title="t('records.titles.topFinishHim')"
        :entries="leaderboards.finishHimLeaderboard"
        mode="finish-him"
        color-class="finishHimLeaderboard"
        info-topic="topFinishHim"
      />

      <!-- Attack Leaderboard -->
      <SimpleLeaderboardTable
        v-if="leaderboards.attackLeaderboard && leaderboards.attackLeaderboard.length > 0"
        :title="t('records.titles.topAttack')"
        :entries="leaderboards.attackLeaderboard"
        mode="attack"
        color-class="attackLeaderboard"
        info-topic="topAttack"
      />

      <!-- Overall Skill Leaderboard -->
      <SkillLeaderboardTable
        v-if="leaderboards.overallSkillLeaderboard"
        :title="t('records.titles.overallSkill')"
        :entries="leaderboards.overallSkillLeaderboard"
        color-class="overallSkill"
        :show-filter="true"
        :is-loading="isSkillLeaderboardLoading"
        :selected-period="selectedSkillPeriod"
        info-topic="overallSkill"
        @period-change="handleSkillPeriodChange"
      />
    </div>
  </div>
</template>

<style scoped>
/* Стили, относящиеся к макету страницы */
.records-page {
  padding: 20px;
  box-sizing: border-box;
  background-color: var(--color-bg-primary);
  color: var(--color-text-default);
  display: flex;
  flex-direction: column;
  gap: 25px;
  width: 90vw;
  max-width: 900px;
  margin: 20px auto;
}

.records-page__banner {
  width: 100%;
  height: auto;
  object-fit: cover;
  max-height: 200px;
  border-radius: var(--panel-border-radius);
  align-self: center;
  max-width: 900px;
}

.records-page__error-message,
.loading-message {
  color: var(--color-text-error);
  background-color: rgba(229, 57, 53, 0.15);
  border: 1px solid var(--color-accent-error);
  padding: 10px 15px;
  border-radius: var(--panel-border-radius);
  max-width: 600px;
  text-align: center;
  margin: 15px auto;
}

.loading-message {
  color: var(--color-text-muted);
  border-color: var(--color-border-hover);
  background-color: var(--color-bg-tertiary);
}

.records-page__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 25px;
  align-items: start;
}

@media (max-width: 768px) {
  .records-page {
    width: 100%;
    padding: 10px;
    gap: 15px;
  }
  .records-page__banner {
    max-height: 150px;
  }
}
</style>
