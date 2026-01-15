<!-- src/views/PracticalChessSelectionView.vue -->
<script setup lang="ts">
import EngineSelector from '@/components/EngineSelector.vue'
import { usePracticalChessStore } from '@/stores/practicalChess.store'
import {
    PRACTICAL_CHESS_CATEGORIES,
    type PracticalChessCategory,
    type PracticalChessDifficulty,
} from '@/types/api.types'
import { getThemeTranslationKey } from '@/utils/theme-mapper'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
const practicalStore = usePracticalChessStore()

const selectedDifficulty = ref<PracticalChessDifficulty>(practicalStore.activeDifficulty)
const selectedCategory = ref<PracticalChessCategory>(practicalStore.activeCategory)

const difficultyLevels: PracticalChessDifficulty[] = ['Novice', 'Pro', 'Master']

function handleStart() {
    practicalStore.selectDifficulty(selectedDifficulty.value)
    practicalStore.selectCategory(selectedCategory.value)
    router.push({ name: 'practical-chess-play' })
}
</script>

<template>
    <div class="practical-selection-container">
        <div class="glass-panel selection-card">
            <h1 class="title">{{ t('practicalChess.selection.title') }}</h1>
            <p class="subtitle">{{ t('practicalChess.selection.subtitle') }}</p>

            <div class="selection-sections">
                <!-- Difficulty Selection -->
                <div class="section">
                    <label class="section-label">{{ t('practicalChess.selection.difficultyLabel') }}</label>
                    <div class="toggle-group">
                        <button v-for="diff in difficultyLevels" :key="diff" class="toggle-btn"
                            :class="{ active: selectedDifficulty === diff }" @click="selectedDifficulty = diff">
                            {{ t(`theoryEndings.difficulties.${diff}`) }}
                        </button>
                    </div>
                </div>

                <!-- Engine Selection -->
                <div class="section">
                    <label class="section-label">{{ t('engine.title') || 'Engine' }}</label>
                    <div class="engine-selector-wrapper">
                        <EngineSelector />
                    </div>
                </div>

                <!-- Category Selection -->
                <div class="section">
                    <label class="section-label">{{ t('practicalChess.selection.categoryLabel') }}</label>
                    <div class="category-grid">
                        <button v-for="cat in PRACTICAL_CHESS_CATEGORIES" :key="cat" class="category-btn"
                            :class="{ active: selectedCategory === cat }" @click="selectedCategory = cat">
                            <span class="cat-icon">{{ t(`practicalChess.categories.${cat}.icon`) }}</span>
                            <span class="cat-name">{{ t(`chess.themes.${getThemeTranslationKey(cat)}`) }}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="actions">
                <button class="start-btn" @click="handleStart">
                    {{ t('practicalChess.selection.start') }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.practical-selection-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    padding: 20px;
}

.selection-card {
    width: 100%;
    max-width: 600px;
    padding: 40px;
    text-align: center;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
}

.title {
    font-size: 2rem;
    margin-bottom: 10px;
    color: var(--color-accent-primary);
    font-weight: 800;
}

.subtitle {
    color: var(--color-text-secondary);
    margin-bottom: 30px;
    font-size: 1rem;
}

.selection-sections {
    display: flex;
    flex-direction: column;
    gap: 30px;
    margin-bottom: 40px;
}

.section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-align: left;
}

.engine-selector-wrapper {
    width: 100%;
    display: flex;
    justify-content: flex-start;
}

.engine-selector-wrapper :deep(.engine-selector) {
    max-width: 100%;
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
    background: rgba(0, 0, 0, 0.2);
    padding: 4px;
    border-radius: 12px;
    gap: 4px;
}

.toggle-btn {
    flex: 1;
    padding: 10px;
    border: none;
    background: transparent;
    color: var(--color-text-secondary);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 600;
}

.toggle-btn.active {
    background: var(--color-accent-primary);
    color: var(--color-text-dark);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 10px;
}

.category-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 15px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.category-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
}

.category-btn.active {
    background: rgba(var(--color-accent-primary-rgb), 0.15);
    border-color: var(--color-accent-primary);
}

.cat-icon {
    font-size: 1.5rem;
    color: white;
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
}

.cat-name {
    font-size: 0.8rem;
    color: var(--color-text-default);
    font-weight: 500;
}

.actions {
    margin-top: 20px;
}

.start-btn {
    width: 100%;
    padding: 15px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary));
    color: var(--color-text-dark);
    font-size: 1.1rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 2px;
}

.start-btn:hover {
    transform: scale(1.02);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
}

@media (max-width: 480px) {
    .category-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
</style>
