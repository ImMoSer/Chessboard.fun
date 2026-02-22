import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { EngineId } from '@/shared/types/api.types'
import logger from '@/shared/lib/logger'

const ENGINE_STORAGE_KEY = 'user_selected_engine'

export const useEngineSelectionStore = defineStore('engine-selection', () => {
  const router = useRouter()

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

  function setEngine(engineId: EngineId, fromUrlSync = false) {
    if (selectedEngine.value === engineId) return

    selectedEngine.value = engineId
    isEngineSelectorOpen.value = false
    try {
      localStorage.setItem(ENGINE_STORAGE_KEY, engineId)
      logger.info(`[EngineSelectionStore] Saved selected engine: ${engineId}`)
    } catch (error) {
      logger.error('[EngineSelectionStore] Failed to save engine', error)
    }

    if (fromUrlSync) return

    const route = router.currentRoute.value
    if (route.name === 'sandbox' || route.name === 'sandbox-with-engine') {
      const fen = route.params.fen as string
      if (fen) {
        router.replace({
          name: 'sandbox-with-engine',
          params: { engineId, fen },
        })
      }
    }
  }

  function setSandboxEngine() {
    setEngine('MOZER_2000')
  }

  return {
    availableEngines,
    selectedEngine,
    isEngineSelectorOpen,
    toggleEngineSelector,
    setEngine,
    setSandboxEngine,
  }
})
