// src/stores/tower.store.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useGameStore } from './game.store'
import { useBoardStore, type GameEndOutcome } from './board.store'
import { webhookService } from '../services/WebhookService'
import type { TowerData, SaveTowerRecordDto, TowerId, TowerTheme, TowerMode } from '../types/api.types'
import logger from '../utils/logger'
import { soundService } from '../services/sound.service'
import { useAuthStore } from './auth.store'
import { useRouter } from 'vue-router'
import i18n from '../services/i18n'
import { useUiStore } from './ui.store'
import { useAnalysisStore } from './analysis.store'

const t = i18n.global.t
const INITIAL_LIVES = 3
const TIMER_INTERVAL_MS = 1000

export const useTowerStore = defineStore('tower', () => {
  const gameStore = useGameStore()
  const boardStore = useBoardStore()
  const authStore = useAuthStore()
  const router = useRouter()
  const uiStore = useUiStore()
  const analysisStore = useAnalysisStore()

  const activeTower = ref<TowerData | null>(null)
  const currentPositionIndex = ref(0)
  const lives = ref(INITIAL_LIVES)
  const elapsedTimeMs = ref(0)
  const timerId = ref<number | null>(null)
  const feedbackMessage = ref(t('tower.feedback.selectTowerAndStart'))
  const isProcessingGameOver = ref(false)

  const formattedTimer = computed(() => {
    const totalSeconds = Math.floor(elapsedTimeMs.value / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  })

  async function reset() {
    _stopTimer()
    activeTower.value = null
    currentPositionIndex.value = 0
    lives.value = INITIAL_LIVES
    elapsedTimeMs.value = 0
    feedbackMessage.value = t('tower.feedback.selectTowerAndStart')
    isProcessingGameOver.value = false
    if (analysisStore.isPanelVisible) {
      await analysisStore.hidePanel()
    }
    logger.info('[TowerStore] Local state has been reset.')
  }

  function _startTimer() {
    _stopTimer()
    const startTime = Date.now() - elapsedTimeMs.value
    timerId.value = window.setInterval(() => {
      if (gameStore.gamePhase === 'PLAYING') {
        elapsedTimeMs.value = Date.now() - startTime
      } else {
        _stopTimer()
      }
    }, TIMER_INTERVAL_MS)
  }

  function _stopTimer() {
    if (timerId.value) {
      clearInterval(timerId.value)
      timerId.value = null
    }
  }

  function _checkWinCondition(outcome?: GameEndOutcome): boolean {
    if (!outcome) return false
    const humanColor = boardStore.orientation
    return outcome.reason === 'checkmate' && outcome.winner === humanColor
  }

  async function _handlePositionGameOver(isWin: boolean) {
    if (gameStore.gamePhase === 'GAMEOVER' || isProcessingGameOver.value || !activeTower.value)
      return
    isProcessingGameOver.value = true
    _stopTimer()
    gameStore.setGamePhase('GAMEOVER')

    if (isWin) {
      currentPositionIndex.value++
      if (currentPositionIndex.value >= activeTower.value.positions.length) {
        await _handleTowerCompletion()
      } else {
        feedbackMessage.value = t('tower.feedback.positionWon')
        setTimeout(() => _loadCurrentPosition(), 1500)
      }
    } else {
      lives.value--
      if (lives.value > 0) {
        feedbackMessage.value = t('tower.feedback.positionFailedWithLives', { lives: lives.value })
        setTimeout(() => _loadCurrentPosition(), 1500)
      } else {
        await _handleTowerFailure()
      }
    }
    isProcessingGameOver.value = false
  }

  async function _handleTowerCompletion() {
    const towerName = activeTower.value?.tower_type || 'Tower'
    feedbackMessage.value = t('tower.feedback.towerCompleted', {
      towerName,
      time: formattedTimer.value,
    })
    soundService.playSound('game_tower_win_series')
    soundService.playSound('game_user_won')
    await _sendRecord(true)
  }

  async function _handleTowerFailure() {
    feedbackMessage.value = t('tower.feedback.gameOver')
    soundService.playSound('game_user_lost')
    await _sendRecord(false)
    analysisStore.showPanel()
  }

  async function _sendRecord(success: boolean) {
    const user = authStore.userProfile
    const tower = activeTower.value
    if (!user || !tower) return

    const dto: SaveTowerRecordDto = {
      username: user.username,
      tower_id: tower.tower_id,
      tower_type: tower.tower_type,
      time_in_seconds: Math.round(elapsedTimeMs.value / 1000),
      success,
      bw_value_total: tower.bw_value_total,
    }

    try {
      const response = await webhookService.sendTowerRecord(dto)
      if (response?.UserStatsUpdate) {
        authStore.updateUserStats(response.UserStatsUpdate)
      }
    } catch (error) {
      logger.error('[TowerStore] Failed to send tower record', error)
    }
  }

  async function _loadCurrentPosition() {
    isProcessingGameOver.value = false
    if (analysisStore.isPanelVisible) {
      await analysisStore.hidePanel()
    }
    const tower = activeTower.value
    if (!tower) return

    const position = tower.positions[currentPositionIndex.value]
    if (!position) {
      logger.error('[TowerStore] Position not found at index', currentPositionIndex.value)
      await _handleTowerFailure()
      return
    }

    const movesStr = position.Moves || position.solution_moves
    const moves = movesStr ? movesStr.split(' ') : []
    gameStore.setupPuzzle(
      position.FEN_0,
      moves,
      _handlePositionGameOver,
      _checkWinCondition,
      () => { },
      'tower',
    )
    feedbackMessage.value = t('tower.feedback.positionLoaded', {
      current: currentPositionIndex.value + 1,
      total: tower.positions.length,
      towerName: tower.tower_type,
    })
    _startTimer()
  }

  function initialize() { }

  async function startNewTower(towerType: TowerId, theme: TowerTheme, mode: 'tactical' | 'positional' = 'tactical') {
    if (analysisStore.isPanelVisible) {
      await analysisStore.hidePanel()
    }
    gameStore.setGamePhase('LOADING')
    feedbackMessage.value = t('tower.feedback.loadingTower', { towerName: towerType })
    try {
      const towerData = await webhookService.fetchNewTower({
        tower_type: towerType,
        tower_theme: theme,
        tower_mode: mode,
      })
      if (!towerData || towerData.positions.length === 0)
        throw new Error(t('tower.error.noPositionsInTower'))

      activeTower.value = towerData
      currentPositionIndex.value = 0
      lives.value = INITIAL_LIVES
      elapsedTimeMs.value = 0
      isProcessingGameOver.value = false

      soundService.playSound('app_game_entry')
      await _loadCurrentPosition()
    } catch (error) {
      logger.error('[TowerStore] Failed to start new tower:', error)
      feedbackMessage.value = t('tower.error.towerNotFound')
      gameStore.setGamePhase('IDLE')
    }
  }

  async function loadTowerById(towerId: string) {
    if (analysisStore.isPanelVisible) {
      await analysisStore.hidePanel()
    }
    gameStore.setGamePhase('LOADING')
    feedbackMessage.value = t('common.loading')
    try {
      const towerData = await webhookService.fetchTowerById(towerId)
      if (!towerData || towerData.positions.length === 0)
        throw new Error(t('tower.error.noPositionsInTower'))

      activeTower.value = towerData
      currentPositionIndex.value = 0
      lives.value = INITIAL_LIVES
      elapsedTimeMs.value = 0
      isProcessingGameOver.value = false

      soundService.playSound('app_game_entry')
      await _loadCurrentPosition()
    } catch (error) {
      logger.error('[TowerStore] Failed to load tower by ID:', error)
      feedbackMessage.value = t('tower.error.towerNotFound')
      gameStore.setGamePhase('IDLE')
    }
  }

  async function handleResign() {
    if (gameStore.gamePhase !== 'PLAYING' || !activeTower.value) return
    _stopTimer()
    gameStore.setGamePhase('GAMEOVER')

    lives.value--
    if (lives.value > 0) {
      feedbackMessage.value = t('tower.feedback.positionFailedWithLives', { lives: lives.value })
      setTimeout(() => _loadCurrentPosition(), 1500)
    } else {
      await _handleTowerFailure()
    }
  }

  async function handleRestart() {
    if (!activeTower.value) return
    if (gameStore.gamePhase === 'GAMEOVER' && lives.value === 0) {
      await loadTowerById(activeTower.value.tower_id)
    }
  }

  async function handleExit() {
    if (gameStore.isGameActive) {
      const confirmed = await uiStore.showConfirmation(
        t('gameplay.confirmExit.title'),
        t('gameplay.confirmExit.message'),
      )
      if (!confirmed) return
    }
    await gameStore.resetGame()
    await reset()
    router.push('/')
  }

  return {
    activeTower,
    currentPositionIndex,
    lives,
    elapsedTimeMs,
    feedbackMessage,
    formattedTimer,
    gamePhase: computed(() => gameStore.gamePhase),
    initialize,
    startNewTower,
    loadTowerById,
    handleRestart,
    handleResign,
    handleExit,
    reset,
  }
})
