// src/stores/game.store.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useBoardStore, type GameEndOutcome } from './board.store'
import { useAnalysisStore } from './analysis.store'
import { gameplayService } from '../services/GameplayService'
import type { Key, Color as ChessgroundColor } from 'chessground/types'
import { parseFen } from 'chessops/fen'
import logger from '../utils/logger'
import { useControlsStore } from './controls.store'
import { soundService } from '../services/sound.service'

export type GamePhase = 'IDLE' | 'LOADING' | 'PLAYING' | 'GAMEOVER'
export type GameMode = 'finish-him' | 'attack' | 'tower' | 'tornado' | 'advantage' | null

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

  const boardStore = useBoardStore()
  const controlsStore = useControlsStore()
  const analysisStore = useAnalysisStore()

  let onGameOverCallback: (isWin: boolean, outcome?: GameEndOutcome) => void = noop
  let checkWinCondition: (outcome?: GameEndOutcome) => boolean = () => false
  let onPlayoutStartCallback: () => void = noop
  let onCorrectFirstMoveCallback: () => void = noop

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
        const selectedEngine = controlsStore.selectedEngine
        botMoveUci = await gameplayService.getBestMove(selectedEngine, boardStore.fen)
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

    setTimeout(() => {
      boardStore.playPremove()
    }, 0)

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
  ) {
    try {
      const setup = parseFen(fen).unwrap()
      const botTurnColor = setup.turn
      const humanPlayerColor: ChessgroundColor = botTurnColor === 'white' ? 'black' : 'white'

      boardStore.setupPosition(fen, humanPlayerColor)

      scenarioMoves.value = moves
      currentScenarioMoveIndex.value = 0
      onGameOverCallback = onGameOver
      checkWinCondition = winCondition
      onPlayoutStartCallback = onPlayoutStart
      onCorrectFirstMoveCallback = onCorrectFirstMove ?? noop
      currentGameMode.value = mode

      userMovesCount.value = 0
      isGameActive.value = false
      gamePhase.value = 'PLAYING'

      if (scenarioMoves.value.length > 0) {
        _triggerBotMove()
      }
    } catch (e) {
      logger.error('[GameStore] Invalid FEN provided for setup:', fen, e)
      gamePhase.value = 'IDLE'
    }
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

    if (_checkAndHandleGameOver()) {
      return
    }

    const isScenarioActive = currentScenarioMoveIndex.value < scenarioMoves.value.length

    if (isScenarioActive) {
      const expectedMove = scenarioMoves.value[currentScenarioMoveIndex.value]
      if (uciMove === expectedMove) {
        if (userMovesCount.value === 1 && (currentGameMode.value === 'tornado' || currentGameMode.value === 'advantage')) {
          onCorrectFirstMoveCallback()
        }
        currentScenarioMoveIndex.value++
        const isPuzzleComplete = currentScenarioMoveIndex.value >= scenarioMoves.value.length
        if (isPuzzleComplete && (currentGameMode.value === 'tornado')) {
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
    if (isBotTurn) {
      await _triggerBotMove()
    }
  }

  function setGamePhase(phase: GamePhase) {
    gamePhase.value = phase
    if (phase === 'GAMEOVER' || phase === 'IDLE') {
      isGameActive.value = false
    }
  }

  async function resetGame() {
    boardStore.resetBoardState()
    await analysisStore.resetAnalysisState()

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

    logger.info('[GameStore] Full game state has been reset.')
  }

  return {
    gamePhase,
    isGameActive,
    currentGameMode,
    setupPuzzle,
    handleUserMove,
    setGamePhase,
    handleGameResignation,
    resetGame,
  }
})
