<!-- src/components/NavMenu.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const isMenuOpen = ref(false)
const router = useRouter()

// --- НАЧАЛО ИЗМЕНЕНИЙ ---
// Обновляем массив, чтобы исправить иконку и изменить порядок
const menuItems = [
  { path: '/', labelKey: 'nav.home', icon: '🏠' },
  { path: '/tacktics', labelKey: 'nav.tacktics', icon: '🧩', group: 'games' },
  { path: '/finish-him', labelKey: 'nav.finishHim', icon: '🎯', group: 'games' },
  { path: '/attack', labelKey: 'nav.attack', icon: '⚔️', group: 'games' },
  { path: '/tower', labelKey: 'nav.tower', icon: '🏁', group: 'games' },
  { path: '/records', labelKey: 'nav.leaderboards', icon: '🏆' },
  { path: '/lichess-clubs', labelKey: 'nav.lichessClubs', icon: '🏰' },
  { path: '/user-cabinet', labelKey: 'nav.userCabinet', icon: '👤' },
  { path: '/pricing', labelKey: 'nav.pricing', icon: '💰' },
  { path: '/about', labelKey: 'nav.about', icon: 'ℹ️' },
]
// --- КОНЕЦ ИЗМЕНЕНИЙ ---

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const navigateAndClose = (path: string) => {
  router.push(path)
  isMenuOpen.value = false
}
</script>

<template>
  <button class="menu-toggle" @click="toggleMenu">
    <svg
      class="menu-icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M3 18H21V16H3V18ZM3 13H21V11H3V13ZM3 6V8H21V6H3Z" />
    </svg>
  </button>
  <!-- --- НАЧАЛО ИЗМЕНЕНИЙ: Убираем группировку, оставляя единый список --- -->
  <div class="desktop-menu-wrapper">
    <nav>
      <template v-for="item in menuItems" :key="item.path">
        <a @click="navigateAndClose(item.path)" class="nav-item-link">
          <span class="nav-item-icon">{{ item.icon }}</span>
          <span class="nav-item-text">{{ t(item.labelKey) }}</span>
        </a>
      </template>
    </nav>
  </div>
  <!-- --- КОНЕЦ ИЗМЕНЕНИЙ --- -->

  <div v-if="isMenuOpen" class="mobile-menu-overlay" @click="toggleMenu">
    <div class="mobile-menu-wrapper" @click.stop>
      <nav>
        <!-- --- НАЧАЛО ИЗМЕНЕНИЙ: Убираем группировку и разделители --- -->
        <template v-for="item in menuItems" :key="item.path">
          <a @click="navigateAndClose(item.path)" class="nav-item-link">
            <span class="nav-item-icon">{{ item.icon }}</span>
            <span class="nav-item-text">{{ t(item.labelKey) }}</span>
          </a>
        </template>
        <!-- --- КОНЕЦ ИЗМЕНЕНИЙ --- -->
      </nav>
    </div>
  </div>
</template>

<style scoped>
/* Стили для десктопного меню */
.menu-toggle {
  display: none;
}
.desktop-menu-wrapper {
  display: block;
}
nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.25rem;
  padding: 1rem;
  background-color: var(--color-bg-secondary);
}
.nav-item-link {
  color: var(--color-text-link);
  text-decoration: none;
  font-weight: var(--font-weight-normal);
  transition: color 0.2s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.nav-item-link:hover {
  color: var(--color-text-link-hover);
}
.router-link-active {
  color: var(--color-accent-primary);
  font-weight: var(--font-weight-bold);
  text-decoration: underline;
}

/* Стили для мобильного меню */
.mobile-menu-overlay {
  display: none;
}
.mobile-menu-overlay nav {
  flex-direction: column;
  gap: 0; /* Сброс gap для мобильного меню */
}
.mobile-menu-wrapper {
  background-color: var(--color-bg-secondary);
  width: 40%;
  max-width: 300px;
  box-shadow: -4px 0 15px rgba(0, 0, 0, 0.2);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.mobile-menu-wrapper .nav-item-link {
  padding: 0.5rem 0;
  width: 100%;
  border-bottom: 1px solid var(--color-border);
}
.mobile-menu-wrapper .nav-item-link:last-child {
  border-bottom: none;
}
.mobile-menu-wrapper .game-modes-group-mobile {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.group-header-mobile {
  font-size: var(--font-size-xsmall);
  color: var(--color-text-muted);
  text-transform: uppercase;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}
.menu-divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 0.5rem 0;
}

/* Адаптивность */
@media (max-width: 768px) {
  .desktop-menu-wrapper {
    display: none;
  }
  .menu-toggle {
    display: block;
    background: none;
    border: none;
    cursor: pointer;
    padding: 10px;
    color: var(--color-text-default);
  }
  .menu-icon {
    width: 24px;
    height: 24px;
  }
  .mobile-menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: flex-end;
    z-index: 1001;
  }
}
</style>
