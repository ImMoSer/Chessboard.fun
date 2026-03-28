// src/utils/logger.ts
declare global {
  interface Window {
    APP_FORCE_LOGGING: boolean | null
  }
}

const IS_DEV_MODE = import.meta.env.MODE === 'development'
const BACKEND_API_URL = (import.meta.env.VITE_BACKEND_API_URL as string) || ''

if (typeof window.APP_FORCE_LOGGING === 'undefined') {
  window.APP_FORCE_LOGGING = null
}

function shouldLog(level: 'error' | 'warn' | 'info' | 'debug' | 'log' = 'log'): boolean {
  if (typeof window.APP_FORCE_LOGGING === 'boolean') {
    return window.APP_FORCE_LOGGING ? true : level === 'error'
  }
  if (IS_DEV_MODE) {
    return true
  } else {
    return level === 'error'
  }
}

let isReporting = false

/**
 * Очистка стека от "шума" фреймворков и библиотек для экономии токенов n8n/AI
 */
function cleanStack(stack: string): string {
  if (!stack) return ''
  return stack
    .split('\n')
    .filter((line) => {
      // Оставляем только те строки, которые относятся к нашему коду (/src/)
      // И убираем шум библиотек (node_modules, vue, pinia, chunk-...)
      return line.includes('/src/') && !line.includes('node_modules') && !line.includes('?v=')
    })
    .map((line) => line.trim())
    .join('\n')
}

/**
 * Умная передача логов на бэкенд (n8n proxy)
 */
async function reportToRemote(args: unknown[]) {
  if (isReporting) return
  isReporting = true

  try {
    const savedProfile = localStorage.getItem('user_profile')
    let user = { id: 'anonymous', username: 'anonymous' }

    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile)
        user = {
          id: profile.id || 'unknown',
          username: profile.username || 'unknown',
        }
      } catch {
        // ignore
      }
    }

    // Извлекаем "Event" из тегов [Tag] в первом аргументе (даже если там есть текст после тега)
    let eventName = 'client_error'
    const firstArg = args[0]
    if (typeof firstArg === 'string' && firstArg.startsWith('[')) {
      const closingBracketIndex = firstArg.indexOf(']')
      if (closingBracketIndex > 0) {
        eventName = firstArg.slice(0, closingBracketIndex + 1)
      }
    }

    const cleanedArgs = args.map((a) => {
      if (a instanceof Error) {
        return {
          message: a.message,
          stack: cleanStack(a.stack || ''),
        }
      }
      return a
    })

    const apiPath = '/logs/client-error'
    const fullUrl = BACKEND_API_URL ? `${BACKEND_API_URL}${apiPath}` : `/api${apiPath}`

    await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventName,
        user,
        payload: {
          args: cleanedArgs,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          browser: navigator.userAgent,
        },
      }),
    })
  } catch (e) {
    console.warn('[LOGGER_REMOTE] Failed to send report:', e)
  } finally {
    isReporting = false
  }
}

const logger = {
  log: (...args: unknown[]) => {
    if (shouldLog('log')) {
      console.log('[LOG]', ...args)
    }
  },
  info: (...args: unknown[]) => {
    if (shouldLog('info')) {
      console.info('%c[INFO]', 'color: blue; font-weight: bold;', ...args)
    }
  },
  warn: (...args: unknown[]) => {
    if (shouldLog('warn')) {
      console.warn('%c[WARN]', 'color: orange; font-weight: bold;', ...args)
    }
  },
  error: (...args: unknown[]) => {
    if (shouldLog('error')) {
      console.error('%c[ERROR]', 'color: red; font-weight: bold;', ...args)
      reportToRemote(args)
    }
  },
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) {
      console.debug('%c[DEBUG]', 'color: green; font-weight: bold;', ...args)
    }
  },
  setForceLogging: (value: boolean | null) => {
    if (typeof value === 'boolean' || value === null) {
      window.APP_FORCE_LOGGING = value
      console.info(
        `%c[LOGGER_CONFIG] APP_FORCE_LOGGING установлен в: ${value}`,
        'color: purple; font-style: italic;',
      )
    } else {
      console.warn(
        '%c[LOGGER_CONFIG] Неверное значение для setForceLogging. Ожидается boolean oder null.',
        'color: purple; font-style: italic;',
      )
    }
  },
  isLoggingEnabledForLevel: (level: 'error' | 'warn' | 'info' | 'debug' | 'log'): boolean =>
    shouldLog(level),
  isDevMode: (): boolean => IS_DEV_MODE,
  getForceLoggingStatus: (): boolean | null => window.APP_FORCE_LOGGING,
}

if (IS_DEV_MODE && window.APP_FORCE_LOGGING !== false) {
  console.log(
    `%c[LOGGER_INIT] Логгер инициализирован. Режим разработки: ${IS_DEV_MODE}. Принудительное логирование: ${window.APP_FORCE_LOGGING === null ? 'не установлено (по умолчанию)' : window.APP_FORCE_LOGGING}. Ошибки всегда логируются (если APP_FORCE_LOGGING не false).`,
    'color: purple; font-style: italic;',
  )
}

export default logger
