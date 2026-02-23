import { webhookService } from '@/shared/api/WebhookService'
import type {
    PracticalChessCategory,
    PracticalChessDifficulty,
    PracticalChessResultDto
} from '@/shared/types/api.types'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

export const PRACTICAL_CHESS_KEYS = {
    all: ['practical-chess'] as const,
    puzzles: () => [...PRACTICAL_CHESS_KEYS.all, 'puzzles'] as const,
    puzzle: (id: string) => [...PRACTICAL_CHESS_KEYS.puzzles(), id] as const,
    params: (category: PracticalChessCategory, difficulty: PracticalChessDifficulty) =>
        [...PRACTICAL_CHESS_KEYS.puzzles(), category, difficulty] as const,
}

export function usePracticalChessQueries(params?: {
    category: Ref<PracticalChessCategory>
    difficulty: Ref<PracticalChessDifficulty>
    puzzleId?: Ref<string | undefined>
}) {
    const puzzleQuery = useQuery({
        queryKey: computed(() => {
            if (params?.puzzleId?.value) return PRACTICAL_CHESS_KEYS.puzzle(params.puzzleId.value)
            return PRACTICAL_CHESS_KEYS.params(
                params?.category.value ?? 'extraPawn',
                params?.difficulty.value ?? 'Novice'
            )
        }),
        queryFn: async () => {
            if (params?.puzzleId?.value) {
                return await webhookService.fetchPracticalPuzzleById(params.puzzleId.value)
            }
            return await webhookService.fetchPracticalPuzzle(
                params?.category.value ?? 'extraPawn',
                params?.difficulty.value ?? 'Novice'
            )
        },
        enabled: false,
        staleTime: 0,
    })

    const resultMutation = useMutation({
        mutationFn: (args: { category: string; dto: PracticalChessResultDto }) =>
            webhookService.processPracticalResult(args.category, args.dto),
    })

    return {
        puzzleQuery,
        resultMutation,
    }
}
