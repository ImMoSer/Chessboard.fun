<script setup lang="ts">
import BaseSelectionLayout from '@/shared/ui/BaseSelectionLayout.vue'
import { EngineSelector } from '@/features/engine'
import { useTheoryEndingsStore } from '@/features/theory-endings'
import { NRadioGroup, NRadioButton } from 'naive-ui'
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
    accent-type="primary"
    :category-label="t('features.theoryEndgames.selection.categoryLabel')"
    @start="handleStart"
  >
    <template #sections>
      <!-- Type Selection -->
      <div class="section">
        <label class="section-label">{{ t('features.theoryEndgames.selection.typeLabel') }}</label>
        <n-radio-group v-model:value="selectedType" size="large" class="toggle-group-override" expand>
          <n-radio-button
            v-for="type in (['win', 'draw'] as const)"
            :key="type"
            :value="type"
          >
            {{ t(`chess.types.${type}`) }}
          </n-radio-button>
        </n-radio-group>
      </div>

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
        v-for="cat in THEORY_ENDING_CATEGORIES"
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