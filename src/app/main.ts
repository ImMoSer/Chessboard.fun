// src/main.ts
import '@/assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

import i18n from '@/shared/config/i18n'
import FallbackApp from './FallbackApp.vue'

// Basic synchronous checks
const checkEnvironment = () => {
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined'
  const hasCacheApi = 'caches' in window
  const hasOpfs = navigator.storage && typeof navigator.storage.getDirectory === 'function'

  return hasSharedArrayBuffer && hasCacheApi && hasOpfs
}

async function boot() {
  // Phase 1: Environment Validation
  if (!checkEnvironment()) {
    console.error('Environment check failed. Minimal requirements (SharedArrayBuffer, Cache, OPFS) not met.')
    // Mount the minimal fallback app (OOPS! screen)
    const fallbackApp = createApp(FallbackApp)
    fallbackApp.use(i18n)
    fallbackApp.mount('#app')
    return // Stop execution of the main app
  }

  // Phase 2: Core Infrastructure Initialization
  try {
    const { databaseClient } = await import('@/shared/api/storage/DatabaseClient')
    await databaseClient.init()
  } catch (error) {
    console.error('Failed to initialize database client during boot:', error)
    // If DB fails, we can't run the app. Show fallback.
    const fallbackApp = createApp(FallbackApp)
    fallbackApp.use(i18n)
    fallbackApp.mount('#app')
    return
  }

  // Phase 3: Application Assembly
  const App = (await import('./App.vue')).default
  const router = (await import('./router')).default
  const { setupErrorHandler } = await import('./lib/error-handler')
  
  const app = createApp(App)
  const pinia = createPinia()

  setupErrorHandler(app)

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes by default
      },
    },
  })

  app.use(pinia)
  app.use(router)
  app.use(i18n)
  app.use(VueQueryPlugin, { queryClient })

  // Phase 4: State Initialization
  const { useAuthStore } = await import('@/entities/user')
  const authStore = useAuthStore()
  await authStore.initialize()

  if (authStore.isAuthenticated) {
    const redirectPath = localStorage.getItem('redirect_after_login')
    if (redirectPath) {
      localStorage.removeItem('redirect_after_login')
      router.push(redirectPath)
    }
  }

  // Phase 5: Mount Main App
  app.mount('#app')
}

boot().catch(console.error)
