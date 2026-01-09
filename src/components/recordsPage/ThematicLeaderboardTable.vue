<script setup lang="ts">
import type { AdvantageLeaderboardEntry } from '@/types/api.types'
import type { DataTableColumns } from 'naive-ui'
import { computed, h, ref, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import InfoIcon from '../InfoIcon.vue'

const props = defineProps({
  title: { type: String, required: true },
  data: { type: Object as PropType<Record<string, AdvantageLeaderboardEntry[]>>, required: true },
  colorClass: { type: String, required: true },
  infoTopic: { type: String, required: false },
})

const { t, te } = useI18n()
const currentShift = ref(0)
const activeTab = ref('')

const availableThemes = computed(() => {
  const dataKeys = Object.keys(props.data)
  const ALL_THEMES_ORDER = [
    'pawn', 'knight', 'bishop', 'rookPawn', 'queen', 'knightBishop',
    'rookPieces', 'queenPieces', 'expert'
  ]
  const sorted = ALL_THEMES_ORDER.filter(theme => dataKeys.includes(theme))
    .concat(dataKeys.filter(theme => !ALL_THEMES_ORDER.includes(theme)))

  return sorted
})

// Set default active tab when availableThemes changes or on initial load
watch(availableThemes, (newThemes) => {
  if (!activeTab.value && newThemes.length > 0) {
    activeTab.value = newThemes[0] ?? ''
  }
}, { immediate: true })

const maxShift = computed(() => {
  return Math.max(0, availableThemes.value.length - 3)
})

const scrollTabs = (direction: 'left' | 'right') => {
  if (direction === 'left') {
    currentShift.value = Math.max(0, currentShift.value - 1)
  } else {
    currentShift.value = Math.min(maxShift.value, currentShift.value + 1)
  }
}

const tierToPieceMap: Record<string, string> = {
  Pawn: 'wP.svg', Knight: 'wN.svg', Bishop: 'wB.svg', Rook: 'wR.svg', Queen: 'wQ.svg', King: 'wK.svg',
}

const getSubscriptionIcon = (tier?: string) => {
  if (!tier || !tierToPieceMap[tier]) return null
  return `/piece/alpha/${tierToPieceMap[tier]}`
}

const getThemeLabel = (theme: string) => {
  if (te(`theoryEndings.categories.${theme}.name`)) return t(`theoryEndings.categories.${theme}.name`)
  if (te(`themes.${theme}`)) return t(`themes.${theme}`)
  return theme
}

const getThemeIcon = (theme: string) => {
  if (te(`theoryEndings.categories.${theme}.icon`)) return t(`theoryEndings.categories.${theme}.icon`)
  const fallbacks: Record<string, string> = {
    expert: '⭐', pawn: '♟', knight: '♞', bishop: '♝', rook: '♜', queen: '♛', king: '♚',
    rookPawn: '♖♙', rookPieces: '♖♘♗', knightBishop: '♘♗', queenPieces: '♕♘♗'
  }
  return fallbacks[theme] || ''
}

const columns = computed<DataTableColumns<AdvantageLeaderboardEntry>>(() => [
  { title: t('records.table.rank'), key: 'rank', align: 'center', width: 45 },
  {
    title: t('records.table.player'),
    key: 'username',
    minWidth: 160,
    ellipsis: { tooltip: true },
    render(row) {
      const icon = getSubscriptionIcon(row.subscriptionTier)
      return h('div', { style: { display: 'flex', alignItems: 'center' } }, [
        icon ? h('img', { src: icon, style: { height: '22px', marginRight: '6px' } }) : null,
        h('n-a', {
          href: `https://lichess.org/@/${row.lichess_id}`,
          target: '_blank',
          style: { fontWeight: 'bold' }
        }, row.username)
      ])
    }
  },
  {
    title: t('records.table.score'),
    key: 'score',
    align: 'right',
    render(row) {
      return h('span', { class: 'mode-score-value' }, row.score)
    }
  },
  { title: t('records.table.daysOld'), key: 'days_old', align: 'right', render: (row) => `${row.days_old}d` }
])
</script>

<template>
  <div class="records-card" :class="colorClass">
    <!-- Header with centered title and arrows -->
    <div class="card-header main-header">
      <div class="header-controls">
        <button v-if="availableThemes.length > 3" class="nav-arrow" :disabled="currentShift === 0"
          @click="scrollTabs('left')">◀</button>

        <h3 class="card-title">
          {{ title }}
          <InfoIcon v-if="infoTopic" :topic="infoTopic" />
        </h3>

        <button v-if="availableThemes.length > 3" class="nav-arrow" :disabled="currentShift === maxShift"
          @click="scrollTabs('right')">▶</button>
      </div>
    </div>

    <div class="modes-container">
      <!-- Carousel Window for Tabs -->
      <div class="tabs-carousel-window" v-if="availableThemes.length > 0">
        <n-tabs v-model:value="activeTab" type="segment" animated class="custom-thematic-tabs">
          <n-tab-pane v-for="theme in availableThemes" :key="theme" :name="theme" :tab="theme">
            <template #tab>
              <n-tooltip trigger="hover">
                <template #trigger>
                  <div class="icon-tab-content">
                    <span class="icon-glyph">{{ getThemeIcon(theme) || getThemeLabel(theme) }}</span>
                  </div>
                </template>
                {{ getThemeLabel(theme) }}
              </n-tooltip>
            </template>

            <div class="table-container">
              <n-data-table :columns="columns" :data="props.data[theme] || []" :row-key="(row: any) => row.lichess_id"
                size="small" striped class="records-table" :max-height="400" />
            </div>
          </n-tab-pane>
        </n-tabs>
      </div>

      <div v-if="availableThemes.length === 0" class="no-data">
        {{ t('userCabinet.stats.noData') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.records-card {
  background-color: var(--color-bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--color-border-hover);
  overflow: hidden;
  margin-bottom: 20px;
}

.main-header {
  padding: 12px 20px;
  border-bottom: 1px solid var(--color-border-hover);
}

.header-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.advantageLeaderboard .main-header {
  background-color: var(--color-accent-secondary-hover);
}

.theoryLeaderboard .main-header {
  background-color: var(--color-accent-warning-hover);
}

.card-title {
  color: var(--color-bg-primary);
  font-size: 1.25rem;
  margin: 0;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-arrow {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: var(--color-bg-primary);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 0.75rem;
}

.nav-arrow:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.4);
  transform: scale(1.1);
}

.nav-arrow:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.modes-container {
  padding: 16px;
}

/* CAROUSEL FIXED WINDOW */
.tabs-carousel-window {
  width: 100%;
  max-width: 300px;
  /* 3 tablets of 100px */
  margin: 0 auto;
  overflow: hidden;
  /* This hides the other tabs */
  position: relative;
  padding-bottom: 5px;
}

.icon-tab-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.icon-glyph {
  font-size: 1.5rem;
  line-height: 1;
}

.table-container {
  margin-top: 16px;
  border: 1px solid var(--color-border-hover);
  border-radius: 8px;
  overflow: hidden;
}

.mode-score-value {
  font-weight: 700;
  color: var(--color-accent-warning);
  font-family: monospace;
}

.no-data {
  text-align: center;
  padding: 30px;
  color: var(--color-text-muted);
}

/* NAIVE UI OVERRIDES */

/* Force NAV to shift but keep PANE static */
:deep(.n-tabs-nav) {
  transform: translateX(calc(-1 * v-bind(currentShift) * 100px)) !important;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: transparent !important;
  border: none !important;
}

:deep(.n-tabs-nav-scroll-content) {
  display: flex !important;
  flex-wrap: nowrap !important;
  width: max-content !important;
  gap: 0 !important;
}

:deep(.n-tabs-tab) {
  width: 100px !important;
  /* EXACT width for robust calculation */
  min-width: 100px !important;
  flex: 0 0 100px !important;
  justify-content: center !important;
  border: 1px solid var(--color-border) !important;
  border-radius: 8px !important;
  margin: 0 4px !important;
  /* Visual gap within the 100px window? No, 100px is the anchor */
  /* Let's adjust to 100px total including margin */
  width: 92px !important;
  margin: 0 4px !important;
  transition: all 0.2s;
}

:deep(.n-tabs-tab--active) {
  background-color: var(--color-bg-tertiary) !important;
  border-color: var(--color-border-hover) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Ensure the table doesn't shift with the nav */
:deep(.custom-thematic-tabs) {
  display: flex;
  flex-direction: column;
}

:deep(.n-tabs-pane-wrapper) {
  /* Break out of the 300px window to show full table */
  width: calc(100vw - 64px);
  /* Based on page padding */
  max-width: 1200px;
  position: relative;
  left: 50%;
  transform: translateX(-50%);
}

@media (min-width: 1200px) {
  :deep(.n-tabs-pane-wrapper) {
    width: 100%;
    left: 0;
    transform: none;
  }
}

@media (max-width: 600px) {
  .tabs-carousel-window {
    max-width: 270px;
    /* 3 tabs of 90px */
  }

  :deep(.n-tabs-nav) {
    transform: translateX(calc(-1 * v-bind(currentShift) * 90px)) !important;
  }

  :deep(.n-tabs-tab) {
    width: 82px !important;
    margin: 0 4px !important;
    flex: 0 0 82px !important;
  }
}
</style>
