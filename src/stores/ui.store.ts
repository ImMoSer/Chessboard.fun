// src/stores/ui.store.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import i18n from '../services/i18n'

const t = i18n.global.t

type ResolveFunction = (value: 'confirm' | 'cancel' | 'extra' | null) => void

interface ConfirmationOptions {
  confirmText?: string
  cancelText?: string
  extraText?: string
  showCancel?: boolean
  showExtra?: boolean
  persistent?: boolean
}

export const useUiStore = defineStore('ui', () => {
  // For Confirmation Modal
  const isModalVisible = ref(false)
  const isModalPersistent = ref(false)
  const modalTitle = ref('')
  const modalMessage = ref('')
  const modalConfirmText = ref(t('common.confirm'))
  const modalCancelText = ref(t('common.cancel'))
  const modalExtraText = ref('')
  const isCancelButtonVisible = ref(true)
  const isExtraButtonVisible = ref(false)

  // For Info Modal
  const infoModalKey = ref<string | null>(null)

  let resolvePromise: ResolveFunction | null = null

  function showConfirmation(
    title: string,
    message: string,
    options: ConfirmationOptions = {},
  ): Promise<'confirm' | 'cancel' | 'extra' | null> {
    modalTitle.value = title
    modalMessage.value = message
    modalConfirmText.value = options.confirmText || t('common.confirm')
    modalCancelText.value = options.cancelText || t('common.cancel')
    modalExtraText.value = options.extraText || ''
    isCancelButtonVisible.value = options.showCancel ?? true
    isExtraButtonVisible.value = options.showExtra ?? false
    isModalPersistent.value = options.persistent ?? false
    isModalVisible.value = true

    return new Promise<'confirm' | 'cancel' | 'extra' | null>((resolve) => {
      resolvePromise = resolve
    })
  }

  function handleConfirm() {
    if (resolvePromise) {
      resolvePromise('confirm')
    }
    isModalVisible.value = false
    reset()
  }

  function handleCancel() {
    if (resolvePromise) {
      resolvePromise('cancel')
    }
    isModalVisible.value = false
    reset()
  }

  function handleExtra() {
    if (resolvePromise) {
      resolvePromise('extra')
    }
    isModalVisible.value = false
    reset()
  }

  function handleOverlayClick() {
    if (!isModalPersistent.value) {
      handleCancel()
    }
  }

  function reset() {
    modalTitle.value = ''
    modalMessage.value = ''
    resolvePromise = null
    modalConfirmText.value = t('common.confirm')
    modalCancelText.value = t('common.cancel')
    modalExtraText.value = ''
    isCancelButtonVisible.value = true
    isExtraButtonVisible.value = false
    isModalPersistent.value = false
  }

  function showInfoModal(key: string) {
    infoModalKey.value = key
  }

  function hideInfoModal() {
    infoModalKey.value = null
  }

  return {
    // Confirmation Modal
    isModalVisible,
    modalTitle,
    modalMessage,
    modalConfirmText,
    modalCancelText,
    modalExtraText,
    isCancelButtonVisible,
    isExtraButtonVisible,
    showConfirmation,
    handleConfirm,
    handleCancel,
    handleExtra,
    handleOverlayClick,

    // Info Modal
    infoModalKey,
    showInfoModal,
    hideInfoModal,
  }
})
