<script setup lang="ts">
import { changeLang } from '@/services/i18n'
import { useAuthStore } from '@/entities/user/auth.store'
import {
  BookOutline,
  BuildOutline,
  DiamondOutline,
  FlashOutline,
  HammerOutline,
  LogInOutline,
  PersonOutline,
  SchoolOutline,
  ThunderstormOutline,
  TrophyOutline
} from '@vicons/ionicons5'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref } from 'vue'
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

// Конфигурация карточек меню для чистоты кода в шаблоне
const menuItems = [
  { path: '/finish-him', icon: HammerOutline, labelKey: 'welcome.buttons.finishHim', color: '#f5222d' },
  { path: '/tornado', icon: ThunderstormOutline, labelKey: 'nav.tornado', color: '#1890ff' },
  { path: '/theory-endings', icon: BookOutline, labelKey: 'welcome.buttons.theoryEndings', color: '#722ed1' },
  { path: '/practical-chess', icon: BuildOutline, labelKey: 'welcome.buttons.practicalChess', color: '#fa8c16' },
  { path: '/diamond-hunter', icon: DiamondOutline, labelKey: 'welcome.buttons.openingTraining', color: '#13c2c2' },
  { path: '/opening-sparring', icon: FlashOutline, labelKey: 'welcome.buttons.openingSparring', color: '#eb2f96' },
  { path: '/study', icon: SchoolOutline, labelKey: 'welcome.buttons.study', color: '#52c41a' },
  { path: '/user-cabinet', icon: PersonOutline, labelKey: 'nav.userCabinet', color: '#faad14' },
  { path: '/records', icon: TrophyOutline, labelKey: 'welcome.buttons.leaderboards', color: '#fadb14' }
]

// Mobile detection logic
const isMobile = ref(false)
const updateMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  updateMobile()
  window.addEventListener('resize', updateMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateMobile)
})

// Filter items for mobile (hide 'study')
const filteredMenuItems = computed(() => {
  if (isMobile.value) {
    return menuItems.filter((item) => item.path !== '/study')
  }
  return menuItems
})
</script>

<template>
  <div class="welcome-container">
    <div class="content-wrapper">

      <!-- Hero Section -->
      <div class="hero-section">
        <img
          src="/svg/1280х256_ob.svg"
          :alt="t('app.title')"
          class="hero-logo"
        />

        <!-- Login Button (Visible only if not authenticated) -->
        <div v-if="!isAuthenticated" class="auth-section">
          <n-button
            type="primary"
            size="large"
            :loading="isLoading"
            class="login-btn"
            @click="handleLogin"
          >
            <template #icon>
              <n-icon><LogInOutline /></n-icon>
            </template>
            {{ t('nav.loginWithLichess') }}
          </n-button>
        </div>

        <n-text v-if="error" type="error" class="error-text">
          {{ `Error: ${error}` }}
        </n-text>
      </div>

      <!-- Mode Selection Grid -->
      <n-grid
        x-gap="16"
        y-gap="16"
        cols="2 s:3 m:3 l:3"
        responsive="screen"
        class="menu-grid"
      >
        <n-grid-item v-for="item in filteredMenuItems" :key="item.path">
          <router-link :to="item.path" custom v-slot="{ navigate }">
            <n-card
              hoverable
              class="menu-card glass-card"
              @click="navigate"
              :bordered="false"
            >
              <div class="card-content">
                <n-icon size="32" :color="item.color" class="card-icon">
                  <component :is="item.icon" />
                </n-icon>
                <n-text class="card-title">
                  {{ t(item.labelKey) }}
                </n-text>
              </div>
            </n-card>
          </router-link>
        </n-grid-item>
      </n-grid>

      <!-- Language Switcher -->
      <div class="footer-section">
        <n-space justify="center" size="small">
          <button
            class="lang-text-btn"
            :class="{ active: locale === 'en' }"
            @click="handleChangeLang('en')"
          >
            EN
          </button>
          <span class="lang-divider">|</span>
          <button
            class="lang-text-btn"
            :class="{ active: locale === 'ru' }"
            @click="handleChangeLang('ru')"
          >
            RU
          </button>
          <span class="lang-divider">|</span>
          <button
            class="lang-text-btn"
            :class="{ active: locale === 'de' }"
            @click="handleChangeLang('de')"
          >
            DE
          </button>
        </n-space>
      </div>

    </div>
  </div>
</template>

<style scoped>
.welcome-container {
  height: 100%;
  width: 100%;
  background: none;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
  box-sizing: border-box;
  overflow: hidden; /* Prevent scrolling */
}

.content-wrapper {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1000px;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2vh; /* Use vh for dynamic vertical spacing */
}

.hero-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  flex-shrink: 0;
}

.hero-logo {
  max-width: 90%;
  max-height: 20vh; /* Limit height to fit screen */
  width: auto;
  height: auto;

}

.auth-section {
  margin-top: 5px;
}

.menu-grid {
  width: 100%;
  flex-grow: 1; /* Allow grid to take available space */
  display: flex; /* Fix for centering content if needed, though grid handles cols */
  align-content: center; /* Center rows vertically if they don't fill */
  justify-content: center;
  max-height: 60vh;
}

/* Glassmorphism Card Style */
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--panel-border-radius);
  transition: all 0.2s ease;
  cursor: pointer;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.glass-card:hover {
  transform: translateY(-4px);
  border-color: var(--color-neon-cyan);
  background: var(--glass-bg-hover);
  box-shadow: 0 0 20px rgba(0, 242, 255, 0.15);
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px;
  text-align: center;
  width: 100%;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.2;
}

.footer-section {
  margin-top: auto;
  padding: 10px 0;
  flex-shrink: 0;
}

/* Custom Text Buttons for Language to match App style */
.lang-text-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.9rem;
  color: var(--color-text-muted);
  padding: 0 5px;
  transition: color 0.2s;
}

.lang-text-btn:hover {
  color: var(--color-text-default);
}

.lang-text-btn.active {
  color: var(--color-accent-primary);
  font-weight: bold;
}

.lang-divider {
  color: var(--color-text-muted);
  opacity: 0.5;
}

/* Mobile Adaptation */
@media (max-width: 768px) {
  .content-wrapper {
    gap: 1.4vh;
  }

  .hero-section {
    gap: 10px;
  }

  .hero-logo {
    max-height: 14vh;
  }

  .menu-grid {
    gap: 6px !important;
  }

  .glass-card {
    border-radius: 6px;
  }

  .card-content {
    padding: 6px;
    gap: 4px;
  }

  .card-icon {
    font-size: 20px !important;
  }

  .card-title {
    font-size: 0.75rem;
  }
}
</style>
