<!-- src/components/recordsPage/SkillLeaderboardTable.vue -->
<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import type {
  OverallSolvedLeaderboardEntry,
  SkillPeriod,
  SolveStreakLeaderboardEntry,
} from '@/types/api.types'
import InfoIcon from '../InfoIcon.vue'

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent])

interface TooltipParam {
  dataIndex: number
  value: number
  color: string
  seriesName: string
}

interface LabelParam {
  dataIndex: number
}

interface ClickParam {
  componentType: string
  dataIndex: number
}

const props = defineProps({
  title: { type: String, required: true },
  entries: {
    type: Array as PropType<(OverallSolvedLeaderboardEntry | SolveStreakLeaderboardEntry)[]>,
    required: true,
  },
  colorClass: { type: String, required: true },
  showStreak: { type: Boolean, default: false },
  showFilter: { type: Boolean, default: false },
  showTimer: { type: Boolean, default: false },
  isLoading: { type: Boolean, default: false },
  selectedPeriod: { type: String as PropType<SkillPeriod>, default: '7' },
  infoTopic: { type: String, required: false },
})

const emit = defineEmits<{
  (e: 'period-change', period: SkillPeriod): void
}>()

const { t } = useI18n()

const skillModes = [
  { key: 'advantage', nameKey: 'userCabinet.stats.modes.advantage', color: '#42b883' }, // Green
  { key: 'tornado', nameKey: 'userCabinet.stats.modes.tornado', color: '#f39c12' }, // Orange
  { key: 'theory', nameKey: 'userCabinet.stats.modes.theory', color: '#9b59b6' }, // Purple
] as const

const periodOptions = [
  { label: t('userCabinet.stats.periods.week'), value: '7' },
  { label: t('records.periods.days14'), value: '14' },
  { label: t('records.periods.days21'), value: '21' },
  { label: t('userCabinet.stats.periods.month'), value: '30' },
]

const chartOption = computed(() => {
  const displayEntries = [...props.entries].slice(0, 20).reverse()

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      appendTo: 'body',
      confine: true,
      triggerOn: 'mousemove|click', // Better for touch devices
      backgroundColor: '#2a2a2e',
      borderColor: '#5A5A5A',
      textStyle: { color: '#CCCCCC' },
      formatter: (params: unknown) => {
        const p = params as TooltipParam[]
        if (!p || !p[0]) return ''
        const entry = displayEntries[p[0].dataIndex]
        if (!entry) return ''

        let html = `<div style="padding: 4px; min-width: 150px;">
                      <b style="color: #FFFFFF; display: block; margin-bottom: 8px; border-bottom: 1px solid #5A5A5A; padding-bottom: 4px;">${entry.username}</b>`

        p.forEach((item) => {
          if (item.value > 0) {
            html += `
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: ${item.color}; font-weight: bold;">${item.seriesName}:</span>
                <span style="color: #FFF; margin-left: 12px;">${item.value}</span>
              </div>`
          }
        })
        const total = 'total_score' in entry ? entry.total_score : entry.total_solved
        html += `<div style="margin-top: 8px; border-top: 1px solid #5A5A5A; padding-top: 4px; text-align: right;">
                   <b>Total: ${total}</b>
                 </div></div>`
        return html
      },
    },
    grid: {
      left: '3%',
      right: '12%', // Extra space for labels at the end
      bottom: '3%',
      top: '5%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      show: false, // Hide X axis for a cleaner look
      splitLine: { show: false },
    },
    yAxis: {
      type: 'category',
      triggerEvent: true, // Enables click events on axis labels
      data: displayEntries.map((e, idx) => {
        const rank = props.entries.length - (displayEntries.length - 1 - idx)
        const streak = props.showStreak && 'current_streak' in e ? ` (${e.current_streak}🔥)` : ''
        return `${rank}. ${e.username}${streak}`
      }),
      axisLabel: {
        color: '#CCC',
        fontSize: 12,
        fontWeight: 'bold',
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: skillModes.map((mode, modeIdx) => ({
      name: t(mode.nameKey),
      type: 'bar',
      stack: 'total',
      barWidth: 24, // Fixed bar thickness
      itemStyle: {
        color: mode.color,
      },
      label: {
        show: modeIdx === skillModes.length - 1, // Show only on the last segment (the end of the bar)
        position: 'right',
        distance: 10,
        color: '#f39c12',
        fontWeight: 'bold',
        fontSize: 14,
        formatter: (params: unknown) => {
          const p = params as LabelParam
          const entry = displayEntries[p.dataIndex]
          if (!entry) return ''
          return 'total_score' in entry ? entry.total_score : entry.total_solved
        },
      },
      data: displayEntries.map((e) => (e.solved_by_mode ? e.solved_by_mode[mode.key] || 0 : 0)),
    })),
  }
})

// Dynamic height calculation: 45px per entry + 40px padding
const dynamicHeight = computed(() => {
  const count = Math.max(props.entries.length, 1)
  const displayCount = Math.min(count, 20)
  return `${displayCount * 45 + 40}px`
})

const onChartClick = (params: unknown) => {
  const p = params as ClickParam
  // Only redirect if clicking on the Y-axis labels (username)
  // or if explicitly clicking on the name part of the data
  if (p.componentType === 'yAxis' || p.componentType === 'series') {
    const entry = [...props.entries].slice(0, 20).reverse()[p.dataIndex]

    // On mobile, first touch shows tooltip.
    // We can decide to only redirect if clicking the Y-axis (the name)
    if (p.componentType === 'yAxis' && entry && entry.lichess_id) {
      window.open(`https://lichess.org/@/${entry.lichess_id}`, '_blank')
    }
  }
}
</script>

<template>
  <div class="records-card" :class="colorClass">
    <div class="card-header">
      <h3 class="card-title">
        {{ title }}
        <InfoIcon v-if="infoTopic" :topic="infoTopic" />
      </h3>
    </div>

    <n-space vertical class="controls-area" :size="12">
      <div v-if="showFilter" class="filter-row">
        <n-select
          :value="selectedPeriod"
          :options="periodOptions"
          @update:value="(val: string) => emit('period-change', val as any)"
          style="width: 200px"
        />
      </div>

      <div class="legend-row">
        <n-space justify="center">
          <div v-for="mode in skillModes" :key="mode.key" class="legend-item">
            <span class="dot" :style="{ backgroundColor: mode.color }"></span>
            <span class="label">{{ t(mode.nameKey) }}</span>
          </div>
        </n-space>
      </div>
    </n-space>

    <div
      class="chart-container"
      :class="{ 'is-loading': isLoading }"
      :style="{ height: dynamicHeight }"
    >
      <v-chart
        v-if="entries.length > 0"
        class="chart"
        :option="chartOption"
        @click="onChartClick"
        autoresize
      />
      <n-empty v-else :description="t('userCabinet.stats.noData')" />
      <div v-if="isLoading" class="loading-overlay">
        <n-spin size="large" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.records-card {
  background-color: var(--color-bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--color-border-hover);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.card-header {
  padding: 12px;
  border-bottom: 1px solid var(--color-border-hover);
}

.skillStreak .card-header {
  background-color: var(--color-accent-success);
}
.skillStreakMega .card-header {
  background-color: var(--color-violett-lichess);
}
.topToday .card-header {
  background-color: var(--color-accent-warning);
}
.overallSkill .card-header {
  background-color: var(--color-accent-primary);
}

.card-title {
  color: var(--color-bg-primary);
  font-size: 1.2rem;
  margin: 0;
  text-align: center;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.controls-area {
  background-color: var(--color-bg-tertiary);
  padding: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-item .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-item .label {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.chart-container {
  width: 100%;
  position: relative;
  background-color: var(--color-bg-secondary);
  padding: 10px 0;
}

.chart {
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.is-loading {
  filter: blur(1px);
  pointer-events: none;
}
</style>
