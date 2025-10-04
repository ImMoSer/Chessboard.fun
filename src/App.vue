<!-- src/App.vue -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import NavMenu from './components/NavMenu.vue'
import SettingsMenu from './components/SettingsMenu.vue'
import ConfirmationModal from './components/ConfirmationModal.vue'
import InfoModal from './components/InfoModal.vue' // Импорт InfoModal
import { useGameStore } from './stores/game.store'
import { useFinishHimStore } from './stores/finishHim.store'
import { useUiStore } from './stores/ui.store' // Импорт useUiStore

const gameStore = useGameStore()
const finishHimStore = useFinishHimStore()
const uiStore = useUiStore() // Инициализация uiStore
const { t } = useI18n()
const route = useRoute()

// --- НАЧАЛО ИЗМЕНЕНИЙ: Проверяем, является ли текущая страница страницей для скриншота ---
const isScreenshotView = computed(() => route.name === 'funclub-latest-battle')
// --- КОНЕЦ ИЗМЕНЕНИЙ ---

// Обработчик для перезагрузки/закрытия страницы
const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
  if (gameStore.isGameActive) {
    // Стандартный способ показать браузерное окно подтверждения
    event.preventDefault()
    // Chrome требует установки returnValue
    event.returnValue = t('gameplay.confirmExit.browserMessage')

    // Синхронно обновляем локальное состояние
    gameStore.handleGameResignation()

    // Надежно отправляем статистику на сервер в зависимости от режима игры
    if (gameStore.currentGameMode === 'finish-him') {
      finishHimStore.handleUnloadResignation()
    }
    // TODO: Добавить обработчики для других режимов игры (attack, tower)
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', beforeUnloadHandler)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', beforeUnloadHandler)
})
</script>

<template>
  <!-- --- НАЧАЛО ИЗМЕНЕНИЙ: Скрываем header для страницы скриншота --- -->
  <header v-if="!isScreenshotView" class="app-header">
    <!-- --- КОНЕЦ ИЗМЕНЕНИЙ --- -->
    <div class="header-content">
      <div class="logo">
        <RouterLink to="/">
          <img src="/png/1920_Banner.png" alt="Logo" class="logo-image" />
        </RouterLink>
      </div>

      <div class="navigation-wrapper">
        <NavMenu />
        <SettingsMenu />
      </div>
    </div>
  </header>

  <main id="page-content-wrapper">
    <RouterView />
  </main>

  <ConfirmationModal />
  <InfoModal v-if="uiStore.isInfoModalVisible" />
</template>

<style scoped>
.app-header {
  background-color: var(--color-bg-secondary);
  position: sticky;
  top: 0;
  z-index: 1000;
  padding: 0 10px;
}

.header-content {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
  height: var(--header-height, 50px);
}

.logo-image {
  height: calc(var(--header-height, 50px) - 20px);
  width: auto;
  padding-top: 8px;
}

.navigation-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
  /* Расстояние между меню и шестеренкой */
}

@media (orientation: portrait) {
  .header-content {
    justify-content: space-between;
  }
}
</style>
