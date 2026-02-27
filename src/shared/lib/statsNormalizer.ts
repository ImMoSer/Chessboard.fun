import {
  FINISH_HIM_THEMES,
  PRACTICAL_CHESS_CATEGORIES,
  THEORY_ENDING_CATEGORIES,
  TORNADO_THEMES,
  type FinishHimProfileDto,
  type PracticalChessProfileDto,
  type TheoryEndingProfileDto,
  type TornadoProfileDto,
  type UserProfileStatsDto,
} from '@/shared/types/api.types'

const BASE_SUCCESS = 1
const BASE_REQUESTED = 2

export function normalizeProfileStats(
    apiStats: UserProfileStatsDto | undefined | null,
    baseRating: number = 1000,
): UserProfileStatsDto {
    if (!apiStats) {
        return createEmptyNormalizedStats(baseRating)
    }

    // Helper to deep clone to avoid mutating pinia/vue state or api cache
    const result: UserProfileStatsDto = JSON.parse(JSON.stringify(apiStats))

    // 1. Normalize Tornado
    if (!result.tornado) {
        result.tornado = createEmptyNormalizedTornado(baseRating)
    } else {
        for (const mode of ['bullet', 'blitz', 'rapid', 'classic'] as const) {
            if (!result.tornado.modes[mode]) result.tornado.modes[mode] = []

            // Merge existing with constants
            for (const theme of TORNADO_THEMES) {
                const existing = result.tornado.modes[mode].find((t) => t.theme === theme)
                if (!existing) {
                    result.tornado.modes[mode].push({
                        theme,
                        success: BASE_SUCCESS,
                        requested: BASE_REQUESTED,
                        rating: baseRating,
                    })
                } else {
                    existing.success += BASE_SUCCESS
                    existing.requested += BASE_REQUESTED
                }
            }

            // Sort by rating desc
            result.tornado.modes[mode].sort((a, b) => b.rating - a.rating)
        }
    }

    // 2. Normalize Finish Him
    if (!result.finish_him) {
        result.finish_him = createEmptyNormalizedFinishHim(baseRating)
    } else {
        for (const difficulty of ['Novice', 'Pro', 'Master'] as const) {
            if (!result.finish_him.modes[difficulty]) result.finish_him.modes[difficulty] = []

            for (const theme of FINISH_HIM_THEMES) {
                const existing = result.finish_him.modes[difficulty].find((t) => t.theme === theme)
                if (!existing) {
                    result.finish_him.modes[difficulty].push({
                        theme,
                        rating: baseRating,
                        success: BASE_SUCCESS,
                        requested: BASE_REQUESTED,
                    })
                } else {
                    existing.success += BASE_SUCCESS
                    existing.requested += BASE_REQUESTED
                }
            }

            // Sort by rating desc
            result.finish_him.modes[difficulty].sort((a, b) => b.rating - a.rating)
        }
    }

    // 3. Normalize Theory
    if (!result.theory) {
        result.theory = createEmptyNormalizedTheory()
    } else {
        if (!result.theory.stats) result.theory.stats = {}
        const emptyTheory = createEmptyNormalizedTheory().stats
        for (const key in emptyTheory) {
            if (!result.theory.stats[key]) {
                const val = emptyTheory[key]
                if (val) {
                    result.theory.stats[key] = { success: val.success, requested: val.requested }
                }
            } else {
                result.theory.stats[key].success += BASE_SUCCESS
                result.theory.stats[key].requested += BASE_REQUESTED
            }
        }
    }

    // 4. Normalize Practical
    if (!result.practical) {
        result.practical = createEmptyNormalizedPractical()
    } else {
        if (!result.practical.stats) result.practical.stats = {}
        const emptyPractical = createEmptyNormalizedPractical().stats
        for (const key in emptyPractical) {
            if (!result.practical.stats[key]) {
                const val = emptyPractical[key]
                if (val) {
                    result.practical.stats[key] = { success: val.success, requested: val.requested }
                }
            } else {
                result.practical.stats[key].success += BASE_SUCCESS
                result.practical.stats[key].requested += BASE_REQUESTED
            }
        }
    }

    return result
}

function createEmptyNormalizedTornado(baseRating: number): TornadoProfileDto {
    const modes: TornadoProfileDto['modes'] = { bullet: [], blitz: [], rapid: [], classic: [] }
    for (const mode of ['bullet', 'blitz', 'rapid', 'classic'] as const) {
        modes[mode] = TORNADO_THEMES.map((theme) => ({
            theme,
            success: BASE_SUCCESS,
            requested: BASE_REQUESTED,
            rating: baseRating,
        }))
    }

    return {
        highScores: { bullet: 0, blitz: 0, rapid: 0, classic: 0 },
        modes,
    }
}

function createEmptyNormalizedFinishHim(baseRating: number): FinishHimProfileDto {
    const modes: FinishHimProfileDto['modes'] = { Novice: [], Pro: [], Master: [] }
    for (const diff of ['Novice', 'Pro', 'Master'] as const) {
        modes[diff] = FINISH_HIM_THEMES.map((theme) => ({
            theme,
            rating: baseRating,
            success: BASE_SUCCESS,
            requested: BASE_REQUESTED,
        }))
    }

    return { modes }
}

function createEmptyNormalizedTheory(): TheoryEndingProfileDto {
    const stats: Record<string, { requested: number; success: number }> = {}

        ;['win', 'draw'].forEach((tType) => {
            ;['Novice', 'Pro', 'Master'].forEach((diffLvl) => {
                THEORY_ENDING_CATEGORIES.forEach((tTheme) => {
                    stats[`${tType}/${diffLvl}/${tTheme}`] = { success: BASE_SUCCESS, requested: BASE_REQUESTED }
                })
            })
        })

    return { stats }
}

function createEmptyNormalizedPractical(): PracticalChessProfileDto {
    const stats: Record<string, { requested: number; success: number }> = {}

        ;['Novice', 'Pro', 'Master'].forEach((diffLvl) => {
            PRACTICAL_CHESS_CATEGORIES.forEach((tTheme) => {
                stats[`win/${diffLvl}/${tTheme}`] = { success: BASE_SUCCESS, requested: BASE_REQUESTED }
            })
        })

    return { stats }
}

function createEmptyNormalizedStats(baseRating: number): UserProfileStatsDto {
    return {
        tornado: createEmptyNormalizedTornado(baseRating),
        finish_him: createEmptyNormalizedFinishHim(baseRating),
        theory: createEmptyNormalizedTheory(),
        practical: createEmptyNormalizedPractical(),
    }
}
