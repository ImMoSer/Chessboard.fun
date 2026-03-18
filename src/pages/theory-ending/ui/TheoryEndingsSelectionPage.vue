<!-- src/features/theory-endings/ui/TheoryEndingsSelectionView.vue -->
<script setup lang="ts">
import BaseSelectionLayout from '@/shared/ui/BaseSelectionLayout.vue'
import { EngineSelector } from '@/features/engine'
import { useTheoryEndingsStore } from '@/features/theory-endings'
import {
  THEORY_ENDING_CATEGORIES,
  type TheoryEndingCategory,
  type TheoryEndingDifficulty,
  type TheoryEndingType,
} from '@/shared/types/api.types'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ref, onMounted } from 'vue'

const { t } = useI18n()
const router = useRouter()
const theoryStore = useTheoryEndingsStore()

const difficultyLevels = ['Novice', 'Pro', 'Master'] as const
const selectedDifficulty = ref<string>('Novice')
const selectedType = ref<TheoryEndingType>('win')
const selectedCategory = ref<string>('pawn')

onMounted(() => {
  theoryStore.reset()
})

function getIcon(cat: string) {
  const icons: Record<string, string> = {
    pawn: '♔♟',
    bishop: '♗♙',
    knight: '♘♙',
    queen: '♕♙',
    rook: '♖',
  }
  return icons[cat] || ''
}

function handleStart() {
  theoryStore.setParams(
    selectedType.value,
    selectedDifficulty.value as TheoryEndingDifficulty,
    selectedCategory.value as TheoryEndingCategory,
  )
  router.push({
    name: 'theory-endings-play',
    params: { type: selectedType.value },
  })
}
</script>

<template>
  <BaseSelectionLayout
    :title="t('features.theoryEndgames.selection.title')"
    :subtitle="t('features.theoryEndgames.selection.subtitle')"
    accent-color="var(--color-accent-primary)"
    :category-label="t('features.theoryEndgames.selection.categoryLabel')"
    @start="handleStart"
  >
    <template #sections>
      <!-- Type Selection -->
      <div class="section">
        <label class="section-label">{{ t('features.theoryEndgames.selection.typeLabel') }}</label>
        <div class="toggle-group">
          <button
            v-for="type in ['win', 'draw'] as const"
            :key="type"
            class="toggle-btn"
            :class="{ active: selectedType === type }"
            @click="selectedType = type"
          >
            {{ t(`chess.types.${type}`) }}
          </button>
        </div>
      </div>

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
        v-for="cat in THEORY_ENDING_CATEGORIES"
        :key="cat"
        class="category-btn"
        :class="{ active: selectedCategory === cat }"
        @click="selectedCategory = cat"
      >
        <span class="cat-icon">{{ getIcon(cat) }}</span>
        <span class="cat-name">{{ t(`chess.themes.${cat}`) }}</span>
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
