<!-- src/features/finish-him/ui/FinishHimSelectionView.vue -->
<script setup lang="ts">
import BaseSelectionLayout from '@/shared/ui/BaseSelectionLayout.vue'
import { EngineSelector } from '@/features/engine'
import { useFinishHimStore } from '@/features/finish-him'
import { type FinishHimDifficulty, type FinishHimTheme } from '@/shared/types/api.types'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ref, onMounted } from 'vue'

const { t } = useI18n()
const router = useRouter()
const finishHimStore = useFinishHimStore()

const difficultyLevels = ['Novice', 'Pro', 'Master'] as const
const selectedDifficulty = ref<string>('Novice')
const selectedCategory = ref<string>('auto')

const categories = [
  'auto',
  'pawn',
  'knight',
  'bishop',
  'rookPawn',
  'queen',
  'knightBishop',
  'rookPieces',
  'queenPieces',
  'expert',
]

onMounted(() => {
  finishHimStore.reset()
})

function getIcon(cat: string) {
  if (cat === 'auto') return '✨'
  const icons: Record<string, string> = {
    pawn: '♔♟',
    bishop: '♗♙',
    knight: '♘♙',
    queen: '♕♙',
    rook: '♖',
    rookPawn: '♖♙',
    rookPieces: '♖♘♗',
    knightBishop: '♘♗',
    queenPieces: '♕♘♗',
    extraPawn: '♟️',
  }
  return icons[cat] || ''
}

function getThemeKey(cat: string) {
  if (cat === 'auto') return 'chess.tactics.auto'
  return `chess.themes.${cat}`
}

function handleStart() {
  finishHimStore.setParams(
    selectedCategory.value as FinishHimTheme | 'auto',
    selectedDifficulty.value as FinishHimDifficulty,
  )
  router.push({ name: 'finish-him-play' })
}
</script>

<template>
  <BaseSelectionLayout
    :title="t('features.finishHim.selection.title')"
    :subtitle="t('features.finishHim.selection.subtitle')"
    accent-color="var(--color-accent-warning)"
    :category-label="t('features.finishHim.selection.themeLabel')"
    @start="handleStart"
  >
    <template #sections>
      <!-- Difficulty Selection -->
      <div class="section">
        <label class="section-label">{{ t('features.theoryEndgames.selection.difficultyLabel') }}</label>
        <div class="toggle-group">
          <button
            v-for="diff in difficultyLevels"
            :key="diff"
            class="toggle-btn"
            :class="{ active: selectedDifficulty === diff }"
            @click="selectedDifficulty = diff"
          >
            {{ t(`common.difficulties.level_${diff.toLowerCase()}`) }}
          </button>
        </div>
      </div>
      <!-- Engine Selection -->
      <div class="section">
        <label class="section-label">{{ t('features.engine.select') }}</label>
        <div class="engine-selector-wrapper">
          <EngineSelector />
        </div>
      </div>
    </template>

    <template #categories>
      <button
        v-for="cat in categories"
        :key="cat"
        class="category-btn"
        :class="{ active: selectedCategory === cat }"
        @click="selectedCategory = cat"
      >
        <template v-if="cat === 'expert'">
          <img src="/svg/crown-svgrepo-com.svg" class="cat-icon-svg" alt="expert" />
        </template>
        <span v-else class="cat-icon">{{ getIcon(cat) }}</span>
        <span class="cat-name">{{ t(getThemeKey(cat)) }}</span>
      </button>
    </template>

    <template #start-button-label>
      {{ t('features.theoryEndgames.selection.start') }}
    </template>
  </BaseSelectionLayout>
</template>

<style scoped>
.engine-selector-wrapper {
  width: 100%;
}

:deep(.engine-selector) {
  max-width: 100%;
}

:deep(.selector-toggle) {
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
}
</style>
