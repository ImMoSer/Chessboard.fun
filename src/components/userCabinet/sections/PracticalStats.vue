<!-- src/components/userCabinet/sections/PracticalStats.vue -->
<script setup lang="ts">
import type { PracticalChessStatItem } from '@/types/api.types'
import { getThemeTranslationKey } from '@/utils/theme-mapper'
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
    stats: {
        type: Array as PropType<PracticalChessStatItem[]>,
        required: true,
    },
})
</script>

<template>
    <div class="practical-stats-container">
        <h3 class="title">{{ t('nav.practicalChess') }}</h3>
        <div class="stats-grid">
            <div v-for="stat in stats" :key="stat.category" class="stat-card">
                <div class="cat-info">
                    <span class="cat-icon">{{ t(`practicalChess.categories.${stat.category}.icon`) }}</span>
                    <span class="cat-name">{{ t(`chess.themes.${getThemeTranslationKey(stat.category)}`) }}</span>
                </div>
                <div class="stat-values">
                    <div class="stat-item">
                        <span class="label">{{ t('userCabinet.analyticsTable.solved_attempted') }}</span>
                        <span class="value">{{ stat.puzzles_solved }} / {{ stat.puzzles_attempted }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="label">{{ t('userCabinet.analyticsTable.accuracy_percent') }}</span>
                        <span class="value">{{ stat.puzzles_attempted > 0 ? Math.round((stat.puzzles_solved /
                            stat.puzzles_attempted) * 100) : 0 }}%</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.practical-stats-container {
    width: 100%;
    background-color: var(--color-bg-tertiary);
    border-radius: 12px;
    padding: 24px;
    border: 1px solid var(--color-border);
}

.title {
    margin: 0 0 20px 0;
    color: var(--color-accent-primary);
    font-size: 1.5rem;
    font-weight: bold;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
}

.stat-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.cat-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

.cat-icon {
    font-size: 1.5rem;
}

.cat-name {
    font-weight: 600;
    color: var(--color-text-default);
}

.stat-values {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.stat-item {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
}

.label {
    color: var(--color-text-secondary);
}

.value {
    color: var(--color-text-default);
    font-weight: 500;
}
</style>
