// src/stores/userCabinet.store.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { webhookService } from '../services/WebhookService'
import { lichessApiService } from '../services/LichessApiService'
import { authService } from '../services/AuthService'
import type { PersonalActivityStatsResponse, LichessActivityResponse } from '../types/api.types'
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
  const lichessActivity = ref<LichessActivityResponse | null>(null)
  const isActivityLoading = ref(true)

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

    await Promise.all([fetchPersonalActivityStats(), fetchLichessActivity(user.username)])
    isLoading.value = false
  }

  async function fetchPersonalActivityStats() {
    isPersonalActivityStatsLoading.value = true
    try {
      const stats = await webhookService.fetchPersonalActivityStats()
      personalActivityStats.value = stats
    } catch (e: any) {
      logger.error('[UserCabinetStore] Error fetching personal activity stats:', e)
      error.value = e.message || t('errors.unknown')
    } finally {
      isPersonalActivityStatsLoading.value = false
    }
  }

  async function fetchLichessActivity(username: string) {
    isActivityLoading.value = true
    try {
      lichessActivity.value = await lichessApiService.fetchUserActivity(username)
    } catch (e: any) {
      logger.error('[UserCabinetStore] Error fetching lichess activity:', e)
    } finally {
      isActivityLoading.value = false
    }
  }

  function setSelectedActivityPeriod(period: ActivityPeriod) {
    selectedActivityPeriod.value = period
  }

  async function handleTelegramBind() {
    try {
      const response = await webhookService.fetchTelegramBindingUrl()
      if (response?.bindingUrl) {
        window.open(response.bindingUrl, '_blank')
      }
    } catch (e: any) {
      logger.error('[UserCabinetStore] Error getting telegram binding URL', e)
    }
  }

  return {
    isLoading,
    error,
    personalActivityStats,
    isPersonalActivityStatsLoading,
    selectedActivityPeriod,
    lichessActivity,
    isActivityLoading,
    initializePage,
    setSelectedActivityPeriod,
    handleTelegramBind,
  }
})
