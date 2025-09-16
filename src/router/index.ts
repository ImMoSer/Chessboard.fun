// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useGameStore } from '../stores/game.store'
import { useUiStore } from '../stores/ui.store'
import i18n from '../services/i18n'
import { useAnalysisStore } from '../stores/analysis.store'
import { useAttackStore } from '../stores/attack.store'
import { useFinishHimStore } from '../stores/finishHim.store'
import { useTowerStore } from '../stores/tower.store'
import { useAuthStore } from '../stores/auth.store'
import { useTornadoStore } from '../stores/tornado.store'

import FinishHimView from '../views/FinishHimView.vue'
import WelcomeView from '../views/WelcomeView.vue'
import AboutView from '../views/AboutView.vue'
import PricingView from '../views/PricingView.vue'
import AttackView from '../views/AttackView.vue'
import RecordsPageView from '../views/RecordsPageView.vue'
import TowerView from '../views/TowerView.vue'
import UserCabinetView from '../views/UserCabinetView.vue'
import TornadoSelectionView from '../views/TornadoSelectionView.vue'
import TornadoView from '../views/TornadoView.vue'
import TornadoMistakesView from '../views/TornadoMistakesView.vue'
import FunclubLatestBattleView from '../views/FunclubLatestBattleView.vue'

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
      path: '/tower/:towerId?',
      name: 'tower',
      component: TowerView,
      meta: { isGame: true, requiresAuth: true },
    },
    {
      path: '/tornado',
      name: 'tornado-selection',
      component: TornadoSelectionView,
      meta: { requiresAuth: true },
    },
    {
      path: '/tornado/:mode',
      name: 'tornado',
      component: TornadoView,
      meta: { isGame: true, requiresAuth: true },
    },
    {
      path: '/tornado/mistakes',
      name: 'tornado-mistakes',
      component: TornadoMistakesView,
      meta: { requiresAuth: true },
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
      path: '/funclub',
      name: 'funclub',
      component: () => import('../views/FunclubView.vue'),
    },
    {
      path: '/funclub/latestbattle/:lang?',
      name: 'funclub-latest-battle',
      component: FunclubLatestBattleView,
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
    localStorage.setItem('redirect_after_login', to.fullPath)

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
    const isTornadoToMistakes = from.name === 'tornado' && to.name === 'tornado-mistakes'

    if (gameStore.isGameActive && !isTornadoToMistakes) {
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

  // Исключение для перехода из режима "Торнадо" на страницу ошибок "Торнадо"
  const isTornadoToMistakes = fromBaseRoute === 'tornado' && toBaseRoute === 'tornado-mistakes'

  if (fromBaseRoute === 'tower' && toBaseRoute !== 'tower') {
    useTowerStore().reset()
  } else if (fromBaseRoute === 'attack' && toBaseRoute !== 'attack') {
    useAttackStore().reset()
  } else if (fromBaseRoute === 'finish-him' && toBaseRoute !== 'finish-him') {
    useFinishHimStore().reset()
  } else if (fromBaseRoute === 'tornado' && toBaseRoute !== 'tornado' && !isTornadoToMistakes) {
    useTornadoStore().reset()
  }
})

export default router

