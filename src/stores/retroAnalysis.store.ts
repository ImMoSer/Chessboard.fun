import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { retroAnalysisService, type RetroAnalysisReport, type RetroAnalysisStep } from '../services/RetroAnalysisService'
import logger from '../utils/logger'
import { useAnalysisStore } from './analysis.store'

const SETTINGS_STORAGE_KEY = 'retro_analysis_settings'

export interface RetroAnalysisSettings {
  threads: number
  hash: number
  depth: number
  movetime: number
}

export const useRetroAnalysisStore = defineStore('retroAnalysis', () => {
  const analysisStore = useAnalysisStore()

  // --- STATE ---
  const isModalOpen = ref(false)
  const isAnalyzing = ref(false)
  const progress = ref(0) // 0 to 100
  const currentStep = ref(0)
  const totalSteps = ref(0)
  
  const report = ref<RetroAnalysisReport | null>(null)
  const settings = ref<RetroAnalysisSettings>({
    threads: Math.max(1, Math.floor((navigator.hardwareConcurrency || 4) / 2)),
    hash: 128,
    depth: 15,
    movetime: 500
  })

  // --- GETTERS ---
  const isSupported = computed(() => {
    return true 
  })

  // --- ACTIONS ---
  function loadSettings() {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        settings.value = { ...settings.value, ...parsed }
      } catch (e) {
        logger.error('[RetroAnalysisStore] Failed to parse saved settings', e)
      }
    }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings.value))
  }

  async function startAnalysis(fens: string[], movesSan: string[]) {
    if (isAnalyzing.value) return
    
    isAnalyzing.value = true
    report.value = null
    progress.value = 0
    currentStep.value = 0
    totalSteps.value = fens.length

    const playerColor = analysisStore.playerColor || 'white'

    try {
      const result = await retroAnalysisService.runAnalysis(
        fens, 
        movesSan,
        settings.value,
        playerColor,
        (stepIndex) => {
          currentStep.value = stepIndex
          progress.value = Math.round((stepIndex / totalSteps.value) * 100)
        }
      )
      report.value = result
    } catch (error) {
      logger.error('[RetroAnalysisStore] Analysis failed', error)
    } finally {
      isAnalyzing.value = false
    }
  }

  function stopAnalysis() {
    retroAnalysisService.stop()
    isAnalyzing.value = false
  }

  function openModal() {
    loadSettings()
    isModalOpen.value = true
  }

  function closeModal() {
    if (isAnalyzing.value) {
      stopAnalysis()
    }
    isModalOpen.value = false
  }

  return {
    isModalOpen,
    isAnalyzing,
    progress,
    currentStep,
    totalSteps,
    report,
    settings,
    isSupported,
    openModal,
    closeModal,
    startAnalysis,
    stopAnalysis,
    saveSettings
  }
})
