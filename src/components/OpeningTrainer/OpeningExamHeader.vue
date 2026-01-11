<script setup lang="ts">
import {
    BulbOutline,
    Heart,
    HeartOutline,
    PlayOutline,
    RefreshOutline,
    TrophyOutline
} from '@vicons/ionicons5';
import {
    NButton,
    NCard,
    NGrid, NGridItem,
    NIcon,
    NPageHeader,
    NSpace,
    NStatistic,
    NTag,
    NText
} from 'naive-ui';
import { useI18n } from 'vue-i18n';

defineProps<{
    openingName: string;
    eco?: string;
    averageAccuracy: number;
    averageWinRate: number;
    averageRating: number;
    isTheoryOver: boolean;
    isDeviation: boolean;
    isPlayoutMode?: boolean;
    lives?: number;
}>();

const emit = defineEmits<{
    (e: 'restart'): void;
    (e: 'hint'): void;
    (e: 'playout'): void;
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
                <n-space align="center">
                    <!-- Lives Display (Hearts) -->
                    <div v-if="lives !== undefined" class="lives-container">
                        <n-space :size="4">
                            <n-icon v-for="i in 3" :key="i" size="20"
                                :color="i <= lives ? '#f44336' : 'rgba(244, 67, 54, 0.2)'" class="heart-icon"
                                :class="{ 'lost': i > lives }">
                                <Heart v-if="i <= lives" />
                                <HeartOutline v-else />
                            </n-icon>
                        </n-space>
                    </div>

                    <n-tag type="warning" size="small" round uppercase>
                        <template #icon>
                            <n-icon>
                                <TrophyOutline />
                            </n-icon>
                        </template>
                        {{ t('nav.openingExam') }}
                    </n-tag>
                    <n-tag v-if="isTheoryOver" type="warning" size="small" round uppercase>
                        {{ t('openingTrainer.header.bookEnded') }}
                    </n-tag>
                    <n-tag v-if="isDeviation" type="error" size="small" round uppercase>
                        {{ t('openingTrainer.header.deviation') }}
                    </n-tag>
                    <n-tag v-if="isPlayoutMode" type="success" size="small" round uppercase>
                        PLAYOUT
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
                                <n-button block secondary @click="emit('hint')"
                                    :disabled="isPlayoutMode || (lives !== undefined && lives <= 0)">
                                    <template #icon><n-icon>
                                            <BulbOutline />
                                        </n-icon></template>
                                    {{ t('openingTrainer.header.hint') }}
                                </n-button>
                            </n-grid-item>
                        </n-grid>

                        <n-button block class="playout-btn" type="success" secondary @click="emit('playout')"
                            :disabled="isPlayoutMode">
                            <template #icon><n-icon>
                                    <PlayOutline />
                                </n-icon></template>
                            {{ t('openingTrainer.header.playout') }}
                        </n-button>
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

.lives-container {
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 20px;
}

.heart-icon {
    transition: all 0.3s ease;
    filter: drop-shadow(0 0 5px rgba(244, 67, 54, 0.2));

    &.lost {
        filter: none;
        opacity: 0.3;
    }
}

.playout-btn {
    width: 100%;
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
