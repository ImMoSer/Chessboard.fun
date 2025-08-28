// src/stores/clubePage.store.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { webhookService } from '../services/WebhookService'
import { authService } from '../services/AuthService'
import { useUiStore } from './ui.store'
import type { ClubApiResponse, ClubIdNamePair, FollowClubDto } from '../types/api.types'
import logger from '../utils/logger'
import i18n from '../services/i18n'

const t = i18n.global.t

const FOLLOW_COOLDOWN_MS = 15 * 60 * 1000

export const useClubePageStore = defineStore('clubePage', () => {
  // --- STORE DEPENDENCIES ---
  const uiStore = useUiStore()

  // --- STATE ---
  const isLoading = ref<boolean>(true)
  const error = ref<string | null>(null)
  const clubData = ref<ClubApiResponse | null>(null)
  const isFollowingCurrentClub = ref<boolean>(false)
  const isFollowRequestProcessing = ref<boolean>(false)

  // --- GETTERS ---
  const getIsUserAuthenticated = computed(() => authService.getIsAuthenticated())

  // --- ACTIONS ---

  /**
   * Initializes the page by loading club data by its ID.
   * @param clubId The ID of the club to load.
   */
  async function initializePage(clubId: string): Promise<void> {
    logger.info(`[ClubePageStore] Initializing page for clubId: ${clubId}`)
    // Reset state
    isLoading.value = true
    error.value = null
    clubData.value = null
    isFollowRequestProcessing.value = false
    updateFollowStatusFromAuth(clubId)

    try {
      const data: ClubApiResponse | null = await webhookService.fetchClubStats(clubId)

      if (data && data.club_info && data.players_data) {
        clubData.value = data
        isLoading.value = false
      } else {
        const errorMessage = t('clubPage.error.dataLoadFailedOrNotRegistered', { clubId })
        throw new Error(errorMessage)
      }
    } catch (e: any) {
      logger.error(`[ClubePageStore] Critical error during fetchClubStats for ${clubId}:`, e)
      isLoading.value = false
      error.value = e.message || t('clubPage.error.unknown')
      uiStore.showConfirmation(
        t('clubPage.error.noDataFound'),
        t('clubPage.error.clubNotRegisteredModal.message', { clubId }),
      )
    }
  }

  /**
   * Updates the follow status for the club based on authentication data.
   * @param clubId The ID of the current club.
   */
  function updateFollowStatusFromAuth(clubId: string): void {
    const isAuthenticated = authService.getIsAuthenticated()
    let isFollowing = false
    if (isAuthenticated) {
      const followedClubs: ClubIdNamePair[] | undefined = authService.getUserProfile()?.follow_clubs
      if (followedClubs && Array.isArray(followedClubs)) {
        isFollowing = followedClubs.some((club: ClubIdNamePair) => club.club_id === clubId)
      }
    }
    isFollowingCurrentClub.value = isFollowing
  }

  /**
   * Toggles the follow status for the current club.
   */
  async function toggleFollowCurrentClub(): Promise<void> {
    if (!getIsUserAuthenticated.value) {
      uiStore.showConfirmation(t('common.error'), t('auth.requiredForAction'))
      return
    }
    if (isFollowRequestProcessing.value) return

    const userProfile = authService.getUserProfile()
    const currentClubData = clubData.value
    if (!userProfile || !currentClubData) {
      uiStore.showConfirmation(t('common.error'), t('clubPage.error.profileNotFound'))
      return
    }

    const cooldownKey = `follow_cooldown_timestamp_${userProfile.id}`
    const lastFollowTimestamp = localStorage.getItem(cooldownKey)
    if (lastFollowTimestamp) {
      const elapsedMs = Date.now() - parseInt(lastFollowTimestamp, 10)
      if (elapsedMs < FOLLOW_COOLDOWN_MS) {
        const remainingMinutes = Math.ceil((FOLLOW_COOLDOWN_MS - elapsedMs) / 60000)
        uiStore.showConfirmation(
          t('common.error'),
          t('clubPage.error.followCooldown', { minutes: remainingMinutes }),
        )
        return
      }
    }

    isFollowRequestProcessing.value = true

    const action = isFollowingCurrentClub.value ? 'unfollow' : 'follow'
    const dto: FollowClubDto = {
      club_id: currentClubData.club_info.club_id,
      club_name: currentClubData.club_info.club_name,
      action,
    }

    try {
      const response = await webhookService.updateClubFollowStatus(dto)
      if (response) {
        const currentFollowed = authService.getUserProfile()?.follow_clubs || []
        let newFollowed: ClubIdNamePair[]
        if (action === 'follow') {
          newFollowed = [...currentFollowed, { club_id: dto.club_id, club_name: dto.club_name }]
        } else {
          newFollowed = currentFollowed.filter((club) => club.club_id !== dto.club_id)
        }
        authService.updateUserProfile({ follow_clubs: newFollowed })
        localStorage.setItem(cooldownKey, String(Date.now()))
        isFollowingCurrentClub.value = !isFollowingCurrentClub.value // Update state immediately
        uiStore.showConfirmation(
          t('common.ok'),
          t(`clubPage.follow.success${action === 'follow' ? 'Added' : 'Removed'}`),
        )
      } else {
        uiStore.showConfirmation(t('common.error'), t('clubPage.error.followFailed'))
      }
    } catch (e: any) {
      logger.error('[ClubePageStore] Error during follow/unfollow request:', e)
      uiStore.showConfirmation(t('common.error'), t('clubPage.error.followRequestFailed'))
    } finally {
      isFollowRequestProcessing.value = false
    }
  }

  return {
    isLoading,
    error,
    clubData,
    isFollowingCurrentClub,
    isFollowRequestProcessing,
    getIsUserAuthenticated,
    initializePage,
    toggleFollowCurrentClub,
  }
})
