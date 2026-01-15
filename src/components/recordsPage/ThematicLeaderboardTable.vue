<script setup lang="ts">
import type { AdvantageLeaderboardEntry } from '@/types/api.types'
import { getThemeTranslationKey } from '@/utils/theme-mapper'
import type { DataTableColumns } from 'naive-ui'
import { computed, h, ref, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import InfoIcon from '../InfoIcon.vue'

// Swiper imports
import 'swiper/css'
import 'swiper/css/free-mode'
import 'swiper/css/navigation'
import { FreeMode, Mousewheel, Navigation } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/vue'

const props = defineProps({
  title: { type: String, required: true },
  data: { type: Object as PropType<Record<string, AdvantageLeaderboardEntry[]>>, required: true },
  colorClass: { type: String, required: true },
  infoTopic: { type: String, required: false },
})

const { t, te } = useI18n()
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

const tierToPieceMap: Record<string, string> = {
  Pawn: 'wP.svg', Knight: 'wN.svg', Bishop: 'wB.svg', Rook: 'wR.svg', Queen: 'wQ.svg', King: 'wK.svg',
}

const getSubscriptionIcon = (tier?: string) => {
  if (!tier || !tierToPieceMap[tier]) return null
  return `/piece/alpha/${tierToPieceMap[tier]}`
}

const getThemeLabel = (theme: string) => {
  const key = getThemeTranslationKey(theme)
  return t(`chess.themes.${key}`, { defaultValue: theme })
}

const getThemeIcon = (theme: string) => {
  const key = getThemeTranslationKey(theme)
  if (te(`theoryEndings.categories.${key}.icon`)) return t(`theoryEndings.categories.${key}.icon`)
  if (te(`practicalChess.categories.${key}.icon`)) return t(`practicalChess.categories.${key}.icon`)
  const fallbacks: Record<string, string> = {
    expert: '⭐', pawn: '♟', knight: '♞', bishop: '♝', rook: '♜', queen: '♛', king: '♚',
    rook_pawn_endgame: '♖♙', rook_pieces_endgame: '♖♘♗', knight_vs_bishop: '♘♗', queen_pieces_endgame: '♕♘♗'
  }
  return fallbacks[key] || ''
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
        icon ? h('img', { src: icon, style: { height: '25px', marginRight: '5px' } }) : null,
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
  }
])

const swiperModules = [Navigation, Mousewheel, FreeMode]
</script>

<template>
  <div class="records-card" :class="colorClass">
    <!-- Header: Pure and Simple -->
    <div class="card-header main-header">
      <h3 class="card-title">
        {{ title }}
        <InfoIcon v-if="infoTopic" :topic="infoTopic" />
      </h3>
    </div>

    <div class="modes-container">
      <!-- Category Selection Ribbon using Swiper -->
      <div class="category-ribbon" v-if="availableThemes.length > 0">
        <swiper :modules="swiperModules" :slides-per-view="'auto'" :space-between="16" :navigation="true"
          :mousewheel="{ forceToAxis: true }" :free-mode="true" class="category-swiper">
          <swiper-slide v-for="theme in availableThemes" :key="theme" class="theme-slide">
            <n-tooltip trigger="hover">
              <template #trigger>
                <div class="theme-button" :class="{
                  active: activeTab === theme,
                  'is-composite': (getThemeIcon(theme) || '').length > 1
                }" @click="activeTab = theme">
                  <span class="theme-icon">{{ getThemeIcon(theme) || getThemeLabel(theme) }}</span>
                </div>
              </template>
              {{ getThemeLabel(theme) }}
            </n-tooltip>
          </swiper-slide>
        </swiper>
      </div>

      <!-- Active Table View -->
      <div class="table-view-container" v-if="activeTab && props.data[activeTab]">
        <div class="table-container">
          <n-data-table :columns="columns" :data="props.data[activeTab] || []" :row-key="(row: any) => row.lichess_id"
            size="small" striped class="records-table" :max-height="400" />
        </div>
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
  border-radius: 5px;
  border: 1px solid var(--color-border-hover);
  overflow: hidden;
  margin-bottom: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.main-header {
  padding: 12px 14px;
  border-bottom: 1px solid var(--color-border-hover);
}

.advantageLeaderboard .main-header {
  background: linear-gradient(135deg, var(--color-accent-secondary-hover), var(--color-accent-secondary));
}

.theoryLeaderboard .main-header {
  background: linear-gradient(135deg, var(--color-accent-warning-hover), var(--color-accent-warning));
}

.practicalLeaderboard .main-header {
  background: linear-gradient(135deg, var(--color-accent-primary-hover), var(--color-accent-primary));
}

.card-title {
  color: var(--color-bg-primary);
  font-size: 1.3rem;
  margin: 0;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  letter-spacing: 0.5px;
}

.modes-container {
  padding: 20px 12px;
}

/* Category Ribbon Styling */
.category-ribbon {
  margin-bottom: 12px;
  position: relative;
  padding: 0 5px;
  /* More space for swiper arrows */
}

.category-swiper {
  padding: 4px 0;
}

.theme-slide {
  width: auto !important;
  /* Allow slides to fit content */
}

.theme-button {
  min-width: 56px;
  height: 45px;
  padding: 0 5px;
  border-radius: 5px;
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--color-text-default);
  white-space: nowrap;
}

.theme-button:hover {
  border-color: var(--color-accent-primary);
  background-color: var(--color-bg-secondary);
  transform: translateY(-2px);
}

.theme-button.active {
  background-color: var(--color-accent-primary);
  border-color: var(--color-accent-primary);
  color: white;
  box-shadow: 0 4px 12px rgba(var(--color-accent-primary-rgb), 0.3);
}

.theme-icon {
  font-size: 2rem;
  line-height: 1;
}

/* Scale down composite icons (e.g. Rook + Pieces) */
.theme-button.is-composite .theme-icon {
  font-size: 1.5rem;
  letter-spacing: -2px;
  /* Pull glyphs closer */
}

.table-view-container {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.table-container {
  border: 1px solid var(--color-border-hover);
  border-radius: 5px;
  overflow: hidden;
  background-color: var(--color-bg-primary);
}

.mode-score-value {
  font-weight: 800;
  color: var(--color-accent-warning);
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.1rem;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: var(--color-text-muted);
  font-style: italic;
}

/* Swiper custom overrides */
:deep(.swiper-button-next),
:deep(.swiper-button-prev) {
  width: 24px;
  height: 24px;
  background: var(--color-bg-tertiary);
  border-radius: 50%;
  color: var(--color-text-default);
  top: 50%;
  margin-top: -12px;
  transition: all 0.2s;
  border: 1px solid var(--color-border);
}

:deep(.swiper-button-next:after),
:deep(.swiper-button-prev:after) {
  font-size: 10px;
  font-weight: bold;
}

:deep(.swiper-button-next:hover),
:deep(.swiper-button-prev:hover) {
  background: var(--color-accent-primary);
  color: white;
}

:deep(.swiper-button-disabled) {
  opacity: 0 !important;
  pointer-events: none;
}

:deep(.swiper-button-prev) {
  left: -5px;
}

:deep(.swiper-button-next) {
  right: -5px;
}

/* Naive UI Styling */
:deep(.n-data-table-th) {
  background-color: var(--color-bg-tertiary) !important;
  color: var(--color-text-muted) !important;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 1px;
}

:deep(.n-data-table-td) {
  padding: 12px 8px !important;
}

:deep(.records-table) {
  --n-td-color-striped: rgba(255, 255, 255, 0.02);
}
</style>
