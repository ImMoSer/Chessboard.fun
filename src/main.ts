// src/main.ts
import './assets/main.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import i18n from './services/i18n'

import { useAuthStore } from './stores/auth.store'

async function initializeApp() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)
  app.use(i18n)

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
