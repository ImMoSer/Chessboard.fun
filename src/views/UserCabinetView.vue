<!-- src/views/UserCabinetView.vue -->
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store'
import { useUserCabinetStore } from '@/stores/userCabinet.store'
import type { TornadoMode } from '@/types/api.types'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ActivityChart from '@/components/userCabinet/sections/ActivityChart.vue'
import ThemeRoseChart from '@/components/userCabinet/sections/ThemeRoseChart.vue'
import TheoryStackbarChart from '@/components/userCabinet/sections/TheoryStackbarChart.vue'
import UserProfileHeader from '@/components/userCabinet/sections/UserProfileHeader.vue'

const { t } = useI18n()

const authStore = useAuthStore()
const { userProfile, isAuthenticated } = storeToRefs(authStore)

const userCabinetStore = useUserCabinetStore()
const { isLoading, error, detailedStats } = storeToRefs(userCabinetStore)

const selectedTornadoMode = ref<TornadoMode>('blitz')

const currentTornadoThemes = computed(() => {
  if (!detailedStats.value?.tornado?.modes) return []
  return detailedStats.value.tornado.modes[selectedTornadoMode.value] || []
})

onMounted(() => {
  userCabinetStore.initializePage()
})
</script>

<template>
  <div class="user-cabinet-container">
    <div v-if="isLoading" class="state-container">
      <n-spin size="large" />
    </div>

    <n-alert v-else-if="error" type="error" closable class="error-alert">
      {{ error }}
    </n-alert>

    <div v-else-if="!isAuthenticated || !userProfile" class="login-prompt">
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

    <div v-else class="user-cabinet-content">
      <n-space vertical size="large">
        <UserProfileHeader />

        <ActivityChart />

        <div class="charts-grid">
          <!-- Tornado Stats Section -->
          <ThemeRoseChart
            v-if="detailedStats && detailedStats.tornado"
            v-model:activeMode="selectedTornadoMode"
            :modes="['bullet', 'blitz', 'rapid', 'classic']"
            :themes="currentTornadoThemes"
            :title="t('userCabinet.stats.modes.tornado')"
          />

          <ThemeRoseChart
            v-if="detailedStats && detailedStats.advantage"
            :themes="detailedStats.advantage.themes"
            :title="t('userCabinet.stats.modes.advantage')"
          />
        </div>

        <div class="charts-grid">
          <TheoryStackbarChart
            v-if="detailedStats && detailedStats.advantage"
            :stats="detailedStats.advantage.stats"
            mode="advantage"
          />

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
  }
}
</style>
