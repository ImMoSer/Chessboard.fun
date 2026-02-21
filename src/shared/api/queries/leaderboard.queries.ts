import type { LeaderboardApiResponse, OverallSolvedLeaderboardEntry } from '@/shared/types/api.types'
import { useQuery } from '@tanstack/vue-query'
import { apiClient } from '../client'

// Константы ключей для кэширования
export const LEADERBOARD_KEYS = {
    all: ['leaderboards'] as const,
    combined: () => [...LEADERBOARD_KEYS.all, 'combined'] as const,
    overallSkill: (period: string) => [...LEADERBOARD_KEYS.all, 'overall-skill', period] as const,
}

/**
 * Fetch combined leaderboards (Hot, Competitive, etc.)
 */
export const useCombinedLeaderboardsQuery = (enabled: boolean = true) => {
    return useQuery<LeaderboardApiResponse, Error>({
        queryKey: LEADERBOARD_KEYS.combined(),
        queryFn: () => apiClient<LeaderboardApiResponse>('/leaderboards'),
        enabled,
        staleTime: 5 * 60 * 1000, // Данные рекордов кэшируются 5 минут для экономии запросов
    })
}

/**
 * Fetch Overall Skill Leaderboard for a specific period (7, 14, 21, 30)
 */
export const useOverallSkillLeaderboardQuery = (period: '7' | '14' | '21' | '30', enabled: boolean = true) => {
    return useQuery<OverallSolvedLeaderboardEntry[], Error>({
        queryKey: LEADERBOARD_KEYS.overallSkill(period),
        queryFn: () => apiClient<OverallSolvedLeaderboardEntry[]>(`/leaderboards/overall-skill?period=${period}`),
        enabled,
        staleTime: 5 * 60 * 1000,
    })
}
