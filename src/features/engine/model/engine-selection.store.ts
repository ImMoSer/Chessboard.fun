import logger from '@/shared/lib/logger'
import type { EngineId } from '@/shared/types/api.types'
import { defineStore } from 'pinia'
import { ref } from 'vue'

const ENGINE_STORAGE_KEY = 'user_selected_engine'

export const useEngineSelectionStore = defineStore('engine-selection', () => {

  const availableEngines = ref<EngineId[]>(['MOZER_2000', 'maia_2200', 'MOZER_1900', 'SF_2200'])

  const loadSavedEngine = (): EngineId => {
    try {
      const savedEngine = localStorage.getItem(ENGINE_STORAGE_KEY)
      if (savedEngine && availableEngines.value.includes(savedEngine as EngineId)) {
        return savedEngine as EngineId
      }
    } catch (error) {
      logger.error('[EngineSelectionStore] Failed to load engine from localStorage', error)
    }
    return 'MOZER_2000'
  }

  const selectedEngine = ref<EngineId>(loadSavedEngine())
  const isEngineSelectorOpen = ref(false)

  function toggleEngineSelector() {
    isEngineSelectorOpen.value = !isEngineSelectorOpen.value
  }

  function setEngine(engineId: EngineId) {
    if (selectedEngine.value === engineId) return

    selectedEngine.value = engineId
    isEngineSelectorOpen.value = false
    try {
      localStorage.setItem(ENGINE_STORAGE_KEY, engineId)
      logger.info(`[EngineSelectionStore] Saved selected engine: ${engineId}`)
    } catch (error) {
      logger.error('[EngineSelectionStore] Failed to save engine', error)
    }

  }

  return {
    availableEngines,
    selectedEngine,
    isEngineSelectorOpen,
    toggleEngineSelector,
    setEngine,
  }
})
