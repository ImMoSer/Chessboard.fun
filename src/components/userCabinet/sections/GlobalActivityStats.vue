<!-- src/components/userCabinet/sections/GlobalActivityStats.vue -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useUserCabinetStore, type ActivityPeriod } from '@/stores/userCabinet.store'

const { t } = useI18n()
const userCabinetStore = useUserCabinetStore()
const {
  personalActivityStats,
  isPersonalActivityStatsLoading,
  selectedActivityPeriod,
} = storeToRefs(userCabinetStore)

const handlePeriodChange = (period: ActivityPeriod) => {
  userCabinetStore.setSelectedActivityPeriod(period)
}
</script>

<template>
  <section class="user-cabinet__personal-activity-stats">
    <h3 class="user-cabinet__section-title">{{ t('userCabinet.stats.global.title') }}</h3>
    <div v-if="isPersonalActivityStatsLoading" class="loading-message">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="personalActivityStats">
      <div class="stats-filters">
        <button class="filter-button" :class="{ active: selectedActivityPeriod === 'daily' }"
          @click="handlePeriodChange('daily')">
          {{ t('userCabinet.stats.periods.day') }}
        </button>
        <button class="filter-button" :class="{ active: selectedActivityPeriod === 'weekly' }"
          @click="handlePeriodChange('weekly')">
          {{ t('userCabinet.stats.periods.week') }}
        </button>
        <button class="filter-button" :class="{ active: selectedActivityPeriod === 'monthly' }"
          @click="handlePeriodChange('monthly')">
          {{ t('userCabinet.stats.periods.month') }}
        </button>
      </div>
      <div class="stats-table-container">
        <table class="user-cabinet__stats-table">
          <thead>
            <tr>
              <th>{{ t('userCabinet.stats.modes.all') }}</th>
              <th>{{ t('records.table.requested') }}</th>
              <th>{{ t('records.table.solved') }}</th>
              <th>{{ t('records.table.totalSkill') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mode in ['finishHim', 'attack', 'tower', 'tornado'] as const" :key="mode">
              <td>
                {{
                  t(mode === 'tornado' ? 'nav.tornado' : `userCabinet.stats.modes.${mode}`)
                }}
              </td>
              <td>
                {{ personalActivityStats[selectedActivityPeriod][mode].puzzles_requested }}
              </td>
              <td>{{ personalActivityStats[selectedActivityPeriod][mode].puzzles_solved }}</td>
              <td class="skill-value">
                {{ personalActivityStats[selectedActivityPeriod][mode].skill_value }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.user-cabinet__personal-activity-stats {
  background-color: var(--color-bg-tertiary);
  padding: 15px;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border);
  margin-bottom: 20px;
}

.user-cabinet__section-title {
  font-size: var(--font-size-xlarge);
  color: var(--color-accent-success);
  margin-top: 0;
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border-hover);
  text-align: center;
}

.loading-message {
  text-align: center;
  padding: 20px;
  font-size: var(--font-size-large);
}

.stats-filters {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.filter-button {
  padding: 8px 16px;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-muted);
  font-family: var(--font-family-primary);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-button:hover {
  border-color: var(--color-accent-primary);
  color: var(--color-text-default);
}

.filter-button.active {
  background-color: var(--color-accent-primary);
  color: var(--color-text-dark);
  border-color: var(--color-accent-primary);
  font-weight: bold;
}

.stats-table-container {
  overflow-x: auto;
}

.user-cabinet__stats-table {
  width: 100%;
  border-collapse: collapse;
}

.user-cabinet__stats-table th,
.user-cabinet__stats-table td {
  padding: 10px;
  border: 1px solid var(--color-border);
  text-align: center;
}

.user-cabinet__stats-table th {
  background-color: var(--color-bg-secondary);
  font-weight: bold;
}

.user-cabinet__stats-table td:first-child {
  text-align: left;
  font-weight: bold;
}

.user-cabinet__stats-table .skill-value {
  font-weight: bold;
  color: var(--color-accent-success);
}
</style>
