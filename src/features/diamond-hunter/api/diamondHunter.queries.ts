import { checkDiamondLimit, db, recordBrilliant, recordDiamond } from '@/db/DiamondDatabase'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { diamondApiService, type GravityMove } from './DiamondApiService'

export const DIAMOND_HUNTER_KEYS = {
    all: ['diamond-hunter'] as const,
    gravity: (playerColor: string, fen: string) => [...DIAMOND_HUNTER_KEYS.all, 'gravity', playerColor, fen] as const,
    db: {
        all: ['diamond-hunter-db'] as const,
        diamondsCount: () => [...DIAMOND_HUNTER_KEYS.db.all, 'diamonds-count'] as const,
        brilliantsCount: () => [...DIAMOND_HUNTER_KEYS.db.all, 'brilliants-count'] as const,
    }
}

export function useDiamondHunterQueries() {
    const queryClient = useQueryClient()

    // 1. Database Queries
    const diamondsCountQuery = useQuery({
        queryKey: DIAMOND_HUNTER_KEYS.db.diamondsCount(),
        queryFn: () => db.diamonds.count(),
    })

    const brilliantsCountQuery = useQuery({
        queryKey: DIAMOND_HUNTER_KEYS.db.brilliantsCount(),
        queryFn: () => db.brilliants.count(),
    })

    // 2. Database Mutations
    const recordBrilliantMutation = useMutation({
        mutationFn: async (params: { hash: string, fen: string, pgn: string }) => {
            return await recordBrilliant(params.hash, params.fen, params.pgn)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DIAMOND_HUNTER_KEYS.db.brilliantsCount() })
        }
    })

    const recordDiamondMutation = useMutation({
        mutationFn: async (params: { hash: string, fen: string, pgn: string }) => {
            return await recordDiamond(params.hash, params.fen, params.pgn)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DIAMOND_HUNTER_KEYS.db.diamondsCount() })
        }
    })

    // 3. Gravity Fetcher (Imperative)
    // We use fetchQuery so we can call it on demand from the store actions,
    // while still utilizing deduplication and caching.
    async function fetchGravityForFen(playerColor: string, fen: string): Promise<{ moves: GravityMove[] } | null> {
        return await queryClient.fetchQuery({
            queryKey: DIAMOND_HUNTER_KEYS.gravity(playerColor, fen),
            queryFn: async () => {
                if (playerColor === 'white') {
                    return await diamondApiService.getWhiteGravity(fen)
                } else {
                    return await diamondApiService.getBlackGravity(fen)
                }
            },
            staleTime: 1000 * 60 * 60, // Cache for 1 hour to prevent redundant requests
        })
    }

    return {
        // Query results (reactive)
        diamondsCountQuery,
        brilliantsCountQuery,

        // Mutations
        recordBrilliantMutation,
        recordDiamondMutation,

        // Services
        checkDiamondLimit,
        fetchGravityForFen,
    }
}
