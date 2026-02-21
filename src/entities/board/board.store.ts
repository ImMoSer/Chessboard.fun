// src/stores/board.store.ts
import { useGameStore } from '@/entities/game/model/game.store'
import { pgnService, type PgnNode } from '@/shared/lib/pgn/PgnService'
import { soundService } from '@/shared/lib/sound/sound.service'
import logger from '@/utils/logger'
import type { DrawShape } from '@lichess-org/chessground/draw'
import type {
  Color as ChessgroundColor,
  Piece as ChessopsPiece,
  Dests,
  Key,
} from '@lichess-org/chessground/types'
import { Chess } from 'chessops/chess'
import { chessgroundDests } from 'chessops/compat'
import { makeFen, parseFen } from 'chessops/fen'
import { makeSan } from 'chessops/san'
import type {
  Color as ChessopsColor,
  Move as ChessopsMove,
  Outcome as ChessopsOutcome,
  Role as ChessopsRole,
} from 'chessops/types'
import { isNormal } from 'chessops/types'
import { makeUci, parseSquare, parseUci as parseUciMove } from 'chessops/util'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface GameEndOutcome {
  winner: ChessopsColor | undefined
  reason?: string
}

export interface PromotionState {
  orig: Key
  dest: Key
  color: ChessgroundColor
  onComplete: (role: ChessopsRole | null) => void
}

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export const useBoardStore = defineStore('board', () => {
  const gameStore = useGameStore()

  const fen = ref<string>(INITIAL_FEN)
  const chessPosition = ref(Chess.fromSetup(parseFen(fen.value).unwrap()).unwrap())

  const turn = computed(() => chessPosition.value.turn)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dests = computed<Dests>(() => chessgroundDests(chessPosition.value as any))
  const lastMove = ref<[Key, Key] | undefined>(undefined)
  const isCheck = computed(() => chessPosition.value.isCheck())
  const orientation = ref<ChessgroundColor>('white')
  const promotionState = ref<PromotionState | null>(null)
  const drawableShapes = ref<DrawShape[]>([])
  const isAnalysisModeActive = ref(false)

  function _updateBoardStateFromPgn() {
    const pgnFen = pgnService.getCurrentNavigatedFen()
    const setup = parseFen(pgnFen).unwrap()
    chessPosition.value = Chess.fromSetup(setup).unwrap()
    fen.value = makeFen(chessPosition.value.toSetup())
    const lastPgnMove = pgnService.getLastMove()
    if (lastPgnMove && lastPgnMove.uci) {
      lastMove.value = [lastPgnMove.uci.slice(0, 2) as Key, lastPgnMove.uci.slice(2, 4) as Key]
    } else {
      lastMove.value = undefined
    }
  }

  function syncBoardWithPgn() {
    _updateBoardStateFromPgn()
  }

  function setupPosition(newFen: string, newOrientation?: ChessgroundColor) {
    try {
      if (newOrientation) {
        orientation.value = newOrientation
      }
      pgnService.reset(newFen === 'start' ? INITIAL_FEN : newFen)
      _updateBoardStateFromPgn()
      soundService.playSound('board_load_position')
    } catch (e) {
      console.error('Invalid FEN provided:', newFen, e)
    }
  }

  function _playSoundsForMove(
    move: ChessopsMove,
    pieceOnDestBefore: ChessopsPiece | undefined,
  ): void {
    // Enable sounds for Study Mode (Analysis Mode)
    // if (isAnalysisModeActive.value) return

    const gameStatus = getGameStatus()

    if (isNormal(move) && move.promotion) {
      soundService.playSound('board_promote')
    }

    if (pieceOnDestBefore) {
      soundService.playSound('board_capture')
    } else {
      soundService.playSound('board_move')
    }

    if (gameStore.currentGameMode !== 'tornado') {
      if (gameStatus.isGameOver && gameStatus.outcome) {
        // ... (keep existing logic)
        switch (gameStatus.outcome.reason) {
          case 'checkmate':
            soundService.playSound('board_checkmate')
            break
          case 'stalemate':
            soundService.playSound('board_draw_stalemate')
            break
          case 'threefold_repetition':
            soundService.playSound('board_draw_repetition')
            break
          case 'fifty_move_rule':
            soundService.playSound('board_draw_fifty_moves')
            break
          case 'insufficient_material':
            soundService.playSound('board_draw_insufficient_material')
            break
        }
      } else if (gameStatus.isCheck) {
        // If it's currently the player's turn (gameStatus.turn === orientation),
        // it means the opponent (Bot) just moved and delivered check.
        if (gameStatus.turn === orientation.value) {
          soundService.playSound('board_bot_checks_player')
        } else {
          // Otherwise, the player just moved and delivered check to the Bot.
          soundService.playSound('board_check')
        }
      }
    }
  }

  function _applyUciMove(uci: string): boolean {
    logger.info(`[_applyUciMove] Attempting to apply UCI: ${uci}`)
    const move = parseUciMove(uci)
    if (!move || !chessPosition.value.isLegal(move)) {
      logger.error(`[_applyUciMove] Illegal move or parse error for UCI: ${uci}`)
      return false
    }

    const fenBefore = makeFen(chessPosition.value.toSetup())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const san = makeSan(chessPosition.value as any, move)
    const pieceOnDestBefore = isNormal(move) ? chessPosition.value.board.get(move.to) : undefined

    chessPosition.value.play(move)
    const fenAfter = makeFen(chessPosition.value.toSetup())
    fen.value = fenAfter

    if (isNormal(move)) {
      lastMove.value = [uci.slice(0, 2) as Key, uci.slice(2, 4) as Key]
    }

    logger.info(
      `[_applyUciMove] Move played. Adding to PGN. FenBefore: ${fenBefore}, FenAfter: ${fenAfter}`,
    )
    const node = pgnService.addNode({ san, uci, fenBefore, fenAfter })
    if (!node) {
      logger.error(`[_applyUciMove] Failed to add node to PGN tree.`)
      // Revert board? No, visual board is already updated mostly?
      // Actually, if we fail to add to tree, we should probably warn user.
    } else {
      logger.info(`[_applyUciMove] Node added successfully. ID: ${node.id}`)
    }

    _playSoundsForMove(move, pieceOnDestBefore)
    // Verify sync
    _updateBoardStateFromPgn()
    return true
  }

  function applyUciMove(uci: string) {
    _applyUciMove(uci)
  }

  async function handleUserMove({ orig, dest }: { orig: Key; dest: Key }): Promise<string | null> {
    const fromSq = parseSquare(orig)
    const toSq = parseSquare(dest)
    if (fromSq === undefined || toSq === undefined) return null

    const piece = chessPosition.value.board.get(fromSq)
    const isPromotion =
      piece?.role === 'pawn' &&
      ((piece.color === 'white' && dest.charAt(1) === '8') ||
        (piece.color === 'black' && dest.charAt(1) === '1'))

    if (isPromotion && piece) {
      return new Promise<string | null>((resolve) => {
        promotionState.value = {
          orig,
          dest,
          color: piece.color,
          onComplete: (role: ChessopsRole | null) => {
            promotionState.value = null
            if (role) {
              const uci = makeUci({ from: fromSq, to: toSq, promotion: role })
              _applyUciMove(uci)
              resolve(uci)
            } else {
              resolve(null)
            }
          },
        }
      })
    } else {
      const uci = makeUci({ from: fromSq, to: toSq })
      const success = _applyUciMove(uci)
      return success ? uci : null
    }
  }

  // ... (keep existing methods)

  async function handleAnalysisMove({
    orig,
    dest,
  }: {
    orig: Key
    dest: Key
  }): Promise<string | null> {
    logger.info(`[handleAnalysisMove] Request: ${orig}-${dest}`)
    const fromSq = parseSquare(orig)
    const toSq = parseSquare(dest)
    if (fromSq === undefined || toSq === undefined) return null

    const piece = chessPosition.value.board.get(fromSq)
    const isPromotion =
      piece?.role === 'pawn' &&
      ((piece.color === 'white' && dest.charAt(1) === '8') ||
        (piece.color === 'black' && dest.charAt(1) === '1'))

    if (isPromotion && piece) {
      return new Promise<string | null>((resolve) => {
        promotionState.value = {
          orig,
          dest,
          color: piece.color,
          onComplete: (role: ChessopsRole | null) => {
            promotionState.value = null
            if (role) {
              const uci = makeUci({ from: fromSq, to: toSq, promotion: role })
              _applyUciMove(uci)
              resolve(uci)
            } else {
              _updateBoardStateFromPgn()
              resolve(null)
            }
          },
        }
      })
    } else {
      const uci = makeUci({ from: fromSq, to: toSq })
      const move = parseUciMove(uci)

      // Check legality before applying.
      if (move && chessPosition.value.isLegal(move)) {
        logger.info(`[handleAnalysisMove] Move legal: ${uci}`)
        _applyUciMove(uci)
        return uci
      } else {
        logger.warn(`[handleAnalysisMove] Move illegal or invalid: ${uci}`)
        _updateBoardStateFromPgn() // Revert visual board to legally known state
        return null
      }
    }
  }

  function completePromotion(role: ChessopsRole) {
    if (promotionState.value) {
      promotionState.value.onComplete(role)
    }
  }

  function cancelPromotion() {
    if (promotionState.value) {
      promotionState.value.onComplete(null)
    }
  }

  function flipBoard() {
    orientation.value = orientation.value === 'white' ? 'black' : 'white'
  }

  function _getRepetitionFen(fen: string): string {
    return fen.split(' ').slice(0, 4).join(' ')
  }

  function getGameStatus() {
    const outcomeDetails: ChessopsOutcome | undefined = chessPosition.value.outcome()
    let isGameOver = !!outcomeDetails
    let gameEndOutcome: GameEndOutcome | undefined

    if (outcomeDetails) {
      let reason = 'draw'
      if (outcomeDetails.winner) {
        reason = chessPosition.value.isCheckmate() ? 'checkmate' : 'variant_win'
      } else {
        if (chessPosition.value.isStalemate()) reason = 'stalemate'
        else if (chessPosition.value.isInsufficientMaterial()) reason = 'insufficient_material'
        else if (chessPosition.value.halfmoves >= 100) reason = 'fifty_move_rule'
      }
      gameEndOutcome = { winner: outcomeDetails.winner, reason }
    }

    if (!isGameOver) {
      const fenHistory = pgnService.getFenHistoryForRepetition()
      const currentRepetitionFen = _getRepetitionFen(fen.value)
      const repetitionCount = fenHistory.filter(
        (historicFen) => _getRepetitionFen(historicFen) === currentRepetitionFen,
      ).length
      if (repetitionCount >= 3) {
        isGameOver = true
        gameEndOutcome = { winner: undefined, reason: 'threefold_repetition' }
        logger.info(`[BoardStore] Threefold repetition detected (count: ${repetitionCount}).`)
      }
    }

    return {
      isGameOver,
      outcome: gameEndOutcome,
      isCheck: chessPosition.value.isCheck(),
      turn: chessPosition.value.turn,
    }
  }

  function setDrawableShapes(shapes: DrawShape[]) {
    drawableShapes.value = shapes
  }

  function navigatePgn(
    move: 'start' | 'backward' | 'forward' | 'end',
    targetTurn?: ChessgroundColor | null,
  ) {
    // 1. Perform the primary move
    switch (move) {
      case 'start':
        pgnService.navigateToStart()
        break
      case 'backward':
        pgnService.navigateBackward()
        break
      case 'forward':
        pgnService.navigateForward()
        break
      case 'end':
        pgnService.navigateToEnd()
        break
    }
    _updateBoardStateFromPgn()

    // 2. Smart Navigation (Skip Bot Moves)
    // If targetTurn is set, and we are not at the very start/end (where jumping might not be possible),
    // and the resulting turn is NOT the target turn, we jump one more time.
    if (targetTurn && (move === 'backward' || move === 'forward')) {
      // Check current turn after the first move
      // Note: chessPosition.value.turn is the side to move
      if (turn.value !== targetTurn) {
        // We landed on Bot's turn. Skip it.
        if (move === 'backward') pgnService.navigateBackward()
        else pgnService.navigateForward()

        _updateBoardStateFromPgn()
      }
    }
  }

  function navigateToNode(node: PgnNode) {
    if (pgnService.navigateToNode(node)) {
      _updateBoardStateFromPgn()
    }
  }

  function setAnalysisMode(isActive: boolean) {
    isAnalysisModeActive.value = isActive
    logger.info(`[BoardStore] Analysis mode set to: ${isActive}`)
  }

  function resetBoardState() {
    pgnService.reset(INITIAL_FEN)
    _updateBoardStateFromPgn()

    orientation.value = 'white'
    promotionState.value = null
    drawableShapes.value = []
    isAnalysisModeActive.value = false

    logger.info('[BoardStore] Board state has been reset to initial.')
  }

  return {
    fen,
    turn,
    dests,
    lastMove,
    isCheck,
    orientation,
    promotionState,
    drawableShapes,
    isAnalysisModeActive,
    setupPosition,
    applyUciMove,
    handleUserMove,
    handleAnalysisMove,
    completePromotion,
    cancelPromotion,
    flipBoard,
    getGameStatus,
    setDrawableShapes,
    navigatePgn,
    navigateToNode,
    setAnalysisMode,
    resetBoardState,
    syncBoardWithPgn,
  }
})
