<script setup lang="ts">
import {
  useFinishHimLeaderboardQuery,
  useOverallSkillLeaderboardQuery,
  usePracticalLeaderboardQuery,
  useTheoryLeaderboardQuery,
  useTopTodayLeaderboardQuery,
  useTornadoLeaderboardsQuery,
} from '@/shared/api/queries/leaderboard.queries'
import { generateRandomHallOfFame } from '@/shared/lib/statsRandomizer'
import type { LeaderboardEntry } from '@/shared/types/api.types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

// Import child components
import { SkillLeaderboardTable, TimedModeLeaderboardTable } from '@/features/leaderboards'

const { t } = useI18n()

const route = useRoute()
const isExample = computed(() => route.params.id === 'example')

// Vue Query fetching
const { data: tornadoData, isFetching: isTornadoLoading } = useTornadoLeaderboardsQuery(!isExample.value)
const { data: finishHimData, isFetching: isFinishHimLoading } = useFinishHimLeaderboardQuery(!isExample.value)
const { data: practicalData, isFetching: isPracticalLoading } = usePracticalLeaderboardQuery(!isExample.value)
const { data: theoryData, isFetching: isTheoryLoading } = useTheoryLeaderboardQuery(!isExample.value)

// Overall Skill Query
const {
  data: overallSkillResponse,
  isFetching: isOverallSkillLoading,
} = useOverallSkillLeaderboardQuery(!isExample.value)

// Top Today Query
const {
  data: topTodayResponse,
  isFetching: isTopTodayLoading,
} = useTopTodayLeaderboardQuery(!isExample.value)

// Tab Definitions
const difficultyTabs = computed(() => [
  { id: 'Novice', name: t('common.difficulties.level_novice'), icon: '' },
  { id: 'Pro', name: t('common.difficulties.level_pro'), icon: '' },
  { id: 'Master', name: t('common.difficulties.level_master'), icon: '' },
])

const tornadoTabs = computed(() => [
  { id: 'bullet', name: t('features.leaderboards.table.bullet'), icon: '' },
  { id: 'blitz', name: t('features.leaderboards.table.blitz'), icon: '' },
  { id: 'rapid', name: t('features.leaderboards.table.rapid'), icon: '' },
  { id: 'classic', name: t('features.leaderboards.table.classic'), icon: '' },
])

// Merged Data logic for Hall of Fame (stays as is, but we'll use example data if needed)
const exampleData = computed(() => isExample.value ? generateRandomHallOfFame() : null)

const hallOfFameData = computed(() => {
  if (isExample.value) return exampleData.value?.overallSkillLeaderboard.entries || []

  const overallEntries = overallSkillResponse.value?.entries || []
  const todayEntries = topTodayResponse.value?.entries || []

  const mergedMap = new Map<string, LeaderboardEntry>()
  overallEntries.forEach((entry) => mergedMap.set(entry.id, JSON.parse(JSON.stringify(entry))))

  todayEntries.forEach((today) => {
    const existing = mergedMap.get(today.id)
    if (existing) {
      if (today.score) {
        Object.keys(today.score).forEach((mode) => {
          existing.score[mode] = Number(existing.score[mode] || 0) + Number(today.score[mode] || 0)
        })
      }
      if (today.solved) {
        Object.keys(today.solved).forEach((mode) => {
          existing.solved[mode] = Number(existing.solved[mode] || 0) + Number(today.solved[mode] || 0)
        })
      }
      if (today.failed) {
        Object.keys(today.failed).forEach((mode) => {
          existing.failed[mode] = Number(existing.failed[mode] || 0) + Number(today.failed[mode] || 0)
        })
      }
      existing.current_streak = Math.max(existing.current_streak || 0, today.current_streak || 0)
    } else {
      mergedMap.set(today.id, JSON.parse(JSON.stringify(today)))
    }
  })

  return Array.from(mergedMap.values()).sort((a, b) => {
    const playedA = Object.values(a.solved || {}).reduce((sum, val) => sum + val, 0) + 
                   Object.values(a.failed || {}).reduce((sum, val) => sum + val, 0)
    const playedB = Object.values(b.solved || {}).reduce((sum, val) => sum + val, 0) + 
                   Object.values(b.failed || {}).reduce((sum, val) => sum + val, 0)
    return playedB - playedA
  }).slice(0, 20)
})

const isLoading = computed(() => {
  if (isExample.value) return false
  return (
    isOverallSkillLoading.value ||
    isTopTodayLoading.value ||
    isTornadoLoading.value ||
    isFinishHimLoading.value ||
    isPracticalLoading.value ||
    isTheoryLoading.value
  )
})
</script>

<template>
  <div class="records-page">
    <h1 class="brand-text hall-of-fame-title">HALL OF FAME</h1>

    <div v-if="isLoading" class="loading-message">
      <n-spin size="small" /> {{ t('common.actions.loading') }}
    </div>

    <div v-else class="records-page__grid">
      <!-- SECTION: HALL OF FAME (Overall) -->
      <section class="records-section">
        <SkillLeaderboardTable
          :title="t('features.leaderboards.titles.topToday')"
          :entries="(isExample ? exampleData?.topTodayLeaderboard.entries : topTodayResponse?.entries) || []"
          color-class="topToday"
          :is-loading="isTopTodayLoading"
        />

        <SkillLeaderboardTable
          :title="t('features.leaderboards.titles.overallSkill')"
          :entries="hallOfFameData"
          color-class="overallSkill"
          :is-loading="isOverallSkillLoading"
        />
      </section>

      <!-- SECTION: COMPETITIVE (Modes) -->
      <section class="records-section">
        <h2 class="section-divider">{{ t('features.leaderboards.sections.competitive') }}</h2>
        <div class="section-grid">
          <!-- Tornado Leaderboard -->
          <TimedModeLeaderboardTable
            :title="t('nav.tornado')"
            :data="isExample ? exampleData?.tornadoLeaderboard : tornadoData"
            :tabs="tornadoTabs"
            :is-loading="isTornadoLoading"
            color-class="tornadoLeaderboard"
          />

          <!-- Finish Him Leaderboard -->
          <TimedModeLeaderboardTable
            :title="t('features.leaderboards.titles.topFinishHim')"
            :data="isExample ? exampleData?.finishHimLeaderboard : finishHimData"
            :tabs="difficultyTabs"
            :is-loading="isFinishHimLoading"
            color-class="finishHimLeaderboard"
          />

          <!-- Theory Leaderboard -->
          <TimedModeLeaderboardTable
            :title="t('features.leaderboards.titles.theoryLeaderboard')"
            :data="isExample ? exampleData?.theoryLeaderboard : theoryData"
            :tabs="difficultyTabs"
            :is-loading="isTheoryLoading"
            color-class="theoryLeaderboard"
          />

          <!-- Practical Leaderboard -->
          <TimedModeLeaderboardTable
            :title="t('features.leaderboards.titles.practicalLeaderboard')"
            :data="isExample ? exampleData?.practicalLeaderboard : practicalData"
            :tabs="difficultyTabs"
            :is-loading="isPracticalLoading"
            color-class="practicalLeaderboard"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* Стили, относящиеся к макету страницы */
.records-page {
  padding: 5px;
  box-sizing: border-box;
  background-color: transparent !important;
  color: var(--color-text-default);
  display: flex;
  flex-direction: column;
  gap: 25px;
  width: 100%;
  max-width: 1000px;
  margin: 25px auto;
}

.hall-of-fame-title {
  margin: 0;
  font-size: clamp(2rem, 6vw, 4.5rem);
  line-height: 1;
  text-align: center;
  align-self: center;
  padding: 20px 0 10px;
  position: relative;
  display: inline-block;
  margin: 0 auto;
}

.hall-of-fame-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: -15%;
  width: 130%;
  height: 3px;
  background: linear-gradient(90deg, var(--neon-pink), var(--neon-purple));
  filter: blur(2px);
  border-radius: 2px;
  opacity: 0.8;
  box-shadow: 0 0 15px var(--neon-pink);
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
    padding: 5px;
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
