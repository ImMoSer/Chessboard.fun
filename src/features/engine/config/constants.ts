import type { EngineId } from '@/shared/types/api.types'

export const ENGINE_NAMES: Record<EngineId, string> = {
  'badgyal-8': 'BadGyal-8',
  'elite_2400': 'Elite-2400',
  'maia-1900': 'Maia-1900',
  'maia-2200': 'Maia-2200',
  'SF_2200': 'Stockfish (depth:10)',
}

export const AVAILABLE_ENGINES = Object.keys(ENGINE_NAMES) as EngineId[]
