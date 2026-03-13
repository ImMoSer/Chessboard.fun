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
            result.finish_him.modes[difficulty].sort((a, b) => b.rating - a.rating)
        }
    }

    // 3. Normalize Theory Win
    if (!result.theory_win) {
        result.theory_win = createEmptyNormalizedTheory(baseRating)
    } else {
        for (const difficulty of ['Novice', 'Pro', 'Master'] as const) {
            if (!result.theory_win.modes[difficulty]) result.theory_win.modes[difficulty] = []

            for (const theme of THEORY_ENDING_CATEGORIES) {
                const existing = result.theory_win.modes[difficulty].find((t) => t.theme === theme)
                if (!existing) {
                    result.theory_win.modes[difficulty].push({
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
            result.theory_win.modes[difficulty].sort((a, b) => b.rating - a.rating)
        }
    }

    // 4. Normalize Theory Draw
    if (!result.theory_draw) {
        result.theory_draw = createEmptyNormalizedTheory(baseRating)
    } else {
        for (const difficulty of ['Novice', 'Pro', 'Master'] as const) {
            if (!result.theory_draw.modes[difficulty]) result.theory_draw.modes[difficulty] = []

            for (const theme of THEORY_ENDING_CATEGORIES) {
                const existing = result.theory_draw.modes[difficulty].find((t) => t.theme === theme)
                if (!existing) {
                    result.theory_draw.modes[difficulty].push({
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
            result.theory_draw.modes[difficulty].sort((a, b) => b.rating - a.rating)
        }
    }

    // 5. Normalize Practical
    if (!result.practical) {
        result.practical = createEmptyNormalizedPractical(baseRating)
    } else {
        for (const difficulty of ['Novice', 'Pro', 'Master'] as const) {
            if (!result.practical.modes[difficulty]) result.practical.modes[difficulty] = []

            for (const theme of PRACTICAL_CHESS_CATEGORIES) {
                const existing = result.practical.modes[difficulty].find((t) => t.theme === theme)
                if (!existing) {
                    result.practical.modes[difficulty].push({
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
            result.practical.modes[difficulty].sort((a, b) => b.rating - a.rating)
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

function createEmptyNormalizedTheory(baseRating: number): TheoryEndingProfileDto {
    const modes: TheoryEndingProfileDto['modes'] = { Novice: [], Pro: [], Master: [] }
    for (const diff of ['Novice', 'Pro', 'Master'] as const) {
        modes[diff] = THEORY_ENDING_CATEGORIES.map((theme) => ({
            theme,
            rating: baseRating,
            success: BASE_SUCCESS,
            requested: BASE_REQUESTED,
        }))
    }
    return { modes }
}

function createEmptyNormalizedPractical(baseRating: number): PracticalChessProfileDto {
    const modes: PracticalChessProfileDto['modes'] = { Novice: [], Pro: [], Master: [] }
    for (const diff of ['Novice', 'Pro', 'Master'] as const) {
        modes[diff] = PRACTICAL_CHESS_CATEGORIES.map((theme) => ({
            theme,
            rating: baseRating,
            success: BASE_SUCCESS,
            requested: BASE_REQUESTED,
        }))
    }
    return { modes }
}

function createEmptyNormalizedStats(baseRating: number): UserProfileStatsDto {
    return {
        tornado: createEmptyNormalizedTornado(baseRating),
        finish_him: createEmptyNormalizedFinishHim(baseRating),
        theory_win: createEmptyNormalizedTheory(baseRating),
        theory_draw: createEmptyNormalizedTheory(baseRating),
        practical: createEmptyNormalizedPractical(baseRating),
    }
}
