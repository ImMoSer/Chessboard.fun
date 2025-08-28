// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useGameStore } from '../stores/game.store'
import { useUiStore } from '../stores/ui.store'
import i18n from '../services/i18n'
import { useAnalysisStore } from '../stores/analysis.store'
import { useAttackStore } from '../stores/attack.store'
import { useFinishHimStore } from '../stores/finishHim.store'
import { useTackticsStore } from '../stores/tacktics.store'
import { useTowerStore } from '../stores/tower.store'
import { useAuthStore } from '../stores/auth.store'

import FinishHimView from '../views/FinishHimView.vue'
import WelcomeView from '../views/WelcomeView.vue'
import AboutView from '../views/AboutView.vue'
import PricingView from '../views/PricingView.vue'
import AttackView from '../views/AttackView.vue'
import ClubPageView from '../views/ClubPageView.vue'
import LichessClubsView from '../views/LichessClubsView.vue'
import RecordsPageView from '../views/RecordsPageView.vue'
import TackticsView from '../views/TackticsView.vue'
import TowerView from '../views/TowerView.vue'
import UserCabinetView from '../views/UserCabinetView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'welcome',
      component: WelcomeView,
    },
    {
      path: '/finish-him/:puzzleId?',
      name: 'finish-him',
      component: FinishHimView,
      meta: { isGame: true, requiresAuth: true },
    },
    {
      path: '/attack/:puzzleId?',
      name: 'attack',
      component: AttackView,
      meta: { isGame: true, requiresAuth: true },
    },
    {
      path: '/tacktics/:puzzleId?',
      name: 'tacktics',
      component: TackticsView,
      meta: { isGame: true, requiresAuth: true },
    },
    {
      path: '/tower/:towerId?',
      name: 'tower',
      component: TowerView,
      meta: { isGame: true, requiresAuth: true },
    },
    {
      path: '/user-cabinet',
      name: 'user-cabinet',
      component: UserCabinetView,
      meta: { requiresAuth: true },
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView,
    },
    {
      path: '/pricing',
      name: 'pricing',
      component: PricingView,
    },
    {
      path: '/clubs/:clubId',
      name: 'clubs',
      component: ClubPageView,
    },
    {
      path: '/lichess-clubs',
      name: 'lichess-clubs',
      component: LichessClubsView,
    },
    {
      path: '/records',
      name: 'records',
      component: RecordsPageView,
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const gameStore = useGameStore()
  const uiStore = useUiStore()
  const authStore = useAuthStore()
  const t = i18n.global.t

  while (authStore.isLoading) {
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  const requiresAuth = to.meta.requiresAuth
  const isAuthenticated = authStore.isAuthenticated

  if (requiresAuth && !isAuthenticated) {
    // --- НАЧАЛО ИЗМЕНЕНИЙ: Сохраняем целевой URL перед редиректом ---
    localStorage.setItem('redirect_after_login', to.fullPath)
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---

    const userConfirmedLogin = await uiStore.showConfirmation(
      t('auth.requiredForAction'),
      t('userCabinet.loginPrompt'),
      {
        confirmText: t('nav.loginWithLichess'),
        showCancel: true,
      },
    )

    if (userConfirmedLogin) {
      authStore.login()
    }
    return next(false)
  }

  if (from.meta.isGame && from.name !== to.name) {
    if (gameStore.isGameActive) {
      const userConfirmed = await uiStore.showConfirmation(
        t('gameplay.confirmExit.title'),
        t('gameplay.confirmExit.message'),
      )

      if (userConfirmed) {
        await gameStore.resetGame()
        next()
      } else {
        next(false)
      }
    } else {
      await gameStore.resetGame()
      next()
    }
  } else {
    next()
  }
})

router.afterEach(async (to, from) => {
  const analysisStore = useAnalysisStore()
  if (analysisStore.isPanelVisible) {
    await analysisStore.resetAnalysisState()
  }

  const fromBaseRoute = String(from.name)
  const toBaseRoute = String(to.name)

  if (fromBaseRoute === 'tower' && toBaseRoute !== 'tower') {
    useTowerStore().reset()
  } else if (fromBaseRoute === 'attack' && toBaseRoute !== 'attack') {
    useAttackStore().reset()
  } else if (fromBaseRoute === 'finish-him' && toBaseRoute !== 'finish-him') {
    useFinishHimStore().reset()
  } else if (fromBaseRoute === 'tacktics' && toBaseRoute !== 'tacktics') {
    useTackticsStore().reset()
  }
})

export default router
