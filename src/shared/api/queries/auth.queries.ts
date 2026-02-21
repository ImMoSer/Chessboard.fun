import type { UserSessionProfile } from '@/types/api.types'
import { useQuery } from '@tanstack/vue-query'
import { apiClient } from '../client'; // Adjust if needed

export const AUTH_KEYS = {
    all: ['auth'] as const,
    profile: () => [...AUTH_KEYS.all, 'profile'] as const,
}

export const useAuthProfileQuery = () => {
    return useQuery<UserSessionProfile, Error>({
        queryKey: AUTH_KEYS.profile(),
        queryFn: async () => {
            // Let the error propagate so vue-query catches it
            return await apiClient<UserSessionProfile>('/auth/lichess/profile')
        },
        retry: false, // Don't retry auth checks
        staleTime: 5 * 60 * 1000,
    })
}
