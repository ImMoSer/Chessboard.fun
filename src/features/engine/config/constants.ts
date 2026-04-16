import type { EngineId } from '@/shared/types/api.types'

export const ENGINE_NAMES: Record<EngineId, string> = {
  'Maia_2400': 'Maia-2400',
  'maia-2200': 'Maia-2200',
  'maia-1900': 'Maia-1900',
  'SF_2200': 'Stockfish (depth:10)',
}

export const AVAILABLE_ENGINES: EngineId[] = ['maia-2200', 'maia-1900', 'Maia_2400']
