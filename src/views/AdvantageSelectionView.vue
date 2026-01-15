<!-- src/views/AdvantageSelectionView.vue -->
<script setup lang="ts">
import { useFinishHimStore } from '@/stores/finishHim.store'
import {
    type AdvantageDifficulty,
    type AdvantageTheme
} from '@/types/api.types'
import { getThemeTranslationKey } from '@/utils/theme-mapper'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
const finishHimStore = useFinishHimStore()

const selectedDifficulty = ref<AdvantageDifficulty>('Novice')
const selectedTheme = ref<AdvantageTheme | 'auto'>('auto')

const difficultyLevels: AdvantageDifficulty[] = ['Novice', 'Pro', 'Master']

const themesWithIcons: { key: AdvantageTheme | 'auto', icon?: string, isSvg?: boolean }[] = [
    { key: 'auto' },
    { key: 'pawn' },
    { key: 'knight' },
    { key: 'bishop' },
    { key: 'rookPawn' },
    { key: 'queen' },
    { key: 'knightBishop' },
    { key: 'rookPieces' },
    { key: 'queenPieces' },
    { key: 'expert', icon: '/svg/crown-svgrepo-com.svg', isSvg: true },
]

function handleStart() {
    finishHimStore.setParams(selectedTheme.value, selectedDifficulty.value)
    router.push({
        name: 'finish-him-play',
    })
}

onMounted(() => {
    finishHimStore.reset()
})
</script>

<template>
    <div class="advantage-selection-container">
        <div class="glass-panel selection-card">
            <h1 class="title">{{ t('finishHim.selection.title') }}</h1>
            <p class="subtitle">{{ t('finishHim.selection.subtitle') }}</p>

            <div class="selection-sections">
                <!-- Difficulty Selection -->
                <div class="section">
                    <label class="section-label">{{ t('theoryEndings.selection.difficultyLabel') }}</label>
                    <div class="toggle-group">
                        <button v-for="diff in difficultyLevels" :key="diff" class="toggle-btn"
                            :class="{ active: selectedDifficulty === diff }" @click="selectedDifficulty = diff">
                            {{ t(`theoryEndings.difficulties.${diff}`) }}
                        </button>
                    </div>
                </div>

                <!-- Theme Selection -->
                <div class="section">
                    <label class="section-label">{{ t('finishHim.selection.themeLabel') }}</label>
                    <div class="category-grid">
                        <button v-for="theme in themesWithIcons" :key="theme.key" class="category-btn"
                            :class="{ active: selectedTheme === theme.key }" @click="selectedTheme = theme.key">
                            <span v-if="!theme.isSvg" class="cat-icon">
                                {{ t(`theoryEndings.categories.${theme.key}.icon`, theme.key === 'auto' ? '✨' : '') }}
                            </span>
                            <img v-else :src="theme.icon" class="cat-icon-svg" alt="icon" />
                            <span class="cat-name">{{ t(`chess.themes.${getThemeTranslationKey(theme.key)}`) }}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="section engine-section">
                <label class="section-label">{{ t('engine.select') }}</label>
                <div class="engine-selector-wrapper">
                    <EngineSelector />
                </div>
            </div>

            <div class="actions">
                <button class="start-btn" @click="handleStart">
                    {{ t('theoryEndings.selection.start') }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.advantage-selection-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    padding: 20px;
}

.selection-card {
    width: 100%;
    max-width: 650px;
    padding: 40px;
    text-align: center;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
}

.title {
    font-size: 2.5rem;
    margin-bottom: 10px;
    color: var(--color-accent-warning);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 2px;
}

.subtitle {
    color: var(--color-text-secondary);
    margin-bottom: 30px;
    font-size: 1.1rem;
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
    background: var(--color-accent-warning);
    color: var(--color-text-dark);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 12px;
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
    background: rgba(var(--color-accent-warning-rgb), 0.15);
    border-color: var(--color-accent-warning);
    box-shadow: 0 0 15px rgba(var(--color-accent-warning-rgb), 0.2);
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
}

.engine-section {
    margin-top: -10px;
    margin-bottom: 20px;
}

.engine-selector-wrapper {
    width: 100%;
    max-width: 100%;
}

.engine-selector-wrapper :deep(.engine-selector) {
    max-width: 100%;
}

.engine-selector-wrapper :deep(.selector-toggle) {
    padding: 15px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 12px;
}

.actions {
    margin-top: 20px;
}

.start-btn {
    width: 100%;
    padding: 18px;
    border: none;
    border-radius: 15px;
    background: linear-gradient(135deg, var(--color-accent-warning), #ffa000);
    color: var(--color-text-dark);
    font-size: 1.25rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 3px;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

.start-btn:hover {
    transform: scale(1.02) translateY(-2px);
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.4);
}

@media (max-width: 480px) {
    .category-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
</style>
