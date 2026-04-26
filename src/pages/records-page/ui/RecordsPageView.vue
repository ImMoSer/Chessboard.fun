<!-- src/pages/RecordsPageView.vue -->
<script setup lang="ts">
import {
  useCombinedLeaderboardsQuery,
  useOverallSkillLeaderboardQuery,
  useTopTodayLeaderboardQuery,
} from '@/shared/api/queries/leaderboard.queries'
import { generateRandomHallOfFame } from '@/shared/lib/statsRandomizer'
import type { LeaderboardEntry } from '@/shared/types/api.types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

// Импорт дочерних компонентов
import { SkillLeaderboardTable, ThematicLeaderboardTable, TimedModeLeaderboardTable } from '@/features/leaderboards'

const { t } = useI18n()

const route = useRoute()
const isExample = computed(() => route.params.id === 'example')

// Vue Query fetching
const {
  data: combinedData,
  isPending: isCombinedPending,
  isError: isCombinedError,
  error: combinedError,
} = useCombinedLeaderboardsQuery(!isExample.value)

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

// Merged Data logic
const leaderboards = computed(() => {
  if (isExample.value) {
    return generateRandomHallOfFame()
  }
  if (!combinedData.value) return null

  // 1. Get raw entries from both sources
  const overallEntries = overallSkillResponse.value?.entries || []
  const todayEntries = topTodayResponse.value?.entries || []

  // 2. Create a map for merging by user ID
  const mergedMap = new Map<string, LeaderboardEntry>()

  // 3. Process overall skill (30 days baseline)
  overallEntries.forEach((entry) => {
    mergedMap.set(entry.id, JSON.parse(JSON.stringify(entry))) // Deep copy to avoid mutating cache
  })

  // 4. Merge today's stats
  todayEntries.forEach((today) => {
    const existing = mergedMap.get(today.id)
    if (existing) {
      // Add up scores
      if (today.score) {
        Object.keys(today.score).forEach((mode) => {
          existing.score[mode] = (existing.score[mode] || 0) + (today.score[mode] || 0)
        })
      }
      // Add up solved
      if (today.solved) {
        Object.keys(today.solved).forEach((mode) => {
          existing.solved[mode] = (existing.solved[mode] || 0) + (today.solved[mode] || 0)
        })
      }
      // Add up failed
      if (today.failed) {
        Object.keys(today.failed).forEach((mode) => {
          existing.failed[mode] = (existing.failed[mode] || 0) + (today.failed[mode] || 0)
        })
      }
      // Update metadata if needed (streak, etc.)
      existing.current_streak = Math.max(existing.current_streak || 0, today.current_streak || 0)
    } else {
      // User not in top 20 of overall skill, but active today
      mergedMap.set(today.id, JSON.parse(JSON.stringify(today)))
    }
  })

  // 5. Convert back to array and re-sort by total score
  const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
    const scoreA = Object.values(a.score || {}).reduce((sum, val) => sum + val, 0)
    const scoreB = Object.values(b.score || {}).reduce((sum, val) => sum + val, 0)
    if (scoreB !== scoreA) return scoreB - scoreA
    return a.id.localeCompare(b.id)
  })

  return {
    ...combinedData.value,
    overallSkillLeaderboard: {
      period: 30,
      entries: mergedList.slice(0, 20)
    },
    topTodayLeaderboard: {
      period: 'heute',
      entries: todayEntries
    }
  }
})

const isLoading = computed(() => {
  return isExample.value ? false : isCombinedPending.value
})

const error = computed(() => {
  return isExample.value ? null : isCombinedError.value ? combinedError.value?.message : null
})
</script>

<template>
  <div class="records-page">
    <h1 class="brand-text hall-of-fame-title">HALL OF FAME</h1>

    <div v-if="isLoading" class="loading-message">
      <n-spin size="small" /> {{ t('common.actions.loading') }}
    </div>

    <div v-else-if="error" class="records-page__error-message">
      {{ t('common.actions.error') }}: {{ error }}
    </div>

    <div v-else-if="leaderboards" class="records-page__grid">
      <!-- СЕКЦИЯ: HALL OF FAME (Overall) -->
      <section class="records-section">
        <!-- Overall Skill Leaderboard -->
        <SkillLeaderboardTable
          v-if="leaderboards.overallSkillLeaderboard"
          :title="t('features.leaderboards.titles.overallSkill')"
          :entries="leaderboards.overallSkillLeaderboard.entries"
          color-class="overallSkill"
          :is-loading="isOverallSkillLoading"
        />
      </section>

      <!-- СЕКЦИЯ: HOT (Activity & Streaks) -->
      <section class="records-section">
        <div class="section-grid">
          <!-- Skill Streak Mega Leaderboard -->
          <SkillLeaderboardTable
            v-if="
              leaderboards.skillStreakMegaLeaderboard &&
              leaderboards.skillStreakMegaLeaderboard.length > 0
            "
            :title="t('features.leaderboards.titles.skillStreakMega')"
            :entries="leaderboards.skillStreakMegaLeaderboard"
            color-class="skillStreakMega"
            :show-streak="true"
          />

          <!-- Top Today Leaderboard -->
          <SkillLeaderboardTable
            v-if="leaderboards.topTodayLeaderboard && leaderboards.topTodayLeaderboard.entries.length > 0"
            :title="t('features.leaderboards.titles.topToday')"
            :entries="leaderboards.topTodayLeaderboard.entries"
            color-class="topToday"
            :is-loading="isTopTodayLoading"
          />

          <!-- Skill Streak Leaderboard -->
          <SkillLeaderboardTable
            v-if="
              leaderboards.skillStreakLeaderboard && leaderboards.skillStreakLeaderboard.length > 0
            "
            :title="t('features.leaderboards.titles.skillStreak')"
            :entries="leaderboards.skillStreakLeaderboard"
            color-class="skillStreak"
            :show-streak="true"
          />
        </div>
      </section>

      <!-- СЕКЦИЯ: COMPETITIVE (Modes) -->
      <section class="records-section">
        <h2 class="section-divider">{{ t('features.leaderboards.sections.competitive') }}</h2>
        <div class="section-grid">
          <!-- Tornado Leaderboard -->
          <TimedModeLeaderboardTable
            v-if="leaderboards.tornadoLeaderboard"
            :title="t('nav.tornado')"
            :data="leaderboards.tornadoLeaderboard"
            mode="tornado"
            color-class="tornadoLeaderboard"
          />

          <!-- Finish Him Leaderboard -->
          <ThematicLeaderboardTable
            v-if="leaderboards.finishHimLeaderboard"
            :title="t('features.leaderboards.titles.topFinishHim')"
            :data="leaderboards.finishHimLeaderboard"
            color-class="finishHimLeaderboard"
          />

          <!-- Theory Leaderboard -->
          <ThematicLeaderboardTable
            v-if="leaderboards.theoryLeaderboard"
            :title="t('features.leaderboards.titles.theoryLeaderboard')"
            :data="leaderboards.theoryLeaderboard"
            color-class="theoryLeaderboard"
          />

          <!-- Practical Leaderboard -->
          <ThematicLeaderboardTable
            v-if="leaderboards.practicalLeaderboard"
            :title="t('features.leaderboards.titles.practicalLeaderboard')"
            :data="leaderboards.practicalLeaderboard"
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
