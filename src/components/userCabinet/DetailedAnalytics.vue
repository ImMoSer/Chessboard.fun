<!-- src/components/userCabinet/DetailedAnalytics.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUserCabinetStore } from '@/stores/userCabinet.store'
import AnalyticsDisplay from './AnalyticsDisplay.vue'

const { t } = useI18n()
const router = useRouter()
const userCabinetStore = useUserCabinetStore()
const { detailedStats, isDetailedStatsLoading, detailedStatsError } = storeToRefs(userCabinetStore)

const activeTab = ref('Tornado')

const currentStats = computed(() => {
  if (!detailedStats.value) return []
  switch (activeTab.value) {
    case 'Tornado':
      return detailedStats.value.tornado.themes
    case 'Endgame':
      return detailedStats.value.advantage.themes
    default:
      return []
  }
})

function handleThemeClick(theme: string) {
  if (activeTab.value === 'Tornado') {
    router.push({
      name: 'tornado',
      params: { mode: 'classic' },
      query: { theme },
    })
  }
}
</script>

<template>
  <n-card class="analytics-card">
    <template #header>
      <span class="card-header-text">{{ t('userCabinet.detailedAnalytics.title') }}</span>
    </template>

    <div v-if="isDetailedStatsLoading" class="state-box">
      <n-spin size="large" />
    </div>
    
    <n-alert v-else-if="detailedStatsError" type="error" class="error-alert">
      {{ detailedStatsError }}
    </n-alert>
    
    <div v-else-if="detailedStats">
      <n-tabs v-model:value="activeTab" type="segment" animated>
        <n-tab-pane name="Tornado" tab="Tornado">
          <AnalyticsDisplay :stats="currentStats" @theme-click="handleThemeClick" />
        </n-tab-pane>
        <n-tab-pane name="Endgame" tab="Endgame">
          <AnalyticsDisplay :stats="currentStats" @theme-click="handleThemeClick" />
        </n-tab-pane>
      </n-tabs>
    </div>
    
    <n-empty v-else :description="t('common.noData')" />
  </n-card>
</template>

<style scoped>
.analytics-card {
  background-color: var(--color-bg-tertiary);
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.card-header-text {
  font-family: var(--font-family-primary);
  color: var(--color-accent-secondary);
  font-size: var(--font-size-large);
  font-weight: bold;
}

.state-box {
  display: flex;
  justify-content: center;
  padding: 40px;
}
</style>