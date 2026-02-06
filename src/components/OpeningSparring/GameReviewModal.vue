<!-- src/components/OpeningSparring/GameReviewModal.vue -->
<script setup lang="ts">
import {
  BulbOutline,
  PulseOutline,
  RefreshOutline,
  TrendingDownOutline,
  SearchOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NGrid,
  NGridItem,
  NIcon,
  NList,
  NListItem,
  NModal,
  NSpace,
  NStatistic,
  NTag,
  NText,
} from 'naive-ui'
import { ref, watch } from 'vue'
import { useOpeningSparringStore } from '../../stores/openingSparring.store'
import type { GameReport } from '../../services/GameReviewService'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits(['close', 'restart', 'analyze'])
const openingStore = useOpeningSparringStore()
const report = ref<GameReport | null>(null)
const loading = ref(true)

watch(
  () => props.show,
  async (val) => {
    if (val) {
      loading.value = true
      try {
        report.value = await openingStore.generateGameReport()
      } finally {
        loading.value = false
      }
    }
  },
  { immediate: true },
)
</script>

<template>
  <n-modal
    :show="show"
    preset="card"
    title="Game Review"
    style="width: 600px; border-radius: 16px;"
    :bordered="false"
    :mask-closable="true"
    @close="emit('close')"
  >
    <div v-if="loading" class="loading-state">
      <n-icon size="40" class="spinner">
        <PulseOutline />
      </n-icon>
      <n-text>Analyzing your game...</n-text>
    </div>
    
    <div v-else-if="report" class="report-content">
      <n-space vertical size="large">
        <div class="summary-text">
            <n-text italic depth="1" style="font-size: 1.1em">"{{ report.summary }}"</n-text>
        </div>

        <n-grid :cols="3" :x-gap="12" class="stats-grid">
          <n-grid-item>
            <div class="stat-box">
                <n-statistic label="Theory" :value="report.theoryAccuracy">
                    <template #suffix>%</template>
                </n-statistic>
            </div>
          </n-grid-item>
          <n-grid-item>
            <div class="stat-box">
                <n-statistic label="Playout" :value="report.playoutAccuracy">
                    <template #suffix>%</template>
                </n-statistic>
            </div>
          </n-grid-item>
          <n-grid-item>
            <div class="stat-box blunder-box">
                <n-statistic label="Blunders" :value="report.classification.blunders">
                    <template #prefix>
                        <n-icon color="#f44336"><TrendingDownOutline /></n-icon>
                    </template>
                </n-statistic>
            </div>
          </n-grid-item>
        </n-grid>

        <div v-if="report.keyMoments.length > 0">
          <n-text strong style="margin-bottom: 8px; display: block">Critical Moments</n-text>
          <n-list hoverable clickable class="moments-list">
            <n-list-item v-for="moment in report.keyMoments" :key="moment.moveNumber">
              <n-space vertical size="small">
                <div class="moment-header">
                    <n-tag :type="moment.quality === 'blunder' ? 'error' : 'warning'" size="small" round>
                    {{ moment.quality.toUpperCase() }}
                    </n-tag>
                    <n-text strong>Move {{ moment.moveNumber }}</n-text>
                    <n-text depth="3" class="move-uci">{{ moment.moveUci }}</n-text>
                    <n-text type="error" class="score-diff">Loss: {{ (moment.scoreDiff / 100).toFixed(1) }}</n-text>
                </div>
                <div class="moment-explanation">
                    <n-icon class="bulb-icon"><BulbOutline /></n-icon>
                    <n-text depth="2">{{ moment.explanation }}</n-text>
                </div>
              </n-space>
            </n-list-item>
          </n-list>
        </div>
        
        <div v-else class="perfect-game">
            <n-text type="success">No significant errors found in playout phase!</n-text>
        </div>

        <n-grid :cols="2" :x-gap="12">
            <n-grid-item>
                <n-button block secondary size="large" @click="emit('analyze')">
                    <template #icon>
                        <n-icon><SearchOutline /></n-icon>
                    </template>
                    Analyze Game
                </n-button>
            </n-grid-item>
            <n-grid-item>
                <n-button block type="primary" size="large" @click="emit('restart')">
                    <template #icon>
                        <n-icon><RefreshOutline /></n-icon>
                    </template>
                    Start New Session
                </n-button>
            </n-grid-item>
        </n-grid>
      </n-space>
    </div>
  </n-modal>
</template>

<style scoped>
.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px;
    gap: 16px;
}

.spinner {
    animation: pulse 1.5s infinite;
    color: var(--color-accent);
}

@keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.7; }
    100% { transform: scale(1); opacity: 1; }
}

.stat-box {
    background: rgba(255,255,255,0.03);
    padding: 12px;
    border-radius: 8px;
    text-align: center;
    border: 1px solid rgba(255,255,255,0.05);
}

.blunder-box {
    border-color: rgba(244, 67, 54, 0.2);
    background: rgba(244, 67, 54, 0.05);
}

.moments-list {
    background: transparent;
}

.moment-header {
    display: flex;
    align-items: center;
    gap: 8px;
}

.move-uci {
    font-family: monospace;
    background: rgba(0,0,0,0.2);
    padding: 2px 4px;
    border-radius: 4px;
}

.moment-explanation {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding-left: 4px;
    margin-top: 4px;
}

.bulb-icon {
    color: #ffca28; /* Amber for tips */
    margin-top: 2px;
}

.perfect-game {
    text-align: center;
    padding: 20px;
    background: rgba(76, 175, 80, 0.1);
    border-radius: 8px;
    border: 1px solid rgba(76, 175, 80, 0.3);
}

.score-diff {
    margin-left: auto;
    font-size: 0.9em;
    font-weight: bold;
}
</style>
