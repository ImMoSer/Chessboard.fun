import { useMutation, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { lichessApiService, mozerBookService } from '@/entities/opening'
import { apiClient } from '@/shared/api/client'

const OPENING_SPARRING_KEYS = {
  all: ['opening-sparring'] as const,
  mozerStats: (fen: string) => [...OPENING_SPARRING_KEYS.all, 'mozer', fen] as const,
  lichessStats: (fen: string, ratings: number[]) =>
    [...OPENING_SPARRING_KEYS.all, 'lichess', fen, ratings.join(',')] as const,
}

export function useOpeningSparringQueries(options?: {
  fen: Ref<string>
  source: Ref<'master' | 'lichess'>
  shouldFetchLichess: Ref<boolean>
  lichessRatings: Ref<number[]>
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
        options?.lichessRatings.value ?? [],
      ),
    ),
    queryFn: async () => {
      return await lichessApiService.getStats(options?.fen.value ?? '', 'lichess', {
        ratings: options?.lichessRatings.value ?? [],
        speeds: ['blitz', 'rapid', 'classical'],
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
