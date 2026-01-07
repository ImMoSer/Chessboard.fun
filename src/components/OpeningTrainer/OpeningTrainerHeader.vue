<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import {
    NPageHeader, NGrid, NGridItem, NStatistic, NButton, NButtonGroup,
    NTag, NSpace, NIcon, NCard
} from 'naive-ui';
import {
    RefreshOutline,
    BulbOutline,
    EyeOutline,
    EyeOffOutline,
    BarChartOutline,
    PlayOutline
} from '@vicons/ionicons5';

defineProps<{
    openingName: string;
    eco?: string;
    averageAccuracy: number;
    averageWinRate: number;
    averageRating: number;
    isTheoryOver: boolean;
    isDeviation: boolean;
    isReviewMode: boolean;
    isAnalysisActive: boolean;
}>();

const emit = defineEmits<{
    (e: 'restart'): void;
    (e: 'hint'): void;
    (e: 'toggle-review'): void;
    (e: 'playout'): void;
    (e: 'toggle-analysis'): void;
}>();

const { t } = useI18n();
</script>

<template>
    <n-card class="header-card" :bordered="false">
        <n-page-header class="opening-header">
            <template #title>
                <div class="title-container">
                    <n-text class="opening-name">
                        <n-tag v-if="eco" type="info" size="small" round :bordered="false" class="eco-tag">
                            {{ eco }}
                        </n-tag>
                        {{ openingName || t('openingTrainer.header.searching') }}
                    </n-text>
                </div>
            </template>

            <template #extra>
                <n-space>
                    <n-tag v-if="isTheoryOver" type="warning" size="small" round uppercase>
                        {{ t('openingTrainer.header.bookEnded') }}
                    </n-tag>
                    <n-tag v-if="isDeviation" type="error" size="small" round uppercase>
                        {{ t('openingTrainer.header.deviation') }}
                    </n-tag>
                </n-space>
            </template>

            <div class="stats-section">
                <n-grid :cols="3" :x-gap="12">
                    <n-grid-item>
                        <n-statistic :label="t('openingTrainer.header.accuracy')" :value="averageAccuracy">
                            <template #suffix>%</template>
                        </n-statistic>
                    </n-grid-item>
                    <n-grid-item>
                        <n-statistic :label="t('openingTrainer.header.winRate')" :value="averageWinRate">
                            <template #suffix>%</template>
                        </n-statistic>
                    </n-grid-item>
                    <n-grid-item>
                        <n-statistic :label="t('openingTrainer.header.avgRating')" :value="averageRating" />
                    </n-grid-item>
                </n-grid>
            </div>

            <template #footer>
                <div class="controls-section">
                    <n-space vertical :size="12">
                        <n-grid :cols="2" :x-gap="8" :y-gap="8">
                            <n-grid-item>
                                <n-button block secondary @click="emit('restart')">
                                    <template #icon><n-icon>
                                            <RefreshOutline />
                                        </n-icon></template>
                                    {{ t('openingTrainer.header.newSession') }}
                                </n-button>
                            </n-grid-item>
                            <n-grid-item>
                                <n-button block secondary @click="emit('hint')">
                                    <template #icon><n-icon>
                                            <BulbOutline />
                                        </n-icon></template>
                                    {{ t('openingTrainer.header.hint') }}
                                </n-button>
                            </n-grid-item>
                            <n-grid-item :span="2">
                                <n-button block :type="isReviewMode ? 'primary' : 'default'" :secondary="!isReviewMode"
                                    @click="emit('toggle-review')">
                                    <template #icon>
                                        <n-icon>
                                            <component :is="isReviewMode ? EyeOffOutline : EyeOutline" />
                                        </n-icon>
                                    </template>
                                    {{ isReviewMode ? t('openingTrainer.header.hideTheory') :
                                        t('openingTrainer.header.showTheory') }}
                                </n-button>
                            </n-grid-item>
                        </n-grid>

                        <n-button-group class="action-group">
                            <n-button class="action-btn" :type="isAnalysisActive ? 'primary' : 'default'"
                                :secondary="!isAnalysisActive" @click="emit('toggle-analysis')">
                                <template #icon><n-icon>
                                        <BarChartOutline />
                                    </n-icon></template>
                                {{ t('openingTrainer.header.analysis') }}
                            </n-button>
                            <n-button class="action-btn" type="success" secondary @click="emit('playout')">
                                <template #icon><n-icon>
                                        <PlayOutline />
                                    </n-icon></template>
                                {{ t('openingTrainer.header.playout') }}
                            </n-button>
                        </n-button-group>
                    </n-space>
                </div>
            </template>
        </n-page-header>
    </n-card>
</template>

<style scoped lang="scss">
.header-card {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 12px;
}

.opening-name {
    font-size: 1.1rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 8px;
    line-height: 1.2;
}

.eco-tag {
    font-family: monospace;
    font-weight: 800;
}

.stats-section {
    margin-top: 16px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.controls-section {
    margin-top: 16px;
}

.action-group {
    width: 100%;
    display: flex;

    .action-btn {
        flex: 1;
    }
}

:deep(.n-statistic) {
    .n-statistic-label {
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--color-text-secondary);
    }

    .n-statistic-value__content {
        font-size: 1.1rem;
        font-weight: 700;
    }

    .n-statistic-value__suffix {
        font-size: 0.8rem;
        opacity: 0.6;
    }
}
</style>
