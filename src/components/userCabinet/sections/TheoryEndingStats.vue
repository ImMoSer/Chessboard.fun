<!-- src/components/userCabinet/sections/TheoryEndingStats.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserCabinetStore } from '@/stores/userCabinet.store'
import { THEORY_ENDING_CATEGORIES } from '@/types/api.types'

const { t } = useI18n()
const userCabinetStore = useUserCabinetStore()

const stats = computed(() => userCabinetStore.detailedStats?.theory?.stats || {})

const hasData = computed(() => Object.keys(stats.value).length > 0)

const flattenedStats = computed(() => {
    const result = []
    for (const [key, val] of Object.entries(stats.value)) {
        const [type, diff, cat] = key.split('/')
        result.push({
            key,
            type,
            difficulty: diff,
            category: cat,
            requested: val.requested,
            success: val.success,
            accuracy: val.requested > 0 ? Math.round((val.success / val.requested) * 100) : 0
        })
    }
    return result.sort((a, b) => b.requested - a.requested)
})
</script>

<template>
    <div class="theory-stats-section" v-if="hasData">
        <h3 class="section-title">{{ t('theoryEndings.selection.title') }}</h3>
        <div class="stats-grid">
            <div v-for="item in flattenedStats" :key="item.key" class="stat-card">
                <div class="card-header">
                    <span class="cat-icon">{{ t(`theoryEndings.categories.${item.category}.icon`) }}</span>
                    <div class="header-text">
                        <span class="cat-name">{{ t(`theoryEndings.categories.${item.category}.name`) }}</span>
                        <span class="type-diff">{{ t(`theoryEndings.types.${item.type}`) }} | {{
                            t(`theoryEndings.difficulties.${item.difficulty}`) }}</span>
                    </div>
                </div>
                <div class="card-body">
                    <div class="stat-item">
                        <span class="label">{{ t('records.table.requested') }}</span>
                        <span class="value">{{ item.requested }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="label">{{ t('records.table.solved') }}</span>
                        <span class="value success">{{ item.success }}</span>
                    </div>
                    <div class="stat-item accuracy-item">
                        <div class="accuracy-bar-container">
                            <div class="accuracy-bar" :style="{ width: `${item.accuracy}%` }"></div>
                        </div>
                        <span class="accuracy-value">{{ item.accuracy }}%</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.theory-stats-section {
    margin-top: 20px;
}

.section-title {
    font-size: 1.2rem;
    margin-bottom: 20px;
    color: var(--color-accent-primary);
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 15px;
}

.stat-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 15px;
    transition: transform 0.2s ease;
}

.stat-card:hover {
    transform: translateY(-3px);
    border-color: var(--color-accent-primary);
}

.card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 15px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    padding-bottom: 10px;
}

.cat-icon {
    font-size: 1.5rem;
}

.header-text {
    display: flex;
    flex-direction: column;
}

.cat-name {
    font-weight: 700;
    font-size: 1rem;
}

.type-diff {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
}

.card-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.stat-item {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
}

.label {
    color: var(--color-text-secondary);
}

.value {
    font-weight: 700;
}

.value.success {
    color: var(--color-text-success, #4caf50);
}

.accuracy-item {
    margin-top: 5px;
    align-items: center;
    gap: 10px;
}

.accuracy-bar-container {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
}

.accuracy-bar {
    height: 100%;
    background: var(--color-accent-primary);
    border-radius: 3px;
}

.accuracy-value {
    font-size: 0.75rem;
    font-weight: 700;
    min-width: 35px;
    text-align: right;
}
</style>
