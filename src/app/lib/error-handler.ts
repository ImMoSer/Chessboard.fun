import logger from '@/shared/lib/logger';
import type { App, ComponentPublicInstance } from 'vue';

export function setupErrorHandler(app: App) {
  // 1. Vue Global Error Handler
  app.config.errorHandler = (err: unknown, instance: ComponentPublicInstance | null, info: string) => {
    const error = err instanceof Error ? err : new Error(String(err));
    
    logger.error('[Vue Error]:', error, {
        info,
        component: instance?.$options?.name || instance?.$options?.__name || 'UnknownComponent'
    });
  };

  // 2. Global Script Errors (window.onerror)
  window.onerror = (message, source, lineno, colno, error) => {
    logger.error('[Window Error]:', {
        message: typeof message === 'string' ? message : 'Script Error',
        source,
        lineno,
        colno,
        error
    });
    return false; // Позволяем ошибке всплыть в консоль
  };

  // 3. Unhandled Promise Rejections
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('[Unhandled Rejection]:', event.reason);
  });
}
