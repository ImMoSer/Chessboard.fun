<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useOpeningTrainerStore } from '../../stores/openingTrainer.store';
import { openingGraphService } from '../../services/OpeningGraphService';
import type { OpeningDatabaseSource, LichessParams } from '../../services/OpeningApiService';
import { useI18n } from 'vue-i18n';
import {
    NModal, NSpace, NButton, NRadioGroup, NRadioButton,
    NSelect, NSlider, NText, NCheckboxGroup, NCheckbox,
    NGrid, NGridItem, NTag, NIcon
} from 'naive-ui';
import type { SelectOption } from 'naive-ui';
import {
    ColorPaletteOutline,
    LibraryOutline,
    FilterOutline,
    BookOutline,
    ShuffleOutline,
    PlayOutline
} from '@vicons/ionicons5';

const emit = defineEmits(['start', 'close']);
const { t } = useI18n();
const openingStore = useOpeningTrainerStore();

const selectedColor = ref<'white' | 'black'>('white');
const selectedOpening = ref<string | null>(null);
const majorOpenings = ref<{ name: string, eco?: string, moves: string[], slug: string }[]>([]);

// Database Settings (Local State)
const localDbSource = ref<OpeningDatabaseSource>('masters');
const localLichessParams = ref<LichessParams>({
    ratings: [],
    speeds: []
});

const AVAILABLE_RATINGS = [1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500];
const AVAILABLE_SPEEDS = ['bullet', 'blitz', 'rapid', 'classical'];

const openingOptions = computed<SelectOption[]>(() => {
    const options: SelectOption[] = [
        { label: t('openingTrainer.settings.startPosition'), value: 'start' }
    ];
    majorOpenings.value.forEach(op => {
        options.push({
            label: `${op.eco ? `[${op.eco}] ` : ''}${op.name}`,
            value: op.slug
        });
    });
    return options;
});

onMounted(async () => {
    await openingGraphService.loadBook();
    majorOpenings.value = openingGraphService.getMajorOpenings() as any;

    // Init from store
    selectedColor.value = openingStore.playerColor;
    localDbSource.value = openingStore.dbSource;
    localLichessParams.value = {
        ratings: [...openingStore.lichessParams.ratings],
        speeds: [...openingStore.lichessParams.speeds]
    };
});

function startSession() {
    // Save DB settings to store
    openingStore.setDatabaseSource(localDbSource.value);
    if (localDbSource.value === 'lichess') {
        const finalRatings = localLichessParams.value.ratings.length > 0
            ? localLichessParams.value.ratings
            : [1600, 1800, 2000, 2200, 2500];

        const finalSpeeds = localLichessParams.value.speeds.length > 0
            ? localLichessParams.value.speeds
            : ['blitz', 'rapid', 'classical'];

        openingStore.setLichessParams({
            ratings: finalRatings,
            speeds: finalSpeeds
        });
    }

    const op = majorOpenings.value.find(o => o.slug === selectedOpening.value);
    const moves = op ? op.moves : [];
    const slug = selectedOpening.value === 'start' ? undefined : selectedOpening.value;
    emit('start', selectedColor.value, moves, slug || undefined);
}
</script>

<template>
    <n-modal :show="true" preset="card" style="width: 600px; border-radius: 16px;" class="settings-modal"
        :title="t('openingTrainer.settings.title')" :bordered="false" @close="$emit('close')">
        <template #header-extra>
            <n-icon size="24" color="var(--color-accent)">
                <BookOutline />
            </n-icon>
        </template>

        <n-space vertical :size="24">
            <!-- 1. Color Selection -->
            <div class="setting-section">
                <n-space align="center" :size="12" class="section-title">
                    <n-icon>
                        <ColorPaletteOutline />
                    </n-icon>
                    <n-text strong>{{ t('openingTrainer.settings.color') }}</n-text>
                </n-space>
                <n-radio-group v-model:value="selectedColor" name="color" size="large" expand>
                    <n-radio-button value="white" class="color-btn-white">
                        <n-space align="center" justify="center">
                            <div class="swatch white" />
                            {{ t('openingTrainer.settings.white') }}
                        </n-space>
                    </n-radio-button>
                    <n-radio-button value="black" class="color-btn-black">
                        <n-space align="center" justify="center">
                            <div class="swatch black" />
                            {{ t('openingTrainer.settings.black') }}
                        </n-space>
                    </n-radio-button>
                </n-radio-group>
            </div>

            <!-- 2. Database Source -->
            <div class="setting-section">
                <n-space align="center" :size="12" class="section-title">
                    <n-icon>
                        <LibraryOutline />
                    </n-icon>
                    <n-text strong>{{ t('openingTrainer.settings.opponentDb') }}</n-text>
                </n-space>
                <n-radio-group v-model:value="localDbSource" name="db" size="medium" expand>
                    <n-radio-button value="masters">{{ t('openingTrainer.settings.masters') }}</n-radio-button>
                    <n-radio-button value="lichess">{{ t('openingTrainer.settings.lichessPlayers') }}</n-radio-button>
                </n-radio-group>

                <!-- Lichess Filters -->
                <transition name="fade-slide">
                    <div v-if="localDbSource === 'lichess'" class="filters-container">
                        <n-grid :cols="2" :x-gap="24">
                            <n-grid-item>
                                <n-text depth="3" class="filter-label">{{ t('openingTrainer.settings.ratings')
                                    }}</n-text>
                                <n-checkbox-group v-model:value="localLichessParams.ratings">
                                    <n-grid :cols="2" :y-gap="8">
                                        <n-grid-item v-for="r in AVAILABLE_RATINGS" :key="r">
                                            <n-checkbox :value="r" :label="r.toString()" />
                                        </n-grid-item>
                                    </n-grid>
                                </n-checkbox-group>
                            </n-grid-item>
                            <n-grid-item>
                                <n-text depth="3" class="filter-label">{{ t('openingTrainer.settings.timeControls')
                                    }}</n-text>
                                <n-checkbox-group v-model:value="localLichessParams.speeds">
                                    <n-space vertical :size="8">
                                        <n-checkbox v-for="s in AVAILABLE_SPEEDS" :key="s" :value="s">
                                            <span style="text-transform: capitalize;">{{ s }}</span>
                                        </n-checkbox>
                                    </n-space>
                                </n-checkbox-group>
                            </n-grid-item>
                        </n-grid>
                    </div>
                </transition>
            </div>

            <!-- 3. Opening Selection -->
            <div class="setting-section">
                <n-space align="center" :size="12" class="section-title">
                    <n-icon>
                        <FilterOutline />
                    </n-icon>
                    <n-text strong>{{ t('openingTrainer.settings.selectOpening') }}</n-text>
                </n-space>
                <n-select v-model:value="selectedOpening" :options="openingOptions" filterable
                    placeholder="Search opening..." size="large" />
            </div>

            <!-- 4. Variability -->
            <div class="setting-section">
                <n-space align="center" justify="space-between" class="section-title">
                    <n-space align="center" :size="12">
                        <n-icon>
                            <ShuffleOutline />
                        </n-icon>
                        <n-text strong>{{ t('openingTrainer.settings.variability', { value: openingStore.variability })
                            }}</n-text>
                    </n-space>
                    <n-tag :bordered="false" type="info" size="small">{{ openingStore.variability }} / 10</n-tag>
                </n-space>
                <n-slider v-model:value="openingStore.variability" :min="1" :max="10" :step="1" />
                <n-text depth="3" class="hint-text">
                    {{ t('openingTrainer.settings.variabilityHint') }}
                </n-text>
            </div>
        </n-space>

        <template #footer>
            <n-button type="primary" size="large" block secondary strong class="start-btn" @click="startSession">
                <template #icon>
                    <n-icon>
                        <PlayOutline />
                    </n-icon>
                </template>
                {{ t('openingTrainer.settings.startSession') }}
            </n-button>
        </template>
    </n-modal>
</template>

<style scoped lang="scss">
.settings-modal {
    background: var(--color-bg-secondary);
}

.setting-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.section-title {
    font-size: 0.95rem;
    margin-bottom: 4px;
    color: var(--color-text-secondary);

    .n-icon {
        font-size: 1.2rem;
        color: var(--color-accent);
    }
}

.color-btn-white {
    --n-button-color-active: #fff !important;
    --n-button-text-color-active: #222 !important;
}

.color-btn-black {
    --n-button-color-active: #222 !important;
    --n-button-text-color-active: #fff !important;
}

.swatch {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1px solid rgba(0, 0, 0, 0.1);

    &.white {
        background: #fff;
    }

    &.black {
        background: #222;
    }
}

.filters-container {
    background: rgba(255, 255, 255, 0.03);
    padding: 20px;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    margin-top: 8px;
}

.filter-label {
    display: block;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 12px;
}

.hint-text {
    font-size: 0.8rem;
    line-height: 1.4;
    margin-top: 4px;
}

.start-btn {
    height: 52px;
    font-size: 1.1rem;
    background: var(--color-accent) !important;
    color: white !important;
    border: none !important;
    border-radius: 12px !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(var(--color-accent-rgb, 100, 200, 100), 0.4);
    }

    &:active {
        transform: translateY(0);
    }
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
    transition: all 0.3s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

:deep(.n-radio-button) {
    --n-button-border-radius: 8px !important;
}

:deep(.n-select) {
    .n-base-selection {
        border-radius: 8px !important;
    }
}
</style>
