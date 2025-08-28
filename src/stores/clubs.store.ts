// src/stores/clubs.store.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { webhookService } from '../services/WebhookService'
import { authService } from '../services/AuthService'
import { useUiStore } from './ui.store'
import type { ListedClub, ClubIdNamePair, FounderActionDto } from '../types/api.types'
import logger from '../utils/logger'
import i18n from '../services/i18n'
import { useRouter } from 'vue-router'

const t = i18n.global.t
const FOUNDER_ACTION_COOLDOWN_MS = 24 * 60 * 60 * 1000

export const useClubsStore = defineStore('clubs', () => {
  // --- STORE DEPENDENCIES ---
  const uiStore = useUiStore()
  const router = useRouter()

  // --- STATE ---
  const isLoading = ref<boolean>(true)
  const error = ref<string | null>(null)
  const clubsData = ref<ListedClub[] | null>(null)
  const isFounder = ref<boolean>(false)
  const registeredFounderClub = ref<ListedClub | null>(null)
  const unregisteredFounderClubs = ref<ClubIdNamePair[]>([])
  const isFounderActionLoading = ref<boolean>(false)
  const founderActionCooldownHours = ref<number | null>(null)

  // --- ACTIONS ---

  async function initializePage(): Promise<void> {
    logger.info('[ClubsStore] Initializing page data...')
    isLoading.value = true
    error.value = null
    isFounderActionLoading.value = false

    try {
      const allClubsStats = await webhookService.fetchAllClubsStats()

      if (allClubsStats) {
        // Сортировка теперь происходит на бэкенде, но на всякий случай оставим
        const sortedClubs = allClubsStats.sort(
          (a: ListedClub, b: ListedClub) => (b.total_score || 0) - (a.total_score || 0),
        )
        clubsData.value = sortedClubs
        isLoading.value = false
        error.value = null
        processFounderClubs()
      } else {
        throw new Error(t('lichessClubs.errors.dataLoadFailed'))
      }
    } catch (e: any) {
      logger.error('[ClubsStore] Error fetching clubs data:', e)
      isLoading.value = false
      error.value = e.message || t('lichessClubs.errors.unknown')
      clubsData.value = null
    }
  }

  function _getCooldownHoursRemaining(): number | null {
    const userId = authService.getUserProfile()?.id
    if (!userId) return null

    const lastActionTimestamp = localStorage.getItem(`founder_action_timestamp_${userId}`)
    if (!lastActionTimestamp) return null

    const timeSinceLastAction = Date.now() - parseInt(lastActionTimestamp, 10)
    if (timeSinceLastAction < FOUNDER_ACTION_COOLDOWN_MS) {
      return (FOUNDER_ACTION_COOLDOWN_MS - timeSinceLastAction) / (1000 * 60 * 60)
    }
    return null
  }

  function _setFounderActionTimestamp(): void {
    const userId = authService.getUserProfile()?.id
    if (userId) {
      localStorage.setItem(`founder_action_timestamp_${userId}`, String(Date.now()))
    }
  }

  async function _handleFounderAction(
    clubId: string,
    action: 'club_addToList' | 'club_delete',
  ): Promise<void> {
    // ... (логика без изменений)
  }

  async function handleAddClub(clubId: string): Promise<void> {
    await _handleFounderAction(clubId, 'club_addToList')
  }

  async function handleRemoveClub(clubId: string): Promise<void> {
    const club = registeredFounderClub.value
    if (!club) return

    const confirmed = await uiStore.showConfirmation(
      t('common.confirm'),
      t('lichessClubs.founder.confirmRemove', { clubName: club.club_name }),
    )

    if (confirmed) {
      await _handleFounderAction(clubId, 'club_delete')
    }
  }

  function processFounderClubs(): void {
    const cooldownHours = _getCooldownHoursRemaining()
    if (cooldownHours !== null) {
      founderActionCooldownHours.value = cooldownHours
      isFounder.value = true
      registeredFounderClub.value = null
      unregisteredFounderClubs.value = []
      return
    }

    const founderClubs = authService.getFounderClubs()
    isFounder.value = !!(founderClubs && founderClubs.length > 0)

    let registeredClub: ListedClub | null = null
    let unregisteredClubs: ClubIdNamePair[] = []

    if (isFounder.value && clubsData.value && founderClubs) {
      const founderClubIds = founderClubs.map((c) => c.club_id)
      registeredClub = clubsData.value.find((c) => founderClubIds.includes(c.club_id)) || null

      if (registeredClub) {
        unregisteredClubs = founderClubs.filter((fc) => fc.club_id !== registeredClub!.club_id)
      } else {
        unregisteredClubs = founderClubs
      }
    }

    registeredFounderClub.value = registeredClub
    unregisteredFounderClubs.value = unregisteredClubs
    founderActionCooldownHours.value = null
  }

  return {
    isLoading,
    error,
    clubsData,
    isFounder,
    registeredFounderClub,
    unregisteredFounderClubs,
    isFounderActionLoading,
    founderActionCooldownHours,
    initializePage,
    handleAddClub,
    handleRemoveClub,
    processFounderClubs,
  }
})
