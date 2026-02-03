<!-- src/components/userCabinet/sections/ActivityChart.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useUserCabinetStore, type ActivityPeriod } from '@/stores/userCabinet.store'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent, LegendComponent])

interface TooltipParam {
  axisValue: string
  value: number
  color: string
}

const { t } = useI18n()
const userCabinetStore = useUserCabinetStore()
const { personalActivityStats, isPersonalActivityStatsLoading, selectedActivityPeriod } =
  storeToRefs(userCabinetStore)

const modeColors = {
  advantage: { solved: '#42b883', requested: 'rgba(66, 184, 131, 0.2)' },
  tornado: { solved: '#f39c12', requested: 'rgba(243, 156, 18, 0.2)' },
  theory: { solved: '#9b59b6', requested: 'rgba(155, 89, 182, 0.2)' },
}

const handlePeriodChange = (period: string) => {
  userCabinetStore.setSelectedActivityPeriod(period as ActivityPeriod)
}

const chartOption = computed(() => {
  if (!personalActivityStats.value) return {}

  const periodData = personalActivityStats.value[selectedActivityPeriod.value]

  const modes = [
    { key: 'theory', name: t('userCabinet.stats.modes.theory') },
    { key: 'tornado', name: t('nav.tornado') },
    { key: 'advantage', name: t('userCabinet.stats.modes.advantage') },
  ] as const

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#2a2a2e',
      borderColor: '#5A5A5A',
      textStyle: { color: '#CCCCCC' },
      formatter: (params: unknown) => {
        const p = params as TooltipParam[]
        if (!p || !p[0] || !p[1]) return ''
        const modeName = p[0].axisValue
        const solved = p[0].value
        const remaining = p[1].value
        const total = solved + remaining

        return `<div style="padding: 4px; min-width: 140px;">
                  <b style="color: #FFFFFF; display: block; margin-bottom: 8px; border-bottom: 1px solid #5A5A5A; padding-bottom: 4px;">${modeName}</b>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: ${p[0].color}; font-weight: bold;">${t('records.table.solved')}:</span>
                    <span style="color: #FFF; margin-left: 12px;">${solved}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #888; font-weight: bold;">${t('records.table.requested')}:</span>
                    <span style="color: #FFF; margin-left: 12px;">${total}</span>
                  </div>
                  <div style="margin-top: 8px; border-top: 1px solid #5A5A5A; padding-top: 4px; text-align: right;">
                    <b style="color: var(--color-accent-success)">${total > 0 ? Math.round((solved / total) * 100) : 0}% Accuracy</b>
                  </div>
                </div>`
      },
    },
    grid: {
      left: '3%',
      right: '8%',
      bottom: '5%',
      top: '5%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      splitLine: {
        lineStyle: { color: '#333' },
      },
      axisLabel: { color: '#888' },
    },
    yAxis: {
      type: 'category',
      data: modes.map((m) => m.name),
      axisLabel: {
        color: '#CCC',
        fontSize: 13,
        fontWeight: 'bold',
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: t('records.table.solved'),
        type: 'bar',
        stack: 'total',
        barWidth: 35,
        data: modes.map((m) => ({
          value: periodData[m.key].puzzles_solved,
          itemStyle: { color: modeColors[m.key].solved },
        })),
      },
      {
        name: t('records.table.requested'),
        type: 'bar',
        stack: 'total',
        data: modes.map((m) => ({
          value: Math.max(
            0,
            periodData[m.key].puzzles_requested - periodData[m.key].puzzles_solved,
          ),
          itemStyle: { color: modeColors[m.key].requested },
        })),
      },
    ],
  }
})
</script>

<template>
  <n-card class="activity-chart-card" :loading="isPersonalActivityStatsLoading">
    <template #header>
      <div class="card-header-flex">
        <span class="card-title">{{ t('userCabinet.stats.global.title') }}</span>
        <n-tabs
          type="segment"
          :value="selectedActivityPeriod"
          @update:value="handlePeriodChange"
          class="period-tabs"
          size="small"
        >
          <n-tab-pane name="daily" :tab="t('userCabinet.stats.periods.day')" />
          <n-tab-pane name="weekly" :tab="t('userCabinet.stats.periods.week')" />
          <n-tab-pane name="monthly" :tab="t('userCabinet.stats.periods.month')" />
        </n-tabs>
      </div>
    </template>

    <div class="chart-container">
      <v-chart v-if="personalActivityStats" class="chart" :option="chartOption" autoresize />
      <n-empty v-else :description="t('userCabinet.stats.noData')" />
    </div>
  </n-card>
</template>

<style scoped>
.activity-chart-card {
  background-color: var(--color-bg-tertiary);
  border-radius: 12px;
  border: 1px solid var(--color-border-hover);
}

.card-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.card-title {
  font-family: var(--font-family-primary);
  color: var(--color-accent-success);
  font-size: var(--font-size-large);
  font-weight: bold;
}

.period-tabs {
  width: 300px;
}

.chart-container {
  height: 220px;
  width: 100%;
}

.chart {
  width: 100%;
  height: 100%;
}

@media (max-width: 600px) {
  .card-header-flex {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  .period-tabs {
    width: 100%;
  }
}
</style>
