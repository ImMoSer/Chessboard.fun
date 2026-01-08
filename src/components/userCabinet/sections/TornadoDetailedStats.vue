<!-- src/components/userCabinet/sections/TornadoDetailedStats.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { VueUiCirclePack } from 'vue-data-ui'
import { getThemeTranslationKey } from '@/utils/theme-mapper'

const { t } = useI18n()

interface ThemeStat {
  theme: string
  attempts: number
  accuracy: number
  rating: number
}

const props = defineProps<{
  themes: ThemeStat[]
}>()

const circlePackConfig = ref({
  style: {
    fontFamily: "inherit",
    chart: {
      backgroundColor: "transparent",
      color: "#CCCCCC",
      title: {
        text: t('userCabinet.detailedAnalytics.tornadoStats'),
        color: "#CCCCCC",
        fontSize: 20,
        bold: true,
        textAlign: "center" as 'left' | 'center' | 'right',
        subtitle: { color: "#A1A1A1", text: t('userCabinet.analyticsTable.byAttempts'), fontSize: 14, bold: false }
      },
      width: 800,
      height: 600,
      circles: {
        stroke: "var(--color-bg-secondary)",
        strokeWidth: 1,
        selectedShadowColor: "#CCCCCC",
        gradient: { show: true, intensity: 40 },
        labels: {
          name: { fontSizeRatio: 0.7, show: true, bold: false, offsetY: 0, color: "auto" },
          value: { fontSizeRatio: 0.5, show: true, color: "auto", rounding: 0, prefix: "", suffix: "", bold: false, offsetY: 0 }
        }
      }
    },
    tooltip: {
      show: true,
      color: "#CCCCCC",
      backgroundColor: "#2A2A2A",
      fontSize: 14,
      borderRadius: 4,
      borderColor: "#5A5A5A",
      backgroundOpacity: 90,
      position: "center",
      offsetY: 24
    }
  }
})

// Function to generate consistent colors for themes
const getThemeColor = (index: number) => {
  const colors = [
    '#5f8bee', '#42b883', '#fdd663', '#ff6b6b', '#cc5de8',
    '#20c997', '#f06595', '#845ef7', '#339af0', '#51cf66',
    '#fcc419', '#ff922b'
  ]
  return colors[index % colors.length]
}

const circlePackDataset = computed(() => {
  return props.themes.map((tStat, index) => ({
    name: t('themes.' + getThemeTranslationKey(tStat.theme)),
    value: tStat.attempts,
    color: getThemeColor(index)
  }))
})
</script>

<template>
  <div class="tornado-detailed-stats">
    <n-card class="chart-card circle-card" :bordered="false">
      <div class="vue-ui-container">
        <VueUiCirclePack :config="circlePackConfig" :dataset="circlePackDataset" />
      </div>
    </n-card>
  </div>
</template>

<style scoped>
.tornado-detailed-stats {
  margin-top: 12px;
}

.chart-card {
  background-color: var(--color-bg-tertiary);
  border-radius: 12px;
  height: 100%;
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.vue-ui-container {
  width: 100%;
  height: 100%;
  min-height: 480px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
}

:deep(.vue-ui-radar),
:deep(.vue-ui-circle-pack) {
  width: 100% !important;
}
</style>
