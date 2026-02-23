import { webhookService } from '@/shared/api/WebhookService'
import type {
    TornadoEndSessionDto,
    TornadoMode
} from '@/shared/types/api.types'
import { useMutation } from '@tanstack/vue-query'

export const TORNADO_KEYS = {
    all: ['tornado'] as const,
    session: (id: string) => [...TORNADO_KEYS.all, 'session', id] as const,
}

export function useTornadoQueries() {
    const startSessionMutation = useMutation({
        mutationFn: (args: { mode: TornadoMode; theme?: string }) =>
            webhookService.startTornadoSession(args.mode, args.theme),
    })

    const endSessionMutation = useMutation({
        mutationFn: (args: { mode: TornadoMode; dto: TornadoEndSessionDto }) =>
            webhookService.endTornadoSession(args.mode, args.dto),
    })

    return {
        startSessionMutation,
        endSessionMutation,
    }
}
