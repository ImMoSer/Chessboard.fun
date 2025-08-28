// src/stores/ui.store.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '../services/i18n'

const t = i18n.global.t

type ResolveFunction = (value: boolean) => void

interface ConfirmationOptions {
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
}

export const useUiStore = defineStore('ui', () => {
  const isModalVisible = ref(false)
  const modalTitle = ref('')
  const modalMessage = ref('')
  const modalConfirmText = ref(t('common.confirm'))
  const modalCancelText = ref(t('common.cancel'))
  const isCancelButtonVisible = ref(true)

  let resolvePromise: ResolveFunction | null = null

  function showConfirmation(
    title: string,
    message: string,
    options: ConfirmationOptions = {},
  ): Promise<boolean> {
    modalTitle.value = title
    modalMessage.value = message
    modalConfirmText.value = options.confirmText || t('common.confirm')
    modalCancelText.value = options.cancelText || t('common.cancel')
    isCancelButtonVisible.value = options.showCancel ?? true
    isModalVisible.value = true

    return new Promise<boolean>((resolve) => {
      resolvePromise = resolve
    })
  }

  function handleConfirm() {
    if (resolvePromise) {
      resolvePromise(true)
    }
    isModalVisible.value = false
    reset()
  }

  function handleCancel() {
    if (resolvePromise) {
      resolvePromise(false)
    }
    isModalVisible.value = false
    reset()
  }

  function reset() {
    modalTitle.value = ''
    modalMessage.value = ''
    resolvePromise = null
    modalConfirmText.value = t('common.confirm')
    modalCancelText.value = t('common.cancel')
    isCancelButtonVisible.value = true
  }

  return {
    isModalVisible,
    modalTitle,
    modalMessage,
    modalConfirmText,
    modalCancelText,
    isCancelButtonVisible,
    showConfirmation,
    handleConfirm,
    handleCancel,
  }
})
