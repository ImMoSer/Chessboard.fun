<script setup lang="ts">
import {
    ColorPaletteOutline,
    DiamondOutline,
    PlayOutline,
} from '@vicons/ionicons5'
import {
    NButton,
    NIcon,
    NModal,
    NRadioButton,
    NRadioGroup,
    NSpace,
    NText,
} from 'naive-ui'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnalysisStore } from '../../stores/analysis.store'

const emit = defineEmits(['start', 'close'])
const { t } = useI18n()
const analysisStore = useAnalysisStore()

const selectedColor = ref<'white' | 'black'>('white')

onMounted(() => {
  // Init from analysis store if player color is set
  if (analysisStore.playerColor) {
    selectedColor.value = analysisStore.playerColor
  }
})

function startSession() {
  emit('start', selectedColor.value)
}
</script>

<template>
  <n-modal
    :show="true"
    preset="card"
    :style="{ width: '400px', borderRadius: '16px' }"
    class="settings-modal"
    :title="'Diamond Hunter'"
    :bordered="false"
    @close="$emit('close')"
  >
    <template #header-extra>
      <n-icon size="24" color="#00C853">
        <DiamondOutline />
      </n-icon>
    </template>

    <div class="modal-body-layout">
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
        </div>

         <n-text depth="3" class="hint-text" style="text-align: center; display: block;">
            Find hidden tactical diamonds. Limit: 2 per day.
          </n-text>

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
        Start Hunt
      </n-button>
    </template>
  </n-modal>
</template>

<style scoped lang="scss">
.settings-modal {
  background: var(--color-bg-secondary);
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-body-layout {
  padding: 8px 0;
  transition: all 0.4s ease;
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

.hint-text {
  font-size: 0.9rem;
  line-height: 1.4;
  margin-top: 4px;
}

.start-btn {
  height: 52px;
  font-size: 1.1rem;
  background: #00C853 !important; /* Green for Diamond Hunter */
  color: white !important;
  border: none !important;
  border-radius: 12px !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 200, 83, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
}

:deep(.n-radio-button) {
  --n-button-border-radius: 8px !important;
}
</style>
