// src/services/i18n.ts
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import ru from '@/locales/ru.json'
import de from '@/locales/de.json'

import logger from '@/shared/lib/logger'

const LANG_STORAGE_KEY = 'user_preferred_language'

function getStartingLang(): string {
  const preferredLang = localStorage.getItem(LANG_STORAGE_KEY)
  if (preferredLang && ['en', 'ru', 'de'].includes(preferredLang)) {
    return preferredLang
  }

  const browserLang = navigator.language.split('-')[0]
  if (browserLang && ['ru', 'de'].includes(browserLang)) {
    return browserLang
  }

  return 'en'
}

const i18n = createI18n({
  legacy: false, // Важно для использования Composition API
  locale: getStartingLang(), // Язык по умолчанию
  fallbackLocale: 'en', // Язык, который будет использоваться, если ключ не найден
  messages: {
    en,
    ru,
    de,
  },
})

// Глобальная функция для смены языка, доступная во всем приложении
export const changeLang = (lang: 'en' | 'ru' | 'de') => {
  i18n.global.locale.value = lang
  localStorage.setItem(LANG_STORAGE_KEY, lang)
  logger.info(`[i18n] Language changed to: ${lang}`)
}

export default i18n
