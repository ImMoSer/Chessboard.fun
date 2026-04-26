import type {
  LeaderboardApiResponse,
  LeaderboardResponse,
  UnifiedLeaderboardResponse,
} from '@/shared/types/api.types'
import { useQuery } from '@tanstack/vue-query'
import { apiClient } from '../client'

// Константы ключей для кэширования
const LEADERBOARD_KEYS = {
  all: ['leaderboards'] as const,
  combined: () => [...LEADERBOARD_KEYS.all, 'combined'] as const,
  overallSkill: () => [...LEADERBOARD_KEYS.all, 'overall-skill'] as const,
  topToday: () => [...LEADERBOARD_KEYS.all, 'top-today'] as const,
  tornado: () => [...LEADERBOARD_KEYS.all, 'tornado'] as const,
  finishHim: () => [...LEADERBOARD_KEYS.all, 'finish-him'] as const,
  practical: () => [...LEADERBOARD_KEYS.all, 'practical-chess'] as const,
  theory: () => [...LEADERBOARD_KEYS.all, 'theory'] as const,
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

/**
 * Fetch Tornado Leaderboards (4 modes)
 */
export const useTornadoLeaderboardsQuery = (enabled: boolean = true) => {
  return useQuery<UnifiedLeaderboardResponse, Error>({
    queryKey: LEADERBOARD_KEYS.tornado(),
    queryFn: () => apiClient<UnifiedLeaderboardResponse>('/leaderboards/tornado'),
    enabled,
    staleTime: 60 * 1000,
  })
}

/**
 * Fetch Finish Him Leaderboards
 */
export const useFinishHimLeaderboardQuery = (enabled: boolean = true) => {
  return useQuery<UnifiedLeaderboardResponse, Error>({
    queryKey: LEADERBOARD_KEYS.finishHim(),
    queryFn: () => apiClient<UnifiedLeaderboardResponse>('/leaderboards/finish-him'),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch Practical Chess Leaderboards
 */
export const usePracticalLeaderboardQuery = (enabled: boolean = true) => {
  return useQuery<UnifiedLeaderboardResponse, Error>({
    queryKey: LEADERBOARD_KEYS.practical(),
    queryFn: () => apiClient<UnifiedLeaderboardResponse>('/leaderboards/practical-chess'),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch Theory Leaderboards
 */
export const useTheoryLeaderboardQuery = (enabled: boolean = true) => {
  return useQuery<UnifiedLeaderboardResponse, Error>({
    queryKey: LEADERBOARD_KEYS.theory(),
    queryFn: () => apiClient<UnifiedLeaderboardResponse>('/leaderboards/theory'),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}
