// src/stores/board.store.ts
import { ref, computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { Chess } from 'chessops/chess'
import { parseFen, makeFen } from 'chessops/fen'
import { makeSan } from 'chessops/san'
import { parseSquare, makeUci, parseUci as parseUciMove } from 'chessops/util'
import { chessgroundDests } from 'chessops/compat'
import { isNormal } from 'chessops/types'
import type { Api } from 'chessground/api'
import type { Key, Dests, Color as ChessgroundColor, Piece as ChessopsPiece } from 'chessground/types'
import type {
  Role as ChessopsRole,
  Color as ChessopsColor,
  Outcome as ChessopsOutcome,
  Move as ChessopsMove,
} from 'chessops/types'
import { pgnService, type PgnNode } from '../services/PgnService'
import logger from '../utils/logger'
import { soundService } from '../services/sound.service'
import type { DrawShape } from 'chessground/draw'
import { useGameStore } from './game.store'

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
  const groundApi = shallowRef<Api | null>(null)
  const gameStore = useGameStore()

  function setGroundApi(api: Api | null) {
    groundApi.value = api
  }

  function playPremove() {
    groundApi.value?.playPremove()
  }

  const fen = ref<string>(INITIAL_FEN)
  const chessPosition = ref(Chess.fromSetup(parseFen(fen.value).unwrap()).unwrap())

  const turn = computed(() => chessPosition.value.turn)
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
    turnBeforeMove: ChessopsColor,
  ): void {
    if (isAnalysisModeActive.value) return

    const gameStatus = getGameStatus()
    const wasPlayerTurn = turnBeforeMove === orientation.value

    if (isNormal(move) && move.promotion) {
      soundService.playSound('board_promote')
    }

    if (pieceOnDestBefore) {
      soundService.playSound('board_capture')
    } else {
      soundService.playSound('board_move')
    }

    if (gameStore.currentGameMode !== 'tacktics') {
      if (gameStatus.isGameOver && gameStatus.outcome) {
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
      } else if (gameStatus.isCheck && !wasPlayerTurn) {
        soundService.playSound('board_bot_checks_player')
      }
    }
  }

  function _applyUciMove(uci: string): boolean {
    const move = parseUciMove(uci)
    if (!move || !chessPosition.value.isLegal(move)) {
      return false
    }

    const fenBefore = makeFen(chessPosition.value.toSetup())
    const san = makeSan(chessPosition.value as any, move)
    const pieceOnDestBefore = isNormal(move) ? chessPosition.value.board.get(move.to) : undefined
    const turnBeforeMove = chessPosition.value.turn

    chessPosition.value.play(move)
    const fenAfter = makeFen(chessPosition.value.toSetup())
    fen.value = fenAfter

    if (isNormal(move)) {
      lastMove.value = [uci.slice(0, 2) as Key, uci.slice(2, 4) as Key]
    }

    pgnService.addNode({ san, uci, fenBefore, fenAfter })
    _playSoundsForMove(move, pieceOnDestBefore, turnBeforeMove)
    _updateBoardStateFromPgn()
    return true
  }

  function applyUciMove(uci: string) {
    _applyUciMove(uci)
  }

  async function handleUserMove({
    orig,
    dest,
  }: {
    orig: Key
    dest: Key
  }): Promise<string | null> {
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

  async function handleAnalysisMove({
    orig,
    dest,
  }: {
    orig: Key
    dest: Key
  }): Promise<string | null> {
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
      if (move && chessPosition.value.isLegal(move)) {
        _applyUciMove(uci)
        return uci
      } else {
        _updateBoardStateFromPgn()
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
      let repetitionCount = fenHistory.filter(
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

  function navigatePgn(move: 'start' | 'backward' | 'forward' | 'end') {
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

    // --- <<< НАЧАЛО ИЗМЕНЕНИЙ: Исправлена ошибка TypeScript >>> ---
    groundApi.value?.set({
      fen: INITIAL_FEN,
      orientation: 'white',
      turnColor: 'white',
      lastMove: undefined,
      check: false,
      drawable: {
        shapes: [],
      },
      movable: {
        dests: chessgroundDests(chessPosition.value as any), // 'dests' теперь внутри 'movable'
        free: false,
        color: 'white',
      },
    })
    // --- <<< КОНЕЦ ИЗМЕНЕНИЙ >>> ---

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
    setGroundApi,
    playPremove,
    resetBoardState,
  }
})
