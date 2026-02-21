import type { PersonalActivityStatsResponse, UserProfileStatsDto } from '@/shared/types/api.types'
import { useQuery } from '@tanstack/vue-query'
import { apiClient } from '../client'

export const USER_CABINET_KEYS = {
    all: ['user-cabinet'] as const,
    personalActivity: () => [...USER_CABINET_KEYS.all, 'personal-activity'] as const,
    detailedStats: () => [...USER_CABINET_KEYS.all, 'detailed-stats'] as const,
}

export const usePersonalActivityStatsQuery = (enabled: boolean = true) => {
    return useQuery<PersonalActivityStatsResponse, Error>({
        queryKey: USER_CABINET_KEYS.personalActivity(),
        queryFn: () => apiClient<PersonalActivityStatsResponse>('/activity/personal'),
        enabled,
        staleTime: 5 * 60 * 1000,
    })
}

export const useDetailedStatsQuery = (enabled: boolean = true) => {
    return useQuery<UserProfileStatsDto, Error>({
        queryKey: USER_CABINET_KEYS.detailedStats(),
        queryFn: () => apiClient<UserProfileStatsDto>('/users/me/profile-stats'),
        enabled,
        staleTime: 5 * 60 * 1000,
    })
}
