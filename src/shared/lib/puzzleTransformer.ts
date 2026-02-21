import type { FinishHimPuzzle, GamePuzzle, PracticalPuzzle, PuzzleUnion, TheoryPuzzle, TornadoPuzzle } from '../types/api.types'

export interface DisplayTaskHeader {
    value: string | number
    label?: string
    icon?: string
    color?: string // 'success' | 'warning' | 'info' etc.
}

export interface DisplayTaskBadge {
    text: string
    type: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'
}

export interface DisplayTaskStat {
    icon: string // Icon name or component
    value: string | number
    label?: string
}

export interface DisplayTask {
    header: DisplayTaskHeader
    badges: DisplayTaskBadge[]
    stats: DisplayTaskStat[]
    footerTags: string[]
}

const officialTornadoThemes = new Set([
    'fork', 'pin', 'attraction', 'discoveredAttack', 'deflection', 'skewer',
    'promotion', 'trappedPiece', 'quietMove', 'clearance', 'capturingDefender',
    'backRankMate', 'interference', 'xRayAttack', 'doubleCheck'
])

export function transformPuzzle(puzzle: PuzzleUnion | null, t: (key: string) => string): DisplayTask {
    // Default empty state
    const defaultTask: DisplayTask = {
        header: { value: '?' },
        badges: [],
        stats: [],
        footerTags: []
    }

    if (!puzzle) return defaultTask

    // --- 1. Identify Puzzle Type ---
    // TORNADO
    if ('tactical_rating' in puzzle && 'themes' in puzzle && Array.isArray((puzzle as TornadoPuzzle).themes)) {
        return transformTornado(puzzle as TornadoPuzzle, t)
    }

    // THEORY
    if ('result' in puzzle && 'weak_side' in puzzle) {
        return transformTheory(puzzle as TheoryPuzzle, t)
    }

    // PRACTICAL
    if ('winner' in puzzle && 'category' in puzzle && !('weak_side' in puzzle)) {
        return transformPractical(puzzle as PracticalPuzzle, t)
    }

    // FINISH HIM
    if ('engm_rating' in puzzle || 'material_advantage' in puzzle) {
        return transformFinishHim(puzzle as FinishHimPuzzle, t)
    }

    // Legacy or unknown
    return transformLegacy(puzzle as GamePuzzle, t)
}

function transformTornado(puzzle: TornadoPuzzle, t: (key: string) => string): DisplayTask {
    const themes = puzzle.themes || []
    return {
        header: {
            value: puzzle.tactical_rating || '?',
            label: t('puzzleInfo.tacticalRating'),
            color: 'success',
            icon: 'trending-up'
        },
        badges: [
            { text: t('chess.tornado.auto'), type: 'primary' }
        ],
        stats: [],
        footerTags: themes
            .filter(theme => officialTornadoThemes.has(theme))
            .map(theme => t(`chess.tornado.${theme}`))
    }
}

function transformTheory(puzzle: TheoryPuzzle, t: (key: string) => string): DisplayTask {
    const resultKey = puzzle.result === 'win' ? 'win' : 'draw'

    return {
        header: {
            value: t(`chess.types.${resultKey}`),
            label: t('theoryEndings.selection.typeLabel'),
            color: puzzle.result === 'win' ? 'warning' : 'info',
            icon: 'flash'
        },
        badges: [
            { text: t(`chess.difficulties.${puzzle.difficulty}`), type: getDifficultyColor(puzzle.difficulty) },
            { text: t(`chess.endings.${puzzle.category}`), type: 'info' }
        ],
        stats: [
            { icon: 'pieces', value: puzzle.pieces_count, label: t('puzzleInfo.pieces') }
        ],
        footerTags: [
            t(`chess.types.${puzzle.weak_side}Endgame`)
        ].filter(Boolean)
    }
}

function transformPractical(puzzle: PracticalPuzzle, t: (key: string) => string): DisplayTask {
    const evalValue = puzzle.eval ? (puzzle.eval / 100).toFixed(1) : '?'

    return {
        header: {
            value: evalValue,
            label: t('puzzleInfo.evaluation'),
            color: 'info',
            icon: 'bar-chart'
        },
        badges: [
            { text: t(`chess.difficulties.${puzzle.difficulty}`), type: getDifficultyColor(puzzle.difficulty) },
            { text: t(`chess.endings.${puzzle.category}`), type: 'info' }
        ],
        stats: [
            { icon: 'pieces', value: puzzle.pieces_count, label: t('puzzleInfo.pieces') },
            { icon: 'material', value: puzzle.material_count, label: 'Mat.' }
        ],
        footerTags: []
    }
}

function transformFinishHim(puzzle: FinishHimPuzzle, t: (key: string) => string): DisplayTask {
    return {
        header: {
            value: puzzle.engm_rating || puzzle.tactical_rating || '?',
            label: t('tacktics.stats.rating'),
            color: 'success',
            icon: 'trending-up'
        },
        badges: [
            { text: t(`chess.difficulties.${puzzle.difficulty}`), type: getDifficultyColor(puzzle.difficulty) },
            { text: t(`chess.finishHim.category.${puzzle.category}`), type: 'primary' }
        ],
        stats: [
            { icon: 'pieces', value: puzzle.pieces_count, label: t('puzzleInfo.pieces') },
            { icon: 'advantage', value: `+${puzzle.material_advantage}`, label: t('chess.types.advantage') }
        ],
        footerTags: [
            puzzle.sub_category ? t(`chess.finishHim.subCategory.${puzzle.sub_category}`) : ''
        ].filter(Boolean)
    }
}

function transformLegacy(puzzle: GamePuzzle, t: (key: string) => string): DisplayTask {
    const headerVal = puzzle.Rating ?? puzzle.rating ?? puzzle.engmRating ?? '?'

    const badges: DisplayTaskBadge[] = []
    if (puzzle.difficulty || puzzle.difficulty_level) {
        const diff = puzzle.difficulty || puzzle.difficulty_level || ''
        badges.push({ text: diff, type: 'default' })
    }

    const themeStr = puzzle.Themes || puzzle.puzzle_theme || puzzle.EngmThemes_PG || ''
    const tags = themeStr.split(/[,\s]+/).filter(Boolean)

    return {
        header: {
            value: headerVal,
            label: t('openingTrainer.stats.avgRating'),
            icon: 'trending-up'
        },
        badges,
        stats: [],
        footerTags: tags // Legacy fallback remains as is, but might need t() later
    }
}

function getDifficultyColor(difficulty: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
    switch (difficulty) {
        case 'Novice': return 'success'
        case 'Pro': return 'warning'
        case 'Master': return 'error'
        default: return 'default'
    }
}
