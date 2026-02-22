import { defineStore } from 'pinia'
import { ref } from 'vue'
import { analysisService, type EvaluatedLineWithSan } from '../api/AnalysisService'
import logger from '@/shared/lib/logger'

export const useAnalysisEngineStore = defineStore('analysis-engine', () => {
  const isAnalysisActive = ref(false)
  const isLoading = ref(false)
  const analysisLines = ref<EvaluatedLineWithSan[]>([])
  const isMultiThreadAvailable = ref(false)
  const maxThreads = ref(1)
  const numThreads = ref(1)
  const playerColor = ref<'white' | 'black' | null>(null)
  
  // Internal versioning to prevent race conditions
  let analysisVersion = 0

  async function initialize() {
    await analysisService.initialize()
    isMultiThreadAvailable.value = analysisService.isMultiThreadAvailable()
    maxThreads.value = analysisService.getMaxThreads()
    
    // Load threads preference
    const savedThreads = localStorage.getItem('analysis_threads')
    const defaultThreads = maxThreads.value > 2 ? 2 : 1
    numThreads.value = savedThreads
      ? Math.min(parseInt(savedThreads, 10), maxThreads.value)
      : defaultThreads
      
    logger.info(`[AnalysisEngineStore] Initialized. Threads: ${numThreads.value}/${maxThreads.value}`)
  }

  async function setThreads(count: number) {
    const newCount = Math.max(1, Math.min(count, maxThreads.value))
    if (numThreads.value === newCount) return

    numThreads.value = newCount
    localStorage.setItem('analysis_threads', String(newCount))

    if (isAnalysisActive.value) {
      // Trigger re-analysis logic if needed (handled by consumer usually, or we can expose a 'restart' signal)
      // For pure entity, we might just update the config. 
      // The service.setThreads call happens when analysis starts or here?
      await analysisService.setThreads(newCount)
    }
  }

  async function startNewGame() {
    await analysisService.startNewGame()
  }

  async function startAnalysis(fen: string, onLinesUpdate?: (lines: EvaluatedLineWithSan[]) => void) {
    analysisVersion++
    const currentVersion = analysisVersion
    
    await analysisService.stopAnalysis()
    isLoading.value = true
    analysisLines.value = []
    
    await analysisService.setThreads(numThreads.value)

    await analysisService.startAnalysis(fen, (lines) => {
      if (!isAnalysisActive.value || analysisVersion !== currentVersion) return
      
      isLoading.value = false
      
      // Merge lines strategy
      const lineMap = new Map(analysisLines.value.map((l) => [l.id, l]))
      lines.forEach((l) => lineMap.set(l.id, l))
      const sortedLines = Array.from(lineMap.values()).sort((a, b) => a.id - b.id)
      
      analysisLines.value = sortedLines
      
      if (onLinesUpdate) {
        onLinesUpdate(sortedLines)
      }
    })
    
    isAnalysisActive.value = true
    logger.info(`[AnalysisEngineStore] Started for FEN: ${fen}`)
  }

  async function stopAnalysis() {
    analysisVersion++
    isAnalysisActive.value = false
    isLoading.value = false
    analysisLines.value = []
    await analysisService.stopAnalysis()
    logger.info('[AnalysisEngineStore] Stopped.')
  }
  
  function setPlayerColor(color: 'white' | 'black' | null) {
    playerColor.value = color
  }

  return {
    isAnalysisActive,
    isLoading,
    analysisLines,
    isMultiThreadAvailable,
    maxThreads,
    numThreads,
    playerColor,
    initialize,
    setThreads,
    startNewGame,
    startAnalysis,
    stopAnalysis,
    setPlayerColor
  }
})
