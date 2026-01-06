<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useFinishHimStore } from '../stores/finishHim.store'

import { useTornadoStore } from '../stores/tornado.store'
import type { GamePuzzle } from '../types/api.types'
import { getThemeTranslationKey } from '../utils/theme-mapper'
import ChessboardPreview from './ChessboardPreview.vue'
import {
  NCard, NStatistic, NGrid, NGridItem, NText,
  NSpace, NTag, NIcon, NTable
} from 'naive-ui'
import {
  FlashOutline,
  TrendingUpOutline,
  TimeOutline,
  StarOutline,
  ListOutline,
  BarChartOutline
} from '@vicons/ionicons5'

const route = useRoute()
const finishHimStore = useFinishHimStore()
const tornadoStore = useTornadoStore()
const { t } = useI18n()

const activeStore = computed(() => {
  if (route.name === 'tornado') return tornadoStore
  return finishHimStore
})

const activePuzzle = computed<GamePuzzle | null>(() => {
  return (activeStore.value as { activePuzzle: GamePuzzle | null }).activePuzzle
})



const tacticalThemesList = computed<string[]>(() => {
  const puzzle = activePuzzle.value
  if (!puzzle) return []

  if (puzzle.EngmThemes_PG) {
    return puzzle.EngmThemes_PG.replace(/[{}]/g, '').split(',').map(t => t.trim())
  }

  if (route.meta.game === 'finish-him' && puzzle.engm_type) {
    return [getThemeTranslationKey(puzzle.engm_type)]
  }

  if (puzzle.Themes) return puzzle.Themes.split(' ')
  if (puzzle.puzzle_theme) return puzzle.puzzle_theme.split(' ')

  if (route.name === 'tornado' && puzzle.Themes_PG) {
    return puzzle.Themes_PG
  }

  return []
})

const finishHimModeDisplay = computed(() => {
  if (route.meta.game !== 'finish-him' || !finishHimStore.activeMode) return null
  const mode = finishHimStore.activeMode
  return t(`tornado.modes.${mode}`, { defaultValue: mode })
})

const finalPositionOrientation = computed(() => {
  if (activePuzzle.value && activePuzzle.value.FEN_0) {
    const turn = activePuzzle.value.FEN_0.split(' ')[1]
    return turn === 'w' ? 'black' : 'white'
  }
  if (activePuzzle.value && activePuzzle.value.fen_final) {
    const turn = activePuzzle.value.fen_final.split(' ')[1]
    return turn === 'b' ? 'white' : 'black'
  }
  return 'white'
})

const formatTime = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined || seconds < 0) return '--:--'
  const totalSeconds = Math.ceil(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const sortedResults = computed(() => {
  const puzzle = activePuzzle.value
  const results = puzzle?.endgame_results
  if (!results || results.length === 0) {
    return null
  }
  return [...results].sort((a, b) => a.time_in_seconds - b.time_in_seconds)
})


</script>

<template>
  <div class="puzzle-info-container">


    <!-- Current Puzzle Details -->
    <transition name="fade">
      <n-card v-if="activePuzzle" class="info-card puzzle-details" size="small" :bordered="false">
        <n-space vertical :size="16">
          <!-- Basic Stats Row -->
          <n-grid :cols="2" :x-gap="12" :y-gap="12">
            <n-grid-item v-if="finishHimModeDisplay">
              <n-statistic :label="t('userCabinet.stats.modes.all')">
                <n-text strong>{{ finishHimModeDisplay }}</n-text>
              </n-statistic>
            </n-grid-item>

            <n-grid-item>
              <n-statistic :label="t('tacktics.stats.rating')">
                <template #prefix>
                  <n-icon color="#18a058">
                    <TrendingUpOutline />
                  </n-icon>
                </template>
                <n-text strong>{{ activePuzzle.engmRating ?? activePuzzle.Rating ?? activePuzzle.rating }}</n-text>
              </n-statistic>
            </n-grid-item>

            <n-grid-item v-if="activePuzzle.bw_value">
              <n-statistic :label="t('puzzleInfo.funValue')">
                <template #prefix>
                  <n-icon color="#f0a020">
                    <FlashOutline />
                  </n-icon>
                </template>
                <n-text strong>{{ activePuzzle.bw_value }}</n-text>
              </n-statistic>
            </n-grid-item>

            <n-grid-item v-if="activePuzzle.solve_time && route.meta.game !== 'finish-him'">
              <n-statistic :label="t('puzzleInfo.solveTime')">
                <template #prefix>
                  <n-icon color="var(--color-accent)">
                    <TimeOutline />
                  </n-icon>
                </template>
                <n-text strong>{{ formatTime(activePuzzle.solve_time) }}</n-text>
              </n-statistic>
            </n-grid-item>

            <n-grid-item v-if="activePuzzle.eval">
              <n-statistic :label="t('puzzleInfo.evaluation')">
                <template #prefix>
                  <n-icon color="#2080f0">
                    <BarChartOutline />
                  </n-icon>
                </template>
                <n-text strong>{{ (activePuzzle.eval / 100).toFixed(2) }}</n-text>
              </n-statistic>
            </n-grid-item>

            <n-grid-item v-if="activePuzzle.num_pieces">
              <n-statistic :label="t('puzzleInfo.pieces')">
                <template #prefix>
                  <n-icon depth="3">
                    <ListOutline />
                  </n-icon>
                </template>
                <n-text strong>{{ activePuzzle.num_pieces }}</n-text>
              </n-statistic>
            </n-grid-item>
          </n-grid>

          <!-- Final Position Preview -->
          <n-card v-if="activePuzzle.fen_final" embedded :bordered="false" class="preview-card" size="small">
            <n-space vertical align="stretch" :size="8" style="width: 100%">
              <!-- Display Themes instead of Final Position title if themes are present -->
              <n-space v-if="tacticalThemesList.length > 0" justify="center" :size="[4, 4]" wrap>
                <n-tag v-for="theme in tacticalThemesList" :key="theme" size="small" round :bordered="false"
                  type="info">
                  {{ t(`themes.${theme}`, { defaultValue: t(`tacktics.themes.${theme}`, { defaultValue: theme }) }) }}
                </n-tag>
              </n-space>
              <n-text v-else depth="3" strong uppercase class="preview-title" style="text-align: center">
                {{ t('puzzleInfo.finalPositionTitle') }}
              </n-text>

              <div class="chessboard-preview-wrapper">
                <ChessboardPreview :fen="activePuzzle.fen_final" :orientation="finalPositionOrientation" />
              </div>
            </n-space>
          </n-card>

          <!-- Puzzle Local Leaderboard -->
          <div v-if="sortedResults" class="leaderboard-section">
            <n-space align="center" :size="8" class="mb-8">
              <n-icon color="#f0a020">
                <StarOutline />
              </n-icon>
              <n-text strong uppercase depth="3" class="section-subtitle">{{ t('puzzleInfo.leaderboardTitle')
                }}</n-text>
            </n-space>
            <n-table size="small" :bordered="false" class="minimal-table">
              <thead>
                <tr>
                  <th style="width: 40px">{{ t('puzzleInfo.tableRank') }}</th>
                  <th>{{ t('puzzleInfo.tablePlayer') }}</th>
                  <th style="text-align: right">{{ t('puzzleInfo.tableTime') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(result, index) in sortedResults" :key="result.lichess_id">
                  <td>
                    <n-text depth="3">{{ index + 1 }}</n-text>
                  </td>
                  <td>
                    <a :href="`https://lichess.org/@/${result.lichess_id}`" target="_blank" class="player-link">
                      {{ result.username }}
                    </a>
                  </td>
                  <td style="text-align: right">
                    <n-text strong>{{ result.time_in_seconds }}s</n-text>
                  </td>
                </tr>
              </tbody>
            </n-table>
          </div>
        </n-space>
      </n-card>
    </transition>


  </div>
</template>

<style scoped lang="scss">
.puzzle-info-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.section-title {
  font-size: 0.75rem;
  letter-spacing: 1.2px;
}

.section-subtitle {
  font-size: 0.65rem;
  letter-spacing: 1px;
}

.preview-card {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 8px 4px;
  /* Минимальные отступы для максимального размера доски */
}

.chessboard-preview-wrapper {
  width: 100%;
  position: relative;
  border-radius: 1px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.shadow-premium {
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

.preview-title {
  font-size: 0.7rem;
  letter-spacing: 0.8px;
}

.minimal-table {
  background: transparent;

  th {
    background: transparent;
    font-size: 0.7rem;
    text-transform: uppercase;
    color: var(--color-text-muted);
    padding: 4px 0;
  }

  td {
    background: transparent;
    padding: 6px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  tr:last-child td {
    border-bottom: none;
  }
}

.player-link {
  color: var(--color-accent);
  text-decoration: none;
  font-size: 0.85rem;

  &:hover {
    text-decoration: underline;
  }
}

.mb-8 {
  margin-bottom: 8px;
}

:deep(.n-statistic) {
  .n-statistic-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--color-text-secondary);
    font-weight: 600;
    margin-bottom: 2px;
  }

  .n-statistic-value {
    font-size: 1.1rem;
    font-family: monospace;
  }
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
