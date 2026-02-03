<script setup lang="ts">
import {
    CalendarOutline,
    HourglassOutline,
    ListOutline,
    SettingsOutline,
    TrophyOutline,
} from '@vicons/ionicons5'
import {
    NButton,
    NButtonGroup,
    NCheckbox,
    NCheckboxGroup,
    NCollapseTransition,
    NGrid,
    NGridItem,
    NIcon,
    NSlider,
    NSpace,
    NText,
} from 'naive-ui'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    lichessApiService,
    type LichessMastersParams,
    type LichessOpeningResponse,
    type LichessParams,
} from '../../services/LichessApiService'
import { pgnService, pgnTreeVersion } from '../../services/PgnService'
import { useBoardStore } from '../../stores/board.store'
import { useOpeningSparringStore } from '../../stores/openingSparring.store'
import OpeningStatsTable from './OpeningStatsTable.vue'


const props = defineProps<{
  mode: 'sparring' | 'study'
  blurred?: boolean
}>()

const { t } = useI18n()
const boardStore = useBoardStore()
const examStore = useOpeningSparringStore()

const showSettings = ref(false)

// Active store depends on mode
const activeStore = computed(() => {
  if (props.mode === 'sparring') return examStore
  return null
})

// Local state for Study mode
const localStats = ref<LichessOpeningResponse | null>(null)
const localLoading = ref(false)
const localSource = ref<'lichess' | 'masters'>('lichess')
const localLichessParams = ref({
  ratings: [1800, 2000, 2200, 2500],
  speeds: ['blitz', 'rapid', 'classical'],
})
const localMastersParams = ref({
  since: 1952,
  until: new Date().getFullYear(),
  moves: 12,
  topGames: 10,
})

// Computed values that bridge Store vs Local
const stats = computed(() =>
  activeStore.value ? activeStore.value.currentStats : localStats.value,
)
const loading = computed(() =>
  activeStore.value ? activeStore.value.isLoading : localLoading.value,
)
const source = computed({
  get: () => (activeStore.value ? activeStore.value.dbSource : localSource.value),
  set: (val) => {
    if (activeStore.value) {
      activeStore.value.setDbSource(val)
    } else {
      localSource.value = val
      fetchLocalStats()
    }
  },
})

const lichessParams = computed(() =>
  activeStore.value ? activeStore.value.lichessParams : localLichessParams.value,
)
const mastersParams = computed(() =>
  activeStore.value ? activeStore.value.lichessMastersParams : localMastersParams.value,
)

const sortedTopGames = computed(() => {
  if (!stats.value?.topGames) return []
  return [...stats.value.topGames].sort((a, b) => {
    // Sort by year descending
    if (b.year !== a.year) return b.year - a.year
    // If year is same, try month sorting (ISO format "YYYY-MM")
    return b.month.localeCompare(a.month)
  })
})

// Pending settings to avoid rate limits
const pendingLichessParams = ref({ ...lichessParams.value })
const pendingMastersParams = ref({ ...mastersParams.value })

const isDirty = computed(() => {
  if (source.value === 'lichess') {
    return JSON.stringify(pendingLichessParams.value) !== JSON.stringify(lichessParams.value)
  } else {
    return JSON.stringify(pendingMastersParams.value) !== JSON.stringify(mastersParams.value)
  }
})

watch(showSettings, (val) => {
  if (val) {
    pendingLichessParams.value = JSON.parse(JSON.stringify(lichessParams.value))
    pendingMastersParams.value = JSON.parse(JSON.stringify(mastersParams.value))
  }
})

function applySettings() {
  if (source.value === 'lichess') {
    updateParams('lichess', pendingLichessParams.value)
  } else {
    updateParams('masters', pendingMastersParams.value)
  }
}

const AVAILABLE_RATINGS = [1800, 2000, 2200, 2500]
const AVAILABLE_SPEEDS = ['bullet', 'blitz', 'rapid', 'classical']

function handleSelectMove(uci: string) {
  if (props.mode === 'study') {
    boardStore.applyUciMove(uci)
  } else if (activeStore.value) {
    activeStore.value.handlePlayerMove(uci)
  }
}

async function fetchLocalStats() {
  if (props.mode !== 'study') return
  localLoading.value = true
  try {
    const fen = pgnService.getCurrentNavigatedFen()
    const params =
      localSource.value === 'masters' ? localMastersParams.value : localLichessParams.value
    const data = await lichessApiService.getStats(fen, localSource.value, params)
    localStats.value = data
  } catch (e) {
    console.error('[LichessOpeningExplorer] Failed to fetch stats:', e)
  } finally {
    localLoading.value = false
  }
}

function updateParams(
  type: 'lichess' | 'masters',
  newParams: LichessParams | LichessMastersParams,
) {
  if (activeStore.value) {
    if (type === 'lichess') {
      activeStore.value.setLichessParams(newParams as LichessParams)
    } else {
      activeStore.value.setLichessMastersParams(newParams as LichessMastersParams)
    }
  } else {
    if (type === 'lichess') {
      localLichessParams.value = { ...localLichessParams.value, ...(newParams as LichessParams) }
    } else {
      localMastersParams.value = {
        ...localMastersParams.value,
        ...(newParams as LichessMastersParams),
      }
    }
    fetchLocalStats()
  }
}

watch(
  [pgnTreeVersion, localSource, localLichessParams, localMastersParams],
  () => {
    if (props.mode === 'study') fetchLocalStats()
  },
  { deep: true },
)

onMounted(() => {
  if (props.mode === 'study') fetchLocalStats()
})
</script>

<template>
  <div class="lichess-opening-explorer" :class="{ blurred: blurred }">
    <div v-if="blurred" class="overlay">
      <n-text strong depth="1">{{ t('openingTrainer.stats.reviewModeOverlay') }}</n-text>
    </div>
    <div class="explorer-header">
      <div class="header-left">
        <n-button-group size="tiny">
          <n-button :secondary="source !== 'lichess'" @click="source = 'lichess'">
            Lichess
          </n-button>
          <n-button :secondary="source !== 'masters'" @click="source = 'masters'">
            Masters
          </n-button>

        </n-button-group>
      </div>
      <div class="header-right">
        <n-button
          quaternary
          circle
          size="small"
          @click="showSettings = !showSettings"
          :color="showSettings ? 'var(--color-accent)' : undefined"
        >
          <template #icon>
            <n-icon>
              <SettingsOutline />
            </n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <n-collapse-transition :show="showSettings">
      <div class="settings-panel">
        <div v-if="source === 'lichess'" class="settings-group">
          <n-grid :cols="2" :x-gap="12">
            <n-grid-item>
              <div class="compact-section">
                <n-text depth="3" strong class="section-label">
                  <n-icon>
                    <TrophyOutline />
                  </n-icon>
                  Ratings
                </n-text>
                <n-checkbox-group
                  :value="pendingLichessParams.ratings"
                  @update:value="(v: any) => (pendingLichessParams.ratings = v)"
                >
                  <n-space vertical :size="4">
                    <n-checkbox v-for="r in AVAILABLE_RATINGS" :key="r" :value="r">{{
                      r
                    }}</n-checkbox>
                  </n-space>
                </n-checkbox-group>
              </div>
            </n-grid-item>
            <n-grid-item>
              <div class="compact-section">
                <n-text depth="3" strong class="section-label">
                  <n-icon>
                    <HourglassOutline />
                  </n-icon>
                  Speeds
                </n-text>
                <n-checkbox-group
                  :value="pendingLichessParams.speeds"
                  @update:value="(v: any) => (pendingLichessParams.speeds = v)"
                >
                  <n-space vertical :size="4">
                    <n-checkbox v-for="s in AVAILABLE_SPEEDS" :key="s" :value="s">
                      <span style="text-transform: capitalize">{{ s }}</span>
                    </n-checkbox>
                  </n-space>
                </n-checkbox-group>
              </div>
            </n-grid-item>
          </n-grid>
        </div>
        <div v-if="source === 'masters'" class="settings-group">
          <n-space vertical :size="20">
            <div class="compact-section">
              <n-text depth="3" strong class="section-label">
                <n-icon>
                  <CalendarOutline />
                </n-icon>
                Years: {{ pendingMastersParams.since }} — {{ pendingMastersParams.until }}
              </n-text>
              <n-slider
                range
                :min="1952"
                :max="new Date().getFullYear()"
                :step="1"
                :value="[pendingMastersParams.since, pendingMastersParams.until]"
                @update:value="
                  (v: any) => {
                    pendingMastersParams.since = v[0]
                    pendingMastersParams.until = v[1]
                  }
                "
              />
            </div>
            <div class="compact-section">
              <n-text depth="3" strong class="section-label">
                <n-icon>
                  <ListOutline />
                </n-icon>
                Top Games: {{ pendingMastersParams.topGames }}
              </n-text>
              <n-slider
                :min="0"
                :max="10"
                :step="1"
                :value="pendingMastersParams.topGames"
                @update:value="(v: any) => (pendingMastersParams.topGames = v)"
              />
            </div>
          </n-space>
        </div>

        <div class="settings-actions">
          <n-button type="primary" size="small" block :disabled="!isDirty" @click="applySettings">
            Set Parameters
          </n-button>
        </div>
      </div>
    </n-collapse-transition>

    <div class="table-container">
      <div v-if="loading && !stats" class="loading-state">
        <div class="spinner-tiny"></div>
        <n-text depth="3">Loading stats...</n-text>
      </div>

      <OpeningStatsTable
        v-if="stats"
        :moves="stats.moves"
        :isReviewMode="true"
        :white="stats.white"
        :draws="stats.draws"
        :black="stats.black"
        :avg-elo="stats.avgElo"
        :avg-draw="stats.avgDraw"
        :avg-score="stats.avgScore"
        @select-move="handleSelectMove"
      />



      <!-- Top Games Section -->
      <div v-if="stats && sortedTopGames.length > 0" class="top-games-section">
        <div class="section-divider">
          <span class="divider-text">Top Master Games</span>
        </div>
        <div class="games-list">
          <a
            v-for="game in sortedTopGames"
            :key="game.id"
            :href="'https://lichess.org/' + game.id"
            target="_blank"
            class="game-row"
          >
            <div class="game-info">
              <span class="game-uci">{{ game.uci }}</span>
              <span class="game-players">
                <span class="player white">{{ game.white.name }}</span>
                <span class="vs">vs</span>
                <span class="player black">{{ game.black.name }}</span>
              </span>
            </div>
            <div class="game-meta">
              <span class="game-result" :class="game.winner">
                {{ game.winner === 'white' ? '1-0' : game.winner === 'black' ? '0-1' : '½-½' }}
              </span>
              <span class="game-year">{{ game.year }}</span>
            </div>
          </a>
        </div>
      </div>

      <div v-if="!loading && !stats" class="empty-state">
        <n-text depth="3">No statistics available for this position.</n-text>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lichess-opening-explorer {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  overflow: hidden;
  position: relative;
  flex: 1;
  min-height: 0;
}

.blurred {
  .explorer-header,
  .table-container {
    filter: blur(12px);
    opacity: 0.4;
    pointer-events: none;
  }
}

.overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  background: rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4px);
}

.explorer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--color-border);
}

.settings-panel {
  padding: 12px;
  background: rgba(var(--color-accent-rgb), 0.03);
  border-bottom: 1px solid var(--color-border);
}

.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.settings-actions {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(var(--color-accent-rgb), 0.1);
}

.table-container {
  flex: 1;
  min-height: 100px;
  overflow-y: auto;
}

.top-games-section {
  padding: 0 12px 12px;
}

.section-divider {
  display: flex;
  align-items: center;
  margin: 16px 0 12px;
  opacity: 0.6;
}

.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
  margin-left: 10px;
}

.divider-text {
  font-size: 0.7rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--color-text-secondary);
}

.games-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.game-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  color: var(--color-text-link);

  &:hover {
    background: rgba(var(--color-accent-rgb), 0.08);
    border-color: rgba(var(--color-accent-rgb), 0.2);
    transform: translateX(4px);
    color: var(--color-text-link-hover);
  }
}

.game-info {
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
}

.game-uci {
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  background: rgba(var(--color-accent-rgb), 0.1);
  color: var(--color-accent);
  padding: 2px 6px;
  border-radius: 4px;
  min-width: 45px;
  text-align: center;
}

.game-players {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vs {
  opacity: 0.4;
  font-size: 0.7rem;
}

.game-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.game-result {
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
  font-weight: bold;
  min-width: 35px;
  text-align: right;
}

.game-result.white {
  color: #fff;
}

.game-result.black {
  color: var(--color-accent);
}

.game-result.draw {
  color: var(--color-text-secondary);
}

.game-year {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  opacity: 0.6;
}

.loading-state,
.empty-state {
  padding: 40px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.spinner-tiny {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

:deep(.n-checkbox) {
  --n-font-size: 0.8rem !important;
}
</style>
