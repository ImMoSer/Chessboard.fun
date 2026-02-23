import { apiClient } from '@/shared/api/client'
import type {
  TornadoEndResponse,
  TornadoEndSessionDto,
  TornadoMode,
  TornadoStartResponse
} from '@/shared/types/api.types'
import { useMutation } from '@tanstack/vue-query'

export const TORNADO_KEYS = {
  all: ['tornado'] as const,
  session: (id: string) => [...TORNADO_KEYS.all, 'session', id] as const,
}

export function useTornadoQueries() {
  const startSessionMutation = useMutation({
    mutationFn: (args: { mode: TornadoMode; theme?: string }) =>
      apiClient<TornadoStartResponse>(`/tornado/session/start/${args.mode}${args.theme ? `?theme=${args.theme}` : ''}`, {
        method: 'POST'
      }),
  })

  const endSessionMutation = useMutation({
    mutationFn: (args: { mode: TornadoMode; dto: TornadoEndSessionDto }) =>
      apiClient<TornadoEndResponse>(`/tornado/session/end/${args.mode}`, {
        method: 'POST',
        body: JSON.stringify(args.dto)
      }),
  })

  return {
    startSessionMutation,
    endSessionMutation,
  }
}
