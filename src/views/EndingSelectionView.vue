<!-- src/views/EndingSelectionView.vue -->
<script setup lang="ts">
import EngineSelector from '@/features/engine/ui/EngineSelector.vue'
import { useFinishHimStore } from '@/stores/finishHim.store'
import { usePracticalChessStore } from '@/stores/practicalChess.store'
import { useTheoryEndingsStore } from '@/stores/theoryEndings.store'
import {
  PRACTICAL_CHESS_CATEGORIES,
  THEORY_ENDING_CATEGORIES,
  type FinishHimDifficulty,
  type FinishHimTheme,
  type PracticalChessCategory,
  type PracticalChessDifficulty,
  type TheoryEndingCategory,
  type TheoryEndingDifficulty,
  type TheoryEndingType
} from '@/types/api.types'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

// Stores
const finishHimStore = useFinishHimStore()
const theoryStore = useTheoryEndingsStore()
const practicalStore = usePracticalChessStore()

// Mode detection
const mode = computed(() => {
  if (route.path.includes('finish-him')) return 'finish-him'
  if (route.path.includes('theory-endings')) return 'theory'
  if (route.path.includes('practical-chess')) return 'practical'
  if (route.path.includes('tornado')) return 'tornado'
  return 'theory'
})

// Common state
const difficultyLevels = ['Novice', 'Pro', 'Master'] as const
const selectedDifficulty = ref<string>(
  mode.value === 'practical' ? practicalStore.activeDifficulty : 'Novice',
)

// Mode specific state
const selectedType = ref<TheoryEndingType>('win')
const selectedCategory = ref<string>('auto')

// Initialization
onMounted(() => {
  if (mode.value === 'theory') {
    theoryStore.reset()
    selectedCategory.value = 'pawn'
  } else if (mode.value === 'finish-him') {
    finishHimStore.reset()
    selectedCategory.value = 'auto'
  } else if (mode.value === 'practical') {
    selectedCategory.value = practicalStore.activeCategory
  } else if (mode.value === 'tornado') {
    selectedCategory.value = 'blitz'
  }
})

// Configuration
const config = computed(() => {
  switch (mode.value) {
    case 'finish-him':
      return {
        title: t('finishHim.selection.title'),
        subtitle: t('finishHim.selection.subtitle'),
        accentColor: 'var(--color-accent-warning)',
        categories: [
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
        ],
        categoryLabel: t('finishHim.selection.themeLabel'),
      }
    case 'practical':
      return {
        title: t('practicalChess.selection.title'),
        subtitle: t('practicalChess.selection.subtitle'),
        accentColor: 'var(--color-accent-primary)',
        categories: PRACTICAL_CHESS_CATEGORIES,
        categoryLabel: t('practicalChess.selection.categoryLabel'),
      }
    case 'tornado':
      return {
        title: 'TORNADO',
        subtitle: t('tornado.feedback.selectMode'),
        accentColor: 'var(--color-neon-orange)',
        categories: ['bullet', 'blitz', 'rapid', 'classic'],
        categoryLabel: '',
      }
    case 'theory':
    default:
      return {
        title: t('theoryEndings.selection.title'),
        subtitle: t('theoryEndings.selection.subtitle'),
        accentColor: 'var(--color-accent-primary)',
        categories: THEORY_ENDING_CATEGORIES,
        categoryLabel: t('theoryEndings.selection.categoryLabel'),
      }
  }
})

// Icons mapping for categories
function getIcon(cat: string) {
  if (cat === 'auto') return '✨'
  const icons: Record<string, string> = {
    'pawn': '♔♟',
    'bishop': '♗♙',
    'knight': '♘♙',
    'queen': '♕♙',
    'rook': '♖',
    'rookPawn': '♖♙',
    'rookPieces': '♖♘♗',
    'knightBishop': '♘♗',
    'queenPieces': '♕♘♗',
    'extraPawn': '♟️',
    'materialEquality': '⚖️',
    'exchange': '🔄',
    'bullet': '⚡',
    'blitz': '🔥',
    'rapid': '🚶',
    'classic': '⏳'
  }
  return icons[cat] || ''
}

function getThemeKey(cat: string) {
  if (cat === 'auto') return 'chess.tornado.auto'
  if (mode.value === 'finish-him') return `chess.finishHim.category.${cat}`
  if (mode.value === 'tornado') return `tornado.modes.${cat}`
  return `chess.endings.${cat}`
}

function handleStart() {
  if (mode.value === 'finish-him') {
    finishHimStore.setParams(
      selectedCategory.value as FinishHimTheme | 'auto',
      selectedDifficulty.value as FinishHimDifficulty,
    )
    router.push({ name: 'finish-him-play' })
  } else if (mode.value === 'theory') {
    theoryStore.setParams(
      selectedType.value,
      selectedDifficulty.value as TheoryEndingDifficulty,
      selectedCategory.value as TheoryEndingCategory,
    )
    router.push({
      name: 'theory-endings-play',
      params: { type: selectedType.value },
    })
  } else if (mode.value === 'practical') {
    practicalStore.selectDifficulty(selectedDifficulty.value as PracticalChessDifficulty)
    practicalStore.selectCategory(selectedCategory.value as PracticalChessCategory)
    router.push({ name: 'practical-chess-play' })
  } else if (mode.value === 'tornado') {
    router.push({ name: 'tornado', params: { mode: selectedCategory.value } })
  }
}
</script>

<template>
  <div class="selection-container">
    <div class="glass-panel selection-card">
      <h1 class="title" :class="{ 'tornado-title': mode === 'tornado' }" :style="{ color: config.accentColor }">
        {{ config.title }}
      </h1>
      <p class="subtitle">{{ config.subtitle }}</p>

      <div class="selection-sections">
        <!-- Type Selection (Only for Theory) -->
        <div v-if="mode === 'theory'" class="section">
          <label class="section-label">{{ t('theoryEndings.selection.typeLabel') }}</label>
          <div class="toggle-group">
            <button
              v-for="type in (['win', 'draw'] as const)"
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
        <div v-if="mode !== 'tornado'" class="section">
          <label class="section-label">{{ t('theoryEndings.selection.difficultyLabel') }}</label>
          <div class="toggle-group">
            <button
              v-for="diff in difficultyLevels"
              :key="diff"
              class="toggle-btn"
              :class="{ active: selectedDifficulty === diff }"
              @click="selectedDifficulty = diff"
            >
              {{ t(`chess.difficulties.${diff}`) }}
            </button>
          </div>
        </div>
        <!-- Engine Selection -->
        <div v-if="mode !== 'tornado'" class="section">
          <label class="section-label">{{ t('engine.select') }}</label>
          <div class="engine-selector-wrapper">
            <EngineSelector />
          </div>
        </div>

        <!-- Category Selection -->
        <div class="section">
          <label v-if="config.categoryLabel" class="section-label">{{ config.categoryLabel }}</label>
          <div class="category-grid" :class="{ 'tornado-grid': mode === 'tornado' }">
            <button
              v-for="cat in config.categories"
              :key="cat"
              class="category-btn"
              :class="{ active: selectedCategory === cat, 'tornado-card': mode === 'tornado' }"
              @click="selectedCategory = cat"
            >
              <template v-if="cat === 'expert' && mode === 'finish-him'">
                <img src="/svg/crown-svgrepo-com.svg" class="cat-icon-svg" alt="expert" />
              </template>
              <span v-else class="cat-icon">{{ getIcon(cat) }}</span>
              <span class="cat-name">{{ t(getThemeKey(cat)) }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="actions">
        <button
          class="start-btn"
          :style="{ background: `linear-gradient(135deg, ${config.accentColor}, var(--color-accent-secondary))` }"
          @click="handleStart"
        >
          {{ t('theoryEndings.selection.start') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.selection-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: 20px;
}

.selection-card {
  width: 100%;
  max-width: 650px;
  padding: 10px;
  text-align: center;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
}

.title {
  font-size: 2.3rem;
  margin-bottom: 1px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.title.tornado-title {
  font-size: 4rem;
  letter-spacing: 12px;
  margin-bottom: 15px;
}

.subtitle {
  color: var(--color-text-secondary);
  margin-bottom: 15px;
  font-size: 1.1rem;
}

.selection-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 40px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 15px;
  text-align: left;
}

.section-label {
  font-weight: 600;
  color: var(--color-text-default);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.toggle-group {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  padding: 6px;
  border-radius: 12px;
  gap: 6px;
}

.toggle-btn {
  flex: 1;
  padding: 12px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
}

.toggle-btn.active {
  background: v-bind('config.accentColor');
  color: var(--color-text-dark);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.engine-selector-wrapper {
  width: 100%;
}

.engine-selector-wrapper :deep(.engine-selector) {
  max-width: 100%;
}

.engine-selector-wrapper :deep(.selector-toggle) {
  padding: 15px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
}

.category-grid.tornado-grid {
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.category-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.category-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.2);
}

.category-btn.active {
  background: rgba(var(--color-accent-warning-rgb), 0.15); /* Fallback but v-bind is better */
  border-color: v-bind('config.accentColor');
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
}

/* Specific active background for colors */
.category-btn.active {
  background: color-mix(in srgb, v-bind('config.accentColor') 15%, transparent);
}

.category-btn.tornado-card {
  padding: 30px 20px;
  min-height: 140px;
  justify-content: center;
}

.category-btn.tornado-card .cat-icon {
  font-size: 3.5rem;
  margin-bottom: 8px;
}

.category-btn.tornado-card .cat-name {
  font-size: 1.2rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.cat-icon {
  font-size: 1.8rem;
  color: white;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}

.cat-icon-svg {
  width: 32px;
  height: 32px;
  filter: brightness(0) invert(1) drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
}

.cat-name {
  color: var(--color-text-default);
  font-weight: 600;
  font-size: 0.85rem;
}

.actions {
  margin-top: 20px;
}

.start-btn {
  width: 100%;
  padding: 18px;
  border: none;
  border-radius: 15px;
  color: var(--color-text-dark);
  font-size: 1.25rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 3px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
}

.start-btn:hover {
  transform: scale(1.02) translateY(-2px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.4);
}

/* Mobile Adaptation */
@media (max-width: 600px) {
  .selection-card {
    padding: 8px;
    border-radius: 12px;
  }

  .title {
    font-size: 1.25rem;
    letter-spacing: 1px;
  }

  .subtitle {
    font-size: 0.65rem;
    margin-bottom: 14px;
  }

  .selection-sections {
    gap: 14px;
    margin-bottom: 20px;
  }

  .section {
    gap: 8px;
  }

  .section-label {
    font-size: 0.65rem;
  }

  .category-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .category-btn {
    padding: 8px;
    border-radius: 10px;
    gap: 4px;
  }

  .cat-icon {
    font-size: 1.05rem;
  }

  .cat-icon-svg {
    width: 22px;
    height: 22px;
  }

  .cat-name {
    font-size: 0.6rem;
  }

  .start-btn {
    padding: 12px;
    font-size: 0.85rem;
    letter-spacing: 2px;
    border-radius: 10px;
  }

  .toggle-group {
    padding: 4px;
    border-radius: 8px;
  }

  .title.tornado-title {
    font-size: 2rem;
    letter-spacing: 4px;
    margin-bottom: 15px;
  }

  .category-grid.tornado-grid {
    gap: 12px;
  }

  .category-btn.tornado-card {
    padding: 15px 10px;
    min-height: 90px;
  }

  .category-btn.tornado-card .cat-icon {
    font-size: 2.2rem;
    margin-bottom: 4px;
  }

  .category-btn.tornado-card .cat-name {
    font-size: 0.8rem;
    letter-spacing: 0.5px;
  }

  .toggle-btn {
    padding: 6px;
    font-size: 0.75rem;
    border-radius: 6px;
  }
}

@media (max-width: 400px) {
  .title {
    font-size: 1.5rem;
  }
}
</style>
