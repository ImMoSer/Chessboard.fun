// src/stores/controls.store.ts
import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { EngineId } from '../types/api.types';
import logger from '../utils/logger'; // <<< ИЗМЕНЕНИЕ: Добавлен логгер

const ENGINE_STORAGE_KEY = 'user_selected_engine';

const noop = () => { };

export const useControlsStore = defineStore('controls', () => {
  const availableEngines = ref<EngineId[]>([
    'SF_2200', 'SF_2100', 'SF_1900', 'MOZER_1900+', 'SF_1700', 'SF_1600'
  ]);

  // <<< НАЧАЛО ИЗМЕНЕНИЙ: Загрузка, новый стандарт
  const loadSavedEngine = (): EngineId => {
    try {
      const savedEngine = localStorage.getItem(ENGINE_STORAGE_KEY);
      if (savedEngine && availableEngines.value.includes(savedEngine as EngineId)) {
        logger.info(`[ControlsStore] Loaded saved engine: ${savedEngine}`);
        return savedEngine as EngineId;
      }
    } catch (error) {
      logger.error('[ControlsStore] Failed to load engine from localStorage', error);
    }
    logger.info('[ControlsStore] No saved engine found, setting default: MOZER_1900+');
    return 'MOZER_1900+'; // Новый стандарт
  };

  const selectedEngine = ref<EngineId>(loadSavedEngine());
  // <<< КОНЕЦ ИЗМЕНЕНИЙ

  const isEngineSelectorOpen = ref(false);
  const canRequestNew = ref(false);
  const canRestart = ref(false);
  const canResign = ref(false);
  const canShare = ref(false);
  const canExit = ref(true);

  const onRequestNew = ref<() => void>(noop);
  const onRestart = ref<() => void>(noop);
  const onResign = ref<() => void>(noop);
  const onShare = ref<() => void>(noop);
  const onExit = ref<() => void>(noop);

  function setControls(config: {
    canRequestNew?: boolean;
    canRestart?: boolean;
    canResign?: boolean;
    canShare?: boolean;
    canExit?: boolean;
    onRequestNew?: () => void;
    onRestart?: () => void;
    onResign?: () => void;
    onShare?: () => void;
    onExit?: () => void;
  }) {
    canRequestNew.value = config.canRequestNew ?? false;
    canRestart.value = config.canRestart ?? false;
    canResign.value = config.canResign ?? false;
    canShare.value = config.canShare ?? false;
    canExit.value = config.canExit ?? true;

    onRequestNew.value = config.onRequestNew ?? noop;
    onRestart.value = config.onRestart ?? noop;
    onResign.value = config.onResign ?? noop;
    onShare.value = config.onShare ?? noop;
    onExit.value = config.onExit ?? noop;
  }

  function resetControls() {
    setControls({});
  }

  function toggleEngineSelector() {
    isEngineSelectorOpen.value = !isEngineSelectorOpen.value;
  }

  function setEngine(engineId: EngineId) {
    selectedEngine.value = engineId;
    isEngineSelectorOpen.value = false;
    // <<< ИЗМЕНЕНИЕ: Сохраняем выбор в localStorage
    try {
      localStorage.setItem(ENGINE_STORAGE_KEY, engineId);
      logger.info(`[ControlsStore] Saved selected engine to localStorage: ${engineId}`);
    } catch (error) {
      logger.error('[ControlsStore] Failed to save engine to localStorage', error);
    }
  }

  return {
    canRequestNew,
    canRestart,
    canResign,
    canShare,
    canExit,
    availableEngines,
    selectedEngine,
    isEngineSelectorOpen,
    onRequestNew,
    onRestart,
    onResign,
    onShare,
    onExit,
    setControls,
    resetControls,
    toggleEngineSelector,
    setEngine,
  };
});
