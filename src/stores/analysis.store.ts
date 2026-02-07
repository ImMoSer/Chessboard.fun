// src/stores/analysis.store.ts
import type { DrawShape } from '@lichess-org/chessground/draw'
import type { Key } from '@lichess-org/chessground/types'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { analysisService, type EvaluatedLineWithSan } from '../services/AnalysisService'
import logger from '../utils/logger'
import { useBoardStore } from './board.store'

const THREADS_STORAGE_KEY = 'analysis_threads'
const ARROW_STYLES = [
  { brush: 'blue', lineWidth: 15 },
  { brush: 'green', lineWidth: 9 },
  { brush: 'yellow', lineWidth: 5 },
]

export const useAnalysisStore = defineStore('analysis', () => {
  const boardStore = useBoardStore()

  // --- STATE ---
  const isPanelVisible = ref(false)
  const isAnalysisActive = ref(false)
  const isLoading = ref(false)
  const analysisLines = ref<EvaluatedLineWithSan[]>([])
  const isMultiThreadAvailable = ref(false)
  const maxThreads = ref(1)
  const numThreads = ref(1)
  const playerColor = ref<'white' | 'black' | null>(null)

  // --- Внутренний механизм для предотвращения гонки состояний ---
  let analysisVersion = 0

  // --- СЛЕЖЕНИЕ ЗА ИЗМЕНЕНИЯМИ ---
  watch(
    () => boardStore.fen,
    (newFen) => {
      if (isAnalysisActive.value) {
        logger.debug(`[AnalysisStore] FEN changed. Restarting analysis. FEN: ${newFen}`)
        startCurrentPositionAnalysis()
      } else {
        // logger.debug(`[AnalysisStore] FEN changed but analysis ignored. Visible: ${isPanelVisible.value}, Active: ${isAnalysisActive.value}`)
      }
    },
  )

  // --- ACTIONS ---
  async function showPanel(startActive = false) {
    isPanelVisible.value = true
    isLoading.value = true

    // Инициализация сервиса анализа (один раз при первом открытии)
    await analysisService.initialize()

    isMultiThreadAvailable.value = analysisService.isMultiThreadAvailable()
    maxThreads.value = analysisService.getMaxThreads()

    // Загрузка настроек потоков
    const savedThreads = localStorage.getItem(THREADS_STORAGE_KEY)
    const defaultThreads = maxThreads.value > 2 ? 2 : 1
    numThreads.value = savedThreads
      ? Math.min(parseInt(savedThreads, 10), maxThreads.value)
      : defaultThreads

    logger.info(
      `[AnalysisStore] Panel shown. Multi-threading: ${isMultiThreadAvailable.value}. Threads: ${numThreads.value}/${maxThreads.value}.`,
    )
    isLoading.value = false
    boardStore.setAnalysisMode(true)
    if (startActive) {
      isAnalysisActive.value = true
      await startCurrentPositionAnalysis()
    }
  }

  async function hidePanel() {
    await resetAnalysisState()
    logger.info('[AnalysisStore] Panel hidden.')
  }

  async function startCurrentPositionAnalysis() {
    analysisVersion++
    const currentVersion = analysisVersion

    await analysisService.stopAnalysis()
    isLoading.value = true
    analysisLines.value = []
    boardStore.setDrawableShapes([])
    await analysisService.setThreads(numThreads.value)

    await analysisService.startAnalysis(boardStore.fen, (lines) => {
      // Принимаем данные только от самой последней запущенной сессии анализа
      if (!isAnalysisActive.value || analysisVersion !== currentVersion) {
        return
      }
      // logger.debug('[AnalysisStore_RECEIVED]', { lines })
      if (isLoading.value) isLoading.value = false
      const lineMap = new Map(analysisLines.value.map((l) => [l.id, l]))
      lines.forEach((l) => lineMap.set(l.id, l))
      const sortedLines = Array.from(lineMap.values()).sort((a, b) => a.id - b.id)
      analysisLines.value = sortedLines
      drawAnalysisArrows(sortedLines)
    })
    logger.info(`[AnalysisStore] Analysis started for FEN: ${boardStore.fen}`)
  }

  async function toggleAnalysis() {
    isAnalysisActive.value = !isAnalysisActive.value

    if (isAnalysisActive.value) {
      await analysisService.startNewGame()
      await startCurrentPositionAnalysis()
    } else {
      analysisVersion++ // Немедленно делаем все текущие колбэки невалидными
      isLoading.value = false
      await analysisService.stopAnalysis()
      boardStore.setDrawableShapes([])
      logger.info('[AnalysisStore] Analysis stopped.')
    }
  }

  async function setThreads(count: number) {
    const newCount = Math.max(1, Math.min(count, maxThreads.value))
    if (numThreads.value === newCount) return

    numThreads.value = newCount
    localStorage.setItem(THREADS_STORAGE_KEY, String(newCount))

    if (isAnalysisActive.value) {
      logger.info(`[AnalysisStore] Threads changed to ${newCount}. Restarting analysis.`)
      await startCurrentPositionAnalysis()
    }
  }

  function drawAnalysisArrows(lines: EvaluatedLineWithSan[]) {
    const shapes: DrawShape[] = []
    lines.slice(0, 3).forEach((line, index) => {
      if (line.pvUci && line.pvUci.length > 0) {
        const uciMove = line.pvUci[0]
        if (typeof uciMove === 'string' && uciMove.length >= 4) {
          const orig = uciMove.substring(0, 2) as Key
          const dest = uciMove.substring(2, 4) as Key
          const style = ARROW_STYLES[index]
          if (style) {
            shapes.push({
              orig,
              dest,
              brush: style.brush,
              modifiers: { lineWidth: style.lineWidth },
            })
          }
        }
      }
    })
    boardStore.setDrawableShapes(shapes)
  }

  async function resetAnalysisState() {
    const wasActive = isAnalysisActive.value
    analysisVersion++ // Немедленно делаем все текущие колбэки невалидными

    isPanelVisible.value = false
    isAnalysisActive.value = false
    isLoading.value = false
    analysisLines.value = []

    if (wasActive) {
      await analysisService.stopAnalysis()
    }

    boardStore.setDrawableShapes([])
    boardStore.setAnalysisMode(false)
    logger.info('[AnalysisStore] Analysis state has been reset.')
  }

  function setPlayerColor(color: 'white' | 'black' | null) {
    playerColor.value = color
  }

  return {
    isPanelVisible,
    isAnalysisActive,
    isLoading,
    analysisLines,
    isMultiThreadAvailable,
    maxThreads,
    numThreads,
    playerColor,
    showPanel,
    hidePanel,
    toggleAnalysis,
    setThreads,
    resetAnalysisState,
    setPlayerColor,
  }
})
