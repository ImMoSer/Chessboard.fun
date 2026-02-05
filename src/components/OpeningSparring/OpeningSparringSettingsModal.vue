<script setup lang="ts">
import {
    BookOutline,
    ColorPaletteOutline,
    FilterOutline,
    PeopleOutline,
    PlayOutline,
    ServerOutline,
    ShuffleOutline,
} from '@vicons/ionicons5'
import type { SelectOption } from 'naive-ui'
import {
    NButton,
    NCheckbox,
    NGi,
    NGrid,
    NIcon,
    NModal,
    NRadioButton,
    NRadioGroup,
    NSelect,
    NSlider,
    NSpace,
    NTag,
    NText,
} from 'naive-ui'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { theoryGraphService } from '../../services/TheoryGraphService'
import { useOpeningSparringStore } from '../../stores/openingSparring.store'

const emit = defineEmits(['start', 'close'])
const { t } = useI18n()
const openingStore = useOpeningSparringStore()

const selectedColor = ref<'white' | 'black'>('white')
const selectedOpening = ref<string | null>(null)
const majorOpenings = ref<{ name: string; eco?: string; moves: string[]; slug: string }[]>([])

const openingOptions = computed<SelectOption[]>(() => {
  const options: SelectOption[] = [
    { label: t('openingTrainer.settings.startPosition'), value: 'start' },
  ]
  majorOpenings.value.forEach((op) => {
    options.push({
      label: `${op.eco ? `[${op.eco}] ` : ''}${op.name}`,
      value: op.slug,
    })
  })
  return options
})

const allRatings = [1200, 1400, 1600, 1800, 2000, 2200]

function toggleRating(rating: number, checked: boolean) {
    const current = new Set(openingStore.opponentRatings)
    if (checked) {
        current.add(rating)
    } else {
        current.delete(rating)
    }
    // Sort to keep consistent order, though not strictly required by API
    openingStore.opponentRatings = Array.from(current).sort((a, b) => a - b)
}

onMounted(async () => {
  await theoryGraphService.loadBook()
  majorOpenings.value = theoryGraphService.getMajorOpenings()

  // Init from store
  selectedColor.value = openingStore.playerColor
})

function startSession() {
  const op = majorOpenings.value.find((o) => o.slug === selectedOpening.value)
  const moves = op ? op.moves : []
  const slug = selectedOpening.value === 'start' ? undefined : selectedOpening.value
  emit('start', selectedColor.value, moves, slug || undefined)
}
</script>

<template>
  <n-modal
    :show="true"
    preset="card"
    :style="{ width: '600px', borderRadius: '16px' }"
    class="settings-modal"
    :title="t('nav.openingSparring')"
    :bordered="false"
    @close="$emit('close')"
  >
    <template #header-extra>
      <n-icon size="24" color="var(--color-accent-warning)">
        <BookOutline />
      </n-icon>
    </template>

    <div class="modal-body-layout" style="max-height: 60vh; overflow-y: auto; padding-right: 8px;">
      <n-space vertical :size="32">
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
              <n-space align="center" justify="center" :wrap="false">
                <div class="swatch white" />
                {{ t('openingTrainer.settings.white') }}
              </n-space>
            </n-radio-button>
            <n-radio-button value="black" class="color-btn-black">
              <n-space align="center" justify="center" :wrap="false">
                <div class="swatch black" />
                {{ t('openingTrainer.settings.black') }}
              </n-space>
            </n-radio-button>
          </n-radio-group>
          <n-text depth="3" class="hint-text">
            {{ t('openingTrainer.settings.masters') }} (Master DB)
          </n-text>
        </div>

        <!-- 3. Opening Selection -->
        <div class="setting-section">
          <n-space align="center" :size="12" class="section-title">
            <n-icon>
              <FilterOutline />
            </n-icon>
            <n-text strong>{{ t('openingTrainer.settings.selectOpening') }}</n-text>
          </n-space>
          <n-select
            v-model:value="selectedOpening"
            :options="openingOptions"
            filterable
            placeholder="Search opening..."
            size="large"
          />
        </div>

        <!-- 4. Opponent Source -->
        <div class="setting-section">
            <n-space align="center" :size="12" class="section-title">
                <n-icon>
                    <PeopleOutline />
                </n-icon>
                <n-text strong>{{ t('openingTrainer.settings.opponentSource', 'Opponent Base') }}</n-text>
            </n-space>
            <n-radio-group v-model:value="openingStore.opponentSource" size="large" expand>
                <n-radio-button value="master">
                    <n-space align="center" justify="center" :size="8">
                         <n-icon><ServerOutline /></n-icon>
                         <span>Master Base (2200+)</span>
                    </n-space>
                </n-radio-button>
                <n-radio-button value="lichess">
                    <n-space align="center" justify="center" :size="8">
                        <n-icon><PeopleOutline /></n-icon>
                        <span>Lichess Players</span>
                    </n-space>
                </n-radio-button>
            </n-radio-group>

            <div v-if="openingStore.opponentSource === 'lichess'" class="rating-selector">
                <n-text depth="3" class="hint-text" style="margin-bottom: 8px; display: block;">
                   {{ t('openingTrainer.settings.selectRatings', 'Select Opponent Ratings') }}
                </n-text>
                <n-grid :x-gap="12" :y-gap="8" :cols="2">
                    <n-gi v-for="rating in allRatings" :key="rating">
                        <n-checkbox
                            :checked="openingStore.opponentRatings.includes(rating)"
                            @update:checked="(val) => toggleRating(rating, val)"
                            size="large"
                        >
                            {{ rating }}
                        </n-checkbox>
                    </n-gi>
                </n-grid>
            </div>
            <n-text depth="3" class="hint-text">
                {{ openingStore.opponentSource === 'master'
                   ? t('openingTrainer.settings.masterHint', 'Bot plays optimal moves from Master games.')
                   : t('openingTrainer.settings.lichessHint', 'Bot simulates human play styles based on selected ratings.') }}
            </n-text>
        </div>

        <!-- 5. Variability -->
        <div class="setting-section">
          <n-space align="center" justify="space-between" class="section-title">
            <n-space align="center" :size="12">
              <n-icon>
                <ShuffleOutline />
              </n-icon>
              <n-text strong>{{
                t('openingTrainer.settings.variability', {
                  value: openingStore.variability,
                })
              }}</n-text>
            </n-space>
            <n-tag :bordered="false" type="info" size="small"
              >{{ openingStore.variability }} / 7</n-tag
            >
          </n-space>
          <n-slider v-model:value="openingStore.variability" :min="3" :max="7" :step="1" />
          <n-text depth="3" class="hint-text">
            {{ t('openingTrainer.settings.variabilityHint') }}
          </n-text>
        </div>

      </n-space>
    </div>

    <template #footer>
      <n-button
        type="primary"
        size="large"
        block
        secondary
        strong
        class="start-btn exam-btn"
        @click="startSession"
      >
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

.modal-body-layout {
  padding: 8px 0;
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
    color: var(--color-accent-warning);
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

  &.exam-btn {
    background: var(--color-accent-warning) !important;
    color: var(--color-text-dark) !important;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(var(--color-accent-warning-rgb, 200, 200, 100), 0.4);
  }

  &:active {
    transform: translateY(0);
  }
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
