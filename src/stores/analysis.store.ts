// src/stores/analysis.store.ts
import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { analysisService, type EvaluatedLineWithSan } from '../services/AnalysisService'
import { useBoardStore } from './board.store'
import logger from '../utils/logger'
import type { Key } from 'chessground/types'
import type { DrawShape } from 'chessground/draw'

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

  // --- Внутренний механизм для предотвращения гонки состояний ---
  let analysisVersion = 0

  // --- СЛЕЖЕНИЕ ЗА ИЗМЕНЕНИЯМИ ---
  watch(
    () => boardStore.fen,
    (newFen) => {
      if (isPanelVisible.value && isAnalysisActive.value) {
        startCurrentPositionAnalysis()
      }
    },
  )

  // --- ACTIONS ---
  async function showPanel(startActive = false) {
    isPanelVisible.value = true
    isLoading.value = true
    boardStore.setAnalysisMode(true)

    isMultiThreadAvailable.value = analysisService.isMultiThreadAvailable()
    maxThreads.value = analysisService.getMaxThreads()
    const savedThreads = localStorage.getItem(THREADS_STORAGE_KEY)
    const defaultThreads = maxThreads.value > 2 ? 2 : 1
    numThreads.value = savedThreads
      ? Math.min(parseInt(savedThreads, 10), maxThreads.value)
      : defaultThreads

    logger.info(
      `[AnalysisStore] Panel shown. Multi-threading: ${isMultiThreadAvailable.value}. Threads: ${numThreads.value}/${maxThreads.value}.`,
    )
    isLoading.value = false
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
    boardStore.setAnalysisMode(isAnalysisActive.value)

    if (isAnalysisActive.value) {
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

  return {
    isPanelVisible,
    isAnalysisActive,
    isLoading,
    analysisLines,
    isMultiThreadAvailable,
    maxThreads,
    numThreads,
    showPanel,
    hidePanel,
    toggleAnalysis,
    setThreads,
    resetAnalysisState,
  }
})
