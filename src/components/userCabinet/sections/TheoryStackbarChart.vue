<!-- src/components/userCabinet/sections/TheoryStackbarChart.vue -->
<script setup lang="ts">
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
import { computed, ref, type PropType } from 'vue'
import VChart from 'vue-echarts'
import { useI18n } from 'vue-i18n'

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent])

const { t, te } = useI18n()

interface TheoryStatValue {
  success: number
  requested: number
}

interface TooltipParam {
  dataIndex: number
  seriesName: string
  color: string
}

interface LabelParam {
  value: number
}

interface ClickParam {
  dataIndex: number
  seriesIndex: number
}

const props = defineProps({
  stats: {
    type: Object as PropType<Record<string, TheoryStatValue>>,
    required: true,
  },
  mode: {
    type: String as PropType<'theory' | 'advantage' | 'practical'>,
    default: 'theory',
  },
})

const activeType = ref<'win' | 'draw'>('win')
const showModal = ref(false)
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
    'extra_pawn',
    'material_equality',
    'bishops',
    'knights',
    'pawns',
    'queens',
    'rooks',
    'exchange',
    'knight_vs_bishop',
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
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      appendTo: 'body',
      confine: true,
      triggerOn: 'mousemove|click',
      backgroundColor: '#2a2a2e', // Matching --color-bg-tertiary
      borderColor: '#5A5A5A',
      textStyle: { color: '#CCCCCC' },
      formatter: (params: unknown) => {
        const p = params as TooltipParam[]
        if (!p || !p[0]) return ''
        const theme = themes[p[0].dataIndex]
        if (!theme) return ''
        let themeName = theme
        if (te(`chess.tornado.${theme}`)) themeName = t(`chess.tornado.${theme}`)
        else if (te(`chess.finishHim.category.${theme}`)) themeName = t(`chess.finishHim.category.${theme}`)
        else if (te(`chess.endings.${theme}`)) themeName = t(`chess.endings.${theme}`)

        let html = `<div style="padding: 4px; min-width: 150px;">
                      <b style="color: #FFFFFF; display: block; margin-bottom: 8px; border-bottom: 1px solid #5A5A5A; padding-bottom: 4px;">${themeName}</b>`

        p.forEach((item) => {
          const diff = item.seriesName
          const key = `${prefix}/${diff}/${theme}`
          const stat = props.stats[key]
          if (stat && stat.requested > 0) {
            const accuracy = Math.round((stat.success / stat.requested) * 100)
            html += `
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: ${item.color}; font-weight: bold;">${t(`theoryEndings.difficulties.${diff}`)}:</span>
                <span style="color: #FFF;">${stat.success}/${stat.requested} (${accuracy}%)</span>
              </div>`
          }
        })
        return html + '</div>'
      },
    },
    legend: {
      data: difficulties.map((d) => t(`theoryEndings.difficulties.${d}`)),
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
      name: t(`theoryEndings.difficulties.${diff}`),
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
  const themeId = currentThemes.value[p.dataIndex]
  const difficultyId = difficulties[p.seriesIndex]
  console.log(
    `[ECharts Click] Mode: ${props.mode}, Type: ${activeType.value}, Theme: ${themeId}, Difficulty: ${difficultyId}`,
  )
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
                : mode === 'advantage'
                  ? t('userCabinet.stats.modes.advantage')
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
          : mode === 'advantage'
            ? t('userCabinet.stats.modes.advantage')
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
  </div>
</template>

<style scoped>
.theory-chart-standalone {
  width: 100%;
  background-color: var(--color-bg-tertiary);
  border-radius: 12px;
  padding: 20px;
  margin-top: 24px;
  border: 1px solid var(--color-border);
  box-sizing: border-box;
}

.mode-advantage .theory-title,
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
}

:deep(.zoom-modal) {
  background-color: var(--color-bg-tertiary);
}
</style>
