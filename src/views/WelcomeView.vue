<!-- src/views/WelcomeView.vue -->
<script setup lang="ts">
import { changeLang } from '@/services/i18n'
import { useAuthStore } from '@/stores/auth.store'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

// Инициализируем хранилище, роутер и i18n
const authStore = useAuthStore()
const { t, locale } = useI18n()

// Получаем реактивные свойства из хранилища
const { isAuthenticated, isLoading, error } = storeToRefs(authStore)

// Метод для обработки входа
const handleLogin = async () => {
  if (isLoading.value) {
    return
  }
  await authStore.login()
}

// Метод для смены языка
const handleChangeLang = (lang: 'en' | 'ru' | 'de') => {
  changeLang(lang)
}
</script>

<template>
  <div class="welcome-page-container">
    <div class="welcome-content">
      <img class="welcome-logo" src="/jpg/mainLogo_bg_101014.jpg" :alt="t('app.title')" />

      <div class="mode-selection-container">
        <router-link class="mode-button" to="/finish-him">
          <span class="mode-button-icon">🎯</span>
          <span class="mode-button-text">{{ t('welcome.buttons.finishHim') }}</span>
        </router-link>

        <router-link class="mode-button" to="/theory-endings">
          <span class="mode-button-icon">📚</span>
          <span class="mode-button-text">{{ t('welcome.buttons.theoryEndings') }}</span>
        </router-link>

        <router-link class="mode-button" to="/user-cabinet">
          <span class="mode-button-icon">👤</span>
          <span class="mode-button-text">{{ t('nav.userCabinet') }}</span>
        </router-link>
        <router-link class="mode-button" to="/tornado">
          <span class="mode-button-icon">🌪️</span>
          <span class="mode-button-text">{{ t('nav.tornado') }}</span>
        </router-link>
        <router-link class="mode-button" to="/funclub">
          <span class="mode-button-icon">🏰</span>
          <span class="mode-button-text">{{ t('welcome.buttons.clubs') }}</span>
        </router-link>
        <router-link class="mode-button" to="/records">
          <span class="mode-button-icon">🏆</span>
          <span class="mode-button-text">{{ t('welcome.buttons.leaderboards') }}</span>
        </router-link>
        <router-link class="mode-button training-btn" to="/opening-training">
          <span class="mode-button-icon">🏫</span>
          <span class="mode-button-text">{{ t('welcome.buttons.openingTraining') }}</span>
        </router-link>
        <router-link class="mode-button exam-btn" to="/opening-exam">
          <span class="mode-button-icon">🏆</span>
          <span class="mode-button-text">{{ t('welcome.buttons.openingExam') }}</span>
        </router-link>
        <router-link class="mode-button" to="/study">
          <span class="mode-button-icon">🎓</span>
          <span class="mode-button-text">{{ t('welcome.buttons.study') }}</span>
        </router-link>
      </div>

      <div v-if="!isAuthenticated" class="login-section">
        <p class="login-prompt">
          {{ t('welcome.loginPrompt') }}
        </p>
        <button class="login-button button-primary" @click="handleLogin" :disabled="isLoading">
          {{ isLoading ? t('common.processing') : t('nav.loginWithLichess') }}
        </button>
      </div>

      <p v-if="error" class="error-message">{{ `Error: ${error}` }}</p>
    </div>

    <div class="language-switcher-container">
      <button class="lang-button" :class="{ active: locale === 'en' }" @click="handleChangeLang('en')">
        EN
      </button>
      <span class="lang-separator">|</span>
      <button class="lang-button" :class="{ active: locale === 'ru' }" @click="handleChangeLang('ru')">
        RU
      </button>
      <span class="lang-separator">|</span>
      <button class="lang-button" :class="{ active: locale === 'de' }" @click="handleChangeLang('de')">
        DE
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Стили из welcome.css */
.welcome-page-container {
  position: relative;
  /* Добавлено для создания контекста позиционирования */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  /* Изменено с 80vh на 100vh для полной высоты экрана */
  text-align: center;
  padding: 20px;
  padding-bottom: 30px;
  /* Добавлен отступ снизу для языкового переключателя */
  box-sizing: border-box;
  background-color: var(--color-bg-primary);
  color: var(--color-text-default);
}

.language-switcher-container {
  position: relative;
  bottom: 20px;
  display: flex;
  gap: 10px;
  align-items: center;
  z-index: 10;
  /* Добавлен z-index для гарантии отображения поверх других элементов */
  margin-top: 50px;
}

.lang-button {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
  cursor: pointer;
  transition: color 0.2s ease;
}

.lang-button:hover {
  color: var(--color-text-default);
}

.lang-button.active {
  color: var(--color-text-link);
  font-weight: var(--font-weight-bold);
}

.lang-separator {
  color: var(--color-text-muted);
}

.welcome-content {
  max-width: 800px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 25px;
}

.welcome-logo {
  max-width: 100%;
  height: auto;
  border-radius: 20px;
  box-shadow: 0 0 20px rgba(0, 191, 255, 0.6),
    0 0 40px rgba(0, 0, 255, 0.4),
    inset 0 0 15px rgba(0, 191, 255, 0.5);
  animation: blue-flame-pulse 2s infinite ease-in-out;
  border: 1px solid rgba(0, 191, 255, 0.3);
}

@keyframes blue-flame-pulse {

  0%,
  100% {
    box-shadow: 0 0 15px rgba(0, 191, 255, 0.6),
      0 0 30px rgba(0, 0, 255, 0.4),
      inset 0 0 10px rgba(0, 191, 255, 0.5);
    transform: scale(1);
  }

  50% {
    box-shadow: 0 0 25px rgba(0, 255, 255, 0.8),
      0 0 50px rgba(30, 144, 255, 0.6),
      inset 0 0 20px rgba(0, 191, 255, 0.6);
    transform: scale(1.005);
  }
}

.welcome-title {
  font-size: var(--font-size-xxlarge);
  color: var(--color-accent-primary);
  margin: 0;
}

.mode-selection-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  width: 100%;
  margin-top: 20px;
}

.mode-button {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-hover);
  border-radius: var(--panel-border-radius);
  padding: 25px 20px;
  text-decoration: none;
  color: var(--color-text-default);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.mode-button:hover {
  transform: translateY(-5px);
  border-color: var(--color-accent-primary);
  background-color: var(--color-bg-tertiary);
  color: var(--color-accent-primary);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.mode-button-icon {
  font-size: 3rem;
  line-height: 1;
}

.mode-button-text {
  line-height: 1.1;
  font-size: var(--font-size-xlarge);
}

.training-btn:hover {
  border-color: var(--color-accent-info) !important;
  color: var(--color-accent-info) !important;
}

.exam-btn:hover {
  border-color: var(--color-accent-warning) !important;
  color: var(--color-accent-warning) !important;
}

.login-section {
  margin-top: 30px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.login-prompt {
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
}

.login-button.button-primary {
  background-color: var(--color-accent-primary);
  color: var(--color-text-dark);
  border: 1px solid var(--color-accent-primary);
  padding: 12px 25px;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  border-radius: var(--panel-border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 220px;
}

.login-button.button-primary:hover:not(:disabled) {
  background-color: var(--color-text-link-hover);
  border-color: var(--color-text-link-hover);
  color: var(--color-text-on-accent);
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.error-message {
  color: var(--color-text-error);
  background-color: rgba(229, 57, 53, 0.15);
  border: 1px solid var(--color-accent-error);
  padding: 10px 15px;
  border-radius: var(--panel-border-radius);
  font-size: var(--font-size-small);
  width: 100%;
  box-sizing: border-box;
  margin-top: 10px;
}

/* Адаптация для мобильных устройств */
@media (orientation: portrait) {
  .welcome-page-container {
    padding-bottom: 60px;
    /* Уменьшенный отступ для мобильных */
  }

  .welcome-content {
    gap: 20px;
  }

  .welcome-title {
    font-size: var(--font-size-xlarge);
  }

  .mode-selection-container {
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }

  .mode-button {
    padding: 10px;
    font-size: var(--font-size-small);
  }

  .language-switcher-container {
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
  }

  .lang-button {
    font-size: var(--font-size-small);
  }

  .lang-separator {
    font-size: var(--font-size-small);
  }

  .mode-button-text {
    font-size: var(--font-size-large);
  }
}
</style>
