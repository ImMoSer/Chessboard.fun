<!-- src/components/UpcomingPositions.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useTowerStore } from '@/stores/tower.store'
import { useThemeStore } from '@/stores/theme.store'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import type { TowerPositionEntry } from '@/types/api.types'

const towerStore = useTowerStore()
const themeStore = useThemeStore()
const { activeTower, currentPositionIndex } = storeToRefs(towerStore)
const { t } = useI18n()

interface PieceInfo {
  pieceFile: string
  pieceType: string
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

const parseFenForSortedRows = (
  fen: string,
  botColor: 'w' | 'b',
): { playerPieces: PieceInfo[]; botPieces: PieceInfo[] } => {
  const playerPieces: PieceInfo[] = []
  const botPieces: PieceInfo[] = []
  const fenBoard = fen.split(' ')[0]

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
}

const upcomingPositions = computed(() => {
  if (!activeTower.value) return []
  return activeTower.value.positions.slice(currentPositionIndex.value).map((pos, index) => ({
    ...pos,
    absoluteIndex: currentPositionIndex.value + index + 1,
    material: pos.fen_final
      ? parseFenForSortedRows(pos.fen_final, pos.FEN_0.split(' ')[1] as 'w' | 'b')
      : { playerPieces: [], botPieces: [] },
  }))
})
</script>

<template>
  <div v-if="activeTower && upcomingPositions.length > 0" class="upcoming-positions-container">
    <h4 class="table-title">{{ t('tower.ui.upcomingPositionsTitle') }}</h4>
    <div class="positions-list-scrollable">
      <div v-for="pos in upcomingPositions" :key="pos.absoluteIndex" class="position-preview-item">
        <h5 class="position-preview-title">
          #{{ pos.absoluteIndex }} ({{ t('puzzleInfo.tacticalRating') }}: {{ pos.rating }})
        </h5>
        <div class="sorted-pieces-rows-container">
          <div class="pieces-row player-pieces">
            <img
              v-for="(p, i) in pos.material.playerPieces"
              :key="`player-${i}`"
              :src="`/piece/${themeStore.currentTheme.pieces}/${p.pieceFile}`"
              class="sorted-piece-icon"
            />
          </div>
          <div class="pieces-row bot-pieces">
            <img
              v-for="(p, i) in pos.material.botPieces"
              :key="`bot-${i}`"
              :src="`/piece/${themeStore.currentTheme.pieces}/${p.pieceFile}`"
              class="sorted-piece-icon"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Styles from tower.css */
.upcoming-positions-container {
  flex-grow: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  overflow: hidden;
}
.table-title {
  margin: 5px; /* убираем стандартные margin h4 */
  font-size: var(--font-size-large);
  font-weight: bold;
  padding: 5px;
  color: var(--color-accent-secondary);
  text-align: center;
  flex-shrink: 0;
}

.positions-list-scrollable {
  overflow-y: auto;
  padding: 0 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.position-preview-item {
  background-color: var(--color-bg-tertiary);
  padding: 8px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
}
.position-preview-title {
  margin: 0 0 8px 0;
  font-size: var(--font-size-small);
  color: var(--color-text-default);
  text-align: center;
}
.sorted-pieces-rows-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pieces-row {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  min-height: calc(1.5rem + 4px);
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
  height: 1.5rem;
  width: 1.5rem;
}
</style>
