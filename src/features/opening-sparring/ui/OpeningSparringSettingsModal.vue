<script setup lang="ts">
import { theoryGraphService } from '@/entities/opening'
import { useOpeningSparringStore } from '../index'
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

const emit = defineEmits(['start', 'close'])
const { t } = useI18n()
const openingStore = useOpeningSparringStore()

const selectedColor = ref<'white' | 'black'>('white')
const selectedOpening = ref<string | null>(null)
const majorOpenings = ref<{ name: string; eco?: string; moves: string[]; slug: string }[]>([])

const openingOptions = computed<SelectOption[]>(() => {
  const options: SelectOption[] = [
    { label: t('features.diamondHunter.settings.startPosition'), value: 'start' },
  ]
  majorOpenings.value.forEach((op) => {
    options.push({
      label: `${op.eco ? `[${op.eco}] ` : ''}${op.name}`,
      value: op.slug,
    })
  })
  return options
})

// Removed multi-rating toggle functionality

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
    :style="{ width: 'min(600px, calc(100vw - 32px))', borderRadius: '16px' }"
    class="settings-modal glass-panel-modal"
    :title="t('nav.openingSparring')"
    :bordered="false"
    @close="$emit('close')"
  >
    <template #header-extra>
      <n-icon size="24" color="var(--color-primary)">
        <BookOutline />
      </n-icon>
    </template>

    <div class="modal-body-layout" style="max-height: 60vh; overflow-y: auto; padding-right: 8px">
      <n-space vertical :size="32">
        <!-- 1. Color Selection -->
        <div class="setting-section">
          <n-space align="center" :size="12" class="section-title">
            <n-icon>
              <ColorPaletteOutline />
            </n-icon>
            <n-text strong>{{ t('features.diamondHunter.settings.color') }}</n-text>
          </n-space>
          <n-radio-group v-model:value="selectedColor" name="color" size="large" expand>
            <n-radio-button value="white" class="color-btn-white">
              <n-space align="center" justify="center" :wrap="false">
                <div class="swatch white" />
                {{ t('features.diamondHunter.settings.white') }}
              </n-space>
            </n-radio-button>
            <n-radio-button value="black" class="color-btn-black">
              <n-space align="center" justify="center" :wrap="false">
                <div class="swatch black" />
                {{ t('features.diamondHunter.settings.black') }}
              </n-space>
            </n-radio-button>
          </n-radio-group>
          <n-text depth="3" class="hint-text">
            {{ t('features.diamondHunter.settings.masters') }} (Master DB)
          </n-text>
        </div>

        <!-- 3. Opening Selection -->
        <div class="setting-section">
          <n-space align="center" :size="12" class="section-title">
            <n-icon>
              <FilterOutline />
            </n-icon>
            <n-text strong>{{ t('features.diamondHunter.settings.selectOpening') }}</n-text>
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
            <n-text strong>{{
              t('features.diamondHunter.settings.opponentSource', 'Opponent Base')
            }}</n-text>
          </n-space>
          <n-radio-group v-model:value="openingStore.opponentSource" size="large" expand>
            <n-radio-button value="master">
              <n-space align="center" justify="center" :size="8">
                <n-icon><ServerOutline /></n-icon>
                <span>{{ t('features.diamondHunter.settings.masters') }} (2200+)</span>
              </n-space>
            </n-radio-button>
            <n-radio-button value="lichess">
              <n-space align="center" justify="center" :size="8">
                <n-icon><PeopleOutline /></n-icon>
                <span>{{ t('features.diamondHunter.settings.lichessPlayers') }}</span>
              </n-space>
            </n-radio-button>
          </n-radio-group>

          <div v-if="openingStore.opponentSource === 'lichess'" class="rating-selector" style="margin-top: 12px;">
            <n-text depth="3" class="hint-text" style="margin-bottom: 8px; display: block">
              {{ t('features.diamondHunter.settings.selectRatings', 'Select Opponent Ratings') }}
            </n-text>
            <n-radio-group v-model:value="openingStore.opponentRatingRange" size="large" expand>
              <n-radio-button value="1000-1499">1000 - 1499</n-radio-button>
              <n-radio-button value="1500-1799">1500 - 1799</n-radio-button>
              <n-radio-button value="1800-2200">1800 - 2200</n-radio-button>
            </n-radio-group>
          </div>
          <n-text depth="3" class="hint-text">
            {{
              openingStore.opponentSource === 'master'
                ? t(
                    'features.diamondHunter.settings.masterHint',
                    'Bot plays optimal moves from Master games.',
                  )
                : t(
                    'features.diamondHunter.settings.lichessHint',
                    'Bot simulates human play styles based on selected ratings.',
                  )
            }}
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
                t('features.diamondHunter.settings.variability', {
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
            {{ t('features.diamondHunter.settings.variabilityHint') }}
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
        class="start-btn"
        @click="startSession"
      >
        <template #icon>
          <n-icon>
            <PlayOutline />
          </n-icon>
        </template>
        {{ t('features.diamondHunter.settings.startSession') }}
      </n-button>
    </template>
  </n-modal>
</template>


