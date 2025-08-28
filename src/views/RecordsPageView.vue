<!-- src/views/RecordsPageView.vue -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useRecordsStore } from '../stores/records.store'
import { storeToRefs } from 'pinia'
import type { SkillByMode, SkillPeriod, TowerId } from '../types/api.types'

const recordsStore = useRecordsStore()
const router = useRouter()
const { t } = useI18n()

const { isLoading, isSkillLeaderboardLoading, error, leaderboards, selectedSkillPeriod } =
  storeToRefs(recordsStore)

onMounted(() => {
  recordsStore.fetchLeaderboards()
})

const TOWER_DEFINITIONS: {
  id: TowerId
  nameKey: string
}[] = [
  { id: 'CM', nameKey: 'tower.names.CM' },
  { id: 'FM', nameKey: 'tower.names.FM' },
  { id: 'IM', nameKey: 'tower.names.IM' },
  { id: 'GM', nameKey: 'tower.names.GM' },
]

const tierToPieceMap: { [key: string]: string } = {
  Pawn: 'wP.svg',
  Knight: 'wN.svg',
  Bishop: 'wB.svg',
  Rook: 'wR.svg',
  Queen: 'wQ.svg',
  King: 'wK.svg',
}

const getSubscriptionIcon = (tier?: string) => {
  if (!tier || !tierToPieceMap[tier]) {
    return null
  }
  return `/piece/alpha/${tierToPieceMap[tier]}`
}

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const paddedSeconds = seconds < 10 ? `0${seconds}` : seconds
  return `${minutes}:${paddedSeconds}`
}

const handleChallengeClick = (
  mode: 'finish-him' | 'attack' | 'tower',
  puzzleId?: string,
  towerId?: string,
) => {
  if (mode === 'tower' && towerId) {
    router.push({ name: 'tower', params: { towerId } })
  } else if (puzzleId) {
    router.push({ name: mode, params: { puzzleId } })
  }
}

const handleSkillPeriodChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  recordsStore.changeSkillPeriod(target.value as SkillPeriod)
}

const skillModes: { key: keyof SkillByMode; nameKey: string }[] = [
  { key: 'finishHim', nameKey: 'userCabinet.stats.modes.finishHim' },
  { key: 'attack', nameKey: 'userCabinet.stats.modes.attack' },
  { key: 'tower', nameKey: 'userCabinet.stats.modes.tower' },
  { key: 'tacticalTrainer', nameKey: 'userCabinet.stats.modes.tacticalTrainer' },
]

const getSkillSegmentStyle = (
  skillByMode: SkillByMode,
  totalSkill: number,
  mode: keyof SkillByMode,
) => {
  const skillValue = skillByMode[mode] || 0
  if (skillValue === 0) return { width: '0%' }
  const width = totalSkill > 0 ? (skillValue / totalSkill) * 100 : 0
  return { width: `${width}%` }
}
</script>

<template>
  <div class="records-page">
    <img
      class="records-page__banner"
      src="/svg/ChessBoardLeader.svg"
      :alt="t('records.bannerAlt')"
    />

    <div v-if="isLoading" class="loading-message">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="error" class="records-page__error-message">
      {{ t('common.error') }}: {{ error }}
    </div>

    <div v-else-if="leaderboards" class="records-page__grid">
      <!-- Skill Streak Leaderboard -->
      <div
        v-if="leaderboards.skillStreakLeaderboard && leaderboards.skillStreakLeaderboard.length > 0"
        class="records-page__table-container records-page__table-container--skill-streak"
      >
        <h3 class="records-page__table-title">
          {{ t('records.titles.skillStreak') }}
        </h3>
        <div class="skill-legend">
          <div v-for="mode in skillModes" :key="mode.key" class="legend-item">
            <span :class="`legend-color-swatch ${mode.key}`"></span>
            <span class="legend-label">{{ t(mode.nameKey) }}</span>
          </div>
        </div>
        <table class="records-page__table">
          <thead>
            <tr>
              <th class="text-center">{{ t('records.table.rank') }}</th>
              <th class="text-left">{{ t('records.table.player') }}</th>
              <th class="text-center">{{ t('records.table.streakDays') }}</th>
              <th class="text-right">{{ t('records.table.totalSkill') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(entry, index) in leaderboards.skillStreakLeaderboard"
              :key="entry.lichess_id"
            >
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
              <td class="text-center">{{ entry.current_streak }}</td>
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

      <!-- Tower Leaderboards -->
      <div
        v-if="leaderboards.towerLeaderboards"
        class="records-page__table-container records-page__table-container--towerLeaderboard"
      >
        <h3 class="records-page__table-title">
          {{ t('records.titles.towerLeaderboard') }}
        </h3>
        <table class="records-page__table">
          <thead>
            <tr>
              <th class="text-center">{{ t('records.table.rank') }}</th>
              <th class="text-left">{{ t('records.table.player') }}</th>
              <th class="text-right">{{ t('records.table.time') }}</th>
              <th class="text-right">{{ t('records.table.daysOld') }}</th>
              <th class="text-center">{{ t('records.table.action') }}</th>
            </tr>
          </thead>
          <tbody v-for="towerDef in TOWER_DEFINITIONS" :key="towerDef.id">
            <template
              v-if="
                leaderboards.towerLeaderboards &&
                leaderboards.towerLeaderboards[towerDef.id] &&
                leaderboards.towerLeaderboards[towerDef.id]!.length > 0
              "
            >
              <tr
                class="records-page__table-section-header"
                :class="`records-page__table-section-header--${towerDef.id}`"
              >
                <th colspan="5">
                  {{ t(towerDef.nameKey) }}
                </th>
              </tr>
              <tr
                v-for="entry in leaderboards.towerLeaderboards[towerDef.id]"
                :key="entry.tower_id + entry.lichess_id"
              >
                <td class="text-center">{{ entry.rank }}</td>
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
                <td class="text-right">{{ formatTime(entry.best_time) }}</td>
                <td class="text-right">{{ entry.days_old }}d</td>
                <td class="text-center">
                  <button
                    class="records-page__challenge-button"
                    @click="handleChallengeClick('tower', undefined, entry.tower_id)"
                  >
                    {{ t('records.table.challenge') }}
                  </button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Finish Him Leaderboard -->
      <div
        v-if="leaderboards.finishHimLeaderboard && leaderboards.finishHimLeaderboard.length > 0"
        class="records-page__table-container records-page__table-container--finishHimLeaderboard"
      >
        <h3 class="records-page__table-title">{{ t('records.titles.topFinishHim') }}</h3>
        <table class="records-page__table">
          <thead>
            <tr>
              <th class="text-center">{{ t('records.table.rank') }}</th>
              <th class="text-left">{{ t('records.table.player') }}</th>
              <th class="text-right">{{ t('records.table.time') }}</th>
              <th class="text-right">{{ t('records.table.daysOld') }}</th>
              <th class="text-center">{{ t('records.table.action') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="entry in leaderboards.finishHimLeaderboard"
              :key="entry.puzzle_id + entry.lichess_id"
            >
              <td class="text-center">{{ entry.rank }}</td>
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
              <td class="text-right">{{ formatTime(entry.best_time) }}</td>
              <td class="text-right">{{ entry.days_old }}d</td>
              <td class="text-center">
                <!-- --- НАЧАЛО ИЗМЕНЕНИЙ --- -->
                <button
                  class="records-page__challenge-button"
                  @click="handleChallengeClick('finish-him', entry.puzzle_id)"
                >
                  {{ t('records.table.challenge') }}
                </button>
                <!-- --- КОНЕЦ ИЗМЕНЕНИЙ --- -->
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Attack Leaderboard -->
      <div
        v-if="leaderboards.attackLeaderboard && leaderboards.attackLeaderboard.length > 0"
        class="records-page__table-container records-page__table-container--attackLeaderboard"
      >
        <h3 class="records-page__table-title">{{ t('records.titles.topAttack') }}</h3>
        <table class="records-page__table">
          <thead>
            <tr>
              <th class="text-center">{{ t('records.table.rank') }}</th>
              <th class="text-left">{{ t('records.table.player') }}</th>
              <th class="text-right">{{ t('records.table.time') }}</th>
              <th class="text-right">{{ t('records.table.daysOld') }}</th>
              <th class="text-center">{{ t('records.table.action') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="entry in leaderboards.attackLeaderboard"
              :key="entry.puzzle_id + entry.lichess_id"
            >
              <td class="text-center">{{ entry.rank }}</td>
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
              <td class="text-right">{{ formatTime(entry.best_time) }}</td>
              <td class="text-right">{{ entry.days_old }}d</td>
              <td class="text-center">
                <button
                  class="records-page__challenge-button"
                  @click="handleChallengeClick('attack', entry.puzzle_id)"
                >
                  {{ t('records.table.challenge') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Overall Skill Leaderboard -->
      <div
        v-if="leaderboards.overallSkillLeaderboard"
        class="records-page__table-container records-page__table-container--overall-skill"
      >
        <h3 class="records-page__table-title">{{ t('records.titles.overallSkill') }}</h3>
        <div class="stats-filters">
          <select @change="handleSkillPeriodChange" :value="selectedSkillPeriod">
            <option value="7">
              {{ t('userCabinet.stats.periods.week') }}
            </option>
            <option value="14">
              {{ t('records.periods.days14') }}
            </option>
            <option value="21">
              {{ t('records.periods.days21') }}
            </option>
            <option value="30">
              {{ t('userCabinet.stats.periods.month') }}
            </option>
          </select>
        </div>
        <div class="skill-legend">
          <div v-for="mode in skillModes" :key="mode.key" class="legend-item">
            <span :class="`legend-color-swatch ${mode.key}`"></span>
            <span class="legend-label">{{ t(mode.nameKey) }}</span>
          </div>
        </div>
        <div v-if="isSkillLeaderboardLoading" class="loading-message">
          {{ t('common.loading') }}
        </div>
        <table v-else class="records-page__table">
          <thead>
            <tr>
              <th class="text-center">{{ t('records.table.rank') }}</th>
              <th class="text-left">{{ t('records.table.player') }}</th>
              <th class="text-right">{{ t('records.table.totalSkill') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(entry, index) in leaderboards.overallSkillLeaderboard"
              :key="entry.lichess_id"
            >
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
    </div>
  </div>
</template>

<style scoped>
/* src/features/recordsPage/recordsPage.css */

.records-page {
  padding: 20px;
  box-sizing: border-box;
  background-color: var(--color-bg-primary);
  color: var(--color-text-default);
  display: flex;
  flex-direction: column;
  gap: 25px; /* Увеличенный отступ между таблицами */
  width: 90vw;
  max-width: 900px; /* Увеличена максимальная ширина для всех таблиц */
  margin: 20px auto;
  height: auto;
  overflow: visible;
}

.records-page__banner {
  width: 100%;
  height: auto;
  object-fit: cover;
  max-height: 200px;
  border-radius: var(--panel-border-radius);
  align-self: center;
  max-width: 900px;
}

.records-page__error-message,
.records-page__no-data-message,
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
  display: grid;
  grid-template-columns: 1fr;
  gap: 25px;
  align-items: start;
}

.records-page__table-container {
  padding: 0;
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: auto;
  width: 100%;
  box-sizing: border-box;
}

.stats-filters {
  display: flex;
  justify-content: center;
  gap: 15px;
  padding: 10px;
  background-color: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border-hover);
  flex-wrap: wrap;
}

.stats-filters select {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--color-border-hover);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-default);
  font-family: var(--font-family-primary);
  font-size: var(--font-size-base);
  cursor: pointer;
}

.records-page__table-title {
  color: var(--color-bg-primary);
  font-size: var(--font-size-large);
  padding: 10px 10px;
  margin: 0;
  text-align: center;
  border-bottom: 1px solid var(--color-border-hover);
  font-weight: var(--font-weight-bold);
  font-family: var(--font-family-primary);
  flex-shrink: 0;
}

/* Цвета для всех заголовков таблиц */
.records-page__table-container--finishHimLeaderboard .records-page__table-title {
  background-color: var(--color-accent-secondary);
}
.records-page__table-container--towerLeaderboard .records-page__table-title {
  background-color: var(--color-violett-lichess);
}
.records-page__table-container--attackLeaderboard .records-page__table-title {
  background-color: var(--color-accent-warning);
}
.records-page__table-container--overall-skill .records-page__table-title {
  background-color: var(--color-accent-primary);
}
.records-page__table-container--skill-streak .records-page__table-title {
  background-color: var(--color-accent-success);
}

.records-page__no-data-message {
  padding: 20px;
  text-align: center;
  font-style: italic;
  color: var(--color-text-muted);
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
  color: var(--color-text-default);
  white-space: nowrap;
}

.records-page__table th.text-left,
.records-page__table td.text-left {
  text-align: left;
}
.records-page__table th.text-center,
.records-page__table td.text-center {
  text-align: center;
}
.records-page__table th.text-right,
.records-page__table td.text-right {
  text-align: right;
}

.records-page__table thead th {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-muted);
  font-weight: var(--font-weight-bold);
  font-family: var(--font-family-primary);
}

.records-page__table tbody tr:nth-child(even) {
  background-color: var(--color-bg-tertiary);
}

.records-page__table tbody tr:nth-child(odd) {
  background-color: var(--color-bg-secondary);
}

.records-page__table tbody tr:hover {
  background-color: var(--color-border-hover);
}

.records-page__table td a {
  color: var(--color-text-link);
  text-decoration: none;
  font-weight: var(--font-weight-bold);
}

.records-page__table td a:hover {
  text-decoration: underline;
  color: var(--color-text-link-hover);
}

.records-page__sub-icon {
  width: auto;
  height: 1.7em;
  vertical-align: -0.4em;
  margin-right: 6px;
}

/* Стили для Skill Progress Bar */
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
  transition: width 0.3s ease;
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

/* Стили для старых лидербордов */
.records-page__table-section-header th {
  font-size: var(--font-size-base);
  color: var(--color-bg-primary);
  padding: 8px 10px;
  text-align: center;
  font-weight: var(--font-weight-bold);
  border-bottom: 2px solid var(--color-bg-secondary);
  border-top: 2px solid var(--color-bg-secondary);
}

.records-page__table-section-header--CM th {
  background-color: var(--color-accent-primary);
}
.records-page__table-section-header--FM th {
  background-color: var(--color-accent-success);
}
.records-page__table-section-header--IM th {
  background-color: var(--color-accent-warning);
}
.records-page__table-section-header--GM th {
  background-color: var(--color-accent-error);
}

.records-page__challenge-button {
  background-color: var(--color-accent-success);
  color: var(--color-text-dark);
  border: 1px solid transparent;
  padding: 6px 14px;
  font-family: var(--font-family-primary);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  border-radius: var(--panel-border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1;
}

.records-page__challenge-button:hover:not(:disabled) {
  background-color: var(--color-accent-success-hover);
  border-color: var(--color-accent-success-hover);
  transform: translateY(-1px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .records-page {
    width: 100%;
    padding: 10px;
    gap: 15px;
  }
  .records-page__banner {
    max-height: 150px;
  }
  .records-page__grid {
    grid-template-columns: 1fr;
  }
  .records-page__table-title {
    font-size: var(--font-size-base);
  }
  .records-page__table {
    font-size: var(--font-size-small);
  }
  .skill-progress-bar {
    width: 100px;
  }
}
</style>
