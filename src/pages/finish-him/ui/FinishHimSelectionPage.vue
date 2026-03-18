<script setup lang="ts">
import BaseSelectionLayout from '@/shared/ui/BaseSelectionLayout.vue'
import { EngineSelector } from '@/features/engine'
import { useFinishHimStore } from '@/features/finish-him'
import { NRadioGroup, NRadioButton } from 'naive-ui'
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
    accent-type="primary"
    :category-label="t('features.finishHim.selection.themeLabel')"
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
        v-for="cat in categories"
        :key="cat"
        class="category-card"
        :class="{ 'active': selectedCategory === cat }"
        @click="selectedCategory = cat"
      >
        <template v-if="cat === 'expert'">
          <img src="/svg/crown-svgrepo-com.svg" class="cat-icon-svg" alt="expert" />
        </template>
        <span v-else class="cat-icon">{{ getIcon(cat) }}</span>
        <span class="cat-name">{{ t(getThemeKey(cat)) }}</span>
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