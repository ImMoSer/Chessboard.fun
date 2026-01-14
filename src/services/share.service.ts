// src/services/share.service.ts
import { useUiStore } from '@/stores/ui.store'
import type { Color as ChessgroundColor, EngineId } from '@/types/api.types'
import logger from '../utils/logger'
import i18n from './i18n'

type ShareMode = 'finish-him' | 'tornado' | 'sandbox' | 'theory-endings' | 'practical-chess'

class ShareServiceController {
  /**
   * Показывает всплывающее уведомление.
   * @param titleKey - Ключ для заголовка из i18n.
   * @param messageKey - Ключ для сообщения из i18n.
   */
  private showNotification(titleKey: string, messageKey: string) {
    const uiStore = useUiStore()
    const t = i18n.global.t
    uiStore.showConfirmation(t(titleKey), t(messageKey), { showCancel: false })
  }

  /**
   * Копирует текст в буфер обмена, используя современный Clipboard API с фолбэком.
   * @param text - Текст для копирования.
   */
  private copyToClipboard(text: string): void {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          logger.info('[ShareService] Link copied via Clipboard API:', text)
          this.showNotification('common.ok', 'common.linkCopied')
        })
        .catch((err) => {
          logger.error('[ShareService] Could not copy link via Clipboard API:', err)
          this.fallbackCopyToClipboard(text)
        })
    } else {
      this.fallbackCopyToClipboard(text)
    }
  }

  /**
   * Фолбэк-метод копирования для старых браузеров или небезопасных контекстов.
   */
  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'absolute'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
      logger.info('[ShareService] Link copied via execCommand fallback:', text)
      this.showNotification('common.ok', 'common.linkCopied')
    } catch (err) {
      logger.error('[ShareService] Could not copy link via fallback:', err)
      this.showNotification('common.error', 'common.copyFailed')
    }
    document.body.removeChild(textArea)
  }

  /**
   * Основная функция "Поделиться". Использует Web Share API, если доступно, иначе копирует ссылку.
   * @param mode - Игровой режим.
   * @param id - ID задачи или башни.
   */
  public async share(
    mode: ShareMode,
    id: string,
    options?: {
      engineId?: EngineId
      userColor?: ChessgroundColor
      theoryType?: 'win' | 'draw'
    },
  ): Promise<void> {
    const t = i18n.global.t
    let url = `${window.location.origin}/${mode}/${id}`

    if (mode === 'theory-endings' && options?.theoryType) {
      url = `${window.location.origin}/theory-endings/${options.theoryType}/${id}`
    } else if (mode === 'sandbox') {
      if (options?.engineId && options?.userColor) {
        url = `${window.location.origin}/sandbox/play/${options.engineId}/${options.userColor}/${id}`
      } else if (options?.engineId) {
        url = `${window.location.origin}/sandbox/play/${options.engineId}/${id}`
      } else {
        url = `${window.location.origin}/sandbox/play/${id}`
      }
    }

    const shareData = {
      title: t('app.title'),
      text: t(`nav.${mode}`),
      url: url,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        logger.info('[ShareService] Successfully shared via Web Share API.')
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          logger.error('[ShareService] Error using Web Share API:', error)
          this.copyToClipboard(url) // Фолбэк на копирование при ошибке
        } else {
          logger.info('[ShareService] Web Share dialog was cancelled by the user.')
        }
      }
    } else {
      logger.info('[ShareService] Web Share API not supported, falling back to clipboard.')
      this.copyToClipboard(url)
    }
  }
}

export const shareService = new ShareServiceController()
