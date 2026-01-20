// src/stores/userCabinet.store.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { webhookService } from '../services/WebhookService'
import { authService } from '../services/AuthService'
import type { PersonalActivityStatsResponse, UserProfileStatsDto } from '../types/api.types'
import logger from '../utils/logger'
import i18n from '../services/i18n'

const t = i18n.global.t

export type ActivityPeriod = 'daily' | 'weekly' | 'monthly'

export const useUserCabinetStore = defineStore('userCabinet', () => {
  // --- STATE ---
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const personalActivityStats = ref<PersonalActivityStatsResponse | null>(null)
  const isPersonalActivityStatsLoading = ref(true)
  const selectedActivityPeriod = ref<ActivityPeriod>('daily')

  // Состояние для детальной статистики
  const detailedStats = ref<UserProfileStatsDto | null>(null)
  const isDetailedStatsLoading = ref(true)
  const detailedStatsError = ref<string | null>(null)

  // --- ACTIONS ---

  async function initializePage() {
    isLoading.value = true
    error.value = null

    const user = authService.getUserProfile()
    if (!user) {
      error.value = t('auth.requiredForAction')
      isLoading.value = false
      return
    }

    await Promise.all([
      fetchPersonalActivityStats(),
      fetchDetailedStats(), // Вызываем новый экшен при инициализации
    ])
    isLoading.value = false
  }

  async function fetchPersonalActivityStats() {
    isPersonalActivityStatsLoading.value = true
    try {
      const stats = await webhookService.fetchPersonalActivityStats()
      personalActivityStats.value = stats
    } catch (err: unknown) {
      logger.error('[UserCabinetStore] Error loading user stats:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      isPersonalActivityStatsLoading.value = false
    }
  }

  // Новый экшен для получения детальной статистики
  async function fetchDetailedStats() {
    isDetailedStatsLoading.value = true
    detailedStatsError.value = null
    try {
      const stats = await webhookService.fetchDetailedStats()
      detailedStats.value = stats
    } catch (e: unknown) {
      logger.error('[UserCabinetStore] Error fetching detailed stats:', e)
      detailedStatsError.value = e instanceof Error ? e.message : t('errors.unknown')
    } finally {
      isDetailedStatsLoading.value = false
    }
  }

  function setSelectedActivityPeriod(period: ActivityPeriod) {
    selectedActivityPeriod.value = period
  }

  return {
    isLoading,
    error,
    personalActivityStats,
    isPersonalActivityStatsLoading,
    selectedActivityPeriod,
    detailedStats,
    isDetailedStatsLoading,
    detailedStatsError,
    initializePage,
    setSelectedActivityPeriod,
    fetchDetailedStats, // Экспортируем новый экшен
  }
})
