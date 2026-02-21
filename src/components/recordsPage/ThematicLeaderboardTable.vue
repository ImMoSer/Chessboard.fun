<script setup lang="ts">
import InfoIcon from '@/shared/ui/InfoIcon.vue'
import type { FinishHimLeaderboardEntry, ThematicLeaderboardEntry } from '@/types/api.types'
import { FINISH_HIM_THEMES, PRACTICAL_CHESS_CATEGORIES, THEORY_ENDING_CATEGORIES } from '@/types/api.types'
import type { DataTableColumns } from 'naive-ui'
import { computed, h, ref, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'

// Swiper imports
import 'swiper/css'
import 'swiper/css/free-mode'
import 'swiper/css/navigation'
import { FreeMode, Mousewheel, Navigation } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/vue'

const props = defineProps({
  title: { type: String, required: true },
  data: {
    type: Object as PropType<
      Record<string, FinishHimLeaderboardEntry[]> | Record<string, ThematicLeaderboardEntry[]>
    >,
    required: true,
  },
  colorClass: { type: String, required: true },
  infoTopic: { type: String, required: false },
})

const { t } = useI18n()
const activeTab = ref('')

const availableThemes = computed(() => {
  const dataKeys = Object.keys(props.data)

  // Decide which category list to use for sorting based on the dataset content
  // We check if the data contains keys that are specific to a certain mode
  let order: readonly string[] = []

  if (dataKeys.some(k => (FINISH_HIM_THEMES as readonly string[]).includes(k))) {
     order = FINISH_HIM_THEMES
  } else if (dataKeys.some(k => (THEORY_ENDING_CATEGORIES as readonly string[]).includes(k))) {
     order = THEORY_ENDING_CATEGORIES
  } else if (dataKeys.some(k => (PRACTICAL_CHESS_CATEGORIES as readonly string[]).includes(k))) {
     order = PRACTICAL_CHESS_CATEGORIES
  }

  // Filter the order list to only include keys present in data
  const sorted = order.filter(theme => dataKeys.includes(theme))

  // Append any keys in data that were not in the order list (fallback)
  const remaining = dataKeys.filter(theme => !sorted.includes(theme))

  return [...sorted, ...remaining]
})

// Set default active tab when availableThemes changes or on initial load
watch(
  availableThemes,
  (newThemes) => {
    if (!activeTab.value && newThemes.length > 0) {
      activeTab.value = newThemes[0] ?? ''
    }
  },
  { immediate: true },
)

const tierToPieceMap: Record<string, string> = {
  Pawn: 'wP.svg',
  Knight: 'wN.svg',
  Bishop: 'wB.svg',
  Rook: 'wR.svg',
  Queen: 'wQ.svg',
  King: 'wK.svg',
}

const getSubscriptionIcon = (tier?: string) => {
  if (!tier || !tierToPieceMap[tier]) return null
  return `/piece/alpha/${tierToPieceMap[tier]}`
}

const getThemeLabel = (theme: string) => {
  if ((FINISH_HIM_THEMES as readonly string[]).includes(theme)) {
    return t(`chess.finishHim.category.${theme}`, { defaultValue: theme })
  }
  return t(`chess.endings.${theme}`, { defaultValue: theme })
}

const getThemeIcon = (theme: string) => {
  if (theme === 'expert') return '🎓'
  if (theme === 'auto') return '✨'
  const icons: Record<string, string> = {
    'pawn': '♔♟',
    'bishop': '♗♙',
    'knight': '♘♙',
    'queen': '♕♙',
    'rook': '♖',
    'rookPawn': '♖♙',
    'rookPieces': '♖♘♗',
    'knightBishop': '♘♗',
    'queenPieces': '♕♘♗',
    'extraPawn': '♟️',
    'materialEquality': '⚖️',
    'exchange': '🔄'
  }
  return icons[theme] || ''
}

const columns = computed<DataTableColumns<FinishHimLeaderboardEntry | ThematicLeaderboardEntry>>(() => [
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
        h(
          'n-a',
          {
            href: `https://lichess.org/@/${row.lichess_id}`,
            target: '_blank',
            style: { fontWeight: 'bold' },
          },
          row.username,
        ),
      ])
    },
  },
  {
    title: t('records.table.score'),
    key: 'score',
    align: 'right',
    render(row) {
      if ('score' in row) return h('span', { class: 'mode-score-value' }, (row as ThematicLeaderboardEntry).score)
      return h('span', { class: 'mode-score-value' }, (row as FinishHimLeaderboardEntry).best_time + 's')
    },
  },
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
        <swiper
          :modules="swiperModules"
          :slides-per-view="'auto'"
          :space-between="16"
          :navigation="true"
          :mousewheel="{ forceToAxis: true }"
          :free-mode="true"
          class="category-swiper"
        >
          <swiper-slide v-for="theme in availableThemes" :key="theme" class="theme-slide">
            <n-tooltip trigger="hover">
              <template #trigger>
                <div
                  class="theme-button"
                  :class="{
                    active: activeTab === theme,
                    'is-composite': (getThemeIcon(theme) || '').length > 1,
                  }"
                  @click="activeTab = theme"
                >
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
          <n-data-table
            :columns="columns"
            :data="props.data[activeTab] || []"
            :row-key="(row: FinishHimLeaderboardEntry | ThematicLeaderboardEntry) => row.lichess_id"
            size="small"
            striped
            class="records-table"
            :max-height="400"
          />
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
  background-color: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--glass-border);
  overflow: hidden;
  margin-bottom: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.main-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.03);
}

.finishHimLeaderboard .card-title { color: var(--color-neon-purple); }
.theoryLeaderboard .card-title { color: var(--color-accent-warning); }
.practicalLeaderboard .card-title { color: var(--color-neon-lime); }

.card-title {
  font-size: 1.4rem;
  margin: 0;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
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
  min-width: 60px;
  height: 50px;
  padding: 0 8px;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--color-text-muted);
}

.theme-button:hover {
  border-color: var(--color-neon-cyan);
  background-color: var(--glass-bg-hover);
  transform: translateY(-2px);
  color: var(--color-text-default);
}

.theme-button.active {
  background-color: rgba(0, 242, 255, 0.15);
  border-color: var(--color-neon-cyan);
  color: var(--color-neon-cyan);
  box-shadow: 0 0 15px rgba(0, 242, 255, 0.2);
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
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.2);
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
  background-color: rgba(255, 255, 255, 0.05) !important;
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
  --n-td-color-striped: rgba(255, 255, 255, 0.035);
}
@media (max-width: 768px) {
  .main-header {
    padding: 11px 14px;
  }

  .card-title {
    font-size: 1rem;
    letter-spacing: 1px;
    gap: 8px;
  }

  .modes-container {
    padding: 14px 8px;
  }

  .theme-button {
    min-width: 42px;
    height: 35px;
    padding: 0 6px;
    border-radius: 6px;
  }

  .theme-icon {
    font-size: 1.4rem;
  }

  .theme-button.is-composite .theme-icon {
    font-size: 1.05rem;
  }

  .mode-score-value {
    font-size: 0.8rem;
  }

  :deep(.n-data-table-td) {
    padding: 8px 6px !important;
    font-size: 0.75rem;
  }

  :deep(.n-data-table-th) {
    font-size: 0.6rem;
    padding: 8px 6px !important;
  }
}
</style>
