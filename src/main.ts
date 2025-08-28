// src/main.ts
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './services/i18n'

// Импортируем наши сторы и сервисы
import { useAuthStore } from './stores/auth.store'
import { useThemeStore } from './stores/theme.store'
import { analysisService } from './services/AnalysisService'

async function initializeApp() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)
  app.use(i18n)

  // --- Инициализация сторов и сервисов ---
  // Сначала инициализируем аутентификацию
  const authStore = useAuthStore()
  await authStore.initialize()

  // Сразу после этого инициализируем тему
  const themeStore = useThemeStore()

  // Инициализируем сервис анализа (движок) при старте приложения
  await analysisService.initialize()

  // Только теперь монтируем приложение
  app.mount('#app')
}

initializeApp()
