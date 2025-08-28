<!-- src/components/PuzzleInfo.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useFinishHimStore } from '../stores/finishHim.store'
import { useAttackStore } from '../stores/attack.store'
import { useTackticsStore } from '../stores/tacktics.store'
import { useTowerStore } from '../stores/tower.store'
import { useThemeStore } from '../stores/theme.store'
import type { GamePuzzle } from '../types/api.types'

const route = useRoute()
const finishHimStore = useFinishHimStore()
const attackStore = useAttackStore()
const tackticsStore = useTackticsStore()
const towerStore = useTowerStore()
const themeStore = useThemeStore()
const { t } = useI18n()

const activeStore = computed(() => {
  if (route.name === 'attack') return attackStore
  if (route.name === 'tacktics') return tackticsStore
  if (route.name === 'tower') return towerStore
  return finishHimStore
})

const activePuzzle = computed<GamePuzzle | null>(() => {
  if (route.name === 'tower') return null
  return (activeStore.value as any).activePuzzle
})

const activeTowerInfo = computed(() => {
  if (route.name !== 'tower') return null
  return towerStore.activeTower
})

const towerSortedResults = computed(() => {
  if (!activeTowerInfo.value || !activeTowerInfo.value.tower_results) return null
  return [...activeTowerInfo.value.tower_results].sort(
    (a, b) => a.time_in_seconds - b.time_in_seconds,
  )
})

const localizedThemes = computed(() => {
  if (!activePuzzle.value?.Themes_PG) return ''
  return activePuzzle.value.Themes_PG.map((theme) =>
    t(`tacktics.themes.${theme}`, { defaultValue: theme }),
  ).join(', ')
})

const formatTime = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined || seconds < 0) return '--:--'
  const totalSeconds = Math.ceil(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const pieceFileMap: { [key: string]: string } = {
  r: 'bR.svg',
  n: 'bN.svg',
  b: 'bB.svg',
  q: 'bQ.svg',
  k: 'bK.svg',
  p: 'bP.svg',
  R: 'wR.svg',
  N: 'wN.svg',
  B: 'wB.svg',
  Q: 'wQ.svg',
  K: 'wK.svg',
  P: 'wP.svg',
}
const pieceOrder: { [key: string]: number } = { P: 1, N: 2, B: 3, R: 4, Q: 5, K: 6 }

interface PieceInfo {
  pieceFile: string
  pieceType: string
}

const finalMaterial = computed(() => {
  const puzzle = activePuzzle.value
  if (!puzzle || !puzzle.fen_final) {
    return { playerPieces: [], botPieces: [] }
  }

  const fenParts = puzzle.fen_final.split(' ')
  const botColor = fenParts[1]

  const playerPieces: PieceInfo[] = []
  const botPieces: PieceInfo[] = []
  const fenBoard = fenParts[0]

  if (fenBoard) {
    for (const char of fenBoard) {
      if (pieceFileMap[char]) {
        const pieceColor = char === char.toUpperCase() ? 'w' : 'b'
        const pieceInfo = {
          pieceFile: pieceFileMap[char],
          pieceType: char.toUpperCase(),
        }
        if (pieceColor === botColor) {
          botPieces.push(pieceInfo)
        } else {
          playerPieces.push(pieceInfo)
        }
      }
    }
  }

  const sortFn = (a: PieceInfo, b: PieceInfo) =>
    (pieceOrder[a.pieceType] || 0) - (pieceOrder[b.pieceType] || 0)
  playerPieces.sort(sortFn)
  botPieces.sort(sortFn)

  return { playerPieces, botPieces }
})

const sortedResults = computed(() => {
  const puzzle = activePuzzle.value
  const results = puzzle?.endgame_results || puzzle?.attack_results
  if (!results || results.length === 0) {
    return null
  }
  return [...results].sort((a, b) => a.time_in_seconds - b.time_in_seconds)
})
</script>

<template>
  <div class="puzzle-info-container">
    <div v-if="activePuzzle">
      <h4>{{ t('puzzleInfo.title') }}</h4>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">{{ t('puzzleInfo.tacticalRating') }}:</span>
          <span class="value">{{ activePuzzle.Rating }}</span>
        </div>
        <div v-if="activePuzzle.solve_time" class="info-item">
          <span class="label">{{ t('puzzleInfo.solveTime') }}:</span>
          <span class="value">{{ formatTime(activePuzzle.solve_time) }}</span>
        </div>
        <div v-if="activePuzzle.bw_value" class="info-item">
          <span class="label">{{ t('puzzleInfo.funValue') }}:</span>
          <span class="value">{{ activePuzzle.bw_value }}</span>
        </div>
        <div v-if="route.name === 'tacktics' && localizedThemes" class="info-item">
          <span class="label">{{ t('tacktics.stats.theme') }}:</span>
          <span class="value">{{ localizedThemes }}</span>
        </div>
      </div>

      <div
        v-if="finalMaterial.playerPieces.length > 0 || finalMaterial.botPieces.length > 0"
        class="final-position-preview"
      >
        <h5 class="final-position-title">{{ t('puzzleInfo.finalPositionTitle') }}</h5>
        <div class="sorted-pieces-container">
          <div class="pieces-row player-pieces">
            <img
              v-for="(p, index) in finalMaterial.playerPieces"
              :key="'player-' + index"
              :src="`/piece/${themeStore.currentTheme.pieces}/${p.pieceFile}`"
              class="sorted-piece-icon"
            />
          </div>
          <div class="pieces-row bot-pieces">
            <img
              v-for="(p, index) in finalMaterial.botPieces"
              :key="'bot-' + index"
              :src="`/piece/${themeStore.currentTheme.pieces}/${p.pieceFile}`"
              class="sorted-piece-icon"
            />
          </div>
        </div>
      </div>

      <div v-if="sortedResults" class="puzzle-leaderboard-container">
        <h5 class="leaderboard-title">{{ t('puzzleInfo.leaderboardTitle') }}</h5>
        <table class="puzzle-leaderboard-table">
          <thead>
            <tr>
              <th class="rank">{{ t('puzzleInfo.tableRank') }}</th>
              <th class="player">{{ t('puzzleInfo.tablePlayer') }}</th>
              <th class="time">{{ t('puzzleInfo.tableTime') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(result, index) in sortedResults" :key="result.lichess_id">
              <td class="rank">{{ index + 1 }}</td>
              <td class="player">
                <a
                  :href="`https://lichess.org/@/${result.lichess_id}`"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ result.username }}
                </a>
              </td>
              <td class="time">{{ result.time_in_seconds }}s</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="activeTowerInfo">
      <h4>{{ t('puzzleInfo.title') }}</h4>
      <div class="info-grid">
        <div class="info-item">
          <span class="label">{{ t('tower.ui.themeLabel') }}:</span>
          <span class="value">{{ t(`tower.themes.${activeTowerInfo.tower_theme}`) }}</span>
        </div>
        <div class="info-item">
          <span class="label">{{ t('tower.ui.averageRating') }}:</span>
          <span class="value">{{ activeTowerInfo.average_rating }}</span>
        </div>
        <div class="info-item">
          <span class="label">{{ t('tower.ui.skillValue') }}:</span>
          <span class="value">{{ activeTowerInfo.bw_value_total }}</span>
        </div>
      </div>
      <div
        v-if="towerSortedResults && towerSortedResults.length > 0"
        class="puzzle-leaderboard-container"
      >
        <h5 class="leaderboard-title">{{ t('tower.ui.leaderboardTitle') }}</h5>
        <table class="puzzle-leaderboard-table">
          <thead>
            <tr>
              <th class="rank">{{ t('tower.ui.tableRank') }}</th>
              <th class="player">{{ t('tower.ui.tablePlayer') }}</th>
              <th class="time">{{ t('tower.ui.tableTime') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(result, index) in towerSortedResults" :key="result.lichess_id">
              <td class="rank">{{ index + 1 }}</td>
              <td class="player">
                <a
                  :href="`https://lichess.org/@/${result.lichess_id}`"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ result.username }}
                </a>
              </td>
              <td class="time">{{ formatTime(result.time_in_seconds) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.puzzle-info-container {
  padding: 10px;
  border-radius: var(--panel-border-radius);
  color: var(--color-text-default);
  display: flex;
  flex-direction: column;
  gap: 15px;
}
h4 {
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
  text-align: center;
  color: var(--color-accent-warning);
  font-size: var(--font-size-base);
}
.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 5px;
}
.info-item {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-small);
}
.label {
  color: var(--color-text-muted);
  margin-right: 10px;
  white-space: nowrap;
}
.value {
  font-weight: bold;
  text-align: right;
}
.final-position-preview {
  background-color: var(--color-bg-tertiary);
  padding: 8px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
}
.final-position-title {
  margin: 0 0 8px 0;
  font-size: var(--font-size-small);
  color: var(--color-text-default);
  text-align: center;
}
.sorted-pieces-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pieces-row {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  min-height: 2rem;
  padding: 2px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.1);
}
.pieces-row.player-pieces {
  border: 1px solid var(--color-accent-primary);
}
.pieces-row.bot-pieces {
  border: 1px solid var(--color-accent-error);
}
.sorted-piece-icon {
  height: 1.8rem;
  width: 1.8rem;
}
.puzzle-leaderboard-container {
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--panel-border-radius);
  padding: 10px;
  margin-top: 10px; /* Added margin */
}
.leaderboard-title {
  margin: 0 0 8px 0;
  font-size: var(--font-size-small);
  color: var(--color-text-default);
  text-align: center;
}
.puzzle-leaderboard-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-small);
}
.puzzle-leaderboard-table th,
.puzzle-leaderboard-table td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}
.puzzle-leaderboard-table tr:last-child td {
  border-bottom: none;
}
.puzzle-leaderboard-table th {
  color: var(--color-text-muted);
  font-weight: bold;
}
.puzzle-leaderboard-table .rank {
  text-align: center;
  width: 1%;
  padding-right: 10px;
}
.puzzle-leaderboard-table .time {
  text-align: right;
  font-weight: bold;
}
.puzzle-leaderboard-table .player a {
  color: var(--color-text-link);
  text-decoration: none;
}
.puzzle-leaderboard-table .player a:hover {
  text-decoration: underline;
}
</style>
