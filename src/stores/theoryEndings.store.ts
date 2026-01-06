// src/stores/theoryEndings.store.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useGameStore } from './game.store'
import { useBoardStore, type GameEndOutcome } from './board.store'
import { webhookService } from '../services/WebhookService'
import type {
    TheoryEndingPuzzle,
    TheoryEndingType,
    TheoryEndingDifficulty,
    TheoryEndingCategory,
} from '../types/api.types'
import logger from '../utils/logger'
import { soundService } from '../services/sound.service'
import { useAuthStore } from './auth.store'
import { useRouter } from 'vue-router'
import { useUiStore } from './ui.store'
import i18n from '../services/i18n'
import { useAnalysisStore } from './analysis.store'

const t = i18n.global.t

export const useTheoryEndingsStore = defineStore('theoryEndings', () => {
    const gameStore = useGameStore()
    const boardStore = useBoardStore()
    const authStore = useAuthStore()
    const router = useRouter()
    const uiStore = useUiStore()
    const analysisStore = useAnalysisStore()

    const activePuzzle = ref<TheoryEndingPuzzle | null>(null)
    const activeType = ref<TheoryEndingType | null>(null)
    const activeDifficulty = ref<TheoryEndingDifficulty | null>(null)
    const activeCategory = ref<TheoryEndingCategory | null>(null)

    const feedbackMessage = ref(t('theoryEndings.feedback.pressNext'))
    const isProcessingGameOver = ref(false)

    function reset() {
        activePuzzle.value = null
        feedbackMessage.value = t('theoryEndings.feedback.pressNext')
        isProcessingGameOver.value = false
        logger.info('[TheoryEndingsStore] Local state has been reset.')
    }

    function setParams(type: TheoryEndingType, diff: TheoryEndingDifficulty, cat: TheoryEndingCategory) {
        activeType.value = type
        activeDifficulty.value = diff
        activeCategory.value = cat
    }

    function _checkWinCondition(outcome?: GameEndOutcome): boolean {
        if (!outcome) return false
        const humanColor = boardStore.orientation
        if (activeType.value === 'win') {
            return outcome.winner === humanColor && outcome.reason === 'checkmate'
        } else {
            // Draw mode: any draw (winner is undefined) or win for human is success
            return outcome.winner === humanColor || outcome.winner === undefined
        }
    }

    function _handleGameOver(isWin: boolean, outcome?: GameEndOutcome) {
        if (gameStore.gamePhase === 'GAMEOVER' || isProcessingGameOver.value) {
            return
        }
        isProcessingGameOver.value = true

        gameStore.setGamePhase('GAMEOVER')

        if (isWin) {
            soundService.playSound('game_user_won')
            feedbackMessage.value = activeType.value === 'win' ? t('theoryEndings.feedback.win') : t('theoryEndings.feedback.drawSuccess')
        } else {
            soundService.playSound('game_user_lost')
            const reason = outcome?.reason
            if (reason === 'resign') {
                feedbackMessage.value = t('finishHim.feedback.resigned')
            } else {
                feedbackMessage.value = t('finishHim.feedback.loss')
            }
        }

        _updateAndSendStats(isWin)
        logger.info(`[TheoryEndingsStore] Game Over. Result: ${isWin ? 'Success' : 'Failure'}`)

        analysisStore.showPanel()
    }

    async function _updateAndSendStats(isWin: boolean) {
        const user = authStore.userProfile
        const puzzle = activePuzzle.value

        if (!user || !puzzle) {
            logger.info('[TheoryEndingsStore] User not logged in or no active puzzle. Stats not sent.')
            return
        }

        try {
            const response = await webhookService.processTheoryResult({
                puzzleId: puzzle.id,
                wasCorrect: isWin,
            })
            if (response && response.UserStatsUpdate) {
                authStore.updateUserStats(response.UserStatsUpdate)
            } else {
                await authStore.checkSession()
            }
        } catch (error) {
            logger.error('[TheoryEndingsStore] Error sending Theory Endings stats:', error)
        }
    }

    async function loadNewPuzzle(puzzleId?: string) {
        isProcessingGameOver.value = false

        if (analysisStore.isPanelVisible) {
            await analysisStore.hidePanel()
        }

        gameStore.setGamePhase('LOADING')
        _clearGame() // If any

        try {
            let puzzle: TheoryEndingPuzzle | null = null

            if (puzzleId) {
                // We might want a fetchById although not strictly requested, it's good for restart
                // For now, if puzzleId is passed, we just use the current activePuzzle if its ID matches
                if (activePuzzle.value && activePuzzle.value.id === puzzleId) {
                    puzzle = activePuzzle.value
                } else {
                    // Ideally call fetchById, but for now we skip this or implement in WebhookService
                    // Let's assume we always have parameters if no puzzleId
                }
            }

            if (!puzzle) {
                if (!activeType.value || !activeDifficulty.value || !activeCategory.value) {
                    throw new Error('Params not selected for Theory Endings')
                }
                puzzle = await webhookService.fetchTheoryPuzzle(activeType.value, activeDifficulty.value, activeCategory.value)
            }

            if (!puzzle) throw new Error('Puzzle data is null')

            activePuzzle.value = puzzle

            // Determine human color
            let humanColor: 'white' | 'black'
            if (puzzle.type === 'win') {
                humanColor = 'white'
            } else {
                if (puzzle.weak_side === 'even') {
                    humanColor = Math.random() > 0.5 ? 'white' : 'black'
                } else {
                    humanColor = puzzle.weak_side as 'white' | 'black'
                }
            }

            gameStore.setupPuzzle(
                puzzle.fen,
                [], // No scenario moves
                _handleGameOver,
                _checkWinCondition,
                () => { }, // No timer start callback needed
                'theory',
                undefined,
                humanColor,
            )

            feedbackMessage.value = t('finishHim.feedback.yourTurn')
        } catch (error) {
            logger.error('[TheoryEndingsStore] Failed to load puzzle:', error)
            feedbackMessage.value = t('finishHim.feedback.loadFailed')
            gameStore.setGamePhase('IDLE')
        }
    }

    function _clearGame() {
        // any cleanup
    }

    async function handleResign() {
        if (gameStore.isGameActive) {
            const confirmed = await uiStore.showConfirmation(
                t('gameplay.confirmExit.title'),
                t('gameplay.confirmExit.message'),
            )
            if (confirmed) {
                gameStore.handleGameResignation()
            }
        }
    }

    async function handleRestart() {
        if (activePuzzle.value) {
            if (gameStore.isGameActive) {
                const confirmed = await uiStore.showConfirmation(
                    t('gameplay.confirmExit.title'),
                    t('gameplay.confirmExit.message'),
                )
                if (confirmed) {
                    gameStore.handleGameResignation()
                    await loadNewPuzzle(activePuzzle.value.id)
                }
            } else {
                await loadNewPuzzle(activePuzzle.value.id)
            }
        }
    }

    async function handleExit() {
        if (gameStore.isGameActive) {
            const confirmed = await uiStore.showConfirmation(
                t('gameplay.confirmExit.title'),
                t('gameplay.confirmExit.message'),
            )
            if (!confirmed) {
                return
            }
        }

        await gameStore.resetGame()
        router.push('/theory-endings')
    }

    return {
        gamePhase: computed(() => gameStore.gamePhase),
        activePuzzle,
        activeType,
        activeDifficulty,
        activeCategory,
        feedbackMessage,
        loadNewPuzzle,
        handleResign,
        handleRestart,
        handleExit,
        reset,
        setParams,
    }
})
