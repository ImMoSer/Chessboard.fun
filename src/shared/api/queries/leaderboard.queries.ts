import type {
  LeaderboardApiResponse,
  LeaderboardResponse,
} from '@/shared/types/api.types'
import { useQuery } from '@tanstack/vue-query'
import { apiClient } from '../client'

// Константы ключей для кэширования
const LEADERBOARD_KEYS = {
  all: ['leaderboards'] as const,
  combined: () => [...LEADERBOARD_KEYS.all, 'combined'] as const,
  overallSkill: () => [...LEADERBOARD_KEYS.all, 'overall-skill'] as const,
  topToday: () => [...LEADERBOARD_KEYS.all, 'top-today'] as const,
}

/**
 * Fetch combined leaderboards (Hot, Competitive, etc.)
 */
export const useCombinedLeaderboardsQuery = (enabled: boolean = true) => {
  return useQuery<LeaderboardApiResponse, Error>({
    queryKey: LEADERBOARD_KEYS.combined(),
    queryFn: () => apiClient<LeaderboardApiResponse>('/leaderboards'),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch Overall Skill Leaderboard (fixed 30 days)
 */
export const useOverallSkillLeaderboardQuery = (enabled: boolean = true) => {
  return useQuery<LeaderboardResponse, Error>({
    queryKey: LEADERBOARD_KEYS.overallSkill(),
    queryFn: () => apiClient<LeaderboardResponse>('/leaderboards/overall-skill'),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch Top Today Leaderboard
 */
export const useTopTodayLeaderboardQuery = (enabled: boolean = true) => {
  return useQuery<LeaderboardResponse, Error>({
    queryKey: LEADERBOARD_KEYS.topToday(),
    queryFn: () => apiClient<LeaderboardResponse>('/leaderboards/top-today'),
    enabled,
    staleTime: 60 * 1000, // Top Today updates more frequently
  })
}
