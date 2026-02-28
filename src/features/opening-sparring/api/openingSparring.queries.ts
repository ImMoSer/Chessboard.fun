import { useMutation, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { lichessApiService, mozerBookService } from '@/entities/opening'
import { apiClient } from '@/shared/api/client'

const OPENING_SPARRING_KEYS = {
  all: ['opening-sparring'] as const,
  mozerStats: (fen: string) => [...OPENING_SPARRING_KEYS.all, 'mozer', fen] as const,
  lichessStats: (fen: string, ratingRange: string) =>
    [...OPENING_SPARRING_KEYS.all, 'lichess', fen, ratingRange] as const,
}

export function useOpeningSparringQueries(options?: {
  fen: Ref<string>
  source: Ref<'master' | 'lichess'>
  shouldFetchLichess: Ref<boolean>
  lichessRatingRange: Ref<'0-1500' | '1500-2000' | '2000+'>
  isTheoryPhase: Ref<boolean>
}) {
  const mozerQuery = useQuery({
    queryKey: computed(() => OPENING_SPARRING_KEYS.mozerStats(options?.fen.value ?? '')),
    queryFn: async () => {
      return await mozerBookService.getStats(options?.fen.value ?? '')
    },
    enabled: () => !!options && options.isTheoryPhase.value,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const lichessQuery = useQuery({
    queryKey: computed(() =>
      OPENING_SPARRING_KEYS.lichessStats(
        options?.fen.value ?? '',
        options?.lichessRatingRange.value ?? '0-1500',
      ),
    ),
    queryFn: async () => {
      return await lichessApiService.getStats(options?.fen.value ?? '', {
        ratingRange: options?.lichessRatingRange.value ?? '0-1500',
      })
    },
    enabled: () =>
      !!options && options.source.value === 'lichess' && options.shouldFetchLichess.value && options.isTheoryPhase.value,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const startSparringMutation = useMutation({
    mutationFn: () => apiClient<{ status: string }>('/opening/sparring/start', {
      method: 'POST'
    }),
  })

  return {
    mozerQuery,
    lichessQuery,
    startSparringMutation,
  }
}
