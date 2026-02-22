// src/features/analysis/model/analysis.store.ts
import { useBoardStore } from '@/entities/game'
import { useGameStore } from '@/entities/game'
import { useAnalysisEngineStore, type EvaluatedLineWithSan } from '@/entities/analysis'
import logger from '@/shared/lib/logger'
import type { DrawShape } from '@lichess-org/chessground/draw'
import type { Key } from '@lichess-org/chessground/types'
import { defineStore, storeToRefs } from 'pinia'
import { ref, watch } from 'vue'

const ARROW_STYLES = [
  { brush: 'blue', lineWidth: 15 },
  { brush: 'green', lineWidth: 9 },
  { brush: 'yellow', lineWidth: 5 },
]

export const useAnalysisStore = defineStore('analysis', () => {
  const boardStore = useBoardStore()
  const gameStore = useGameStore()
  const engineStore = useAnalysisEngineStore()

  // --- FEATURE STATE ---
  const isPanelVisible = ref(false)

  // --- ENTITY STATE PROXIES ---
  const { 
    isAnalysisActive, 
    isLoading, 
    analysisLines, 
    isMultiThreadAvailable, 
    maxThreads, 
    numThreads, 
    playerColor 
  } = storeToRefs(engineStore)

  // --- LOGIC ---
  watch(
    () => gameStore.gamePhase,
    (phase) => {
      if (phase === 'IDLE' && (isPanelVisible.value || isAnalysisActive.value)) {
        logger.info('[AnalysisFeature] Auto-resetting because gamePhase became IDLE')
        resetAnalysisState()
      }
    }
  )

  watch(
    () => boardStore.fen,
    (newFen) => {
      if (isAnalysisActive.value) {
        logger.debug(`[AnalysisFeature] FEN changed. Restarting analysis.`)
        // Delegate to engineStore
        engineStore.startAnalysis(newFen)
      }
    }
  )

  // Watch lines to update board arrows (Pure Feature Logic)
  watch(analysisLines, (lines) => {
      // Only draw arrows if this feature is "active" (panel visible or toggled on)
      if (isAnalysisActive.value) {
          drawAnalysisArrows(lines)
      }
  })

  // --- ACTIONS ---
  async function showPanel(startActive = false) {
    isPanelVisible.value = true
    
    // Initialize Engine
    await engineStore.initialize()
    boardStore.setAnalysisMode(true)

    if (startActive) {
      await engineStore.startAnalysis(boardStore.fen)
    }
  }

  async function hidePanel() {
    await resetAnalysisState()
    logger.info('[AnalysisFeature] Panel hidden.')
  }
  
  async function toggleAnalysis() {
    if (!isAnalysisActive.value) {
      await engineStore.startNewGame()
      await engineStore.startAnalysis(boardStore.fen)
    } else {
      await engineStore.stopAnalysis()
      boardStore.setDrawableShapes([])
    }
  }

  async function setThreads(count: number) {
      await engineStore.setThreads(count)
      if (isAnalysisActive.value) {
          await engineStore.startAnalysis(boardStore.fen)
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
    isPanelVisible.value = false
    
    if (wasActive) {
      await engineStore.stopAnalysis()
    }

    boardStore.setDrawableShapes([])
    boardStore.setAnalysisMode(false)
  }

  function setPlayerColor(color: 'white' | 'black' | null) {
    engineStore.setPlayerColor(color)
  }

  return {
    // Feature State
    isPanelVisible,
    
    // Entity State (Proxied)
    isAnalysisActive,
    isLoading,
    analysisLines,
    isMultiThreadAvailable,
    maxThreads,
    numThreads,
    playerColor,

    // Actions
    showPanel,
    hidePanel,
    toggleAnalysis,
    setThreads,
    resetAnalysisState,
    setPlayerColor,
  }
})
