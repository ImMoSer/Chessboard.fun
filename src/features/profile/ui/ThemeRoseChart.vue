<script setup lang="ts">
import { ExpandOutline, CloseOutline } from '@vicons/ionicons5'
import { PieChart } from 'echarts/charts'
import { LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed, nextTick, onMounted, onUnmounted, ref, type PropType } from 'vue'
import VChart from 'vue-echarts'
import { useI18n } from 'vue-i18n'
import type { GameLaunchOptions } from '@/shared/types/api.types'

use([CanvasRenderer, PieChart, TooltipComponent, LegendComponent, TitleComponent])

const { t, te } = useI18n()

interface ThemeStat {
  theme: string
  rating: number
  success: number
  requested: number
}

interface RoseParam {
  data: {
    raw: ThemeStat
  }
  name: string
  event: {
    event: MouseEvent
  }
}

interface PopupData {
  modeName: string
  subModeName: string
  themeName: string
  rating: number
  accuracy: number
  success: number
  requested: number
  themeId: string
  screenMode: string
}

const props = defineProps({
  themes: {
    type: Array as PropType<ThemeStat[]>,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  modes: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
  activeMode: {
    type: String,
    default: '',
  },
  mode: {
    type: String as PropType<'tornado' | 'finish_him' | 'theory_win' | 'theory_draw' | 'practical'>,
    default: 'tornado',
  },
})

const emit = defineEmits<{
  (e: 'update:activeMode', value: string): void
  (e: 'improve', options: GameLaunchOptions): void
}>()

const activePopup = ref<{ visible: boolean; x: number; y: number; data: PopupData | null }>({
  visible: false,
  x: 0,
  y: 0,
  data: null,
})
const popupRef = ref<HTMLElement | null>(null)
const lastOpenTime = ref(0)

// Close popup when clicking outside
const handleClickOutside = (event: MouseEvent | TouchEvent) => {
  if (Date.now() - lastOpenTime.value < 100) return

  if (
    activePopup.value.visible &&
    popupRef.value &&
    !popupRef.value.contains(event.target as Node)
  ) {
    activePopup.value.visible = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('touchstart', handleClickOutside, { passive: true })
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('touchstart', handleClickOutside)
})

const viewMode = ref<'rating' | 'accuracy'>('rating')
const showModal = ref(false)

const formatMode = (mode: string) => {
  return mode.charAt(0).toUpperCase() + mode.slice(1)
}

const chartData = computed(() => {
  return props.themes
    .map((item) => {
      const accuracy = item.requested > 0 ? (item.success / item.requested) * 100 : 0
      return {
        name: item.theme,
        value: viewMode.value === 'rating' ? item.rating : Math.round(accuracy),
        raw: item,
      }
    })
    .sort((a, b) => b.value - a.value)
})

const option = computed(() => {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      show: false, // Disable default tooltip
    },
    series: [
      {
        name: props.title,
        type: 'pie',
        radius: ['10%', '70%'],
        center: ['50%', '50%'],
        roseType: 'radius',
        itemStyle: {
          borderRadius: 5,
        },
        label: {
          show: true,
          color: '#CCCCCC',
          formatter: (params: unknown) => {
            const p = params as RoseParam
            const theme = p.name
            let themeName = theme
            if (te(`chess.tornado.${theme}`)) themeName = t(`chess.tornado.${theme}`)
            else if (te(`chess.finishHim.category.${theme}`))
              themeName = t(`chess.finishHim.category.${theme}`)
            else if (te(`chess.endings.${theme}`)) themeName = t(`chess.endings.${theme}`)
            else if (te(`chess.practicalChess.category.${theme}`)) themeName = t(`chess.practicalChess.category.${theme}`)

            return themeName.length > 10 ? themeName.slice(0, 8) + '..' : themeName
          },
        },
        emphasis: {
          label: {
            show: true,
            fontWeight: 'bold',
          },
        },
        data: chartData.value,
      },
    ],
  }
})

const onChartClick = (params: unknown) => {
  const p = params as RoseParam
  const data = p.data.raw
  const accuracy = data.requested > 0 ? Math.round((data.success / data.requested) * 100) : 0
  const theme = data.theme

  let themeName = theme
  if (te(`chess.tornado.${theme}`)) themeName = t(`chess.tornado.${theme}`)
  else if (te(`chess.finishHim.category.${theme}`))
    themeName = t(`chess.finishHim.category.${theme}`)
  else if (te(`chess.endings.${theme}`)) themeName = t(`chess.endings.${theme}`)
  else if (te(`chess.practicalChess.category.${theme}`)) themeName = t(`chess.practicalChess.category.${theme}`)

  const ev = p.event.event as Event
  let x = window.innerWidth / 2
  let y = window.innerHeight / 2

  if ('clientX' in ev) {
    x = (ev as MouseEvent).clientX
    y = (ev as MouseEvent).clientY
  } else if ('changedTouches' in ev) {
    const touches = (ev as TouchEvent).changedTouches
    const firstTouch = touches?.[0]
    if (firstTouch) {
      x = firstTouch.clientX
      y = firstTouch.clientY
    }
  }

  // Stop propagation so the document click listener doesn't immediately close it
  if (p.event.event.stopImmediatePropagation) {
    p.event.event.stopImmediatePropagation()
  }

  lastOpenTime.value = Date.now()

  const modeName = props.title
  const screenModeRaw = props.activeMode || props.mode
  const subModeName =
    screenModeRaw.charAt(0).toUpperCase() + screenModeRaw.slice(1)

  activePopup.value = {
    visible: true,
    x: x + 10,
    y: y + 10,
    data: {
      modeName,
      subModeName,
      themeName,
      rating: Math.round(data.rating),
      accuracy,
      success: data.success,
      requested: data.requested,
      themeId: theme,
      screenMode: screenModeRaw,
    },
  }

  nextTick(() => {
    if (popupRef.value) {
      const rect = popupRef.value.getBoundingClientRect()
      let safeX = activePopup.value.x
      let safeY = activePopup.value.y
      
      const padding = 10
      
      // Check right boundary
      if (safeX + rect.width + padding > window.innerWidth) {
        safeX = window.innerWidth - rect.width - padding
      }
      
      // Check bottom boundary
      if (safeY + rect.height + padding > window.innerHeight) {
        safeY = window.innerHeight - rect.height - padding
      }
      
      // Prevent going off-screen to the left or top
      if (safeX < padding) safeX = padding
      if (safeY < padding) safeY = padding
      
      activePopup.value.x = safeX
      activePopup.value.y = safeY
    }
  })
}

const onImproveClick = () => {
  if (!activePopup.value.data) return

  const { themeId, screenMode } = activePopup.value.data

  emit('improve', {
    mode: props.mode, // 'tornado' | 'finish_him'
    theme: themeId,
    subMode: screenMode, // 'bullet', 'blitz' etc. OR 'novice', 'pro' ...
  })
}
</script>

<template>
  <div class="theme-rose-container">
    <div class="chart-header">
      <div class="header-left-group">
        <h3 class="chart-title">{{ title }}</h3>
        <n-button quaternary circle size="small" @click="showModal = true" class="zoom-btn">
          <template #icon>
            <n-icon :component="ExpandOutline" />
          </template>
        </n-button>
      </div>
      <n-radio-group v-model:value="viewMode" size="small">
        <n-radio-button value="rating">{{ t('userCabinet.analyticsTable.rating') }}</n-radio-button>
        <n-radio-button value="accuracy">{{
          t('userCabinet.analyticsTable.accuracy')
        }}</n-radio-button>
      </n-radio-group>
    </div>

    <div class="chart-wrapper">
      <v-chart class="chart" :option="option" @click="onChartClick" autoresize />
    </div>

    <div v-if="modes.length > 0" class="chart-footer">
      <n-radio-group
        :value="activeMode"
        @update:value="emit('update:activeMode', $event)"
        size="small"
      >
        <n-radio-button v-for="mode in modes" :key="mode" :value="mode">
          {{ formatMode(mode) }}
        </n-radio-button>
      </n-radio-group>
    </div>

    <!-- Zoom Modal -->
    <n-modal
      v-model:show="showModal"
      preset="card"
      class="zoom-modal"
      :title="title"
      style="width: 90vw; max-width: 1200px"
    >
      <div class="modal-content">
        <div class="modal-controls">
          <n-radio-group v-model:value="viewMode" size="medium">
            <n-radio-button value="rating">{{
              t('userCabinet.analyticsTable.rating')
            }}</n-radio-button>
            <n-radio-button value="accuracy">{{
              t('userCabinet.analyticsTable.accuracy')
            }}</n-radio-button>
          </n-radio-group>

          <n-radio-group
            v-if="modes.length > 0"
            :value="activeMode"
            @update:value="emit('update:activeMode', $event)"
            size="medium"
          >
            <n-radio-button v-for="mode in modes" :key="mode" :value="mode">
              {{ formatMode(mode) }}
            </n-radio-button>
          </n-radio-group>
        </div>
        <div class="modal-chart-wrapper">
          <v-chart class="chart" :option="option" autoresize />
        </div>
      </div>
    </n-modal>

    <!-- Chart Popup -->
    <Teleport to="body">
      <div
        v-if="activePopup.visible && activePopup.data"
        ref="popupRef"
        class="chart-popup"
        :style="{
          top: `${activePopup.y}px`,
          left: `${activePopup.x}px`,
        }"
      >
        <div class="popup-header">
          <span class="popup-title">
            {{ activePopup.data.modeName }} {{ activePopup.data.subModeName }}
          </span>
          <n-button circle size="tiny" type="error" ghost @click="activePopup.visible = false" class="close-btn">
            <template #icon>
              <n-icon :component="CloseOutline" />
            </template>
          </n-button>
        </div>

        <div class="popup-content">
          <div class="popup-theme-name">
            {{ activePopup.data.themeName }}
          </div>
          <div class="popup-row">
            <span>{{ t('userCabinet.analyticsTable.rating') }}:</span>
            <span class="rating-val">{{ activePopup.data.rating }}</span>
          </div>
          <div class="popup-row">
            <span>{{ t('userCabinet.analyticsTable.accuracy') }}:</span>
            <span
              class="accuracy-val"
              :class="{
                'high-acc': activePopup.data.accuracy > 70,
                'low-acc': activePopup.data.accuracy <= 70,
              }"
            >
              {{ activePopup.data.accuracy }}%
            </span>
          </div>
          <div class="popup-row">
            <span>{{ t('userCabinet.stats.success') }}:</span>
            <span>{{ activePopup.data.success }} / {{ activePopup.data.requested }}</span>
          </div>
        </div>

        <div class="popup-footer">
          <n-button type="primary" block @click="onImproveClick" class="improve-btn">
            {{ t('userCabinet.stats.improve') }} {{ activePopup.data.subModeName }}
          </n-button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.chart-popup {
  position: fixed;
  z-index: 9999;
  background-color: var(--glass-bg, var(--color-bg-tertiary));
  backdrop-filter: var(--glass-blur, blur(12px));
  -webkit-backdrop-filter: var(--glass-blur, blur(12px));
  border: 1px solid color-mix(in srgb, var(--color-neon-cyan) 50%, transparent);
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 8px 32px color-mix(in srgb, var(--color-neon-cyan) 25%, transparent), 
              0 0 16px color-mix(in srgb, var(--color-neon-cyan) 15%, transparent),
              inset 0 0 16px color-mix(in srgb, var(--color-neon-cyan) 5%, transparent);
  min-width: 180px;
  pointer-events: auto;
  transform: translate(0, 0);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-neon-cyan) 25%, transparent);
  gap: 16px;
}

.popup-title {
  font-weight: bold;
  color: var(--color-text-primary);
  font-size: 1rem;
}

.popup-theme-name {
  margin-bottom: 8px;
  font-size: 0.95rem;
  font-weight: bold;
  color: var(--color-text-primary);
  border-bottom: 1px dashed color-mix(in srgb, var(--color-text-secondary) 30%, transparent);
  padding-bottom: 4px;
}

.close-btn {
  flex-shrink: 0;
}

.popup-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--color-neon-cyan) 25%, transparent);
}

.improve-btn {
  font-weight: bold;
}

.popup-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.popup-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.rating-val {
  color: #f39c12;
  font-weight: bold;
}

.accuracy-val {
  font-weight: bold;
}

.high-acc {
  color: var(--color-success);
}

.low-acc {
  color: #f39c12;
}

.theme-rose-container {
  width: 100%;
  background-color: var(--color-bg-tertiary);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--color-border);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-title {
  margin: 0;
  color: var(--color-accent-primary);
  font-family: var(--font-family-primary);
  font-size: 1.25rem;
  font-weight: 600;
}

.zoom-btn {
  color: var(--color-text-muted);
}

.chart-wrapper {
  width: 100%;
  height: 400px;
}

.chart {
  width: 100%;
  height: 100%;
}

.chart-footer {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.modal-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.modal-chart-wrapper {
  width: 100%;
  height: 70vh;
  min-height: 500px;
}

@media (max-width: 768px) {
  .theme-rose-container {
    padding: 14px;
  }

  .chart-header {
    gap: 11px;
    margin-bottom: 7px;
  }

  .chart-title {
    font-size: 0.88rem;
  }

  .chart-wrapper {
    height: 280px;
  }

  .header-left-group {
    gap: 6px;
  }
}

@media (max-width: 600px) {
  .chart-popup {
    max-width: none;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    width: 85vw;
    max-width: 320px;
  }
}

:deep(.zoom-modal) {
  background-color: var(--color-bg-tertiary);
}
</style>
