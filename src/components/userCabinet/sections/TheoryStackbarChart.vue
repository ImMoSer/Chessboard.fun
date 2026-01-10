<!-- src/components/userCabinet/sections/TheoryStackbarChart.vue -->
<script setup lang="ts">
import { ref, computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent
} from 'echarts/components'
import VChart from 'vue-echarts'

use([
  CanvasRenderer,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent
])

const { t } = useI18n()

interface TheoryStatValue {
  success: number
  requested: number
}

const props = defineProps({
  stats: {
    type: Object as PropType<Record<string, TheoryStatValue>>,
    required: true,
  },
  mode: {
    type: String as PropType<'theory' | 'advantage'>,
    default: 'theory',
  }
})

const activeType = ref<'win' | 'draw'>('win')
const difficulties = ['Novice', 'Pro', 'Master'] as const

const seriesColors = {
  Novice: '#42b883', // Vue green
  Pro: '#35495e',    // Vue dark blue
  Master: '#f39c12'  // Orange
}

// Extract unique themes from keys
const currentThemes = computed(() => {
  const themes = new Set<string>()
  const prefix = props.mode === 'theory' ? activeType.value : 'win'
  
      Object.keys(props.stats).forEach(key => {
        const parts = key.split('/')
        if (parts.length === 3 && parts[0] === prefix) {
          const theme = parts[2]
          if (theme) {
            themes.add(theme)
          }
        }
      })
  const preferredOrder = [
    'pawn', 'knight', 'bishop', 'rookPawn', 'rookPieces', 'knightBishop', 'queen', 'queenPieces', 'expert'
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
        type: 'shadow'
      },
      backgroundColor: '#2a2a2e', // Matching --color-bg-tertiary
      borderColor: '#5A5A5A',
      textStyle: { color: '#CCCCCC' },
      formatter: (params: any) => {
        const theme = themes[params[0].dataIndex]
        const themeKey = `theoryEndings.categories.${theme}.name`
        const translatedTheme = t(themeKey)
        const themeName = translatedTheme !== themeKey ? translatedTheme : t(`themes.${theme}`)
        
        let html = `<div style="padding: 4px; min-width: 150px;">
                      <b style="color: #FFFFFF; display: block; margin-bottom: 8px; border-bottom: 1px solid #5A5A5A; padding-bottom: 4px;">${themeName}</b>`
        
        params.forEach((item: any) => {
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
      }
    },
    legend: {
      data: difficulties.map(d => t(`theoryEndings.difficulties.${d}`)),
      textStyle: { color: '#CCCCCC' },
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: themes.map(theme => {
        const themeKey = `theoryEndings.categories.${theme}.name`
        const translatedTheme = t(themeKey)
        return translatedTheme !== themeKey ? translatedTheme : t(`themes.${theme}`)
      }),
      axisLabel: {
        color: '#CCCCCC',
        interval: 0,
        rotate: themes.length > 6 ? 30 : 0
      },
      axisLine: { lineStyle: { color: '#5A5A5A' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#CCCCCC' },
      axisLine: { lineStyle: { color: '#5A5A5A' } },
      splitLine: { lineStyle: { color: '#444' } }
    },
    series: difficulties.map(diff => ({
      name: t(`theoryEndings.difficulties.${diff}`),
      type: 'bar',
      stack: 'total',
      label: {
        show: true,
        formatter: (params: any) => {
          return params.value > 0 ? params.value : ''
        },
        color: '#fff',
        fontSize: 10
      },
      emphasis: {
        focus: 'self'
      },
      itemStyle: {
        color: seriesColors[diff]
      },
      data: themes.map(theme => {
        const key = `${prefix}/${diff}/${theme}`
        return props.stats[key]?.success || 0
      })
    }))
  }
})

const onChartClick = (params: any) => {
  // ECharts returns seriesName (difficulty) and name (theme label)
  // We need to find the raw theme ID from the label or use dataIndex
  const themeId = currentThemes.value[params.dataIndex]
  const difficultyId = difficulties[params.seriesIndex] // difficulties order matches series order

  console.log(`[ECharts Click] Mode: ${props.mode}, Type: ${activeType.value}, Theme: ${themeId}, Difficulty: ${difficultyId}`)
  // emit('startTraining', { mode: props.mode, type: activeType.value, theme: themeId, difficulty: difficultyId })
}
</script>

<template>
  <div class="theory-chart-standalone" :class="`mode-${mode}`">
    <div class="chart-header">
      <div class="header-left">
        <h3 class="theory-title">
          {{ props.mode === 'theory' ? t('userCabinet.stats.modes.theory') : t('userCabinet.stats.modes.advantage') }}
        </h3>
        <n-button-group v-if="mode === 'theory'">
          <n-button :type="activeType === 'win' ? 'primary' : 'default'" @click="activeType = 'win'" size="small">
            {{ t('theoryEndings.types.win') }}
          </n-button>
          <n-button :type="activeType === 'draw' ? 'primary' : 'default'" @click="activeType = 'draw'" size="small">
            {{ t('theoryEndings.types.draw') }}
          </n-button>
        </n-button-group>
      </div>
    </div>

    <div class="chart-wrapper">
      <v-chart class="chart" :option="option" @click="onChartClick" autoresize />
    </div>
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

.mode-advantage .theory-title {
  color: var(--color-accent-primary);
}

.mode-theory .theory-title {
  color: var(--color-accent-secondary);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.theory-title {
  margin: 0;
  font-family: var(--font-family-primary);
  font-size: 1.5rem;
  font-weight: bold;
}

.chart-wrapper {
  width: 100%;
  height: 450px;
}

.chart {
  width: 100%;
  height: 100%;
}

@media (max-width: 600px) {
  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>