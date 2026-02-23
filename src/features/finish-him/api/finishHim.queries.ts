import { webhookService } from '@/shared/api/WebhookService'
import type { FinishHimDifficulty, FinishHimResultDto } from '@/shared/types/api.types'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

export const FINISH_HIM_KEYS = {
    all: ['finish-him'] as const,
    puzzles: () => [...FINISH_HIM_KEYS.all, 'puzzles'] as const,
    puzzle: (id: string) => [...FINISH_HIM_KEYS.puzzles(), id] as const,
    params: (theme: string, difficulty: FinishHimDifficulty) =>
        [...FINISH_HIM_KEYS.puzzles(), theme, difficulty] as const,
}

export function useFinishHimQueries(params?: {
    theme: Ref<string>
    difficulty: Ref<FinishHimDifficulty>
    puzzleId?: Ref<string | undefined>
}) {
    const puzzleQuery = useQuery({
        queryKey: computed(() => {
            if (params?.puzzleId?.value) return FINISH_HIM_KEYS.puzzle(params.puzzleId.value)
            return FINISH_HIM_KEYS.params(params?.theme.value ?? 'auto', params?.difficulty.value ?? 'Novice')
        }),
        queryFn: async () => {
            if (params?.puzzleId?.value) {
                return await webhookService.fetchFinishHimPuzzleById(params.puzzleId.value)
            }
            return await webhookService.fetchFinishHimPuzzle(
                params?.theme.value ?? 'auto',
                params?.difficulty.value ?? 'Novice'
            )
        },
        enabled: false, // Загрузка инициируется вручную через refetch()
        staleTime: 0,
    })

    const resultMutation = useMutation({
        mutationFn: (dto: FinishHimResultDto) => webhookService.processFinishHimResult(dto),
    })

    return {
        puzzleQuery,
        resultMutation,
    }
}
