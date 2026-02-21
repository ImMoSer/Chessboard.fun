// src/main.ts
import './assets/main.css'

import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import i18n from '@/shared/config/i18n'

import { useAuthStore } from '@/entities/user/auth.store'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes by default
    },
  },
})

async function initializeApp() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)
  app.use(i18n)
  app.use(VueQueryPlugin, { queryClient })

  const authStore = useAuthStore()
  await authStore.initialize()

  // --- НАЧАЛО ИЗМЕНЕНИЙ: Логика редиректа после входа ---
  if (authStore.isAuthenticated) {
    const redirectPath = localStorage.getItem('redirect_after_login')
    if (redirectPath) {
      localStorage.removeItem('redirect_after_login') // Очищаем, чтобы не было повторных редиректов
      router.push(redirectPath)
    }
  }
  // --- КОНЕЦ ИЗМЕНЕНИЙ ---

  app.mount('#app')
}

initializeApp()
