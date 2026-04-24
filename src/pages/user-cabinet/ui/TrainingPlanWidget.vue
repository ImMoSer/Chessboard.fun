<script setup lang="ts">
import {
  useCurrentTrainingPlanQuery,
  useNextTrainingPlanMutation,
} from '@/shared/api/queries/userCabinet.queries'
import { RefreshOutline } from '@vicons/ionicons5'
import {
  NButton,
  NCard,
  NDataTable,
  NH3,
  NIcon,
  NModal,
  NProgress,
  NSpace,
  NText,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import { computed, h, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameLauncher } from '../lib/composables/useGameLauncher'

const message = useMessage()
const { t } = useI18n()
const { launchGame } = useGameLauncher()

const props = defineProps<{
  userStatus: 'N' | 'P' | 'M'
  isExample?: boolean
}>()

const statusMap: Record<string, string> = {
  N: 'Novice',
  P: 'Pro',
  M: 'Master',
}

const requestedLevel = computed(() => statusMap[props.userStatus] || 'Novice')

const { data: planData, isPending, error, refetch } = useCurrentTrainingPlanQuery(!props.isExample)
const { mutate: requestNextPlan, isPending: isRequesting } = useNextTrainingPlanMutation()

const isRefreshing = ref(false)
const handleRefresh = async () => {
  isRefreshing.value = true
  try {
    await refetch()
    message.success(t('features.userCabinet.trainingPlan.refreshed') || 'Plan refreshed')
  } finally {
    isRefreshing.value = false
  }
}

const showUpgradeModal = ref(false)
const upgradeMessage = ref('')

const handleRequestPlan = () => {
  requestNextPlan(requestedLevel.value, {
    onSuccess: (res) => {
      if (res.type === 'CONGRATULATIONS') {
        upgradeMessage.value = res.message || ''
        showUpgradeModal.value = true
      } else {
        message.success(res.message || 'Plan requested')
      }
    },
    onError: (err: Error) => {
      const error = err as Error & { response?: { data?: { message?: string } } }
      message.error(error.response?.data?.message || 'Error requesting plan')
    },
  })
}


const mapModeForLauncher = (mode: string, subMode: string) => {
  if (mode === 'THEORY_ENDING') return subMode === 'draw' ? 'theory_draw' : 'theory_win'
  if (mode === 'PRACTICAL_CHESS') return 'practical'
  if (mode === 'FINISH_HIM') return 'finish_him'
  if (mode === 'TORNADO') return 'tornado'
  return mode
}

interface TrainingPlanRow {
  key: string
  mode: string
  sub_mode: string
  theme: string
  count: number
  current_solved: number
  is_done: boolean
}

const columns = computed<DataTableColumns<TrainingPlanRow>>(() => [
  {
    title: t('features.userCabinet.trainingPlan.columns.mode'),
    key: 'mode',
    render: (row: TrainingPlanRow) => {
      const modeMap: Record<string, string> = {
        'THEORY_ENDING': 'gameModes.theoryEndgames',
        'PRACTICAL_CHESS': 'gameModes.practicalChess',
        'FINISH_HIM': 'gameModes.finishHim',
        'TORNADO': 'gameModes.tornado'
      }
      const key = modeMap[row.mode] || row.mode
      return t(key)
    }
  },
  { title: t('features.userCabinet.trainingPlan.columns.subMode'), key: 'sub_mode' },
  {
    title: t('features.userCabinet.trainingPlan.columns.theme'),
    key: 'theme',
    render: (row: TrainingPlanRow) => {
      const isTornado = row.mode === 'TORNADO'
      // Normalisierung von 'rook' zu 'rookPawn' für alte Trainingspläne (Kompatibilität)
      const theme = row.theme === 'rook' ? 'rookPawn' : row.theme
      const i18nKey = isTornado ? `chess.tactics.${theme}` : `chess.themes.${theme}`
      return t(i18nKey)
    }
  },
  { 
    title: t('features.userCabinet.trainingPlan.columns.progress'), 
    key: 'progress', 
    align: 'center',
    titleAlign: 'center',
    render: (row: TrainingPlanRow) => h(NProgress, {
      type: 'line',
      color: '#b000ff',
      percentage: row.count > 0 ? Math.min(100, Math.round((row.current_solved / row.count) * 100)) : 0,
      indicatorPlacement: 'inside',
    }, { default: () => h('span', { style: 'color: #fff; font-weight: 500; text-shadow: 0 0 2px #000;' }, `${row.current_solved} / ${row.count}`) }) 
  },
  {
    title: t('features.userCabinet.trainingPlan.columns.action'),
    key: 'action',
    align: 'right',
    titleAlign: 'right',
    render: (row: TrainingPlanRow) => h(NButton, {

      size: 'small',
      type: row.is_done ? 'default' : 'primary',
      disabled: row.is_done || planData.value?.is_completed,
      onClick: () => launchGame({
        mode: mapModeForLauncher(row.mode, row.sub_mode) as 'theory_draw' | 'theory_win' | 'practical' | 'finish_him' | 'tornado',
        subMode: row.sub_mode,
        theme: row.theme === 'rook' ? 'rookPawn' : row.theme,
        difficulty: requestedLevel.value
      })
    }, { default: () => row.is_done ? t('features.userCabinet.trainingPlan.actions.done') : t('features.userCabinet.trainingPlan.actions.play') })
  }
])

const tableData = computed(() => {
  if (!planData.value?.plan?.tasks) return []

  const data: TrainingPlanRow[] = []
  planData.value.plan.tasks.forEach((task) => {
    task.themes.forEach((theme) => {
      data.push({
        key: `${task.mode}-${task.sub_mode}-${theme.name}`,
        mode: task.mode,
        sub_mode: task.sub_mode,
        theme: theme.name,
        count: theme.count,
        current_solved: theme.current_solved || 0,
        is_done: theme.is_done || false,
      })
    })
  })
  return data
})

</script>

<template>
  <div class="training-plan-widget">
    <n-card :bordered="false" class="plan-card">
      <n-space vertical size="large">
        <n-space align="center" justify="space-between">
          <n-h3 style="margin-bottom: 0;">📅 {{ t('features.userCabinet.trainingPlan.title') }}</n-h3>
          <n-button
            v-if="planData?.active"
            circle
            quaternary
            :loading="isRefreshing"
            @click="handleRefresh"
          >
            <template #icon>
              <n-icon><RefreshOutline /></n-icon>
            </template>
          </n-button>
        </n-space>

        <!-- Loading / Error -->
        <n-text v-if="isPending" depth="3">{{ t('features.userCabinet.trainingPlan.loading') }}</n-text>
        <n-text v-else-if="error" type="error">{{ t('features.userCabinet.trainingPlan.error') }}</n-text>

        <!-- No Active Plan -->
        <template v-else-if="!planData?.active">
          <n-text depth="3">{{ t('features.userCabinet.trainingPlan.noPlan') }}</n-text>
          <n-button type="primary" size="large" :loading="isRequesting" @click="handleRequestPlan">
            {{ t('features.userCabinet.trainingPlan.requestButton', { level: requestedLevel }) }}
          </n-button>
        </template>

        <!-- Active Plan -->
        <template v-else-if="planData?.plan">
          <div class="plan-header">
            <n-space align="center">
              <n-text v-if="planData.current_streak !== undefined" strong>
                {{ t('features.userCabinet.trainingPlan.streak') }}: {{ planData.current_streak }}
              </n-text>
              <n-text v-if="planData.plan?.level" depth="3">
                | {{ t(`common.difficulties.level_${planData.plan.level.toLowerCase()}`) }}
              </n-text>
            </n-space>
            <n-text v-if="planData.overall_progress_percent !== undefined" style="margin-left: auto;">
              {{ t('features.userCabinet.trainingPlan.overallProgress') }}: {{ planData.overall_progress_percent }}%
            </n-text>
          </div>

          <!-- Progress Bar Overall -->
          <n-progress
            v-if="planData.overall_progress_percent !== undefined"
            type="line"
            :percentage="planData.overall_progress_percent"
            color="#b000ff"
            style="margin-bottom: 12px;"
          />

          <n-data-table
            :columns="columns"
            :data="tableData"
            :bordered="false"
            size="small"
          />

          <div v-if="planData.is_completed" class="complete-banner">
            <n-text strong style="font-size: 1.1em; color: #b000ff;">
              {{ t('features.userCabinet.trainingPlan.planCompleted') }}
            </n-text>
          </div>

        </template>
      </n-space>
    </n-card>

    <n-modal
      v-model:show="showUpgradeModal"
      preset="card"
      style="max-width: 400px; background-color: rgba(10, 11, 20, 0.95);"
      :title="t('features.userCabinet.trainingPlan.upgradeTitle')"
    >
      <n-space vertical :size="24">
        <n-text style="font-size: 1.1em; line-height: 1.5;">
          {{ upgradeMessage }}
        </n-text>
        <n-button type="primary" size="large" block @click="showUpgradeModal = false">
          {{ t('features.userCabinet.trainingPlan.awesome') }}
        </n-button>
      </n-space>
    </n-modal>
  </div>
</template>

<style scoped>
.plan-card {
  margin-top: 24px;
  border-radius: var(--panel-border-radius);
  background-color: #1a1b26; /* Solider dunkler Hintergrund */
  border: 1px solid rgba(255, 255, 255, 0.1);
}

@media (max-width: 600px) {
  .plan-card :deep(.n-card-content) {
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  .plan-card :deep(.n-h3) {
    font-size: 1rem !important;
  }

  .plan-card :deep(.n-data-table-th) {
    font-size: 0.8rem !important;
    padding: 8px 4px !important;
  }

  .plan-card :deep(.n-data-table-td) {
    font-size: 0.8rem !important;
    padding: 8px 4px !important;
  }

  .plan-card :deep(.n-button) {
    font-size: 0.75rem !important;
    padding: 0 8px !important;
  }

  .plan-header {
    font-size: 0.85rem;
  }

  .complete-banner n-text {
    font-size: 0.9em !important;
  }
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

:deep(.n-data-table-th) {
  font-size: 1.05rem !important;
  font-weight: 700 !important;
  color: var(--color-text-primary) !important;
}

.complete-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  padding: 16px;
  border-radius: 8px;
  background-color: rgba(176, 0, 255, 0.1);
  border: 1px solid rgba(176, 0, 255, 0.3);
}
</style>
