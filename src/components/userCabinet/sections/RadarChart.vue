<!-- src/components/userCabinet/sections/RadarChart.vue -->
<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { RadarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { computed, type PropType } from 'vue'

use([CanvasRenderer, RadarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const props = defineProps({
  chartData: {
    type: Object as PropType<{ name: string; value: number }[]>,
    required: true,
  },
  datasetLabel: {
    type: String,
    required: true,
  },
})

const chartOption = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'item',
  },
  legend: {
    data: [props.datasetLabel],
    bottom: 5,
    textStyle: {
      color: '#e0e0e0',
    },
  },
  radar: {
    indicator: props.chartData.map((item) => ({
      name: item.name,
      max: maxRating.value,
      min: minRating.value,
    })),
    shape: 'circle',
    center: ['50%', '45%'],
    radius: '65%',
    splitNumber: 5,
    axisName: {
      color: '#fff',
      backgroundColor: '#666',
      borderRadius: 3,
      padding: [3, 5],
      overflow: 'break',
    },
    splitArea: {
      areaStyle: {
        color: ['rgba(50, 50, 50, 0.2)', 'rgba(40, 40, 40, 0.2)'].reverse(),
      },
    },
    axisLine: {
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.2)',
      },
    },
    splitLine: {
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.2)',
      },
    },
  },
  series: [
    {
      name: props.datasetLabel,
      type: 'radar',
      data: [
        {
          value: props.chartData.map((item) => item.value),
          name: props.datasetLabel,
          areaStyle: {
            color: 'rgba(255, 99, 132, 0.3)',
          },
          lineStyle: {
            color: 'rgba(255, 99, 132, 1)',
          },
          itemStyle: {
            color: 'rgba(255, 99, 132, 1)',
          },
        },
      ],
    },
  ],
}))

const minRating = computed(() => {
  if (props.chartData.length === 0) return 0
  const values = props.chartData.map((item) => item.value)
  const minValue = Math.min(...values)
  return Math.max(0, Math.floor(minValue / 100) * 100 - 200)
})

const maxRating = computed(() => {
  if (props.chartData.length === 0) return 2500 // Default max if no data
  const values = props.chartData.map((item) => item.value)
  const maxValue = Math.max(...values)
  return Math.ceil(maxValue / 100) * 100 + 200
})
</script>

<template>
  <div class="chart-container">
    <v-chart :option="chartOption" autoresize />
  </div>
</template>

<style scoped>
.chart-container {
  height: 600px;
  width: 100%;
}
</style>
