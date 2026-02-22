import { useBoardStore } from '@/entities/board'
import { useAnalysisStore } from '@/features/analysis'
import { diamondApiService, type GravityMove } from '@/features/diamond-hunter/api/DiamondApiService'
import { useDiamondHunterQueries } from '@/features/diamond-hunter/api/diamondHunter.queries'
import logger from '@/shared/lib/logger'
import { pgnService } from '@/shared/lib/pgn/PgnService'
import type { SoundEvent } from '@/shared/lib/sound/sound.service'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export type HunterState = 'IDLE' | 'HUNTING' | 'SOLVING' | 'REWARD' | 'FAILED' | 'SAVING'

export interface HunterHint {
    orig: string
    dest?: string
    type: 'arrow' | 'blunder' | 'victory' | 'correct' | 'expected'
    dist?: number
}

export const useDiamondHunterStore = defineStore('diamondHunter', () => {
    const boardStore = useBoardStore()
    const analysisStore = useAnalysisStore()

    const state = ref<HunterState>('IDLE')
    const isActive = computed(() => state.value !== 'IDLE')
    const isSolving = computed(() => state.value === 'SOLVING')

    const currentDiamondHash = ref<string | null>(null)
    const currentBlunderMove = ref<GravityMove | null>(null)
    const message = ref<string>('')
    const isProcessing = ref(false)
    const showTheoryEndModal = ref(false)

    // UI Hints state
    const hints = ref<HunterHint[]>([])
    const soundTrigger = ref<SoundEvent | null>(null)

    // Saving Mode State
    const savingPgn = ref<string | null>(null)
    const savingMoves = ref<string[]>([])
    const savingMoveIndex = ref(0)
    const savingPlayerColor = ref<'white' | 'black'>('white')
    const isReplayActive = ref(false)

    const {
        diamondsCountQuery,
        brilliantsCountQuery,
        recordBrilliantMutation,
        recordDiamondMutation,
        checkDiamondLimit,
        fetchGravityForFen: fetchGravityQuery,
    } = useDiamondHunterQueries()

    // Current Gravity Stats (To validate moves)
    const currentGravityStats = ref<{ moves: GravityMove[] } | null>(null)

    // Tracks the FEN of the position the user is currently trying to SOLVE.
    const puzzleFen = ref<string>('')

    // Stats
    const totalDiamonds = computed(() => diamondsCountQuery.data?.value ?? 0)
    const totalBrilliants = computed(() => brilliantsCountQuery.data?.value ?? 0)

    async function fetchGravityForFen(fen: string) {
        const playerColor = analysisStore.playerColor
        if (!playerColor) return null

        const response = await fetchGravityQuery(playerColor, fen)
        currentGravityStats.value = response
        return response
    }

    async function startHunt() {
        logger.info('DiamondHunter: Starting hunt')
        reset() // Ensure clean slate

        try {
            await diamondApiService.startSession()
        } catch (e: unknown) {
            const err = e as Error
            if (err.message === 'Insufficient FunCoins') {
                message.value = 'Insufficient FunCoins to start Diamond Hunter!'
                return
            }
            message.value = 'Failed to start Diamond Hunter session.'
            return
        }

        state.value = 'HUNTING'
        message.value = 'Hunt started! Follow the arrows...'

        // Kickstart the loop based on whose turn it is
        if (boardStore.turn === analysisStore.playerColor) {
            updateArrows()
        } else {
            botMove()
        }
    }

    function reset() {
        state.value = 'IDLE'
        hints.value = []
        soundTrigger.value = null
        message.value = ''
        currentGravityStats.value = null
        showTheoryEndModal.value = false
        currentDiamondHash.value = null
        currentBlunderMove.value = null
        isProcessing.value = false
        savingPgn.value = null
        savingMoves.value = []
        savingMoveIndex.value = 0
        isReplayActive.value = false
    }

    function stopHunt() {
        logger.info('DiamondHunter: Stopping hunt')
        reset()
    }

    // --- Hunt Phase Validation ---
    async function handleHuntMove(uci: string) {
        if (state.value !== 'HUNTING') return

        const playerColor = analysisStore.playerColor || 'white'
        // Only validate if it was the player's turn
        // (The bot's moves are already taken from gravity stats)
        if (boardStore.turn === playerColor) {
            // Wait, if handleHuntMove is called via callback, the move is ALREADY on the board.
            // So boardStore.turn has already switched to the bot.
            // We need to check the move AGAINST the gravity stats of the PREVIOUS position.
            // Fortunately, currentGravityStats is cached for the FEN before the move.
        }

        const stats = currentGravityStats.value
        const isValid = stats?.moves.some(m => m.uci === uci)

        if (!isValid) {
            logger.warn('DiamondHunter: User left theory during hunt. Undoing...', { uci })
            soundTrigger.value = 'game_tacktics_error'
            message.value = 'Stay in theory! Follow the arrows.'

            pgnService.undoLastMove()
            boardStore.syncBoardWithPgn()

            // Redraw arrows for the user
            await updateArrows()
        } else {
            // Valid move: update arrows will be triggered by the FEN watcher,
            // but we can also call it here for responsiveness if needed.
            // Actually, the bot will move next if it's bot's turn.
        }
    }

    // --- Arrow Logic (User Turn) ---
    async function updateArrows() {
        if (state.value === 'SOLVING' || state.value === 'SAVING') return

        const playerColor = analysisStore.playerColor || 'white'
        const fen = boardStore.fen

        if (state.value !== 'HUNTING' || boardStore.turn !== playerColor) {
            boardStore.setDrawableShapes([])
            return
        }

        const response = await fetchGravityForFen(fen)

        if (!response || !response.moves || response.moves.length === 0) {
            // If we are hunting but no moves are found, theory has ended
            if (state.value === 'HUNTING') {
                logger.info('DiamondHunter: Theory ended (User turn)')
                showTheoryEndModal.value = true
                state.value = 'IDLE' // Pause the hunt state so we don't loop
            }
            return
        }

        const sortedMoves = [...response.moves].sort((a, b) => b.weight - a.weight)
        const topMoves = sortedMoves.slice(0, 3)

        hints.value = topMoves.map((move) => ({
            orig: move.uci.substring(0, 2),
            dest: move.uci.substring(2, 4),
            type: 'arrow',
            dist: move.dist
        }))
    }

    // --- Bot Logic (System Turn) ---
    async function botMove() {
        if (state.value === 'SAVING') {
            // Saving/Replay mode is handled explicitly by handleSaveMove/startSaveRun
            // We do NOT want the generic board watcher to trigger moves here.
            return
        }

        if (state.value !== 'HUNTING' || isProcessing.value) return

        const playerColor = analysisStore.playerColor || 'white'
        // If it's player's turn, bot shouldn't move
        if (boardStore.turn === playerColor) return

        isProcessing.value = true
        const fen = boardStore.fen

        const response = await fetchGravityForFen(fen)

        if (!response || !response.moves || response.moves.length === 0) {
            logger.info('DiamondHunter: Theory ended (Bot turn)')
            showTheoryEndModal.value = true
            state.value = 'IDLE'
            isProcessing.value = false
            return
        }

        const candidates = [...response.moves]
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 5)

        let selectedMove: GravityMove | undefined = candidates[0]

        if (candidates.length > 0) {
            const totalWeight = candidates.reduce((sum, m) => sum + m.weight, 0)
            let randomValue = Math.random() * totalWeight

            for (const move of candidates) {
                randomValue -= move.weight
                if (randomValue <= 0) {
                    selectedMove = move
                    break
                }
            }
        }

        if (!selectedMove) {
            logger.warn('DiamondHunter: Failed to select move')
            isProcessing.value = false
            return
        }

        logger.info('DiamondHunter: Bot selected move', { uci: selectedMove.uci, nag: selectedMove.nag })

        if (selectedMove.nag === 4) {
            await playBlunder(selectedMove)
        } else {
            boardStore.applyUciMove(selectedMove.uci)
            // No explicit updateArrows() or setTimeout here.
            // The FEN change will trigger the watcher, which will call updateArrows() for the user.
        }

        isProcessing.value = false
    }

    async function playBlunder(move: GravityMove) {
        currentDiamondHash.value = boardStore.fen
        currentBlunderMove.value = move
        boardStore.applyUciMove(move.uci)

        // Tag the blunder node in PGN so we can find it later for replay truncation
        const blunderNode = pgnService.getCurrentNode()
        if (blunderNode) {
            pgnService.updateNode(blunderNode, { nag: 4 })
        }

        puzzleFen.value = boardStore.fen
        state.value = 'SOLVING'
        message.value = 'Tactics available! Punishment time!'

        const dest = move.uci.substring(2, 4)
        hints.value = [{ orig: dest, type: 'blunder' }]

        soundTrigger.value = 'blunder'

        setTimeout(() => {
            // Check if we are still solving to avoid clearing other shapes if state changed rapidly
            if (state.value === 'SOLVING') {
                hints.value = []
            }
        }, 2000)
    }

    // --- Solving Logic ---
    async function handleUserSolvingMove(uci: string) {
        if (state.value === 'SAVING') {
            await handleSaveMove(uci)
            return
        }

        if (state.value !== 'SOLVING') return

        const validationFen = puzzleFen.value
        if (!validationFen) return

        const response = await fetchGravityForFen(validationFen)
        const moveStats = response?.moves.find((m: GravityMove) => m.uci === uci)

        if (moveStats?.nag === 255) {
            logger.info('DiamondHunter: Victory (NAG 255)')
            // Increment happens in completeDiamond after DB write for accuracy,
            // but we can optimistic update or wait. Let's wait.

            const orig = uci.substring(0, 2)
            const dest = uci.substring(2, 4)
            hints.value = [{ orig, dest, type: 'victory' }]

            await completeDiamond()
        } else if (moveStats?.nag === 3) {
            logger.info('DiamondHunter: Brilliant (NAG 3)')

            // Record Brilliant
            if (currentDiamondHash.value) {
                recordBrilliantMutation.mutate({
                    hash: currentDiamondHash.value,
                    fen: boardStore.fen,
                    pgn: 'pgn-placeholder'
                })
            }

            const orig = uci.substring(0, 2)
            const dest = uci.substring(2, 4)
            hints.value = [{ orig, dest, type: 'correct' }]

            setTimeout(() => botSolvingResponse(), 1000)
        } else {
            logger.warn('DiamondHunter: Incorrect refutation, retrying...')
            message.value = "Incorrect! Try again..."
            soundTrigger.value = 'game_user_lost'

            if (currentDiamondHash.value && currentBlunderMove.value) {
                setTimeout(async () => {
                    if (state.value !== 'SOLVING') return // Guard in case user left

                    // Return to position before blunder by undoing moves (User's wrong move + Blunder)
                    // We loop safely until we hit the target FEN or run out of moves
                    let safetyCounter = 0
                    while (
                        boardStore.fen !== currentDiamondHash.value &&
                        safetyCounter < 5 // Should only be 2 moves deep usually
                    ) {
                        pgnService.undoLastMove()
                        boardStore.syncBoardWithPgn()
                        safetyCounter++
                    }

                    // Fallback if PGN navigation failed (shouldn't happen, but safe restart)
                    if (boardStore.fen !== currentDiamondHash.value) {
                        logger.warn('DiamondHunter: Could not navigate back to diamond hash via Undo. forcing setup (History lost).')
                        boardStore.setupPosition(currentDiamondHash.value!)
                    }

                    // Replay the blunder to restart the puzzle
                    // We can cast because we checked for null above, but safely:
                    if (currentBlunderMove.value) {
                        await playBlunder(currentBlunderMove.value)
                    }
                }, 1500)
            } else {
                state.value = 'FAILED'
            }
        }
    }

    async function botSolvingResponse() {
        if (state.value !== 'SOLVING') return

        const fen = boardStore.fen
        const response = await fetchGravityForFen(fen)

        if (!response || !response.moves || response.moves.length === 0) return

        const blunder = response.moves.find((m: GravityMove) => m.nag === 4)
        const forced = response.moves.find((m: GravityMove) => m.nag === 7) || response.moves[0]

        if (blunder) {
            await playBlunder(blunder)
        } else if (forced) {
            boardStore.applyUciMove(forced.uci)
            puzzleFen.value = boardStore.fen
        }
    }

    async function completeDiamond() {
        if (!currentDiamondHash.value) return

        if (isReplayActive.value) {
            // --- Phase 2: Replay Success (Diamond Secured) ---
            const allowed = await checkDiamondLimit(currentDiamondHash.value)
            if (allowed) {
                message.value = "Diamond Secured! 💎"
                soundTrigger.value = 'game_user_won'
                // Save the NEW PGN (which includes the full replay + solution)
                const finalPgn = pgnService.getCurrentPgnString()
                await recordDiamondMutation.mutateAsync({
                    hash: currentDiamondHash.value,
                    fen: boardStore.fen,
                    pgn: finalPgn
                })
            } else {
                message.value = "Limit reached, but great memory!"
            }
            // Reset replay state
            state.value = 'REWARD'
            isReplayActive.value = false
            savingMoves.value = []
            return
        }

        // --- Phase 1: First Find (Prepare for Replay) ---

        // Traverse up to find the Blunder (NAG 4) to define the replay path
        const node = pgnService.getCurrentNode()
        let blunderNodeFound = false

        // First, traverse back from victory to finding the blunder
        // We collect moves in reverse, then will slice or unshift
        const tempPath: string[] = []

        let curr = node
        while (curr && curr.parent) {
            tempPath.unshift(curr.uci)
            if (curr.nag === 4) {
                blunderNodeFound = true
                // We found the blunder. The replay should end HERE.
                // Discard any moves found *after* this (which are the solution moves we just played)
                // Since we unshift, the moves currently in tempPath are [Blunder, ...Solution]
                // We want savingMoves to be [Root...Blunder].
                // So we actually need to clear tempPath and start collecting from here upwards?
                // No, let's just grab the path from Root to This Node.
                break
            }
            curr = curr.parent
        }

        if (blunderNodeFound && curr) {
            // Rebuild path from Root to Blunder (curr)
            let tracer = curr
            const pathFromRoot: string[] = []
            while (tracer && tracer.parent) {
                pathFromRoot.unshift(tracer.uci)
                tracer = tracer.parent
            }
            savingMoves.value = pathFromRoot
            logger.info('DiamondHunter: Blunder found. Replay path set:', savingMoves.value)
        } else {
            // Fallback: If no blunder NAG found (shouldn't happen in standard logic),
            // just save the whole path? Or maybe the user didn't blunder?
            // Let's save the whole path for now as a fallback.
            const fullPath: string[] = []
            let n = pgnService.getCurrentNode()
            while (n && n.parent) {
                fullPath.unshift(n.uci)
                n = n.parent
            }
            savingMoves.value = fullPath
            logger.warn('DiamondHunter: No blunder (NAG 4) found. Replay path set to full game.')
        }

        // Store the PGN just in case, though we regenerate it on save
        savingPgn.value = pgnService.getCurrentPgnString()

        state.value = 'REWARD'
        message.value = "Diamond Found! 💎"
        soundTrigger.value = 'game_user_won'
    }

    // --- Saving Mode (Replay) Logic ---
    async function startSaveRun() {
        logger.info('DiamondHunter: Starting Save Run')
        state.value = 'SAVING'
        isReplayActive.value = true
        savingMoveIndex.value = 0
        savingPlayerColor.value = analysisStore.playerColor || 'white'

        // Reset Board to Start
        boardStore.setupPosition('start', savingPlayerColor.value)
        hints.value = []

        // If first move is bot's, play it
        if (savingPlayerColor.value === 'black' && savingMoves.value.length > 0) {
            setTimeout(() => botSaveMove(), 500)
        }
    }

    async function handleSaveMove(uci: string) {
        if (state.value !== 'SAVING') return

        const expectedMove = savingMoves.value[savingMoveIndex.value]

        if (!expectedMove) {
            logger.warn('DiamondHunter: No expected move found at index', savingMoveIndex.value)
            return
        }

        if (uci === expectedMove) {
            // Correct move
            savingMoveIndex.value++

            // Visual Feedback for correct move
            const orig = uci.substring(0, 2)
            const dest = uci.substring(2, 4)
            hints.value = [{ orig, dest, type: 'correct' }]

            // Check if finished (Users last move was the move BEFORE blunder?)
            // If the array ends with the Blunder (Bot move), then the Bot will play it next.
            // If the array ends with a User move (unlikely for "Blunder -> Puzzle" flow), we might be done.

            if (savingMoveIndex.value >= savingMoves.value.length) {
                // This implies the path ended on a User move.
                // Transition to Solving immediately.
                await transitionToSolving()
            } else {
                // Trigger bot move if it's bot's turn now
                setTimeout(() => botSaveMove(), 500)
            }
        } else {
            // Incorrect move
            soundTrigger.value = 'game_tacktics_error'
            pgnService.undoLastMove()
            boardStore.syncBoardWithPgn()

            // Show arrow for expected move
            const orig = expectedMove.substring(0, 2)
            const dest = expectedMove.substring(2, 4)
            hints.value = [{ orig, dest, type: 'expected' }]
        }
    }

    async function botSaveMove() {
        if (state.value !== 'SAVING') return
        if (savingMoveIndex.value >= savingMoves.value.length) return

        // Ensure it is bot's turn
        if (boardStore.turn === savingPlayerColor.value) return

        const move = savingMoves.value[savingMoveIndex.value]

        if (!move) {
            logger.warn('DiamondHunter: No bot move found at index', savingMoveIndex.value)
            return
        }

        boardStore.applyUciMove(move)
        savingMoveIndex.value++

        if (savingMoveIndex.value >= savingMoves.value.length) {
            // Bot just played the last move (The Blunder).
            // Time for the user to solve it again!
            await transitionToSolving()
        }
    }

    async function transitionToSolving() {
        state.value = 'SOLVING'
        message.value = "Punish the blunder again!"
        puzzleFen.value = boardStore.fen

        // Update context for retry logic (if user fails again)
        const lastNode = pgnService.getCurrentNode()
        if (lastNode && lastNode.parent) {
            currentDiamondHash.value = lastNode.fenBefore
            // We reconstruct a GravityMove-like object or use the stored one if available.
            // Ideally we kept the original move data, but for replay 'uci' is enough for playBlunder to work.
            // However, playBlunder expects GravityMove with nag/weight.
            // Let's mock it or retrieve it. Mocking is safer for now.
            currentBlunderMove.value = {
                uci: lastNode.uci,
                san: lastNode.san,
                nag: 4,
                weight: 0, // Irrelevant for replay
                dist: 0,
                rating: 0,
                nag_str: 'Blunder'
            }
        }

        // Highlight the blunder (last move played)
        const lastMove = boardStore.lastMove
        if (lastMove) {
            hints.value = [{ orig: lastMove[0], dest: lastMove[1], type: 'blunder' }]
        }
        soundTrigger.value = 'blunder'
    }

    function closeTheoryModal() {
        showTheoryEndModal.value = false
    }

    function clearSoundTrigger() {
        soundTrigger.value = null
    }

    // --- Reactivity ---
    watch(() => boardStore.fen, async () => {
        if (state.value === 'SAVING') {
            // Handled in specific functions
            return
        }

        if (state.value !== 'HUNTING') return

        const playerColor = analysisStore.playerColor || 'white'
        const isPlayerTurn = boardStore.turn === playerColor

        if (isPlayerTurn) {
            // User's turn: Update arrows
            await updateArrows()
        } else {
            // Bot's turn: Move
            // Add a small natural delay so the board doesn't move instantly
            if (!isProcessing.value) {
                setTimeout(() => botMove(), 500)
            }
        }
    })

    return {
        state,
        isActive,
        isSolving,
        message,
        totalDiamonds,
        totalBrilliants,
        currentGravityStats,
        hints,
        soundTrigger,
        clearSoundTrigger,
        savingPgn,
        savingMoves,
        startHunt,
        stopHunt,
        updateArrows,
        botMove,
        completeDiamond,
        handleUserSolvingMove,
        handleHuntMove,
        handleSaveMove, // Export for View/GameStore to call
        startSaveRun,
        fetchGravityForFen,
        showTheoryEndModal,
        closeTheoryModal,
        reset
    }
})
