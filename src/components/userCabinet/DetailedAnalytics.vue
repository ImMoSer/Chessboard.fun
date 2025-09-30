<!-- src/components/userCabinet/DetailedAnalytics.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useUserCabinetStore } from '@/stores/userCabinet.store'

import TornadoStats from './TornadoStats.vue'
import AdvantageStats from './AdvantageStats.vue'
import EndgameStats from './EndgameStats.vue'

const { t } = useI18n()
const userCabinetStore = useUserCabinetStore()
const { detailedStats, isDetailedStatsLoading, detailedStatsError } = storeToRefs(userCabinetStore)

type Tab = 'Tornado' | 'Advantage' | 'Endgame'
const activeTab = ref<Tab>('Tornado')

const tabs: Record<Tab, any> = {
  Tornado: TornadoStats,
  Advantage: AdvantageStats,
  Endgame: EndgameStats,
}

const currentTabComponent = computed(() => tabs[activeTab.value])

const currentStats = computed(() => {
  if (!detailedStats.value) return null
  switch (activeTab.value) {
    case 'Tornado':
      return detailedStats.value.tornadoStats
    case 'Advantage':
      return detailedStats.value.advantageStats
    case 'Endgame':
      return detailedStats.value.endgameStats
    default:
      return null
  }
})
</script>

<template>
  <section class="detailed-analytics-container">
    <h3 class="detailed-analytics__title">{{ t('userCabinet.detailedAnalytics.title') }}</h3>

    <div v-if="isDetailedStatsLoading" class="loading-message">Загрузка статистики...</div>
    <div v-else-if="detailedStatsError" class="error-message">
      {{ detailedStatsError }}
    </div>
    <div v-else-if="detailedStats" class="analytics-content">
      <div class="tabs-navigation">
        <button v-for="tab in Object.keys(tabs) as Tab[]" :key="tab" class="tab-button"
          :class="{ active: activeTab === tab }" @click="activeTab = tab">
          {{ tab }}
        </button>
      </div>

      <div class="tab-content">
        <component :is="currentTabComponent" :stats="currentStats" />
      </div>
    </div>
    <div v-else class="no-data-message">Нет данных для отображения.</div>
  </section>
</template>

<style scoped>
.detailed-analytics-container {
  background-color: var(--color-bg-tertiary);
  padding: 15px;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border);
  margin-top: 20px;
  margin-bottom: 20px;
}

.detailed-analytics__title {
  font-size: var(--font-size-large);
  color: var(--color-accent-secondary);
  margin-top: 0;
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border-hover);
  text-align: center;
}

.loading-message,
.error-message,
.no-data-message {
  text-align: center;
  padding: 20px;
  font-size: var(--font-size-large);
  color: var(--color-text-muted);
}

.tabs-navigation {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.tab-button {
  padding: 8px 20px;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-muted);
  font-family: var(--font-family-primary);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button:hover {
  border-color: var(--color-accent-primary);
  color: var(--color-text-default);
}

.tab-button.active {
  background-color: var(--color-accent-primary);
  color: var(--color-text-dark);
  border-color: var(--color-accent-primary);
  font-weight: bold;
}

.tab-content {
  margin-top: 1rem;
}
</style>
