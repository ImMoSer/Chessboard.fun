<!-- src/pages/UserCabinetView.vue -->
<script setup lang="ts">
import {
    EXAMPLE_ACTIVITY_STATS,
    EXAMPLE_DETAILED_STATS,
    EXAMPLE_USER_PROFILE,
} from '@/shared/config/constants/exampleCabinetData'
import { useAuthStore } from '@/entities/user/auth.store'
import {
    useDetailedStatsQuery,
    usePersonalActivityStatsQuery,
} from '@/shared/api/queries/userCabinet.queries'
import type { FinishHimDifficulty, TornadoMode } from '@/shared/types/api.types'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import ActivityChart from '@/features/profile/ui/ActivityChart.vue'
import ThemeRoseChart from '@/features/profile/ui/ThemeRoseChart.vue'
import TheoryStackbarChart from '@/features/profile/ui/TheoryStackbarChart.vue'
import UserProfileHeader from '@/features/profile/ui/UserProfileHeader.vue'

const { t } = useI18n()

const authStore = useAuthStore()
const { userProfile, isAuthenticated } = storeToRefs(authStore)

const route = useRoute()
const isExample = computed(() => route.params.id === 'example')

// Vue Query fetching
const {
  data: personalActivityData,
  isPending: isActivityPending,
  isError: isActivityError,
  error: activityError
} = usePersonalActivityStatsQuery(!isExample.value && isAuthenticated.value)

const {
  data: detailedStatsData,
  isError: isDetailedStatsError,
  error: detailedError,
} = useDetailedStatsQuery(!isExample.value && isAuthenticated.value)

// Computed wrappers to support Example Mode
const personalActivityStats = computed(() => {
  return isExample.value ? EXAMPLE_ACTIVITY_STATS : personalActivityData.value
})

const detailedStats = computed(() => {
  return isExample.value ? EXAMPLE_DETAILED_STATS : detailedStatsData.value
})

const error = computed(() => {
  if (isExample.value) return null
  if (!isAuthenticated.value) return null // Handled by login-prompt
  if (isActivityError.value) return activityError.value?.message
  if (isDetailedStatsError.value) return detailedError.value?.message
  return null
})


// ... imports
// ...

const selectedTornadoMode = ref<TornadoMode>('blitz')
const selectedFinishHimMode = ref<FinishHimDifficulty>('Novice') // Default mode

const currentTornadoThemes = computed(() => {
  if (!detailedStats.value?.tornado?.modes) return []
  return detailedStats.value.tornado.modes[selectedTornadoMode.value] || []
})

const currentFinishHimThemes = computed(() => {
  if (!detailedStats.value?.finish_him?.modes) return []
  return detailedStats.value.finish_him.modes[selectedFinishHimMode.value] || []
})



// ...

// In Template:
/*
          <ThemeRoseChart
            v-if="detailedStats && detailedStats.finish_him"
            v-model:activeMode="selectedFinishHimMode"
            mode="finish_him"
            :modes="['novice', 'pro', 'master']"
            :themes="currentFinishHimThemes"
            :title="t('userCabinet.stats.modes.finishHim')"
          />
*/


const displayProfile = computed(() => {
  if (isExample.value) return EXAMPLE_USER_PROFILE
  return userProfile.value
})
</script>

<template>
  <div class="user-cabinet-container">
    <n-alert v-if="error" type="error" closable class="error-alert">
      {{ error }}
    </n-alert>

    <div v-else-if="!isExample && (!isAuthenticated || !userProfile)" class="login-prompt">
      <n-result
        status="403"
        :title="t('userCabinet.title')"
        :description="t('userCabinet.loginPrompt')"
      >
        <template #footer>
          <n-button type="primary" size="large" @click="authStore.login()">
            {{ t('nav.loginWithLichess') }}
          </n-button>
        </template>
      </n-result>
    </div>

    <div class="user-cabinet-content">
      <n-space vertical size="large">
        <UserProfileHeader :profile-override="displayProfile" />

        <ActivityChart
          :stats="personalActivityStats"
          :is-loading="isExample ? false : isActivityPending"
        />

        <div class="charts-grid">
          <!-- Tornado Stats Section -->
          <ThemeRoseChart
            v-if="detailedStats && detailedStats.tornado"
            v-model:activeMode="selectedTornadoMode"
            mode="tornado"
            :modes="['bullet', 'blitz', 'rapid', 'classic']"
            :themes="currentTornadoThemes"
            :title="t('userCabinet.stats.modes.tornado')"
          />

          <ThemeRoseChart
            v-if="detailedStats && detailedStats.finish_him"
            v-model:activeMode="selectedFinishHimMode"
            mode="finish_him"
            :modes="['Novice', 'Pro', 'Master']"
            :themes="currentFinishHimThemes"
            :title="t('userCabinet.stats.modes.finishHim')"
          />
        </div>

        <div class="charts-grid">
          <!-- Removed TheoryStackbarChart for finish_him as requested -->

          <TheoryStackbarChart
            v-if="detailedStats && detailedStats.theory"
            :stats="detailedStats.theory.stats"
            mode="theory"
          />

          <TheoryStackbarChart
            v-if="detailedStats && detailedStats.practical"
            :stats="detailedStats.practical.stats"
            mode="practical"
          />
        </div>
      </n-space>
    </div>
  </div>
</template>

<style scoped>
.user-cabinet-container {
  padding: 24px;
  max-width: 1400px;
  margin: 20px auto;
}

.charts-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (min-width: 1200px) {
  .charts-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
}

.state-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.login-prompt {
  padding: 60px 0;
  background-color: var(--color-bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--color-border-hover);
}

@media (max-width: 768px) {
  .user-cabinet-container {
    padding: 12px;
    margin: 10px auto;
  }

  .charts-grid {
    gap: 17px;
  }
}
</style>
