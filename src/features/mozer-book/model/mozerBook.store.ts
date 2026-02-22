// src/stores/mozerBook.store.ts
import { useBoardStore } from '@/entities/game'
import { mozerBookService, type MozerBookResponse } from '@/shared/api/mozer-book/MozerBookService'
import logger from '@/shared/lib/logger'
import { pgnService, pgnTreeVersion } from '@/shared/lib/pgn/PgnService'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useMozerBookStore = defineStore('mozerBook', () => {
  const boardStore = useBoardStore()

  const currentStats = ref<MozerBookResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastFetchedFen = ref('')

  // Deduplication: Store the pending promise
  const pendingRequest = ref<Promise<MozerBookResponse | null> | null>(null)
  const pendingFen = ref<string | null>(null)

  // We use boardStore.fen because it's already properly synced with PgnService
  // but we also watch pgnTreeVersion for structural changes.
  const currentFen = computed(() => {
    // Ensuring computed tracks changes
    void pgnTreeVersion.value
    return boardStore.fen || pgnService.getCurrentNavigatedFen()
  })

  async function fetchStats(force = false): Promise<MozerBookResponse | null> {
    const fen = currentFen.value

    // 1. Return cached data if available and fresh
    if (!force && fen === lastFetchedFen.value && currentStats.value) {
      return currentStats.value
    }

    // 2. Return in-flight request if matching
    if (pendingRequest.value && pendingFen.value === fen && !force) {
      return pendingRequest.value
    }

    isLoading.value = true
    error.value = null
    pendingFen.value = fen

    const promise = (async () => {
      try {
        logger.info(`[MozerBookStore] Fetching stats for FEN: ${fen}`)
        const data = await mozerBookService.getStats(fen)
        if (data) {
          // Only update state if this is still the relevant FEN
          // (though usually we want to cache it anyway)
          if (fen === pendingFen.value) {
            currentStats.value = data
            lastFetchedFen.value = fen
          }
          return data
        }
        return null
      } catch (e: unknown) {
        if (fen === pendingFen.value) {
          const msg = e instanceof Error ? e.message : String(e)
          error.value = msg || 'Failed to fetch MozerBook stats'
        }
        logger.error(`[MozerBookStore] Error:`, e)
        return null
      } finally {
        if (fen === pendingFen.value) {
          isLoading.value = false
          pendingRequest.value = null
          pendingFen.value = null
        }
      }
    })()

    pendingRequest.value = promise
    return promise
  }

  function reset() {
    currentStats.value = null
    isLoading.value = false
    error.value = null
    lastFetchedFen.value = ''
    pendingRequest.value = null
    pendingFen.value = null
  }

  // Helper to get stats for a specific FEN without side-effecting the main UI immediately if not needed?
  // Actually, we usually want to update the store.
  // But if Diamond Hunter needs stats for a *future* move or specific validation, it might want to bypass currentStats.
  // However, Diamond Hunter usually looks at the board's current FEN.

  async function getStatsForFen(fen: string): Promise<MozerBookResponse | null> {
    // If the requested FEN matches our current store state, just ensure it's loaded.
    if (fen === currentFen.value) {
      return fetchStats()
    }

    // Otherwise, fetch independently (stateless for the store UI, but using API)
    // We don't want to break the UI by loading other FENs into `currentStats`.
    return mozerBookService.getStats(fen)
  }

  return {
    currentStats,
    isLoading,
    error,
    currentFen,
    fetchStats,
    getStatsForFen,
    reset,
  }
})
