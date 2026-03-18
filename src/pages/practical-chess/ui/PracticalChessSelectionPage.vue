<script setup lang="ts">
import BaseSelectionLayout from '@/shared/ui/BaseSelectionLayout.vue'
import { EngineSelector } from '@/features/engine'
import { usePracticalChessStore } from '@/features/practical-chess'
import { NRadioGroup, NRadioButton } from 'naive-ui'
import {
  PRACTICAL_CHESS_CATEGORIES,
  type PracticalChessCategory,
  type PracticalChessDifficulty,
} from '@/shared/types/api.types'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'

const { t } = useI18n()
const router = useRouter()
const practicalStore = usePracticalChessStore()

const difficultyLevels = ['Novice', 'Pro', 'Master'] as const
const selectedDifficulty = ref<string>(practicalStore.activeDifficulty)
const selectedCategory = ref<string>(practicalStore.activeCategory)

function getIcon(cat: string) {
  const icons: Record<string, string> = {
    extraPawn: '♟️',
    materialEquality: '⚖️',
    exchange: '🔄',
  }
  return icons[cat] || ''
}

function handleStart() {
  practicalStore.selectDifficulty(selectedDifficulty.value as PracticalChessDifficulty)
  practicalStore.selectCategory(selectedCategory.value as PracticalChessCategory)
  router.push({ name: 'practical-chess-play' })
}
</script>

<template>
  <BaseSelectionLayout
    :title="t('features.practicalChess.selection.title')"
    :subtitle="t('features.practicalChess.selection.subtitle')"
    accent-type="primary"
    :category-label="t('features.practicalChess.selection.categoryLabel')"
    @start="handleStart"
  >
    <template #sections>
      <!-- Difficulty Selection -->
      <div class="section">
        <label class="section-label">{{ t('features.theoryEndgames.selection.difficultyLabel') }}</label>
        <n-radio-group v-model:value="selectedDifficulty" size="large" class="toggle-group-override" expand>
          <n-radio-button
            v-for="diff in difficultyLevels"
            :key="diff"
            :value="diff"
          >
            {{ t(`common.difficulties.level_${diff.toLowerCase()}`) }}
          </n-radio-button>
        </n-radio-group>
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
      <div
        v-for="cat in PRACTICAL_CHESS_CATEGORIES"
        :key="cat"
        class="category-card"
        :class="{ active: selectedCategory === cat }"
        @click="selectedCategory = cat"
      >
        <span class="cat-icon">{{ getIcon(cat) }}</span>
        <span class="cat-name">{{ t(`chess.themes.${cat}`) }}</span>
      </div>
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
.toggle-group-override {
  width: 100%;
}
:deep(.n-radio-button) {
  flex: 1;
  text-align: center;
}
</style>