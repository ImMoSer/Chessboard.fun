<script setup lang="ts">
import { computed, ref, h } from 'vue'
import {
  NCard,
  NSpace,
  NH3,
  NText,
  NButton,
  NDataTable,
  NProgress,
  useMessage,
  NModal,
} from 'naive-ui'
import {
  useCurrentTrainingPlanQuery,
  useNextTrainingPlanMutation,
  useCompleteTrainingPlanMutation,
} from '@/shared/api/queries/userCabinet.queries'
import { useGameLauncher } from '../lib/composables/useGameLauncher'
import { useI18n } from 'vue-i18n'

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

const { data: planData, isPending, error } = useCurrentTrainingPlanQuery(!props.isExample)
const { mutate: requestNextPlan, isPending: isRequesting } = useNextTrainingPlanMutation()
const { mutate: completePlan, isPending: isCompleting } = useCompleteTrainingPlanMutation()

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

const handleCompletePlan = () => {
  completePlan(undefined, {
    onSuccess: (res) => {
      message.success(res.message || 'Plan completed!')
    },
    onError: (err: Error) => {
      const error = err as Error & { response?: { data?: { message?: string } } }
      message.error(error.response?.data?.message || 'Error completing plan')
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

const columns = computed(() => [
  { title: t('features.userCabinet.trainingPlan.columns.mode'), key: 'mode' },
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
    render: (row: TrainingPlanRow) => h(NProgress, {
      type: 'line',
      status: row.is_done ? 'success' : 'default',
      percentage: row.count > 0 ? Math.min(100, Math.round((row.current_solved / row.count) * 100)) : 0,
      indicatorPlacement: 'inside'
    }, { default: () => `${row.current_solved} / ${row.count}` }) 
  },
  {
    title: t('features.userCabinet.trainingPlan.columns.action'),
    key: 'action',
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
    <n-card :bordered="false" class="plan-card" embedded>
      <n-space vertical size="large">
        <n-h3 style="margin-bottom: 0;">📅 {{ t('features.userCabinet.trainingPlan.title') }}</n-h3>

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
            <n-text v-if="planData.current_streak !== undefined" strong>{{ t('features.userCabinet.trainingPlan.streak') }}: {{ planData.current_streak }}</n-text>
            <n-text v-if="planData.overall_progress_percent !== undefined" style="margin-left: auto;">
              {{ t('features.userCabinet.trainingPlan.overallProgress') }}: {{ planData.overall_progress_percent }}%
            </n-text>
          </div>
          
          <!-- Progress Bar Overall -->
          <n-progress 
            v-if="planData.overall_progress_percent !== undefined"
            type="line" 
            :percentage="planData.overall_progress_percent" 
            :status="planData.overall_progress_percent === 100 ? 'success' : 'default'" 
            style="margin-bottom: 12px;"
          />

          <n-data-table
            :columns="columns"
            :data="tableData"
            :bordered="false"
            size="small"
          />

          <!-- Complete Banner -->
          <div v-if="planData.overall_progress_percent === 100 && !planData.is_completed" class="complete-banner">
            <n-text strong style="font-size: 1.1em; color: #18a058;">
              {{ t('features.userCabinet.trainingPlan.planFulfilled') }}
            </n-text>
            <n-button type="success" size="large" :loading="isCompleting" @click="handleCompletePlan">
              {{ t('features.userCabinet.trainingPlan.claimReward') }}
            </n-button>
          </div>

          <div v-else-if="planData.is_completed" class="complete-banner">
            <n-text strong style="font-size: 1.1em; color: #18a058;">
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
  background-color: var(--color-bg-panel);
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.complete-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
  padding: 16px;
  border-radius: 8px;
  background-color: rgba(24, 160, 88, 0.1);
  border: 1px solid rgba(24, 160, 88, 0.3);
}
</style>
