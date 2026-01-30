// src/stores/diamondHunter.store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useBoardStore } from './board.store'
import { useAnalysisStore } from './analysis.store'
import { useMozerBookStore } from './mozerBook.store'
import { type MozerBookMove } from '../services/OpeningApiService'
import { soundService } from '../services/sound.service'
import { checkDiamondLimit, recordDiamond } from '../db/DiamondDatabase'
import type { DrawShape } from '@lichess-org/chessground/draw'
import type { Key } from '@lichess-org/chessground/types'
import logger from '../utils/logger'

export type HunterState = 'IDLE' | 'HUNTING' | 'SOLVING' | 'REWARD' | 'FAILED'

export const useDiamondHunterStore = defineStore('diamondHunter', () => {
    const boardStore = useBoardStore()
    const analysisStore = useAnalysisStore()
    const mozerBookStore = useMozerBookStore()

    const state = ref<HunterState>('IDLE')
    const isActive = computed(() => state.value !== 'IDLE')
    const isSolving = computed(() => state.value === 'SOLVING')

    const currentDiamondHash = ref<string | null>(null)
    const message = ref<string>('')
    const isProcessing = ref(false)

    // Tracks the FEN of the position the user is currently trying to SOLVE.
    // This is updated after the bot plays a move (blunder or reply).
    const puzzleFen = ref<string>('')

    // Session Stats
    const sessionDiamonds = ref(0)
    const sessionBrilliants = ref(0)

    // Arrow Colors
    const ARROW_COLORS = ['green', 'blue', 'yellow']

    function startHunt() {
        logger.info('DiamondHunter: Starting hunt')
        state.value = 'HUNTING'
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
        // STRICT GUARD: No arrow updates if we are solving.
        if (state.value === 'SOLVING') return

        const playerColor = analysisStore.playerColor || 'white'

        // If not hunting or if it's NOT the player's turn, clear arrows
        if (state.value !== 'HUNTING' || boardStore.turn !== playerColor) {
            boardStore.setDrawableShapes([])
            return
        }

        const fen = boardStore.fen
        const stats = await mozerBookStore.getStatsForFen(fen)

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
        } 
        // STRICT RULE: If no trap moves, show NO arrows.

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
        // STRICT GUARD: No bot moves if solving (handled by botSolvingResponse)
        if (state.value !== 'HUNTING' || isProcessing.value) return
        isProcessing.value = true

        const fen = boardStore.fen
        const stats = await mozerBookStore.getStatsForFen(fen)

        if (!stats || !stats.moves || stats.moves.length === 0) {
            logger.info('DiamondHunter: No book moves left for bot in hunting phase')
            isProcessing.value = false
            return
        }

        // Priority 1: STRICT Blunder (??) - NAG 4
        const blunder = stats.moves.find((m: MozerBookMove) => m.nag === 4)
        // Priority 2: Only Move (Only) - NAG 7
        const onlyMove = stats.moves.find((m: MozerBookMove) => m.nag === 7)

        if (blunder) {
            logger.info('DiamondHunter: Bot blundered! Triggering solve phase', { uci: blunder.uci })
            await playBlunder(blunder)
        } else if (onlyMove) {
             logger.info('DiamondHunter: Bot playing forced move', { uci: onlyMove.uci })
             boardStore.applyUciMove(onlyMove.uci)
             setTimeout(() => updateArrows(), 200)
        } else {
            await playGiveaway(stats.moves)
        }

        isProcessing.value = false
    }

    async function playBlunder(move: MozerBookMove) {
        // 1. Trigger Diamond Context
        currentDiamondHash.value = boardStore.fen
        
        // 2. Make the move FIRST
        boardStore.applyUciMove(move.uci)
        
        // 3. CAPTURE THE PUZZLE STATE
        // The user now faces this position and must find the refutation.
        puzzleFen.value = boardStore.fen
        
        // 4. Set State to SOLVING
        state.value = 'SOLVING'
        message.value = 'Tactics available! Punishment time!'

        // 5. Visual Alert (Post-move)
        const dest = move.uci.substring(2, 4) as Key
        boardStore.setDrawableShapes([{
            orig: dest,
            brush: 'red',
            label: { text: '??', fill: '#D32F2F' }
        }])

        soundService.playSound('blunder')

        // 6. Clear the red mark after a delay
        setTimeout(() => {
             boardStore.setDrawableShapes([])
        }, 2000)
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

        // CRITICAL: Validate against puzzleFen (Pre-user-move state)
        const validationFen = puzzleFen.value
        logger.info('DiamondHunter: User solving move', { uci, validationFen })

        if (!validationFen) {
            logger.error('DiamondHunter: Puzzle FEN missing!')
            return
        }

        const stats = await mozerBookStore.getStatsForFen(validationFen)
        if (!stats?.moves) {
            logger.warn('DiamondHunter: No stats found for validation FEN')
            return
        }

        // Find the move the user actually played in the stats
        const playedMove = stats.moves.find(m => m.uci === uci)

        // Validation Rules:
        // 1. NAG 3 (!!) -> Correct, continue
        // 2. NAG 255 (!!!) -> Victory
        // Everything else -> Failure
        
        if (playedMove?.nag === 255) {
             logger.info('DiamondHunter: Victory reached (NAG 255)')
             // Move already applied by BoardStore interaction
             
             // Increment Stats
             sessionDiamonds.value++
             
             // Visual Feedback (Gold/Purple for Diamond)
             const orig = uci.substring(0, 2) as Key
             const dest = uci.substring(2, 4) as Key
             boardStore.setDrawableShapes([{
                 orig,
                 dest,
                 brush: 'purple', // Using purple/gold for victory
                 label: { text: '!!!', fill: '#9C27B0' } // Purple label
             }])
             
             await completeDiamond()
        } else if (playedMove?.nag === 3) {
             logger.info('DiamondHunter: Brilliant move (NAG 3), chain continues')
             // Move already applied by BoardStore interaction
             
             // Increment Stats
             sessionBrilliants.value++

             // Visual Feedback (Green for Brilliant)
             const orig = uci.substring(0, 2) as Key
             const dest = uci.substring(2, 4) as Key
             boardStore.setDrawableShapes([{
                 orig,
                 dest,
                 brush: 'green',
                 label: { text: '!!', fill: '#00C853' } // Green label
             }])
             
             setTimeout(() => botSolvingResponse(), 1000)
        } else {
             logger.warn('DiamondHunter: Incorrect refutation', {
                played: uci,
                playedNag: playedMove?.nag
             })
             message.value = "Incorrect refutation! The diamond is lost."
             state.value = 'FAILED'
             soundService.playSound('game_user_lost')
        }
    }

    async function botSolvingResponse() {
        if (state.value !== 'SOLVING') return

        const fen = boardStore.fen
        const stats = await mozerBookStore.getStatsForFen(fen)

        if (!stats || !stats.moves || stats.moves.length === 0) {
            logger.info('DiamondHunter: No more book moves in solving phase')
            return
        }

        // Priority 1: Blunder (??, NAG 4) - Chained Blunder
        // Priority 2: Only Move (NAG 7)
        // Priority 3: Top Move (Fallback)

        const blunder = stats.moves.find((m: MozerBookMove) => m.nag === 4)
        const forcedMove = stats.moves.find((m: MozerBookMove) => m.nag === 7) || stats.moves[0]

        if (blunder) {
            logger.info('DiamondHunter: Bot blunders again in chain!', { uci: blunder.uci })
            await playBlunder(blunder) 
            // playBlunder updates puzzleFen internally
        } else if (forcedMove) {
            logger.info('DiamondHunter: Bot responding in solving loop', { uci: forcedMove.uci, nag: forcedMove.nag })
            boardStore.applyUciMove(forcedMove.uci)
            
            // CRITICAL: Update puzzleFen to the NEW position after bot's reply
            // User must now solve THIS new position.
            puzzleFen.value = boardStore.fen
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
        sessionDiamonds,
        sessionBrilliants,
        startHunt,
        stopHunt,
        updateArrows,
        botMove,
        completeDiamond,
        handleUserSolvingMove
    }
})
