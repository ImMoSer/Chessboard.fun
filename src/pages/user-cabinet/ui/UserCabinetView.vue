<!-- src/pages/UserCabinetView.vue -->
<script setup lang="ts">
import { useAuthStore } from '@/entities/user'
import {
  useDetailedStatsQuery,
  usePersonalActivityStatsQuery,
} from '@/shared/api/queries/userCabinet.queries'
import {
  EXAMPLE_ACTIVITY_STATS,
  EXAMPLE_DETAILED_STATS,
  EXAMPLE_USER_PROFILE,
} from '@/shared/config/constants/exampleCabinetData'
import { apiClient } from '@/shared/api/client'
import type { FinishHimDifficulty, TornadoMode } from '@/shared/types/api.types'
import {
  NAlert,
  NButton,
  NCard,
  NInput,
  NInputGroup,
  NModal,
  NResult,
  NSpace,
  NText,
  NH3,
  useMessage,
} from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import { ActivityChart } from '@/features/profile'
import { ThemeRoseChart } from '@/features/profile'
import { TheoryStackbarChart } from '@/features/profile'
import { UserProfileHeader } from '@/features/profile'
import { useGameLauncher } from '../lib/composables/useGameLauncher'
import { normalizeProfileStats } from '@/shared/lib/statsNormalizer'

const { t } = useI18n()
const { launchGame } = useGameLauncher()
const message = useMessage()

const giftCode = ref('')
const isRedeeming = ref(false)
const showSuccessModal = ref(false)
const successTier = ref('')
const successDate = ref('')

const handleSuccessOk = () => {
  window.location.reload()
}

const authStore = useAuthStore()
const { userProfile, isAuthenticated } = storeToRefs(authStore)

const route = useRoute()
const isExample = computed(() => route.params.id === 'example')

// Vue Query fetching
const {
  data: personalActivityData,
  isPending: isActivityPending,
  isError: isActivityError,
  error: activityError,
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

const displayProfile = computed(() => {
  if (isExample.value) return EXAMPLE_USER_PROFILE
  return userProfile.value
})

const detailedStats = computed(() => {
  const stats = isExample.value ? EXAMPLE_DETAILED_STATS : detailedStatsData.value
  const baseRating = displayProfile.value?.base_puzzle_rating || 1000
  return normalizeProfileStats(stats || null, baseRating)
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

const handleRedeem = async () => {
  if (!giftCode.value || giftCode.value.length !== 8) return;
  
  isRedeeming.value = true
  try {
    const res = await apiClient<{ success: boolean; tier: string; expiresAt: string }>(
      '/billing/redeem',
      {
        method: 'POST',
        body: JSON.stringify({ code: giftCode.value }),
      }
    )
    if (res.success) {
      successTier.value = res.tier
      successDate.value = new Date(res.expiresAt).toLocaleDateString()
      showSuccessModal.value = true
      giftCode.value = ''
    }
  } catch (err) {
    const error = err as { status?: number }
    if (error.status === 404 || error.status === 409) {
      message.error(t('userCabinet.gift.invalid'))
    } else {
      message.error(t('userCabinet.gift.error'))
    }
  } finally {
    isRedeeming.value = false
  }
}
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
            @improve="launchGame"
          />

          <ThemeRoseChart
            v-if="detailedStats && detailedStats.finish_him"
            v-model:activeMode="selectedFinishHimMode"
            mode="finish_him"
            :modes="['Novice', 'Pro', 'Master']"
            :themes="currentFinishHimThemes"
            :title="t('userCabinet.stats.modes.finishHim')"
            @improve="launchGame"
          />
        </div>

        <div class="charts-grid">
          <!-- Removed TheoryStackbarChart for finish_him as requested -->

          <TheoryStackbarChart
            v-if="detailedStats && detailedStats.theory"
            :stats="detailedStats.theory.stats"
            mode="theory"
            @improve="launchGame"
          />

          <TheoryStackbarChart
            v-if="detailedStats && detailedStats.practical"
            :stats="detailedStats.practical.stats"
            mode="practical"
            @improve="launchGame"
          />
        </div>

        <!-- Gift Code Redeem Area -->
        <n-card :bordered="false" class="gift-redeem-card" embedded>
          <n-space vertical>
            <n-h3 style="margin-bottom: 0;">🎁 {{ t('userCabinet.gift.title') }}</n-h3>
            <n-text depth="3">{{ t('userCabinet.gift.description') }}</n-text>
            <n-input-group style="margin-top: 8px;">
              <n-input
                v-model:value="giftCode"
                :placeholder="t('userCabinet.gift.placeholder')"
                :maxlength="8"
                size="large"
                style="max-width: 250px;"
                @keyup.enter="handleRedeem"
              />
              <n-button 
                type="primary" 
                size="large" 
                :loading="isRedeeming" 
                :disabled="giftCode.length !== 8" 
                @click="handleRedeem"
              >
                {{ t('userCabinet.gift.activate') }}
              </n-button>
            </n-input-group>
          </n-space>
        </n-card>
      </n-space>
    </div>

    <!-- Success Modal -->
    <n-modal
      v-model:show="showSuccessModal"
      preset="card"
      style="max-width: 400px; background-color: var(--color-bg-panel)"
      :title="t('userCabinet.gift.successTitle')"
      :mask-closable="false"
      @close="handleSuccessOk"
    >
      <n-space vertical :size="24">
        <n-text style="font-size: 1.1em; line-height: 1.5;">
          {{ t('userCabinet.gift.successMessage', { tier: successTier, date: successDate }) }}
        </n-text>
        <n-button type="primary" size="large" block @click="handleSuccessOk">
          {{ t('userCabinet.gift.ok') }}
        </n-button>
      </n-space>
    </n-modal>
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

.gift-redeem-card {
  margin-top: 24px;
  border-radius: var(--panel-border-radius);
  background-color: var(--color-bg-panel);
}
</style>
