<!-- src/views/RecordsPageView.vue -->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRecordsStore } from '../stores/records.store'
import type { SkillPeriod } from '../types/api.types'

// Импорт дочерних компонентов
import SkillLeaderboardTable from '../components/recordsPage/SkillLeaderboardTable.vue'
import ThematicLeaderboardTable from '../components/recordsPage/ThematicLeaderboardTable.vue'
import TimedModeLeaderboardTable from '../components/recordsPage/TimedModeLeaderboardTable.vue'

const recordsStore = useRecordsStore()
const { t } = useI18n()

const { isSkillLeaderboardLoading, error, leaderboards, selectedSkillPeriod } =
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
      src="/jpg/ChessBoardLeader_bg_101014.jpg"
      :alt="t('records.bannerAlt')"
    />

    <div v-if="error" class="records-page__error-message">
      {{ t('common.error') }}: {{ error }}
    </div>

    <div v-else-if="leaderboards" class="records-page__grid">
      <!-- СЕКЦИЯ: HOT (Activity & Streaks) -->
      <section class="records-section">
        <h2 class="section-divider">{{ t('records.sections.hot') }}</h2>
        <div class="section-grid">
          <!-- Skill Streak Mega Leaderboard -->
          <SkillLeaderboardTable
            v-if="
              leaderboards.skillStreakMegaLeaderboard &&
              leaderboards.skillStreakMegaLeaderboard.length > 0
            "
            :title="t('records.titles.skillStreakMega')"
            :entries="leaderboards.skillStreakMegaLeaderboard"
            color-class="skillStreakMega"
            :show-streak="true"
            info-topic="skillStreakMega"
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

          <!-- Skill Streak Leaderboard -->
          <SkillLeaderboardTable
            v-if="
              leaderboards.skillStreakLeaderboard && leaderboards.skillStreakLeaderboard.length > 0
            "
            :title="t('records.titles.skillStreak')"
            :entries="leaderboards.skillStreakLeaderboard"
            color-class="skillStreak"
            :show-streak="true"
            info-topic="skillStreak"
          />
        </div>
      </section>

      <!-- СЕКЦИЯ: COMPETITIVE (Modes) -->
      <section class="records-section">
        <h2 class="section-divider">{{ t('records.sections.competitive') }}</h2>
        <div class="section-grid">
          <!-- Tornado Leaderboard -->
          <TimedModeLeaderboardTable
            v-if="leaderboards.tornadoLeaderboard"
            :title="t('nav.tornado')"
            :data="leaderboards.tornadoLeaderboard"
            mode="tornado"
            color-class="tornadoLeaderboard"
            info-topic="tornadoLeaderboard"
          />

          <!-- Advantage Leaderboard -->
          <ThematicLeaderboardTable
            v-if="leaderboards.advantageLeaderboard"
            :title="t('records.titles.advantageLeaderboard')"
            :data="leaderboards.advantageLeaderboard"
            color-class="advantageLeaderboard"
            info-topic="topFinishHim"
          />

          <!-- Theory Leaderboard -->
          <ThematicLeaderboardTable
            v-if="leaderboards.theoryLeaderboard"
            :title="t('records.titles.theoryLeaderboard')"
            :data="leaderboards.theoryLeaderboard"
            color-class="theoryLeaderboard"
            info-topic="theoryLeaderboard"
          />

          <!-- Practical Leaderboard -->
          <ThematicLeaderboardTable
            v-if="leaderboards.practicalLeaderboard"
            :title="t('records.titles.practicalLeaderboard')"
            :data="leaderboards.practicalLeaderboard"
            color-class="practicalLeaderboard"
            info-topic="practicalLeaderboard"
          />
        </div>
      </section>

      <!-- СЕКЦИЯ: HALL OF FAME (Overall) -->
      <section class="records-section">
        <h2 class="section-divider">{{ t('records.sections.hallOfFame') }}</h2>
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
      </section>
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
  width: 95vw;
  max-width: 1000px;
  margin: 20px auto;
}

.records-page__banner {
  width: 100%;
  height: auto;
  object-fit: cover;
  max-height: 200px;
  border-radius: 20px;
  align-self: center;
  box-shadow:
    0 0 20px rgba(255, 0, 0, 0.6),
    0 0 40px rgba(255, 69, 0, 0.4),
    inset 0 0 15px rgba(255, 0, 0, 0.5);
  animation: flame-pulse 2s infinite ease-in-out;
  border: 1px solid rgba(255, 69, 0, 0.3);
}

@keyframes flame-pulse {
  0%,
  100% {
    box-shadow:
      0 0 15px rgba(255, 0, 0, 0.6),
      0 0 30px rgba(255, 69, 0, 0.4),
      inset 0 0 10px rgba(255, 0, 0, 0.5);
    transform: scale(1);
  }

  50% {
    box-shadow:
      0 0 25px rgba(255, 0, 0, 0.8),
      0 0 50px rgba(255, 140, 0, 0.6),
      inset 0 0 20px rgba(255, 69, 0, 0.6);
    transform: scale(1.005);
  }
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
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.records-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-divider {
  font-size: 1.4rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 3px;
  color: var(--color-text-muted);
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 12px;
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

.section-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 25px;
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
