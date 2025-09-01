<!-- src/components/recordsPage/SkillLeaderboardTable.vue -->
<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  OverallSkillLeaderboardEntry,
  SkillStreakLeaderboardEntry,
  SkillByMode,
  SkillPeriod,
} from '@/types/api.types'

type LeaderboardEntry = OverallSkillLeaderboardEntry | SkillStreakLeaderboardEntry

const props = defineProps({
  title: { type: String, required: true },
  entries: { type: Array as PropType<LeaderboardEntry[]>, required: true },
  colorClass: { type: String, required: true },
  showStreak: { type: Boolean, default: false },
  showFilter: { type: Boolean, default: false },
  showTimer: { type: Boolean, default: false },
  isLoading: { type: Boolean, default: false },
  selectedPeriod: { type: String as PropType<SkillPeriod>, default: '7' },
})

const emit = defineEmits<{
  (e: 'period-change', period: SkillPeriod): void
}>()

const { t } = useI18n()

const tierToPieceMap: { [key: string]: string } = {
  Pawn: 'wP.svg',
  Knight: 'wN.svg',
  Bishop: 'wB.svg',
  Rook: 'wR.svg',
  Queen: 'wQ.svg',
  King: 'wK.svg',
}

const skillModes: { key: keyof SkillByMode; nameKey: string }[] = [
  { key: 'finishHim', nameKey: 'userCabinet.stats.modes.finishHim' },
  { key: 'attack', nameKey: 'userCabinet.stats.modes.attack' },
  { key: 'tower', nameKey: 'userCabinet.stats.modes.tower' },
  { key: 'tacticalTrainer', nameKey: 'userCabinet.stats.modes.tacticalTrainer' },
]

const getSubscriptionIcon = (tier?: string) => {
  if (!tier || !tierToPieceMap[tier]) return null
  return `/piece/alpha/${tierToPieceMap[tier]}`
}

const getSkillSegmentStyle = (
  skillByMode: SkillByMode,
  totalSkill: number,
  mode: keyof SkillByMode,
) => {
  const skillValue = skillByMode[mode] || 0
  if (totalSkill === 0 || skillValue === 0) return { width: '0%' }
  const width = (skillValue / totalSkill) * 100
  return { width: `${width}%` }
}

const localResetTimeMessage = computed(() => {
  if (!props.showTimer) return ''
  const now = new Date()
  const tomorrowUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  )
  const localTime = tomorrowUTC.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
  return t('userCabinet.stats.activity.titleWithTime', { time: localTime })
})

const handlePeriodChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('period-change', target.value as SkillPeriod)
}
</script>

<template>
  <div class="records-page__table-container" :class="colorClass">
    <h3 class="records-page__table-title">{{ title }}</h3>
    <h5 v-if="showTimer" class="reset-timer-message">{{ localResetTimeMessage }}</h5>

    <div v-if="showFilter" class="stats-filters">
      <select @change="handlePeriodChange" :value="selectedPeriod">
        <option value="7">{{ t('userCabinet.stats.periods.week') }}</option>
        <option value="14">{{ t('records.periods.days14') }}</option>
        <option value="21">{{ t('records.periods.days21') }}</option>
        <option value="30">{{ t('userCabinet.stats.periods.month') }}</option>
      </select>
    </div>

    <div class="skill-legend">
      <div v-for="mode in skillModes" :key="mode.key" class="legend-item">
        <span :class="`legend-color-swatch ${mode.key}`"></span>
        <span class="legend-label">{{ t(mode.nameKey) }}</span>
      </div>
    </div>

    <div v-if="isLoading" class="loading-message">{{ t('common.loading') }}</div>
    <table v-else class="records-page__table">
      <thead>
        <tr>
          <th class="text-center">{{ t('records.table.rank') }}</th>
          <th class="text-left">{{ t('records.table.player') }}</th>
          <th v-if="showStreak" class="text-center">{{ t('records.table.streakDays') }}</th>
          <th class="text-right">{{ t('records.table.totalSkill') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(entry, index) in entries" :key="entry.lichess_id">
          <td class="text-center">{{ index + 1 }}</td>
          <td class="text-left">
            <img
              v-if="getSubscriptionIcon(entry.subscriptionTier)"
              :src="getSubscriptionIcon(entry.subscriptionTier)!"
              class="records-page__sub-icon"
              :alt="entry.subscriptionTier || 'N/A'"
            />
            <a :href="`https://lichess.org/@/${entry.lichess_id}`" target="_blank">{{
              entry.username
            }}</a>
          </td>
          <td v-if="showStreak" class="text-center">
            {{ (entry as SkillStreakLeaderboardEntry).current_streak }}
          </td>
          <td class="text-right">
            <span class="total-skill-value">{{ entry.total_skill }}</span>
            <div class="skill-progress-bar">
              <div
                v-for="mode in skillModes"
                :key="mode.key"
                :class="`skill-bar-segment ${mode.key}`"
                :style="getSkillSegmentStyle(entry.skill_by_mode, entry.total_skill, mode.key)"
                :title="`${t(mode.nameKey)}: ${entry.skill_by_mode[mode.key] || 0}`"
              ></div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* Стили скопированы и адаптированы из RecordsPageView */
.records-page__table-container {
  padding: 0;
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.records-page__table-title {
  color: var(--color-bg-primary);
  font-size: var(--font-size-large);
  padding: 10px;
  margin: 0;
  text-align: center;
  border-bottom: 1px solid var(--color-border-hover);
  font-weight: var(--font-weight-bold);
}
.skillStreak .records-page__table-title {
  background-color: var(--color-accent-success);
}
.topToday .records-page__table-title {
  background-color: var(--color-accent-warning);
}
.overallSkill .records-page__table-title {
  background-color: var(--color-accent-primary);
}
.reset-timer-message {
  text-align: center;
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
  background-color: var(--color-bg-tertiary);
  padding: 5px;
  margin: 0;
}
.stats-filters {
  display: flex;
  justify-content: center;
  padding: 10px;
  background-color: var(--color-bg-tertiary);
}
.stats-filters select {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--color-border-hover);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-default);
  font-size: var(--font-size-base);
  cursor: pointer;
}
.skill-legend {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 15px;
  padding: 10px;
  background-color: var(--color-bg-tertiary);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.legend-color-swatch {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid var(--color-border-hover);
}
.legend-color-swatch.finishHim {
  background-color: var(--color-accent-secondary);
}
.legend-color-swatch.attack {
  background-color: var(--color-accent-warning);
}
.legend-color-swatch.tower {
  background-color: var(--color-violett-lichess);
}
.legend-color-swatch.tacticalTrainer {
  background-color: var(--color-accent-success);
}
.legend-label {
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
}
.loading-message {
  text-align: center;
  padding: 20px;
}
.records-page__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-base);
}
.records-page__table th,
.records-page__table td {
  padding: 3px 3px;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}
.records-page__table th {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-muted);
}
.records-page__table tbody tr:nth-child(even) {
  background-color: var(--color-bg-tertiary);
}
.records-page__table tbody tr:hover {
  background-color: var(--color-border-hover);
}
.records-page__table td a {
  color: var(--color-text-link);
  text-decoration: none;
  font-weight: var(--font-weight-bold);
}
.records-page__sub-icon {
  width: auto;
  height: 1.7em;
  vertical-align: -0.4em;
  margin-right: 6px;
}
.total-skill-value {
  font-weight: bold;
  margin-right: 10px;
}
.skill-progress-bar {
  display: inline-flex;
  width: 150px;
  height: 16px;
  background-color: var(--color-bg-primary);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--color-border-hover);
  vertical-align: middle;
}
.skill-bar-segment {
  height: 100%;
}
.skill-bar-segment.finishHim {
  background-color: var(--color-accent-secondary);
}
.skill-bar-segment.attack {
  background-color: var(--color-accent-warning);
}
.skill-bar-segment.tower {
  background-color: var(--color-violett-lichess);
}
.skill-bar-segment.tacticalTrainer {
  background-color: var(--color-accent-success);
}
.text-left {
  text-align: left;
}
.text-center {
  text-align: center;
}
.text-right {
  text-align: right;
}
</style>
