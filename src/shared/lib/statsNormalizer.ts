import {
  FINISH_HIM_THEMES,
  PRACTICAL_CHESS_CATEGORIES,
  THEORY_ENDING_CATEGORIES,
  TORNADO_THEMES,
  type GameModeProfileDto,
  type UserProfileStatsDto,
} from '@/shared/types/api.types'

const BASE_SUCCESS = 1
const BASE_REQUESTED = 2

function normalizeGameMode(
  profile: GameModeProfileDto | undefined,
  subModes: readonly string[],
  difficulties: readonly string[],
  themes: readonly string[],
  baseRating: number
): GameModeProfileDto {
  const modes: GameModeProfileDto['modes'] = {}

  for (const subMode of subModes) {
    modes[subMode] = {}
    for (const diff of difficulties) {
      modes[subMode][diff] = []
      
      for (const theme of themes) {
        const existing = profile?.modes?.[subMode]?.[diff]?.find(t => t.theme === theme)
        if (existing) {
          modes[subMode][diff].push({
            theme,
            rating: existing.rating || baseRating,
            success: existing.success + BASE_SUCCESS,
            requested: existing.requested + BASE_REQUESTED
          })
        } else {
          modes[subMode][diff].push({
            theme,
            rating: baseRating,
            success: BASE_SUCCESS,
            requested: BASE_REQUESTED
          })
        }
      }
      modes[subMode][diff].sort((a, b) => b.rating - a.rating)
    }
  }

  return {
    modes,
    highScores: profile?.highScores || {}
  }
}

export function normalizeProfileStats(
    apiStats: UserProfileStatsDto | undefined | null,
    baseRating: number = 1000,
): UserProfileStatsDto {
    const safeStats = apiStats || {} as UserProfileStatsDto

    return {
        tornado: normalizeGameMode(
          safeStats.tornado,
          ['bullet', 'blitz', 'rapid', 'classic'],
          ['mix'],
          TORNADO_THEMES,
          baseRating
        ),
        finish_him: normalizeGameMode(
          safeStats.finish_him,
          ['win'],
          ['Novice', 'Pro', 'Master'],
          FINISH_HIM_THEMES,
          baseRating
        ),
        theory: normalizeGameMode(
          safeStats.theory,
          ['win', 'draw'],
          ['Novice', 'Pro', 'Master'],
          THEORY_ENDING_CATEGORIES,
          baseRating
        ),
        practical: normalizeGameMode(
          safeStats.practical,
          ['win'],
          ['Novice', 'Pro', 'Master'],
          PRACTICAL_CHESS_CATEGORIES,
          baseRating
        )
    }
}

export function generateExampleStats(baseRating: number = 1500): UserProfileStatsDto {
    const stats = normalizeProfileStats(null, baseRating)

    const applyVariety = (
        items: { theme: string; rating: number; success: number; requested: number }[] | undefined,
        seed: number,
    ) => {
        if (!items) return;
        items.forEach((item, index) => {
            const variance = ((index * seed) % 800) - 300
            item.rating = baseRating + variance
            item.requested = 20 + ((index * 7) % 100)
            const rate = 0.6 + ((index * 3) % 35) / 100
            item.success = Math.floor(item.requested * rate)
        })
        items.sort((a, b) => b.rating - a.rating)
    }

    let s = 13
    
    // Tornado
    if (!stats.tornado.highScores) stats.tornado.highScores = {}
    for (const mode of ['bullet', 'blitz', 'rapid', 'classic'] as const) {
        applyVariety(stats.tornado.modes[mode]?.['mix'], s++)
        stats.tornado.highScores[mode] = Math.floor(baseRating / 30) + (s % 15)
    }

    // Finish Him
    for (const diff of ['Novice', 'Pro', 'Master'] as const) {
        applyVariety(stats.finish_him.modes['win']?.[diff], s++)
    }

    // Theory
    for (const subMode of ['win', 'draw'] as const) {
        for (const diff of ['Novice', 'Pro', 'Master'] as const) {
            applyVariety(stats.theory.modes[subMode]?.[diff], s++)
        }
    }

    // Practical
    for (const diff of ['Novice', 'Pro', 'Master'] as const) {
        applyVariety(stats.practical.modes['win']?.[diff], s++)
    }

    return stats
}

