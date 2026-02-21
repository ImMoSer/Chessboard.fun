<!-- src/views/RecordsPageView.vue -->
<script setup lang="ts">
import {
    useCombinedLeaderboardsQuery,
    useOverallSkillLeaderboardQuery,
} from '@/shared/api/queries/leaderboard.queries'
import type { SkillPeriod } from '@/types/api.types'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { EXAMPLE_HALL_OF_FAME_DATA } from '../constants/exampleCabinetData'

// Импорт дочерних компонентов
import SkillLeaderboardTable from '@/features/leaderboards/ui/SkillLeaderboardTable.vue'
import ThematicLeaderboardTable from '@/features/leaderboards/ui/ThematicLeaderboardTable.vue'
import TimedModeLeaderboardTable from '@/features/leaderboards/ui/TimedModeLeaderboardTable.vue'

const { t } = useI18n()

const route = useRoute()
const isExample = computed(() => route.params.id === 'example')
const selectedSkillPeriod = ref<SkillPeriod>('7')

// Vue Query fetching
const {
  data: combinedData,
  isPending: isCombinedPending,
  isError: isCombinedError,
  error: combinedError,
} = useCombinedLeaderboardsQuery(!isExample.value)

// Overall Skill Query
const {
  data: overallSkillData,
  isFetching: isSkillLeaderboardLoading, // use isFetching so it highlights during refetches
} = useOverallSkillLeaderboardQuery(selectedSkillPeriod.value, !isExample.value)

// Merged Data logic
const leaderboards = computed(() => {
  if (isExample.value) {
    return EXAMPLE_HALL_OF_FAME_DATA
  }
  if (!combinedData.value) return null

  return {
    ...combinedData.value,
    overallSkillLeaderboard: overallSkillData.value || combinedData.value.overallSkillLeaderboard
  }
})

const isLoading = computed(() => {
    return isExample.value ? false : isCombinedPending.value
})

const error = computed(() => {
    return isExample.value ? null : (isCombinedError.value ? combinedError.value?.message : null)
})

const handleSkillPeriodChange = (period: SkillPeriod) => {
  selectedSkillPeriod.value = period
}
</script>

<template>
  <div class="records-page">
    <img
      class="records-page__banner"
      src="/svg/ChessBoardLeader_ob.svg"
      :alt="t('records.bannerAlt')"
    />

    <div v-if="isLoading" class="loading-message">
      <n-spin size="small" /> {{ t('common.loading') }}
    </div>

    <div v-else-if="error" class="records-page__error-message">
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

          <!-- Finish Him Leaderboard -->
          <ThematicLeaderboardTable
            v-if="leaderboards.finishHimLeaderboard"
            :title="t('records.titles.topFinishHim')"
            :data="leaderboards.finishHimLeaderboard"
            color-class="finishHimLeaderboard"
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
  background-color: transparent !important;
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
  align-self: center;
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
    padding: 14px;
    gap: 17px;
    margin: 10px auto;
  }

  .records-page__banner {
    max-height: 140px;
  }

  .records-page__grid {
    gap: 28px;
  }

  .section-divider {
    font-size: 1rem;
    letter-spacing: 2px;
    padding-bottom: 8px;
    gap: 14px;
  }
}
</style>
