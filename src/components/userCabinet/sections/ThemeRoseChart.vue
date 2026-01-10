<!-- src/components/userCabinet/sections/ThemeRoseChart.vue -->
<script setup lang="ts">
import { ref, computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { use } from 'echarts/core'
import { PieChart } from 'echarts/charts'
import {
  TooltipComponent,
  LegendComponent,
  TitleComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

use([
  CanvasRenderer,
  PieChart,
  TooltipComponent,
  LegendComponent,
  TitleComponent
])

const { t } = useI18n()

interface ThemeStat {
  theme: string
  rating: number
  success: number
  requested: number
}

const props = defineProps({
  themes: {
    type: Array as PropType<ThemeStat[]>,
    required: true
  },
  title: {
    type: String,
    required: true
  }
})

const viewMode = ref<'rating' | 'accuracy'>('rating')

const chartData = computed(() => {
  return props.themes.map(item => {
    const accuracy = item.requested > 0 ? (item.success / item.requested) * 100 : 0
    return {
      name: item.theme,
      value: viewMode.value === 'rating' ? item.rating : Math.round(accuracy),
      raw: item
    }
  }).sort((a, b) => b.value - a.value)
})

const option = computed(() => {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      appendTo: 'body',
      confine: true,
      triggerOn: 'mousemove|click',
      backgroundColor: '#2a2a2e', // Matching --color-bg-tertiary
      borderColor: '#5A5A5A',
      textStyle: { color: '#CCCCCC' },
      formatter: (params: any) => {
        const data = params.data.raw as ThemeStat
        const accuracy = data.requested > 0 ? Math.round((data.success / data.requested) * 100) : 0
        const themeName = t(`themes.${data.theme}`)
        
        return `
          <div style="padding: 4px; min-width: 140px;">
            <b style="color: #FFFFFF; display: block; margin-bottom: 8px; border-bottom: 1px solid #5A5A5A; padding-bottom: 4px;">${themeName}</b>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>${t('userCabinet.analyticsTable.rating')}:</span>
              <span style="font-weight: bold; color: #f39c12;">${Math.round(data.rating)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>${t('userCabinet.analyticsTable.accuracy')}:</span>
              <span style="font-weight: bold; color: ${accuracy > 70 ? '#42b883' : '#f39c12'}">${accuracy}%</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>${t('userCabinet.stats.success')}:</span>
              <span>${data.success} / ${data.requested}</span>
            </div>
          </div>
        `
      }
    },
    series: [
      {
        name: props.title,
        type: 'pie',
        radius: ['10%', '70%'],
        center: ['50%', '50%'],
        roseType: 'radius',
        itemStyle: {
          borderRadius: 5
        },
        label: {
          show: true,
          color: '#CCCCCC',
          formatter: (params: any) => {
            const themeName = t(`themes.${params.name}`)
            return themeName.length > 10 ? themeName.slice(0, 8) + '..' : themeName
          }
        },
        emphasis: {
          label: {
            show: true,
            fontWeight: 'bold'
          }
        },
        data: chartData.value
      }
    ]
  }
})

const onChartClick = (params: any) => {
  console.log(`[Rose Click] Theme: ${params.name}, Mode: ${viewMode.value}`)
}
</script>

<template>
  <div class="theme-rose-container">
    <div class="chart-header">
      <h3 class="chart-title">{{ title }}</h3>
      <n-radio-group v-model:value="viewMode" size="small">
        <n-radio-button value="rating">{{ t('userCabinet.analyticsTable.rating') }}</n-radio-button>
        <n-radio-button value="accuracy">{{ t('userCabinet.analyticsTable.accuracy') }}</n-radio-button>
      </n-radio-group>
    </div>
    <div class="chart-wrapper">
      <v-chart class="chart" :option="option" @click="onChartClick" autoresize />
    </div>
  </div>
</template>

<style scoped>
.theme-rose-container {
  width: 100%;
  background-color: var(--color-bg-tertiary);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--color-border);
  box-sizing: border-box;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.chart-title {
  margin: 0;
  color: var(--color-accent-primary);
  font-family: var(--font-family-primary);
  font-size: 1.25rem;
}

.chart-wrapper {
  width: 100%;
  height: 400px;
}

.chart {
  width: 100%;
  height: 100%;
}
</style>
