// src/stores/controls.store.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

const noop = () => {}

export const useControlsStore = defineStore('controls', () => {
  const canRequestNew = ref(false)
  const canRestart = ref(false)
  const canResign = ref(false)
  const canShare = ref(false)
  const canRequestHint = ref(true)

  const onRequestNew = ref<() => void>(noop)
  const onRestart = ref<() => void>(noop)
  const onResign = ref<() => void>(noop)
  const onShare = ref<() => void>(noop)

  function setControls(config: {
    canRequestNew?: boolean
    canRestart?: boolean
    canResign?: boolean
    canShare?: boolean
    canRequestHint?: boolean
    onRequestNew?: () => void
    onRestart?: () => void
    onResign?: () => void
    onShare?: () => void
  }) {
    canRequestNew.value = config.canRequestNew ?? false
    canRestart.value = config.canRestart ?? false
    canResign.value = config.canResign ?? false
    canShare.value = config.canShare ?? false
    canRequestHint.value = config.canRequestHint ?? true

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
    canRequestHint,
    onRequestNew,
    onRestart,
    onResign,
    onShare,
    setControls,
    resetControls,
  }
})
