// src/stores/mozerBook.store.ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { openingApiService, type MozerBookResponse } from '../services/OpeningApiService'
import { pgnService, pgnTreeVersion } from '../services/PgnService'
import logger from '../utils/logger'
import { useBoardStore } from './board.store'

export const useMozerBookStore = defineStore('mozerBook', () => {
  const boardStore = useBoardStore()

  const currentStats = ref<MozerBookResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastFetchedFen = ref('')

  // We use boardStore.fen because it's already properly synced with PgnService
  // but we also watch pgnTreeVersion for structural changes.
  const currentFen = computed(() => {
    // Ensuring computed tracks changes
    void pgnTreeVersion.value
    return boardStore.fen || pgnService.getCurrentNavigatedFen()
  })

  async function fetchStats(force = false) {
    const fen = currentFen.value

    if (!force && fen === lastFetchedFen.value && currentStats.value) {
      return
    }

    isLoading.value = true
    error.value = null
    try {
      logger.info(`[MozerBookStore] Fetching stats for FEN: ${fen}`)
      const data = await openingApiService.getMozerBookStats(fen)
      if (data) {
        currentStats.value = data
        lastFetchedFen.value = fen
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch MozerBook stats'
      logger.error(`[MozerBookStore] Error:`, e)
    } finally {
      isLoading.value = false
    }
  }

  function reset() {
    currentStats.value = null
    isLoading.value = false
    error.value = null
    lastFetchedFen.value = ''
  }

  return {
    currentStats,
    isLoading,
    error,
    currentFen,
    fetchStats,
    reset,
  }
})
