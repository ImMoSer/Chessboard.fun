import { useFinishHimStore } from '@/features/finish-him'
import { usePracticalChessStore } from '@/features/practical-chess'
import { useTheoryEndingsStore } from '@/features/theory-endings'
import type {
    FinishHimTheme,
    PracticalChessCategory,
    TheoryEndingCategory,
    TheoryEndingType,
    TornadoMode
} from '@/shared/types/api.types'
import { useRouter } from 'vue-router'

export interface GameLaunchOptions {
    mode: 'theory' | 'finish_him' | 'practical' | 'tornado'
    theme: string
    difficulty?: string
    type?: 'win' | 'draw'
    subMode?: string // For tornado (bullet, blitz...) or finish_him (novice, pro...)
}

export function useGameLauncher() {
    const router = useRouter()
    const finishHimStore = useFinishHimStore()
    const theoryStore = useTheoryEndingsStore()
    const practicalStore = usePracticalChessStore()

    const launchGame = (options: GameLaunchOptions) => {
        const { mode, theme, difficulty, type, subMode } = options

        console.log('[GameLauncher] Launching:', options)

        const capitalizeDiff = (d?: string): 'Novice' | 'Pro' | 'Master' => {
            if (!d) return 'Novice'
            const lower = d.toLowerCase()
            if (lower === 'pro') return 'Pro'
            if (lower === 'master') return 'Master'
            return 'Novice'
        }

        // 1. FINISH HIM
        if (mode === 'finish_him') {
            const targetDiff = capitalizeDiff(subMode || difficulty)
            finishHimStore.setParams(theme as FinishHimTheme, targetDiff)
            router.push({ name: 'finish-him-play' })
            return
        }

        // 2. THEORY ENDINGS
        if (mode === 'theory') {
            const targetType = (type || 'win') as TheoryEndingType
            const targetDiff = capitalizeDiff(difficulty)

            theoryStore.setParams(
                targetType,
                targetDiff,
                theme as TheoryEndingCategory
            )

            router.push({
                name: 'theory-endings-play',
                params: { type: targetType },
            })
            return
        }

        // 3. PRACTICAL CHESS
        if (mode === 'practical') {
            const targetDiff = capitalizeDiff(difficulty)

            practicalStore.selectDifficulty(targetDiff)
            practicalStore.selectCategory(theme as PracticalChessCategory)

            router.push({ name: 'practical-chess-play' })
            return
        }

        // 4. TORNADO
        if (mode === 'tornado') {
            // mode in URL is 'bullet', 'blitz', 'rapid', 'classic'
            const targetMode = (subMode || 'blitz') as TornadoMode

            // We cannot force a theme in Tornado easily via URL yet (TornadoView logic might support it?)
            // If user wants to improve a specific theme in Tornado, we might need a specific route or query param?
            // Standard tornado route: /tornado/:mode
            // Let's check TornadoView to see if it accepts theme.
            // Current route: /tornado/:mode
            // If we want to support theme filtering in Tornado, we might need to add it to store before pushing.

            // For now, launch the mode.
            // Optionally logic: "Tornado Theme Improvement" might actually imply going to
            // Finish Him or Theory for that theme if it's a specific ending?
            // But user said: "прямо из кабинета можно сразу вызвать и запустить определенный режим игры"
            // If it's "Tornado", they probably expect Tornado game.

            router.push({
                name: 'tornado',
                params: { mode: targetMode },
                query: theme ? { theme } : {}
            })
            return
        }

        console.warn('[GameLauncher] Unknown mode:', mode)
    }

    return {
        launchGame
    }
}
