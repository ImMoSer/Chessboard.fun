// src/stores/controls.store.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'
import type { EngineId } from '../types/api.types'
import logger from '../utils/logger'
import { useUiStore } from './ui.store'

const ENGINE_STORAGE_KEY = 'user_selected_engine'

const noop = () => {}

export const useControlsStore = defineStore('controls', () => {
  const uiStore = useUiStore()
  const router = useRouter()

  const availableEngines = ref<EngineId[]>([
    'SF_2200',
    'SF_2100',
    'SF_1900',
    'MOZER_2000+',
    'MOZER_1900+',
    'SF_1700',
    'SF_1600',
  ])

  const loadSavedEngine = (): EngineId => {
    try {
      const savedEngine = localStorage.getItem(ENGINE_STORAGE_KEY)
      if (savedEngine && availableEngines.value.includes(savedEngine as EngineId)) {
        logger.info(`[ControlsStore] Loaded saved engine: ${savedEngine}`)
        return savedEngine as EngineId
      }
    } catch (error) {
      logger.error('[ControlsStore] Failed to load engine from localStorage', error)
    }
    logger.info('[ControlsStore] No saved engine found, setting default: MOZER_1900+')
    return 'MOZER_1900+'
  }

  const selectedEngine = ref<EngineId>(loadSavedEngine())

  const isEngineSelectorOpen = ref(false)
  const canRequestNew = ref(false)
  const canRestart = ref(false)
  const canResign = ref(false)
  const canShare = ref(false)
  const canShowInfo = ref(true)

  const onRequestNew = ref<() => void>(noop)
  const onRestart = ref<() => void>(noop)
  const onResign = ref<() => void>(noop)
  const onShare = ref<() => void>(noop)

  const onShowInfo = () => {
    const routeName = router.currentRoute.value.name?.toString() || ''
    // Преобразуем имя маршрута, чтобы оно соответствовало ключам в локализации
    const modeKey = routeName.replace(/-(puzzle|selection)$/, '')
    if (modeKey) {
      uiStore.showInfoModal('info.modes.' + modeKey)
    }
  }

  function setControls(config: {
    canRequestNew?: boolean
    canRestart?: boolean
    canResign?: boolean
    canShare?: boolean
    canShowInfo?: boolean
    onRequestNew?: () => void
    onRestart?: () => void
    onResign?: () => void
    onShare?: () => void
  }) {
    canRequestNew.value = config.canRequestNew ?? false
    canRestart.value = config.canRestart ?? false
    canResign.value = config.canResign ?? false
    canShare.value = config.canShare ?? false
    canShowInfo.value = config.canShowInfo ?? true

    onRequestNew.value = config.onRequestNew ?? noop
    onRestart.value = config.onRestart ?? noop
    onResign.value = config.onResign ?? noop
    onShare.value = config.onShare ?? noop
  }

  function resetControls() {
    setControls({})
  }

  function toggleEngineSelector() {
    isEngineSelectorOpen.value = !isEngineSelectorOpen.value
  }

  function setEngine(engineId: EngineId) {
    selectedEngine.value = engineId
    isEngineSelectorOpen.value = false
    try {
      localStorage.setItem(ENGINE_STORAGE_KEY, engineId)
      logger.info(`[ControlsStore] Saved selected engine to localStorage: ${engineId}`)
    } catch (error) {
      logger.error('[ControlsStore] Failed to save engine to localStorage', error)
    }
  }

  return {
    canRequestNew,
    canRestart,
    canResign,
    canShare,
    canShowInfo,
    availableEngines,
    selectedEngine,
    isEngineSelectorOpen,
    onRequestNew,
    onRestart,
    onResign,
    onShare,
    onShowInfo,
    setControls,
    resetControls,
    toggleEngineSelector,
    setEngine,
  }
})
