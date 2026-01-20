// src/stores/wikibooks.store.ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { wikiBooksApiService, WikiUrlBuilder } from '../services/WikiBooksService'
import type { WikiPageExtract } from '../types/wikibooks.types'
import logger from '../utils/logger'

export const useWikiBooksStore = defineStore('wikibooks', () => {
    const wikiData = ref<WikiPageExtract | null>(null)
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const currentMoves = ref<string[]>([])

    const currentSlug = computed(() => WikiUrlBuilder.buildSlug(currentMoves.value))
    const hasTheory = computed(() => wikiData.value !== null)

    async function updateMoves(moves: string[]) {
        // Avoid redundant updates
        if (JSON.stringify(currentMoves.value) === JSON.stringify(moves)) return

        currentMoves.value = [...moves]
        isLoading.value = true
        error.value = null

        try {
            const data = await wikiBooksApiService.fetchWithFallback(moves)
            wikiData.value = data
        } catch (err) {
            logger.error('[WikiBooksStore] Update error:', err)
            error.value = err instanceof Error ? err.message : String(err)
            wikiData.value = null
        } finally {
            isLoading.value = false
        }
    }

    return {
        wikiData,
        isLoading,
        error,
        currentMoves,
        currentSlug,
        hasTheory,
        updateMoves,
    }
})
