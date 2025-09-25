// src/stores/funclub.store.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { webhookService } from '../services/WebhookService'
import type { FunclubMeta, TeamBattleReport } from '../types/api.types'
import logger from '../utils/logger'
import i18n from '../services/i18n'

const t = i18n.global.t

export const useFunclubStore = defineStore('funclub', () => {
  // --- STATE ---
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const clubMeta = ref<FunclubMeta | null>(null)
  const teamBattleReport = ref<TeamBattleReport | null>(null)
  const selectedPeriod = ref('last_30_days')
  const periodOptions = ref<{ label: string; value: string }[]>([])
  const selectedPeriodIndex = ref(0)

  // --- ACTIONS ---
  async function initializePage() {
    isLoading.value = true
    error.value = null
    try {
      // Сначала получаем метаданные, так как они нужны для генерации опций
      const meta = await webhookService.fetchFunclubClubMeta()
      clubMeta.value = meta
      if (meta) {
        generatePeriodOptions()
      } else {
        // Если метаданные не загрузились, создаем опцию по умолчанию
        periodOptions.value = [{ label: t('clubPage.tournamentHistoryTitle'), value: 'last_30_days' }]
      }

      // Устанавливаем индекс по умолчанию
      selectedPeriodIndex.value = periodOptions.value.findIndex(
        (p) => p.value === selectedPeriod.value,
      )

      // Затем загружаем отчет по умолчанию
      const report = await webhookService.fetchFunclubTeamBattleReport(selectedPeriod.value)
      teamBattleReport.value = report
    } catch (e: any) {
      logger.error('[FunclubStore] Error initializing page:', e)
      error.value = e.message || 'Unknown error'
    } finally {
      isLoading.value = false
    }
  }

  function generatePeriodOptions() {
    const options = [{ label: t('clubPage.tournamentHistoryTitle'), value: 'last_30_days' }]

    if (!clubMeta.value?.reportPeriodStart || !clubMeta.value?.reportPeriodEnd) {
      logger.warn('[FunclubStore] Report period start/end not in meta. Using default options.')
      periodOptions.value = options
      return
    }

    const [startYear, startMonth] = clubMeta.value.reportPeriodStart.split('-').map(Number)
    const [endYear, endMonth] = clubMeta.value.reportPeriodEnd.split('-').map(Number)

    // --- НАЧАЛО ИЗМЕНЕНИЙ: Добавлена проверка на корректность дат ---
    if (!startYear || !startMonth || !endYear || !endMonth) {
      logger.error('[FunclubStore] Could not parse report period dates from meta.', clubMeta.value)
      periodOptions.value = options
      return
    }
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---

    const startDate = new Date(startYear, startMonth - 1, 1)
    const currentDate = new Date(endYear, endMonth - 1, 1)

    while (currentDate >= startDate) {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1

      const monthLabel = String(month).padStart(2, '0')

      options.push({
        label: `${monthLabel}/${year}`,
        value: `${year}-${month}`,
      })

      currentDate.setMonth(currentDate.getMonth() - 1)
    }

    periodOptions.value = options
  }

  async function changePeriod(newPeriod: string) {
    if (selectedPeriod.value === newPeriod) return

    const newIndex = periodOptions.value.findIndex((p) => p.value === newPeriod)
    if (newIndex === -1) {
      logger.warn(`[FunclubStore] Period ${newPeriod} not found in options.`)
      return
    }

    selectedPeriod.value = newPeriod
    selectedPeriodIndex.value = newIndex

    isLoading.value = true
    error.value = null
    try {
      const newReport = await webhookService.fetchFunclubTeamBattleReport(newPeriod)
      teamBattleReport.value = newReport
      logger.info(`[FunclubStore] Successfully loaded report for period ${newPeriod}.`)
    } catch (e: any) {
      logger.error(`[FunclubStore] Error fetching report for period ${newPeriod}:`, e)
      error.value = e.message || 'Failed to load report'
      teamBattleReport.value = null
    } finally {
      isLoading.value = false
    }
  }

  function selectNextPeriod() {
    if (periodOptions.value.length === 0) return
    let newIndex = selectedPeriodIndex.value + 1
    if (newIndex >= periodOptions.value.length) {
      newIndex = 0
    }
    const newPeriodOption = periodOptions.value[newIndex]
    if (newPeriodOption) {
      changePeriod(newPeriodOption.value)
    }
  }

  function selectPreviousPeriod() {
    if (periodOptions.value.length === 0) return
    let newIndex = selectedPeriodIndex.value - 1
    if (newIndex < 0) {
      newIndex = periodOptions.value.length - 1
    }
    const newPeriodOption = periodOptions.value[newIndex]
    if (newPeriodOption) {
      changePeriod(newPeriodOption.value)
    }
  }

  return {
    isLoading,
    error,
    clubMeta,
    teamBattleReport,
    selectedPeriod,
    periodOptions,
    selectedPeriodIndex,
    initializePage,
    changePeriod,
    selectNextPeriod,
    selectPreviousPeriod,
  }
})
