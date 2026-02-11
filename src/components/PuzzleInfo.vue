<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useFinishHimStore } from '../stores/finishHim.store'

import { BarChartOutline, ExtensionPuzzleOutline, FlashOutline, GridOutline, StarOutline, TrendingUpOutline } from '@vicons/ionicons5'
import { NCard, NDivider, NGrid, NGridItem, NIcon, NSpace, NTable, NTag, NText } from 'naive-ui'
import { usePracticalChessStore } from '../stores/practicalChess.store'
import { useTheoryEndingsStore } from '../stores/theoryEndings.store'
import { useTornadoStore } from '../stores/tornado.store'
import type { GamePuzzle, PuzzleResultEntry, PuzzleUnion } from '../types/api.types'
import { transformPuzzle, type DisplayTask } from '../utils/puzzleTransformer'
import ChessboardPreview from './ChessboardPreview.vue'

const route = useRoute()
const finishHimStore = useFinishHimStore()
const tornadoStore = useTornadoStore()
const theoryStore = useTheoryEndingsStore()
const { t } = useI18n()

// Active Store Logic
const activeStore = computed(() => {
  if (route.name === 'tornado' || route.meta.game === 'tornado') return tornadoStore
  if (route.name?.toString().startsWith('theory-endings') || route.meta.game === 'theory-endings')
    return theoryStore
  if (route.name?.toString().startsWith('practical-chess') || route.meta.game === 'practical-chess')
    return usePracticalChessStore()
  return finishHimStore
})

const activePuzzle = computed<PuzzleUnion | null>(() => {
  return (activeStore.value.activePuzzle as PuzzleUnion) || null
})

// Unified Display Task
const displayTask = computed<DisplayTask>(() => {
  return transformPuzzle(activePuzzle.value, t)
})

// --- Legacy / Specific Compat Helpers ---
// (Kept for Leaderboard and Preview checks if needed, but mostly served by transformer now)

const finalPositionOrientation = computed(() => {
  const puzzle = activePuzzle.value
  if (!puzzle) return 'white'

  let fen: string | undefined

  if ('initial_fen' in puzzle) fen = puzzle.initial_fen
  else if ('FEN_0' in puzzle) fen = puzzle.FEN_0
  else if ('fen_final' in puzzle) fen = (puzzle as GamePuzzle).fen_final

  if (fen) {
    const turn = fen.split(' ')[1]
    return turn === 'w' ? 'black' : 'white'
  }
  return 'white'
})

const sortedResults = computed(() => {
  const puzzle = activePuzzle.value
  if (!puzzle || !('endgame_results' in puzzle)) return null

  const results = (puzzle as GamePuzzle).endgame_results
  if (!results || results.length === 0) {
    return null
  }
  return [...results].sort((a: PuzzleResultEntry, b: PuzzleResultEntry) => a.time_in_seconds - b.time_in_seconds)
})

const puzzleFenFinal = computed(() => {
  const puzzle = activePuzzle.value
  if (!puzzle) return null
  if ('fen_final' in puzzle) return (puzzle as GamePuzzle).fen_final
  return null
})

// Icon mapping helper
const getIcon = (iconName: string) => {
    switch (iconName) {
        case 'trending-up': return TrendingUpOutline;
        case 'bar-chart': return BarChartOutline;
        case 'flash': return FlashOutline;
        case 'extension-puzzle': return ExtensionPuzzleOutline;
        case 'grid': return GridOutline;
        case 'pieces': return GridOutline; // Reuse Grid for 'pieces'
        case 'advantage': return ExtensionPuzzleOutline; // Or maybe something better?
        case 'material': return ExtensionPuzzleOutline;
        default: return StarOutline; // Fallback
    }
}

const getBadgeType = (type: string) => {
    // NaiveUI tag types: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'
    return type as 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'
}
</script>

<template>
  <div class="puzzle-info-container">
    <!-- Unified Info Card -->
    <transition name="fade">
      <n-card v-if="activePuzzle" class="info-card puzzle-details" size="small" :bordered="false">
        <n-space vertical :size="16">

          <!-- ZONE 1: Status Bar (Header & Badges) -->
          <div class="zone-status-bar">
             <div class="header-row">
                 <div class="main-stat">
                     <div class="stat-icon-wrapper">
                         <n-icon :color="displayTask.header.color === 'success' ? '#18a058' : displayTask.header.color === 'warning' ? '#f0a020' : '#2080f0'" size="28" class="stat-icon">
                            <component :is="getIcon(displayTask.header.icon || 'star')" />
                         </n-icon>
                     </div>
                     <div class="stat-content">
                         <div class="stat-label">{{ displayTask.header.label }}</div>
                         <div class="stat-value">{{ displayTask.header.value }}</div>
                     </div>
                 </div>

                 <!-- Badges Row -->
                 <n-space size="small" align="center" style="margin-top: 4px;">
                     <n-tag v-for="(badge, idx) in displayTask.badges" :key="idx" :type="getBadgeType(badge.type)" size="small" round :bordered="false">
                         {{ badge.text }}
                     </n-tag>
                 </n-space>
             </div>
          </div>

          <n-divider style="margin: 4px 0" />

          <!-- ZONE 2: Material & Balance -->
          <div v-if="displayTask.stats.length > 0" class="zone-material">
              <n-grid :cols="2" :x-gap="12" :y-gap="12">
                  <n-grid-item v-for="(stat, idx) in displayTask.stats" :key="idx">
                    <div class="mini-stat">
                        <n-space align="center" size="small">
                             <n-icon size="16" color="#ffffff50">
                                 <component :is="getIcon(stat.icon)" />
                             </n-icon>
                             <n-text depth="3" class="mini-stat-label">{{ stat.label }}</n-text>
                        </n-space>
                         <n-text strong class="mini-stat-value">{{ stat.value }}</n-text>
                    </div>
                  </n-grid-item>
              </n-grid>
          </div>

          <!-- ZONE 3: Taxonomy Tags (Detailed Info) -->
          <div v-if="displayTask.footerTags.length > 0" class="zone-taxonomy">
             <n-space :size="[6, 6]" wrap>
                 <n-tag v-for="tag in displayTask.footerTags" :key="tag" size="small" :bordered="false" class="taxonomy-tag">
                     {{ tag }}
                 </n-tag>
             </n-space>
          </div>

          <!-- Final Position Preview (Legacy / Specific) -->
          <n-card
            v-if="puzzleFenFinal"
            embedded
            :bordered="false"
            class="preview-card"
            size="small"
          >
            <n-space vertical align="stretch" :size="8" style="width: 100%">
              <n-text
                depth="3"
                strong
                uppercase
                class="preview-title"
                style="text-align: center"
              >
                {{ t('puzzleInfo.finalPositionTitle') }}
              </n-text>

              <div class="chessboard-preview-wrapper">
                <ChessboardPreview
                  :fen="puzzleFenFinal"
                  :orientation="finalPositionOrientation"
                />
              </div>
            </n-space>
          </n-card>

          <!-- Puzzle Local Leaderboard (Legacy / Specific) -->
          <div v-if="sortedResults" class="leaderboard-section">
            <n-space align="center" :size="8" class="mb-8">
              <n-icon color="#f0a020">
                <StarOutline />
              </n-icon>
              <n-text strong uppercase depth="3" class="section-subtitle">{{
                t('puzzleInfo.leaderboardTitle')
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
                    <a
                      :href="`https://lichess.org/@/${result.lichess_id}`"
                      target="_blank"
                      class="player-link"
                    >
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

/* ZONE 1 */
.zone-status-bar {
    .header-row {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .main-stat {
        display: flex;
        align-items: center;
        gap: 12px;

        .stat-icon-wrapper {
            background: rgba(255, 255, 255, 0.05);
            padding: 8px;
            border-radius: 12px;
            width: 44px;
            height: 44px;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .stat-content {
            display: flex;
            flex-direction: column;
        }

        .stat-label {
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: var(--color-text-secondary);
            font-weight: 600;
            margin-bottom: 2px;
        }

        .stat-value {
             font-size: 1.4rem;
             font-weight: 700;
             line-height: 1.1;
             font-family: monospace;
        }
    }
}

/* ZONE 2 */
.zone-material {
    .mini-stat {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        padding: 8px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .mini-stat-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
     .mini-stat-value {
        font-size: 0.9rem;
        font-family: monospace;
    }
}

/* ZONE 3 */
.zone-taxonomy {
    .taxonomy-tag {
        font-size: 0.75rem;
        background: rgba(255, 255, 255, 0.08);
        color: var(--color-text-primary);
    }
}


/* Legacy styles for Leaderboard & Preview */

.preview-card {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 8px 4px;
}

.chessboard-preview-wrapper {
  width: 100%;
  position: relative;
  border-radius: 1px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
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

.leaderboard-section {
    margin-top: 8px;
}

.section-subtitle {
  font-size: 0.65rem;
  letter-spacing: 1px;
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
