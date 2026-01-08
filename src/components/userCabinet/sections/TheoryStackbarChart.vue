<!-- src/components/userCabinet/sections/TheoryStackbarChart.vue -->
<script setup lang="ts">
import { ref, computed, type PropType } from 'vue'
import { VueUiStackbar, type VueUiStackbarConfig, type VueUiStackbarDatasetItem } from 'vue-data-ui'
import 'vue-data-ui/style.css'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface TheoryStatValue {
  success: number
  requested: number
}

const props = defineProps({
  stats: {
    type: Object as PropType<Record<string, TheoryStatValue>>,
    required: true,
  }
})

const activeType = ref<'win' | 'draw'>('win')

// Themes available in the dataset
const themes = ['pawn', 'queen', 'bishop', 'knight', 'rookPawn', 'rookPieces', 'knightBishop']
// Difficulties
const difficulties = ['Novice', 'Pro', 'Master']

const config = computed<VueUiStackbarConfig>(() => ({
  style: {
    chart: {
      backgroundColor: '#2A2A2A',
      color: '#CCCCCC',
      fontFamily: 'inherit',
      zoom: {
        show: false
      },
      grid: {
        x: {
          axisColor: '#5A5A5A',
          axisName: {
            text: t('userCabinet.stats.theoryThemes'),
            color: '#CCCCCC'
          },
          timeLabels: {
            color: '#CCCCCC',
            values: themes.map(theme => t(`theoryEndings.categories.${theme}.name`))
          }
        },
        y: {
          axisColor: '#5A5A5A',
          axisName: {
            text: '', // Removed "Versuche" label
            color: '#CCCCCC'
          },
          axisLabels: {
            color: '#CCCCCC'
          }
        }
      },
      highlighter: {
        color: '#FFFFFF',
        opacity: 5
      },
      legend: {
        backgroundColor: '#2A2A2A',
        color: '#CCCCCC',
        fontSize: 14
      },
      title: {
        text: '',
        color: '#CCCCCC',
        textAlign: 'left',
        subtitle: {
          text: ''
        }
      },
      tooltip: {
        backgroundColor: '#2A2A2A',
        color: '#CCCCCC',
        borderColor: '#5A5A5A',
        backgroundOpacity: 70,
        roundingValue: 0
      },
      bars: {
        gap: 12,
        borderRadius: 4,
        totalValues: {
          show: true,
          color: '#CCCCCC',
          fontSize: 16,
          offsetY: -10
        },
        dataLabels: {
          show: true,
          color: '#CCCCCC'
        }
      }
    }
  },
  table: {
    show: false,
    th: {
      backgroundColor: '#2A2A2A',
      color: '#CCCCCC',
      outline: 'none'
    },
    td: {
      backgroundColor: '#2A2A2A',
      color: '#CCCCCC',
      outline: 'none'
    }
  },
  userOptions: {
    show: true
  }
}))

const seriesColors = {
  Novice: '#42b883', // Vue green
  Pro: '#35495e',    // Vue dark blue
  Master: '#f39c12'  // Orange
}

const dataset = computed<VueUiStackbarDatasetItem[]>(() => {
  return difficulties.map(diff => {
    const seriesData = themes.map(theme => {
      const key = `${activeType.value}/${diff}/${theme}`
      return props.stats[key]?.requested || 0
    })

    return {
      name: t(`theoryEndings.difficulties.${diff}`),
      series: seriesData,
      color: seriesColors[diff as keyof typeof seriesColors]
    }
  })
})
</script>

<template>
  <div class="theory-chart-standalone">
    <div class="chart-header">
      <div class="header-left">
        <h3 class="theory-title">{{ t('userCabinet.stats.modes.theory') }}</h3>
        <n-button-group>
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
      <VueUiStackbar :config="config" :dataset="dataset" />
    </div>
  </div>
</template>

<style scoped>
.theory-chart-standalone {
  width: 100%;
  background-color: #2A2A2A;
  border-radius: 12px;
  padding: 20px;
  margin-top: 24px;
  border: 1px solid var(--color-border);
  box-sizing: border-box;
  overflow: hidden;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.theory-title {
  margin: 0;
  color: var(--color-accent-secondary);
  font-family: var(--font-family-primary);
  font-size: 1.5rem;
  font-weight: bold;
}

.chart-wrapper {
  width: 100%;
  min-height: 450px;
  overflow: hidden;
}

:deep(.vue-ui-stackbar) {
  width: 100% !important;
  font-family: var(--font-family-primary) !important;
}

@media (max-width: 600px) {
  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
