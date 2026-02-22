// src/stores/controls.store.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/shared/ui/model/ui.store'

const noop = () => {}

export const useControlsStore = defineStore('controls', () => {
  const uiStore = useUiStore()
  const router = useRouter()

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

  return {
    canRequestNew,
    canRestart,
    canResign,
    canShare,
    canShowInfo,
    onRequestNew,
    onRestart,
    onResign,
    onShare,
    onShowInfo,
    setControls,
    resetControls,
  }
})
