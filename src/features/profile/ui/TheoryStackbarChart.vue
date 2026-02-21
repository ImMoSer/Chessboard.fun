<!-- src/components/userCabinet/sections/TheoryStackbarChart.vue -->
<script setup lang="ts">
import { useGameLauncher } from '@/shared/lib/composables/useGameLauncher'
import { ExpandOutline } from '@vicons/ionicons5'
import { BarChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed, onMounted, onUnmounted, ref, type PropType } from 'vue'
import VChart from 'vue-echarts'
import { useI18n } from 'vue-i18n'

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent])

const { t, te } = useI18n()

interface TheoryStatValue {
  success: number
  requested: number
}

interface LabelParam {
  value: number
}

interface ClickParam {
  dataIndex: number
  seriesIndex: number
  event: {
    event: MouseEvent
  }
}

interface PopupData {
  title: string
  items: {
    difficulty: string
    success: number
    requested: number
    accuracy: number
    color: string
  }[]
  themeId: string
  clickedDifficulty: string
}

const props = defineProps({
  stats: {
    type: Object as PropType<Record<string, TheoryStatValue>>,
    required: true,
  },
  mode: {
    type: String as PropType<'theory' | 'finish_him' | 'practical'>,
    default: 'theory',
  },
})

const activeType = ref<'win' | 'draw'>('win')
const { launchGame } = useGameLauncher()
const showModal = ref(false)
const activePopup = ref<{ visible: boolean; x: number; y: number; data: PopupData | null }>({
  visible: false,
  x: 0,
  y: 0,
  data: null,
})
const popupRef = ref<HTMLElement | null>(null)

// Close popup when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (activePopup.value.visible && popupRef.value && !popupRef.value.contains(event.target as Node)) {
     activePopup.value.visible = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const difficulties = ['Novice', 'Pro', 'Master'] as const

const seriesColors = {
  Novice: '#42b883', // Vue green
  Pro: '#35495e', // Vue dark blue
  Master: '#f39c12', // Orange
}

// Extract unique themes from keys
const currentThemes = computed(() => {
  const themes = new Set<string>()
  const prefix = props.mode === 'theory' ? activeType.value : 'win'

  Object.keys(props.stats).forEach((key) => {
    const parts = key.split('/')
    if (parts.length === 3 && parts[0] === prefix) {
      const theme = parts[2]
      if (theme) {
        themes.add(theme)
      }
    }
  })

  const preferredOrder = [
    'pawn',
    'knight',
    'bishop',
    'rookPawn',
    'rookPieces',
    'knightBishop',
    'queen',
    'queenPieces',
    'expert',
    'extraPawn',
    'materialEquality',
    'bishops',
    'knights',
    'pawns',
    'queens',
    'rooks',
    'exchange',
  ]

  return Array.from(themes).sort((a, b) => {
    const indexA = preferredOrder.indexOf(a)
    const indexB = preferredOrder.indexOf(b)
    if (indexA !== -1 && indexB !== -1) return indexA - indexB
    if (indexA !== -1) return -1
    if (indexB !== -1) return 1
    return a.localeCompare(b)
  })
})

const option = computed(() => {
  const themes = currentThemes.value
  const prefix = props.mode === 'theory' ? activeType.value : 'win'

  return {
    backgroundColor: 'transparent',
    tooltip: {
      show: false, // Disable default tooltip
    },
    legend: {
      data: difficulties.map((d) => t(`theoryEndings.difficulties.${d.toLowerCase()}`)),
      textStyle: { color: '#CCCCCC' },
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '5%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: themes.map((theme) => {
        if (te(`chess.tornado.${theme}`)) return t(`chess.tornado.${theme}`)
        if (te(`chess.finishHim.category.${theme}`)) return t(`chess.finishHim.category.${theme}`)
        if (te(`chess.endings.${theme}`)) return t(`chess.endings.${theme}`)
        return theme
      }),
      axisLabel: {
        color: '#CCCCCC',
        interval: 0,
        rotate: themes.length > 6 ? 30 : 0,
      },
      axisLine: { lineStyle: { color: '#5A5A5A' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#CCCCCC' },
      axisLine: { lineStyle: { color: '#5A5A5A' } },
      splitLine: { lineStyle: { color: '#444' } },
    },
    series: difficulties.map((diff) => ({
      name: t(`theoryEndings.difficulties.${diff.toLowerCase()}`),
      type: 'bar',
      stack: 'total',
      label: {
        show: true,
        formatter: (params: unknown) => {
          const p = params as LabelParam
          return p.value > 0 ? p.value : ''
        },
        color: '#fff',
        fontSize: 10,
      },
      emphasis: {
        focus: 'self',
      },
      itemStyle: {
        color: seriesColors[diff],
      },
      data: themes.map((theme) => {
        const key = `${prefix}/${diff}/${theme}`
        return props.stats[key]?.success || 0
      }),
    })),
  }
})

const onChartClick = (params: unknown) => {
  const p = params as ClickParam
  const theme = currentThemes.value[p.dataIndex]
  const difficulty = difficulties[p.seriesIndex] ?? 'Master'
  const prefix = props.mode === 'theory' ? activeType.value : 'win'

  if (!theme) return

  let themeName = theme
  if (te(`chess.tornado.${theme}`)) themeName = t(`chess.tornado.${theme}`)
  else if (te(`chess.finishHim.category.${theme}`)) themeName = t(`chess.finishHim.category.${theme}`)
  else if (te(`chess.endings.${theme}`)) themeName = t(`chess.endings.${theme}`)

  const items: PopupData['items'] = []

  // Collect data for all difficulties for this theme
  difficulties.forEach(diff => {
    const key = `${prefix}/${diff}/${theme}`
    const stat = props.stats[key]
    if (stat && stat.requested > 0) {
      items.push({
        difficulty: diff,
        success: stat.success,
        requested: stat.requested,
        accuracy: Math.round((stat.success / stat.requested) * 100),
        color: seriesColors[diff],
      })
    }
  })

  // Prevent popup from going offscreen (basic implementation)
  const x = p.event.event.clientX
  const y = p.event.event.clientY

  // Stop propagation so the document click listener doesn't immediately close it
  if (p.event.event.stopImmediatePropagation) {
    p.event.event.stopImmediatePropagation()
  }

  activePopup.value = {
    visible: true,
    x,
    y,
    data: {
      title: themeName,
      items,
      themeId: theme,
      clickedDifficulty: difficulty
    },
  }
}

const onImproveClick = () => {
  if (!activePopup.value.data) return

  const { themeId, clickedDifficulty } = activePopup.value.data

  launchGame({
    mode: props.mode,
    theme: themeId,
    difficulty: clickedDifficulty,
    type: activeType.value
  })
}
</script>

<template>
  <div class="theory-chart-standalone" :class="`mode-${mode}`">
    <div class="chart-header">
      <div class="header-left">
        <div class="title-group">
          <h3 class="theory-title">
            {{
              mode === 'theory'
                ? t('userCabinet.stats.modes.theory')
                : mode === 'finish_him'
                  ? t('userCabinet.stats.modes.finishHim')
                  : t('userCabinet.stats.modes.practical')
            }}
          </h3>
          <n-button quaternary circle size="small" @click="showModal = true" class="zoom-btn">
            <template #icon>
              <n-icon :component="ExpandOutline" />
            </template>
          </n-button>
        </div>
        <n-button-group v-if="mode === 'theory'">
          <n-button
            :type="activeType === 'win' ? 'primary' : 'default'"
            @click="activeType = 'win'"
            size="small"
          >
            {{ t('theoryEndings.types.win') }}
          </n-button>
          <n-button
            :type="activeType === 'draw' ? 'primary' : 'default'"
            @click="activeType = 'draw'"
            size="small"
          >
            {{ t('theoryEndings.types.draw') }}
          </n-button>
        </n-button-group>
      </div>
    </div>

    <div class="chart-wrapper">
      <v-chart class="chart" :option="option" @click="onChartClick" autoresize />
    </div>

    <!-- Zoom Modal -->
    <n-modal
      v-model:show="showModal"
      preset="card"
      class="zoom-modal"
      :title="
        mode === 'theory'
          ? t('userCabinet.stats.modes.theory')
          : mode === 'finish_him'
            ? t('userCabinet.stats.modes.finishHim')
            : t('userCabinet.stats.modes.practical')
      "
      style="width: 90vw; max-width: 1200px"
    >
      <div class="modal-content">
        <div class="modal-controls" v-if="mode === 'theory'">
          <n-radio-group v-model:value="activeType" size="medium">
            <n-radio-button value="win">{{ t('theoryEndings.types.win') }}</n-radio-button>
            <n-radio-button value="draw">{{ t('theoryEndings.types.draw') }}</n-radio-button>
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
          top: `${activePopup.y + 10}px`,
          left: `${activePopup.x + 10}px`,
        }"
      >
        <div class="popup-header">
          <span class="popup-title">{{ activePopup.data.title }}</span>
          <n-button
            type="primary"
            size="tiny"
            @click="onImproveClick"
            class="improve-btn"
          >
            {{ t('userCabinet.stats.improve') }}
          </n-button>
        </div>

        <div class="popup-content">
          <div
            v-for="(item, index) in activePopup.data.items"
            :key="index"
            class="popup-item"
          >
            <div class="popup-label">
              <span
                class="diff-indicator"
                :style="{ backgroundColor: item.color }"
              ></span>
              <span class="diff-name">{{ t(`theoryEndings.difficulties.${item.difficulty.toLowerCase()}`) }}:</span>
            </div>
            <div class="popup-value">
              {{ item.success }}/{{ item.requested }}
              <span
                class="accuracy-val"
                :class="{ 'high-acc': item.accuracy > 70, 'low-acc': item.accuracy <= 70 }"
              >
                ({{ item.accuracy }}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.chart-popup {
  position: fixed;
  z-index: 9999;
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  min-width: 200px;
  pointer-events: auto;
  transform: translate(0, 0); /* Initial position */
}

/* Ensure popup stays within viewport if needed - logic for this could be added to script,
   but for now we rely on simple positioning.
   If it goes off screen, we might need logic to adjust x/y
*/

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.popup-title {
  font-weight: bold;
  color: var(--color-text-primary);
  font-size: 0.9rem;
}

.improve-btn {
  font-size: 0.7rem;
  padding: 0 8px;
  height: 22px;
}

.popup-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  font-size: 0.85rem;
}

.popup-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);
}

.diff-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.popup-value {
  color: var(--color-text-primary);
  font-weight: 500;
}

.accuracy-val {
  margin-left: 4px;
  font-size: 0.8rem;
}

.high-acc {
  color: var(--color-success);
}

.low-acc {
  color: var(--color-warning);
}

.theory-chart-standalone {
  width: 100%;
  background-color: var(--color-bg-tertiary);
  border-radius: 12px;
  padding: 20px;
  margin-top: 24px;
  border: 1px solid var(--color-border);
  box-sizing: border-box;
}

.mode-finish_him .theory-title,
.mode-practical .theory-title {
  color: var(--color-accent-primary);
}

.mode-theory .theory-title {
  color: var(--color-accent-secondary);
}

.chart-header {
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theory-title {
  margin: 0;
  font-family: var(--font-family-primary);
  font-size: 1.5rem;
  font-weight: bold;
}

.zoom-btn {
  color: var(--color-text-muted);
}

.chart-wrapper {
  width: 100%;
  height: 450px;
}

.chart {
  width: 100%;
  height: 100%;
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.modal-controls {
  display: flex;
  justify-content: center;
}

.modal-chart-wrapper {
  width: 100%;
  height: 70vh;
  min-height: 500px;
}

@media (max-width: 768px) {
  .theory-chart-standalone {
    padding: 14px;
    margin-top: 17px;
  }

  .theory-title {
    font-size: 1.05rem;
  }

  .header-left {
    gap: 17px;
    flex-direction: column;
    align-items: flex-start;
  }

  .title-group {
    gap: 6px;
  }

  .chart-wrapper {
    height: 315px;
  }

  .chart-header {
    margin-bottom: 11px;
  }
}

@media (max-width: 600px) {
  .header-left {
    gap: 12px;
  }

  .chart-popup {
    /* Adjust for mobile to keep it on screen better */
    max-width: 90vw;
  }
}

:deep(.zoom-modal) {
  background-color: var(--color-bg-tertiary);
}
</style>
