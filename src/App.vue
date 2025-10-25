<!-- src/App.vue -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
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

const isSidebarCollapsed = ref(false)

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}


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
  <header v-if="!isScreenshotView" class="app-header" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <button class="sidebar-toggle" @click="toggleSidebar">
      <svg v-if="isSidebarCollapsed" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>
    </button>
    <!-- --- КОНЕЦ ИЗМЕНЕНИЙ --- -->
    <div class="header-content">
      <div class="top-bar" :class="{ collapsed: isSidebarCollapsed }">
        <div class="logo">
          <RouterLink to="/">
            <img v-if="isSidebarCollapsed" src="/png/ChessBoard_fun.png" alt="Logo" class="logo-image-collapsed" />
            <img v-else src="/png/1920_Banner.png" alt="Logo" class="logo-image" />
          </RouterLink>
        </div>
        <SettingsMenu />
      </div>

      <div class="navigation-wrapper">
        <NavMenu :is-sidebar-collapsed="isSidebarCollapsed" />
      </div>
    </div>
  </header>

  <main id="page-content-wrapper">
    <RouterView />
  </main>

  <ConfirmationModal />
  <InfoModal v-if="uiStore.infoModalKey" />
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

@media (min-width: 769px) and (orientation: landscape) {
  .app-header {
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    width: 11vw;
    padding: 1rem;
    border-right: 1px solid var(--color-border);
    z-index: 1000;
    overflow-y: auto;
    /* Add scroll for smaller heights */
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 2rem;
    height: auto;
  }

  .top-bar.collapsed {
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .logo-image-collapsed {
    width: 40px;
    height: 40px;
  }

  #page-content-wrapper {
    margin-left: 200px;
    transition: margin-left 0.3s ease;
  }

  .app-header.sidebar-collapsed {
    width: 80px; /* Increased width for collapsed view */
  }

  .app-header.sidebar-collapsed + #page-content-wrapper {
    margin-left: 80px; /* Match collapsed width */
  }

  .sidebar-toggle {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-left: none;
    color: var(--color-text-default);
    cursor: pointer;
    padding: 0.5rem 0.2rem;
    position: absolute;
    top: 50%;
    right: -25px; 
    transform: translateY(-50%);
    z-index: 1100;
    border-radius: 0 4px 4px 0;
  }

  .sidebar-toggle svg {
    width: 24px;
    height: 24px;
    fill: currentColor;
  }
}
</style>
