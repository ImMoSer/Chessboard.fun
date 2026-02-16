<!-- src/App.vue -->
<script setup lang="ts">
import { MenuOutline } from '@vicons/ionicons5'
import { darkTheme, type GlobalThemeOverrides } from 'naive-ui'
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterView } from 'vue-router'
import ConfirmationModal from './components/ConfirmationModal.vue'
import InfoModal from './components/InfoModal.vue'
import NavMenu from './components/NavMenu.vue'
import SettingsMenu from './components/SettingsMenu.vue'
import GalaxyBackground from './components/visuals/GalaxyBackground.vue'
import { useFinishHimStore } from './stores/finishHim.store'
import { useGameStore } from './stores/game.store'
import { useUiStore } from './stores/ui.store'

const gameStore = useGameStore()
const finishHimStore = useFinishHimStore()
const uiStore = useUiStore()
const { t } = useI18n()

const isLandscape = ref(false)
const isSidebarCollapsed = ref(true)
const isDrawerOpen = ref(false)

/**
 * Тема Naive UI, настроенная под CSS проекта
 */
const themeOverrides: GlobalThemeOverrides = {
  common: {
    fontFamily: 'Neucha, cursive',
    primaryColor: '#00f2ff',
    primaryColorHover: '#00d7e6',
    primaryColorPressed: '#00d7e6',
    primaryColorSuppl: '#00d7e6',
    borderRadius: '12px',
  },
  Card: {
    color: 'rgba(15, 17, 26, 0.45)',
    borderColor: 'rgba(0, 242, 255, 0.15)',
  },
  DataTable: {
    tdColor: 'transparent',
    tdColorHover: 'rgba(0, 242, 255, 0.05)',
    tdColorStriped: 'rgba(255, 255, 255, 0.03)',
    thColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(0, 242, 255, 0.15)',
  },
}

const openDrawer = () => {
  isDrawerOpen.value = true
}


// Обработчик для перезагрузки/закрытия страницы
const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
  if (gameStore.isGameActive) {
    event.preventDefault()
    event.returnValue = t('gameplay.confirmExit.browserMessage')
    gameStore.handleGameResignation()
    if (gameStore.currentGameMode === 'finish-him') {
      finishHimStore.handleUnloadResignation()
    }
  }
}

const mediaQuery = window.matchMedia('(min-width: 769px) and (orientation: landscape)')
const updateLandscape = () => (isLandscape.value = mediaQuery.matches)

onMounted(() => {
  mediaQuery.addEventListener('change', updateLandscape)
  updateLandscape() // Initial check
  window.addEventListener('beforeunload', beforeUnloadHandler)
})

onUnmounted(() => {
  mediaQuery.removeEventListener('change', updateLandscape)
  window.removeEventListener('beforeunload', beforeUnloadHandler)
})
</script>

<template>
  <n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <n-layout has-sider position="absolute" class="root-layout">
          <!-- Desktop Sidebar (Landscape) -->
          <n-layout-sider
            v-if="isLandscape"
            bordered
            collapse-mode="width"
            :collapsed-width="64"
            :width="260"
            :collapsed="isSidebarCollapsed"
            show-trigger
            class="app-sider"
            @collapse="isSidebarCollapsed = true"
            @expand="isSidebarCollapsed = false"
          >
            <!-- Top Action Bar (Settings) -->
            <div class="sider-top-bar">
              <SettingsMenu />
            </div>

            <div class="sider-header">
              <RouterLink to="/" class="logo-link">
                <img
                  :src="isSidebarCollapsed ? '/png/ChessBoard_fun.png' : '/png/1920_Banner.png'"
                  alt="Logo"
                  :class="isSidebarCollapsed ? 'logo-collapsed' : 'logo-full'"
                />
              </RouterLink>
            </div>

            <NavMenu :collapsed="isSidebarCollapsed" />
          </n-layout-sider>

          <n-layout class="main-layout-container">
            <!-- Mobile Header (Portrait) -->
            <n-layout-header
              v-if="!isLandscape"
              bordered
              class="mobile-header"
            >
              <n-button quaternary circle @click="openDrawer">
                <template #icon>
                  <n-icon>
                    <MenuOutline />
                  </n-icon>
                </template>
              </n-button>

              <RouterLink to="/" class="mobile-logo">
                <img src="/png/ChessBoard_fun.png" alt="Logo" height="32" />
              </RouterLink>

              <SettingsMenu />
            </n-layout-header>

            <!-- Page Content -->
            <n-layout-content :content-style="{ height: '100%' }" class="page-content">
              <RouterView />
            </n-layout-content>
          </n-layout>

          <!-- Mobile Menu Drawer (Swipe-out) -->
          <n-drawer v-model:show="isDrawerOpen" placement="left" :width="280">
            <n-drawer-content closable class="mobile-drawer-content">
              <template #header>
                <n-space align="center">
                  <img src="/png/ChessBoard_fun.png" alt="Logo" height="30" />
                  <n-text strong>Chessboard.fun</n-text>
                </n-space>
              </template>
              <NavMenu @select="isDrawerOpen = false" />
            </n-drawer-content>
          </n-drawer>

          <ConfirmationModal />
          <InfoModal v-if="uiStore.infoModalKey" />
        </n-layout>
        <GalaxyBackground />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style>
/* Global Layout Fixes */
.root-layout {
  height: 100vh;
  background-color: transparent !important;
}

.main-layout-container {
  background-color: transparent !important;
}

.app-sider {
  background-color: var(--glass-bg) !important;
  backdrop-filter: var(--glass-blur);
  z-index: 1000;
  border-right: 1px solid var(--glass-border) !important;
}

.sider-top-bar {
  padding: 8px 0;
  display: flex;
  justify-content: center;
  align-items: center;
  border-bottom: 1px solid var(--glass-border);
}

.sider-header {
  padding: 8px 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50px;
}

.logo-link {
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-full {
  max-width: 150px;
  height: auto;
}

.logo-collapsed {
  width: 30px;
  height: 30px;
}

.mobile-header {
  height: 56px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--glass-bg) !important;
  backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid var(--glass-border) !important;
}

.mobile-drawer-content :deep(.n-drawer-header__main) {
  width: 100%;
}

.page-content {
  background-color: transparent !important;
  height: calc(100vh - 56px);
}

@media (min-width: 769px) and (orientation: landscape) {
  .page-content {
    height: 100vh;
  }
}
</style>
