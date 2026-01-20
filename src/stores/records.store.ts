// src/stores/records.store.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { webhookService } from '../services/WebhookService'
import type { LeaderboardApiResponse, SkillPeriod } from '../types/api.types'
import logger from '../utils/logger'
import i18n from '../services/i18n'

const t = i18n.global.t

export const useRecordsStore = defineStore('records', () => {
  // --- STATE ---
  // Флаг для основной загрузки страницы
  const isLoading = ref(true)
  // Флаг для загрузки данных при смене периода в таблице скилла
  const isSkillLeaderboardLoading = ref(false)
  // Хранение сообщения об ошибке
  const error = ref<string | null>(null)
  // Хранение всех данных для страницы рекордов
  const leaderboards = ref<LeaderboardApiResponse | null>(null)
  // Выбранный период для таблицы "Overall Skill"
  const selectedSkillPeriod = ref<SkillPeriod>('7')

  // --- ACTIONS ---

  /**
   * Загружает все данные для страницы рекордов.
   */
  async function fetchLeaderboards() {
    isLoading.value = true
    error.value = null
    try {
      const data = await webhookService.fetchCombinedLeaderboards()
      if (!data) {
        throw new Error('No data received from the server.')
      }
      leaderboards.value = data
      logger.info('[RecordsStore] Combined leaderboards data loaded successfully.')
    } catch (e: unknown) {
      logger.error('[RecordsStore] Error fetching combined leaderboard data:', e)
      error.value = e instanceof Error ? e.message : t('records.errors.unknown')
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Загружает данные для таблицы "Overall Skill" при смене периода.
   * @param period - Новый выбранный период ('7', '14', '21', '30').
   */
  async function changeSkillPeriod(period: SkillPeriod) {
    if (selectedSkillPeriod.value === period || !leaderboards.value) return

    selectedSkillPeriod.value = period
    isSkillLeaderboardLoading.value = true
    try {
      const skillData = await webhookService.fetchOverallSkillLeaderboard(period)
      if (skillData && leaderboards.value) {
        // Обновляем только часть данных в общем стейте
        leaderboards.value.overallSkillLeaderboard = skillData
      }
    } catch (e: unknown) {
      logger.error(
        `[RecordsStore] Error fetching overall skill leaderboard for period ${period}:`,
        e,
      )
      error.value = e instanceof Error ? e.message : t('records.errors.dataLoadFailed')
    } finally {
      isSkillLeaderboardLoading.value = false
    }
  }

  return {
    isLoading,
    isSkillLeaderboardLoading,
    error,
    leaderboards,
    selectedSkillPeriod,
    fetchLeaderboards,
    changeSkillPeriod,
  }
})
