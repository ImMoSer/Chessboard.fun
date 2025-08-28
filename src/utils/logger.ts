// src/utils/logger.ts

const IS_DEV_MODE = import.meta.env.MODE === 'development';

if (typeof (window as any).APP_FORCE_LOGGING === 'undefined') {
  (window as any).APP_FORCE_LOGGING = null;
}

function shouldLog(level: 'error' | 'warn' | 'info' | 'debug' | 'log' = 'log'): boolean {
  if (typeof (window as any).APP_FORCE_LOGGING === 'boolean') {
    return (window as any).APP_FORCE_LOGGING ? true : level === 'error';
  }
  if (IS_DEV_MODE) {
    return true;
  } else {
    return level === 'error';
  }
}

const logger = {
  log: (...args: any[]) => {
    if (shouldLog('log')) {
      console.log('[LOG]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (shouldLog('info')) {
      console.info('%c[INFO]', 'color: blue; font-weight: bold;', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (shouldLog('warn')) {
      console.warn('%c[WARN]', 'color: orange; font-weight: bold;', ...args);
    }
  },
  error: (...args: any[]) => {
    if (shouldLog('error')) {
      console.error('%c[ERROR]', 'color: red; font-weight: bold;', ...args);
    }
  },
  debug: (...args: any[]) => {
    if (shouldLog('debug')) {
      console.debug('%c[DEBUG]', 'color: green; font-weight: bold;', ...args);
    }
  },
  setForceLogging: (value: boolean | null) => {
    if (typeof value === 'boolean' || value === null) {
      (window as any).APP_FORCE_LOGGING = value;
      console.info(
        `%c[LOGGER_CONFIG] APP_FORCE_LOGGING установлен в: ${value}`,
        'color: purple; font-style: italic;',
      );
    } else {
      console.warn(
        '%c[LOGGER_CONFIG] Неверное значение для setForceLogging. Ожидается boolean или null.',
        'color: purple; font-style: italic;',
      );
    }
  },
  isLoggingEnabledForLevel: (level: 'error' | 'warn' | 'info' | 'debug' | 'log'): boolean => shouldLog(level),
  isDevMode: (): boolean => IS_DEV_MODE,
  getForceLoggingStatus: (): boolean | null => (window as any).APP_FORCE_LOGGING,
};

if (IS_DEV_MODE && (window as any).APP_FORCE_LOGGING !== false) {
  console.log(
    `%c[LOGGER_INIT] Логгер инициализирован. Режим разработки: ${IS_DEV_MODE}. Принудительное логирование: ${(window as any).APP_FORCE_LOGGING === null ? 'не установлено (по умолчанию)' : (window as any).APP_FORCE_LOGGING}. Ошибки всегда логируются (если APP_FORCE_LOGGING не false).`,
    'color: purple; font-style: italic;',
  );
}

export default logger;
