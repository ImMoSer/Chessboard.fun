// src/router/index.ts
import { useGameStore } from '@/entities/game'
import { useFinishHimStore } from '@/features/finish-him/model/finishHim.store'
import i18n from '@/shared/config/i18n'
import { useUiStore } from '@/shared/ui/model/ui.store'
import { watch } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/entities/user'
import { useOpeningSparringStore } from '@/features/opening-sparring/model/openingSparring.store'
import { usePracticalChessStore } from '@/features/practical-chess/model/practicalChess.store'
import { useTheoryEndingsStore } from '@/features/theory-endings/model/theoryEndings.store'
import { useTornadoStore } from '@/features/tornado/model/tornado.store'

import AboutView from '@/pages/AboutView.vue'
import FinishHimView from '@/pages/FinishHimView.vue'
import PricingView from '@/pages/PricingView.vue'
import RecordsPageView from '@/pages/RecordsPageView.vue'
import WelcomeView from '@/pages/WelcomeView.vue'

import TornadoMistakesView from '@/pages/TornadoMistakesView.vue'
import TornadoView from '@/pages/TornadoView.vue'
import UserCabinetView from '@/pages/UserCabinetView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'welcome',
      component: WelcomeView,
    },

    {
      path: '/sandbox',
      name: 'sandbox-base',
      redirect:
        '/sandbox/play/MOZER_2000/white/rnbqkbnr/ppp1pppp/8/3p4/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2',
    },
    {
      path: '/sandbox/play/:engineId([A-Z0-9_]+)/:userColor(white|black)/:fen(.+)',
      name: 'sandbox-with-engine-and-color',
      component: () => import('@/pages/SandboxView.vue'),
      meta: { isGame: true, game: 'sandbox', requiresAuth: true },
    },
    {
      path: '/sandbox/play/:engineId([A-Z0-9_]+)/:fen(.+)',
      name: 'sandbox-with-engine',
      component: () => import('@/pages/SandboxView.vue'),
      meta: { isGame: true, game: 'sandbox', requiresAuth: true },
    },
    {
      path: '/sandbox/play/:fen(.+)', // :fen(.+) for supporting FENs with slashes
      name: 'sandbox',
      component: () => import('@/pages/SandboxView.vue'),
      meta: { isGame: true, game: 'sandbox', requiresAuth: true },
    },
    {
      path: '/finish-him',
      name: 'finish-him-selection',
      component: () => import('@/pages/EndingSelectionView.vue'),
      meta: { requiresAuth: true, gameMode: 'finish-him' },
    },
    {
      path: '/finish-him/play',
      name: 'finish-him-play',
      component: FinishHimView,
      meta: { isGame: true, requiresAuth: true, game: 'finish-him' },
    },
    {
      path: '/finish-him/playout/:color/:fen',
      name: 'finish-him-playout',
      component: FinishHimView,
      meta: { isGame: true, requiresAuth: true, game: 'finish-him' },
    },
    {
      path: '/finish-him/:puzzleId',
      name: 'finish-him-puzzle',
      component: FinishHimView,
      meta: { isGame: true, requiresAuth: true, game: 'finish-him' },
    },

    {
      path: '/tornado',
      name: 'tornado-selection',
      component: () => import('@/pages/EndingSelectionView.vue'),
      meta: { requiresAuth: true, gameMode: 'tornado' },
    },
    {
      path: '/tornado/:mode',
      name: 'tornado',
      component: TornadoView,
      meta: { isGame: true, requiresAuth: true, game: 'tornado' },
    },
    {
      path: '/tornado/mistakes',
      name: 'tornado-mistakes',
      component: TornadoMistakesView,
      meta: { requiresAuth: true },
    },
    {
      path: '/user-cabinet/:id?',
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
      path: '/records/:id?',
      name: 'records',
      component: RecordsPageView,
    },
    {
      path: '/pricing',
      name: 'pricing',
      component: PricingView,
    },
    {
      path: '/diamond-hunter/:openingSlug?/:color?',
      name: 'diamond-hunter',
      component: () => import('@/pages/DiamondHunterView.vue'),
      meta: { isGame: true, game: 'opening-training', requiresAuth: true },
    },
    {
      path: '/opening-sparring/:openingSlug?/:color?',
      name: 'opening-sparring',
      component: () => import('@/pages/OpeningSparringView.vue'),
      meta: { isGame: true, game: 'opening-sparring', requiresAuth: true },
    },
    {
      path: '/opening-trainer/:openingSlug?/:color?',
      redirect: (to) => ({
        name: 'diamond-hunter',
        params: to.params,
      }),
    },

    {
      path: '/theory-endings',
      name: 'theory-endings-selection',
      component: () => import('@/pages/EndingSelectionView.vue'),
      meta: { requiresAuth: true, gameMode: 'theory' },
    },
    {
      path: '/theory-endings/play/:type?/:puzzleId?',
      name: 'theory-endings-play',
      component: () => import('@/pages/TheoryEndingView.vue'),
      meta: { isGame: true, requiresAuth: true, game: 'theory' },
    },
    {
      path: '/theory-endings/:type(win|draw)/:puzzleId',
      name: 'theory-endings-puzzle',
      component: () => import('@/pages/TheoryEndingView.vue'),
      meta: { isGame: true, requiresAuth: true, game: 'theory' },
    },
    {
      path: '/study',
      name: 'study',
      component: () => import('@/pages/StudyView.vue'),
      meta: { isGame: true, game: 'study', requiresAuth: true }, // Optional requiresAuth
    },
    {
      path: '/study/chapter/:slug',
      name: 'study-chapter',
      component: () => import('@/pages/StudyView.vue'),
      meta: { isGame: true, game: 'study', requiresAuth: true },
    },
    {
      path: '/study/local/:id',
      name: 'study-local',
      component: () => import('@/pages/StudyView.vue'),
      meta: { isGame: true, game: 'study', requiresAuth: true },
    },
    {
      path: '/practical-chess',
      name: 'practical-chess',
      component: () => import('@/pages/EndingSelectionView.vue'),
      meta: { requiresAuth: true, gameMode: 'practical' },
    },
    {
      path: '/practical-chess/play/:id?',
      name: 'practical-chess-play',
      component: () => import('@/pages/PracticalChessView.vue'),
      meta: { isGame: true, requiresAuth: true, game: 'practical-chess' },
    },
    {
      path: '/practical-chess/:id',
      name: 'practical-chess-puzzle',
      component: () => import('@/pages/PracticalChessView.vue'),
      meta: { isGame: true, requiresAuth: true, game: 'practical-chess' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: '/about',
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const gameStore = useGameStore()
  const uiStore = useUiStore()
  const authStore = useAuthStore()
  const t = i18n.global.t

  if (authStore.isLoading) {
    await new Promise<void>((resolve) => {
      const unwatch = watch(
        () => authStore.isLoading,
        (isLoading) => {
          if (!isLoading) {
            unwatch()
            resolve()
          }
        },
      )
    })
  }

  const requiresAuth = to.meta.requiresAuth
  const isAuthenticated = authStore.isAuthenticated

  // Bypass auth for "example" mode
  if (to.params.id === 'example') {
    return next()
  }

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

    if (userConfirmedLogin === 'confirm') {
      authStore.login()
    }
    return next(false)
  }

  if (from.meta.isGame && to.meta.game !== from.meta.game) {
    const isTornadoToMistakes = from.name === 'tornado' && to.name === 'tornado-mistakes'

    if (gameStore.isGameActive && !isTornadoToMistakes) {
      const userConfirmed = await uiStore.showConfirmation(
        t('gameplay.confirmExit.title'),
        t('gameplay.confirmExit.message'),
      )

      if (userConfirmed === 'confirm') {
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
  const fromBaseRoute = String(from.name)
  const toBaseRoute = String(to.name)

  // Исключение для перехода из режима "Торнадо" на страницу ошибок "Торнадо"
  const isTornadoToMistakes = fromBaseRoute === 'tornado' && toBaseRoute === 'tornado-mistakes'

  if (fromBaseRoute === 'finish-him' && toBaseRoute !== 'finish-him') {
    useFinishHimStore().reset()
  } else if (fromBaseRoute === 'tornado' && toBaseRoute !== 'tornado' && !isTornadoToMistakes) {
    useTornadoStore().reset()
  } else if (
    fromBaseRoute?.startsWith('theory-endings') &&
    !toBaseRoute?.startsWith('theory-endings')
  ) {
    useTheoryEndingsStore().reset()
  } else if (
    fromBaseRoute?.startsWith('practical-chess') &&
    !toBaseRoute?.startsWith('practical-chess')
  ) {
    usePracticalChessStore().reset()
  } else if (fromBaseRoute === 'opening-sparring' && toBaseRoute !== 'opening-sparring') {
    useOpeningSparringStore().reset()
  }
})

export default router
