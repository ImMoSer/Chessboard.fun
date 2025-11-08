<!-- src/components/UpcomingPositions.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useTowerStore } from '@/stores/tower.store'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import ChessboardPreview from './ChessboardPreview.vue'

const towerStore = useTowerStore()
const { activeTower, currentPositionIndex } = storeToRefs(towerStore)
const { t } = useI18n()

const upcomingPositions = computed(() => {
  if (!activeTower.value) return []
  const positions = activeTower.value.positions.slice(currentPositionIndex.value)
  return positions.map((pos, index) => {
    let orientation: 'white' | 'black' = 'white'
    if (pos.fen_final) {
      orientation = pos.fen_final.split(' ')[1] === 'b' ? 'white' : 'black'
    }
    return {
      ...pos,
      absoluteIndex: currentPositionIndex.value + index + 1,
      orientation,
    }
  })
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
        <ChessboardPreview v-if="pos.fen_final" :fen="pos.fen_final" :orientation="pos.orientation" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Styles from tower.css */
.upcoming-positions-container {
  flex-grow: 1;

  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-secondary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  overflow: hidden;
}

.table-title {
  margin: 5px;
  /* убираем стандартные margin h4 */
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
  /* Hide scrollbar for IE, Edge and Firefox */
  -ms-overflow-style: none;
  /* IE and Edge */
  scrollbar-width: none;
  /* Firefox */
}

/* Hide scrollbar for Chrome, Safari and Opera */
.positions-list-scrollable::-webkit-scrollbar {
  display: none;
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
</style>
