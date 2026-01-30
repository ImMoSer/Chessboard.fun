// src/stores/diamondHunter.store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useBoardStore } from './board.store'
import { useAnalysisStore } from './analysis.store'
import { openingApiService, type MozerBookMove } from '../services/OpeningApiService'
import { soundService } from '../services/sound.service'
import { checkDiamondLimit, recordDiamond } from '../db/DiamondDatabase'
import type { DrawShape } from '@lichess-org/chessground/draw'
import type { Key } from '@lichess-org/chessground/types'
import logger from '../utils/logger'

export type HunterState = 'IDLE' | 'HUNTING' | 'SOLVING' | 'REWARD'

export const useDiamondHunterStore = defineStore('diamondHunter', () => {
    const boardStore = useBoardStore()
    const analysisStore = useAnalysisStore()

    const state = ref<HunterState>('IDLE')
    const isActive = computed(() => state.value !== 'IDLE')
    const isSolving = computed(() => state.value === 'SOLVING')

    const currentDiamondHash = ref<string | null>(null)
    const message = ref<string>('')
    const isProcessing = ref(false)

    // Crucial: Track the FEN of the position the user is currently seeing.
    // Validation must happen against the stats of this FEN, not the one after applying move.
    const lastValidFen = ref<string>('')

    // Arrow Colors
    const ARROW_COLORS = ['green', 'blue', 'yellow']

    function startHunt() {
        logger.info('DiamondHunter: Starting hunt')
        state.value = 'HUNTING'
        lastValidFen.value = boardStore.fen
        message.value = 'Hunt started! Follow the arrows...'
        updateArrows()
    }

    function stopHunt() {
        logger.info('DiamondHunter: Stopping hunt')
        state.value = 'IDLE'
        boardStore.setDrawableShapes([])
        message.value = ''
    }

    // --- Arrow Logic (User Turn) ---
    async function updateArrows() {
        const playerColor = analysisStore.playerColor || 'white'

        // If not hunting or if it's NOT the player's turn, clear arrows
        if (state.value !== 'HUNTING' || boardStore.turn !== playerColor) {
            boardStore.setDrawableShapes([])
            return
        }

        const fen = boardStore.fen
        lastValidFen.value = fen // Remember this position for user's next move

        const stats = await openingApiService.getMozerBookStats(fen)

        if (!stats || !stats.moves) return

        const userColor = playerColor

        // Filter out BAD moves from advice/arrows
        // - Exclude: ? (2), ?? (4), ?! (6)
        // - Diamond Hunter Rule: Only show moves with ACTUAL trap potential (wt/bt > 0)
        const trapMoves = stats.moves.filter(m => {
            const nag = m.nag || 0
            if (nag === 2 || nag === 4 || nag === 6) return false

            const trapValue = userColor === 'white' ? (m.wt || 0) : (m.bt || 0)
            return trapValue > 0
        })

        let finalMoves: MozerBookMove[] = []

        if (trapMoves.length > 0) {
            // Sort by Trap Potential Descending
            finalMoves = [...trapMoves].sort((a: MozerBookMove, b: MozerBookMove) => {
                const trapA = userColor === 'white' ? (a.wt || 0) : (a.bt || 0)
                const trapB = userColor === 'white' ? (b.wt || 0) : (b.bt || 0)
                return trapB - trapA
            }).slice(0, 3)
        } else {
            // Fallback: If no traps exist, show ONLY the top move (if not a blunder)
            const topMove = stats.moves[0]
            if (topMove && topMove.nag !== 2 && topMove.nag !== 4 && topMove.nag !== 6) {
                finalMoves = [topMove]
            }
        }

        const shapes: DrawShape[] = finalMoves.map((move: MozerBookMove, index: number) => {
            return {
                orig: move.uci.substring(0, 2) as Key,
                dest: move.uci.substring(2, 4) as Key,
                brush: ARROW_COLORS[index],
            }
        })

        boardStore.setDrawableShapes(shapes)
    }

    // --- Bot Logic (System Turn) ---
    async function botMove() {
        if (state.value !== 'HUNTING' || isProcessing.value) return
        isProcessing.value = true

        const fen = boardStore.fen
        lastValidFen.value = fen // Remember this for user's next turn if bot plays a regular move

        const stats = await openingApiService.getMozerBookStats(fen)

        if (!stats || !stats.moves || stats.moves.length === 0) {
            logger.info('DiamondHunter: No book moves left for bot in hunting phase')
            isProcessing.value = false
            return
        }

        // Priority 1: STRICT Blunder only (??) - NAG 4
        // If the bot sees a blunder, it plays it and switches mode.
        const blunder = stats.moves.find((m: MozerBookMove) => m.nag === 4)

        if (blunder) {
            logger.info('DiamondHunter: Bot blundered! Triggering solve phase', { uci: blunder.uci })
            await playBlunder(blunder)
        } else {
            await playGiveaway(stats.moves)
        }

        isProcessing.value = false
    }

    async function playBlunder(move: MozerBookMove) {
        // Trigger Diamond!
        currentDiamondHash.value = boardStore.fen

        // Visual Alert: Red '??'
        const dest = move.uci.substring(2, 4) as Key
        boardStore.setDrawableShapes([{
            orig: dest,
            brush: 'red',
            label: { text: '??', fill: '#D32F2F' }
        }])

        soundService.playSound('blunder')

        await new Promise(r => setTimeout(r, 2000)) // Wait for user to see

        boardStore.applyUciMove(move.uci)
        state.value = 'SOLVING' // Switch mode
        boardStore.setDrawableShapes([]) // Clear arrows
        message.value = 'Tactics available! Punishment time!'
    }

    async function playGiveaway(moves: MozerBookMove[]) {
        const playerColor = analysisStore.playerColor || 'white'
        const userColor = playerColor

        // Bot plays move that MAXIMIZES user's trap potential (Giveaway)
        const sorted = [...moves].sort((a: MozerBookMove, b: MozerBookMove) => {
            const trapA = userColor === 'white' ? (a.wt || 0) : (a.bt || 0)
            const trapB = userColor === 'white' ? (b.wt || 0) : (b.bt || 0)
            return trapB - trapA
        })

        const selected = sorted[0]
        if (selected) {
             boardStore.applyUciMove(selected.uci)
        }

        // After move, update user arrows
        setTimeout(() => updateArrows(), 200)
    }

    // --- Solving Logic ---
    async function handleUserSolvingMove(uci: string) {
        if (state.value !== 'SOLVING') return

        const validationFen = lastValidFen.value || boardStore.fen
        logger.info('DiamondHunter: User solving move', { uci, validationFen })

        const stats = await openingApiService.getMozerBookStats(validationFen)
        if (!stats?.moves) {
            logger.warn('DiamondHunter: No stats found for validation FEN')
            return
        }

        // Find the move the user actually played in the ORIGINAL position's stats
        const playedMove = stats.moves.find(m => m.uci === uci)
        const bestMove = stats.moves[0]

        // Validation logic: Best move, or marked as good/brilliant/forced
        const isCorrect = (playedMove && bestMove && playedMove.uci === bestMove.uci) ||
                          (playedMove?.nag === 3) ||
                          (playedMove?.nag === 1) ||
                          (playedMove?.nag === 7) ||
                          (playedMove?.nag === 5) ||
                          (playedMove?.nag === 255)

        if (isCorrect && playedMove) {
             logger.info('DiamondHunter: Move accepted as correct', { nag: playedMove.nag })
             boardStore.applyUciMove(uci)

             if (playedMove.nag === 255) {
                 logger.info('DiamondHunter: Victory reached (NAG 255)')
                 await completeDiamond()
             } else {
                 logger.info('DiamondHunter: Chain continues, calling bot reply')
                 setTimeout(() => botSolvingResponse(), 400)
             }
        } else {
             logger.warn('DiamondHunter: Incorrect move', {
                played: uci,
                playedNag: playedMove?.nag,
                expected: bestMove?.uci
             })
             message.value = "Incorrect refutation! The diamond is lost."
             state.value = 'IDLE'
             soundService.playSound('game_user_lost')
              setTimeout(() => {
                 stopHunt()
             }, 3000)
        }
    }

    async function botSolvingResponse() {
        if (state.value !== 'SOLVING') return

        const fen = boardStore.fen
        lastValidFen.value = fen // Remember this for the user's next punishment move

        const stats = await openingApiService.getMozerBookStats(fen)

        if (!stats || !stats.moves || stats.moves.length === 0) {
            logger.info('DiamondHunter: No more book moves, declaring victory')
            await completeDiamond()
            return
        }

        // System answers with "only move" (NAG 7) or best move available
        const forcedMove = stats.moves.find(m => m.nag === 7) || stats.moves[0]

        if (forcedMove) {
            logger.info('DiamondHunter: Bot responding in solving loop', { uci: forcedMove.uci, nag: forcedMove.nag })
            boardStore.applyUciMove(forcedMove.uci)
        }
    }

    async function completeDiamond() {
        if (!currentDiamondHash.value) return

        state.value = 'REWARD'
        const allowed = await checkDiamondLimit(currentDiamondHash.value)

        if (allowed) {
            message.value = "Diamond Collected! 💎"
            soundService.playSound('game_user_won')
            await recordDiamond(currentDiamondHash.value, boardStore.fen, 'pgn-placeholder')
        } else {
             message.value = "Limit reached for this diamond today. Good job though!"
        }
    }

    return {
        state,
        isActive,
        isSolving,
        message,
        startHunt,
        stopHunt,
        updateArrows,
        botMove,
        completeDiamond,
        handleUserSolvingMove
    }
})
