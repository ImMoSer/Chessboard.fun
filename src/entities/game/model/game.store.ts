// src/stores/game.store.ts
import { useBoardStore, type GameEndOutcome } from '@/entities/game'
import logger from '@/shared/lib/logger'
import { pgnService } from '@/shared/lib/pgn/PgnService'
import { soundService } from '@/shared/lib/sound/sound.service'
import type { EngineId } from '@/shared/types/api.types'
import type { Color as ChessgroundColor, Key } from '@lichess-org/chessground/types'
import { parseFen } from 'chessops/fen'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { gameplayService } from '../lib/GameplayService'

export type GamePhase = 'IDLE' | 'LOADING' | 'PLAYING' | 'GAMEOVER'
export type GameMode =
  | 'finish-him'
  | 'tornado'
  | 'sandbox'
  | 'opening-trainer'
  | 'theory'
  | 'practical-chess'
  | null

const BOT_MOVE_DELAY_MS = 50
const FIRST_BOT_MOVE_DELAY_MS = 500
const noop = () => { }

export const useGameStore = defineStore('game', () => {
  const gamePhase = ref<GamePhase>('IDLE')
  const scenarioMoves = ref<string[]>([])
  const currentScenarioMoveIndex = ref(0)
  const currentGameMode = ref<GameMode>(null)

  const userMovesCount = ref(0)
  const isGameActive = ref(false)
  const shouldAutoPlayBot = ref(true)
  const botEngineId = ref<EngineId>('MOZER_2000')

  const boardStore = useBoardStore()
  let onGameOverCallback: (isWin: boolean, outcome?: GameEndOutcome) => void = noop
  let checkWinCondition: (outcome?: GameEndOutcome) => boolean = () => false
  let onPlayoutStartCallback: () => void = noop
  let onCorrectFirstMoveCallback: () => void = noop
  let onUserMoveCallback: (uci: string) => void = noop
  let onBotMoveCallback: (uci: string) => void = noop

  function _checkAndHandleGameOver(): boolean {
    if (gamePhase.value !== 'PLAYING') {
      return true
    }

    const gameStatus = boardStore.getGameStatus()
    if (gameStatus.isGameOver) {
      isGameActive.value = false
      onGameOverCallback(checkWinCondition(gameStatus.outcome), gameStatus.outcome)
      return true
    }
    return false
  }

  function handleGameResignation() {
    if (gamePhase.value !== 'PLAYING') return
    logger.warn('[GameStore] Game resigned by user action.')
    onGameOverCallback(false, { winner: undefined, reason: 'resign' })
  }

  async function _triggerBotMove() {
    const isScenarioActive = currentScenarioMoveIndex.value < scenarioMoves.value.length
    let botMoveUci: string | null = null

    if (isScenarioActive) {
      botMoveUci = scenarioMoves.value[currentScenarioMoveIndex.value] ?? null
      currentScenarioMoveIndex.value++
    } else {
      try {
        if (currentScenarioMoveIndex.value === scenarioMoves.value.length) {
          if (currentGameMode.value !== 'tornado') {
            soundService.playSound('game_play_out_start')
            onPlayoutStartCallback()
          }
          currentScenarioMoveIndex.value++
        }
        botMoveUci = await gameplayService.getBestMove(botEngineId.value, boardStore.fen)
      } catch (error) {
        logger.error('[GameStore] Error getting move from gameplayService:', error)
        isGameActive.value = false
        onGameOverCallback(false)
        return
      }
    }

    const delay = userMovesCount.value === 0 ? FIRST_BOT_MOVE_DELAY_MS : BOT_MOVE_DELAY_MS
    await new Promise((resolve) => setTimeout(resolve, delay))

    if (gamePhase.value !== 'PLAYING' || !botMoveUci) return

    boardStore.applyUciMove(botMoveUci)
    onBotMoveCallback(botMoveUci)

    _checkAndHandleGameOver()
  }

  function setupPuzzle(
    fen: string,
    moves: string[],
    onGameOver: (isWin: boolean, outcome?: GameEndOutcome) => void,
    winCondition: (outcome?: GameEndOutcome) => boolean,
    onPlayoutStart: () => void,
    mode: GameMode = null,
    onCorrectFirstMove?: () => void,
    userColor?: ChessgroundColor,
    onUserMove?: (uci: string) => void,
    onBotMove?: (uci: string) => void,
    autoPlayBot: boolean = true,
    keepPgn: boolean = false,
  ) {
    try {
      const setup = parseFen(fen).unwrap()
      let humanPlayerColor: ChessgroundColor

      if (userColor) {
        humanPlayerColor = userColor
      } else if (mode === 'sandbox' || mode === 'opening-trainer' || mode === 'theory') {
        humanPlayerColor = setup.turn
      } else {
        const botTurnColor = setup.turn
        humanPlayerColor = botTurnColor === 'white' ? 'black' : 'white'
      }

      if (!keepPgn) {
        boardStore.setupPosition(fen, humanPlayerColor)
      } else {
        boardStore.orientation = humanPlayerColor
      }

      scenarioMoves.value = moves
      currentScenarioMoveIndex.value = 0
      onGameOverCallback = onGameOver
      checkWinCondition = winCondition
      onPlayoutStartCallback = onPlayoutStart
      onCorrectFirstMoveCallback = onCorrectFirstMove ?? noop
      onUserMoveCallback = onUserMove ?? noop
      onBotMoveCallback = onBotMove ?? noop
      currentGameMode.value = mode
      shouldAutoPlayBot.value = autoPlayBot

      userMovesCount.value = 0
      isGameActive.value = false
      gamePhase.value = 'PLAYING'

      if (setup.turn !== humanPlayerColor && shouldAutoPlayBot.value) {
        _triggerBotMove()
      }
    } catch (error) {
      logger.error('[GameStore] Invalid FEN provided for setup:', fen, error)
      gamePhase.value = 'IDLE'
    }
  }

  function startSandboxGame(rawFen: string, userColor?: ChessgroundColor) {
    const fen = rawFen.replace(/_/g, ' ')

    parseFen(fen).unwrap() // throws if invalid FEN

    const onGameOver = (isWin: boolean, outcome?: GameEndOutcome) => {
      logger.info(`[Sandbox] Game over. Win: ${isWin}, Outcome: ${outcome?.reason}`)
      setGamePhase('GAMEOVER')
      const pgn = pgnService.getCurrentPgnString({ showResult: true })
      logger.info(`[Sandbox] Final PGN: ${pgn}`)
    }

    const winCondition = (outcome?: GameEndOutcome) => {
      return outcome?.winner === boardStore.orientation
    }

    setupPuzzle(fen, [], onGameOver, winCondition, noop, 'sandbox', undefined, userColor)
  }

  async function handleUserMove(orig: Key, dest: Key) {
    const uciMove = await boardStore.handleUserMove({ orig, dest })

    if (!uciMove) {
      return
    }

    if (userMovesCount.value === 0) {
      isGameActive.value = true
    }
    userMovesCount.value++

    const isGameOver = _checkAndHandleGameOver()

    if (currentGameMode.value === 'opening-trainer') {
      onUserMoveCallback(uciMove)
      if (isGameOver) return
    }

    if (isGameOver) {
      return
    }

    const isScenarioActive = currentScenarioMoveIndex.value < scenarioMoves.value.length

    if (isScenarioActive) {
      const expectedMove = scenarioMoves.value[currentScenarioMoveIndex.value]
      if (uciMove === expectedMove) {
        if (userMovesCount.value === 1 && currentGameMode.value === 'tornado') {
          onCorrectFirstMoveCallback()
        }
        currentScenarioMoveIndex.value++
        const isPuzzleComplete = currentScenarioMoveIndex.value >= scenarioMoves.value.length
        if (isPuzzleComplete && currentGameMode.value === 'tornado') {
          onGameOverCallback(true)
          return
        }
      } else {
        currentScenarioMoveIndex.value = scenarioMoves.value.length
        if (currentGameMode.value === 'tornado') {
          onGameOverCallback(false, { winner: undefined, reason: 'wrong_move' })
          return
        }
      }
    }

    const isBotTurn = boardStore.turn !== boardStore.orientation
    if (isBotTurn && shouldAutoPlayBot.value) {
      await _triggerBotMove()
    }
  }

  function setGamePhase(phase: GamePhase) {
    gamePhase.value = phase
    if (phase === 'GAMEOVER' || phase === 'IDLE') {
      isGameActive.value = false
    }
  }

  function setBotEngineId(id: EngineId) {
    botEngineId.value = id
  }

  async function resetGame() {
    boardStore.resetBoardState()

    gamePhase.value = 'IDLE'
    scenarioMoves.value = []
    currentScenarioMoveIndex.value = 0
    currentGameMode.value = null
    userMovesCount.value = 0
    isGameActive.value = false

    onGameOverCallback = noop
    checkWinCondition = () => false
    onPlayoutStartCallback = noop
    onCorrectFirstMoveCallback = noop
    onUserMoveCallback = noop
    onBotMoveCallback = noop

    logger.info('[GameStore] Full game state has been reset.')
  }

  return {
    gamePhase,
    isGameActive,
    currentGameMode,
    setupPuzzle,
    startSandboxGame,
    handleUserMove,
    setGamePhase,
    handleGameResignation,
    resetGame,
    userMovesCount,
    shouldAutoPlayBot,
    setBotEngineId,
  }
})
