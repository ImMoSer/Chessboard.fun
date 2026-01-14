// src/router/index.ts
import { watch } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import i18n from '../services/i18n'
import { useAnalysisStore } from '../stores/analysis.store'
import { useFinishHimStore } from '../stores/finishHim.store'
import { useGameStore } from '../stores/game.store'
import { useUiStore } from '../stores/ui.store'

import { useAuthStore } from '../stores/auth.store'
import { useTornadoStore } from '../stores/tornado.store'

import AboutView from '../views/AboutView.vue'
import FinishHimView from '../views/FinishHimView.vue'
import PricingView from '../views/PricingView.vue'
import RecordsPageView from '../views/RecordsPageView.vue'
import WelcomeView from '../views/WelcomeView.vue'

import FunclubLatestBattleView from '../views/FunclubLatestBattleView.vue'
import ModeSelectionView from '../views/ModeSelectionView.vue'
import TornadoMistakesView from '../views/TornadoMistakesView.vue'
import TornadoView from '../views/TornadoView.vue'
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
      path: '/sandbox',
      name: 'sandbox-base',
      redirect: '/sandbox/play/MOZER_2000/white/rnbqkbnr/ppp1pppp/8/3p4/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2',
    },
    {
      path: '/sandbox/play/:engineId([A-Z0-9_]+)/:userColor(white|black)/:fen(.+)',
      name: 'sandbox-with-engine-and-color',
      component: () => import('../views/SandboxView.vue'),
      meta: { isGame: true, game: 'sandbox' },
    },
    {
      path: '/sandbox/play/:engineId([A-Z0-9_]+)/:fen(.+)',
      name: 'sandbox-with-engine',
      component: () => import('../views/SandboxView.vue'),
      meta: { isGame: true, game: 'sandbox' },
    },
    {
      path: '/sandbox/play/:fen(.+)', // :fen(.+) for supporting FENs with slashes
      name: 'sandbox',
      component: () => import('../views/SandboxView.vue'),
      meta: { isGame: true, game: 'sandbox' },
    },
    {
      path: '/finish-him',
      name: 'finish-him-selection',
      component: () => import('../views/AdvantageSelectionView.vue'),
      meta: { requiresAuth: true, gameMode: 'finish-him' },
    },
    {
      path: '/finish-him/play',
      name: 'finish-him-play',
      component: FinishHimView,
      meta: { isGame: true, requiresAuth: true, game: 'finish-him' },
    },
    {
      path: '/finish-him/play/:puzzleId',
      name: 'finish-him-puzzle',
      component: FinishHimView,
      meta: { isGame: true, requiresAuth: true, game: 'finish-him' },
    },
    {
      path: '/finish-him/:puzzleId',
      redirect: (to) => ({
        name: 'finish-him-puzzle',
        params: { puzzleId: to.params.puzzleId },
      }),
    },

    {
      path: '/tornado',
      name: 'tornado-selection',
      component: ModeSelectionView,
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
    {
      path: '/opening-training/:openingSlug?/:color?',
      name: 'opening-training',
      component: () => import('../views/OpeningTrainingView.vue'),
      meta: { isGame: true, game: 'opening-training' },
    },
    {
      path: '/opening-sparring/:openingSlug?/:color?',
      name: 'opening-sparring',
      component: () => import('../views/OpeningExamView.vue'),
      meta: { isGame: true, game: 'opening-sparring' },
    },
    {
      path: '/opening-trainer/:openingSlug?/:color?',
      redirect: (to) => ({
        name: 'opening-training',
        params: to.params
      })
    },
    {
      path: '/finish-him/playout/:color/:fen',
      name: 'finish-him-playout',
      component: FinishHimView,
      meta: { isGame: true, requiresAuth: true, game: 'finish-him' },
    },
    {
      path: '/theory-endings',
      name: 'theory-endings-selection',
      component: () => import('../views/TheoryEndingSelectionView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/theory-endings/play/:type?/:puzzleId?',
      name: 'theory-endings-play',
      component: () => import('../views/TheoryEndingView.vue'),
      meta: { isGame: true, requiresAuth: true, game: 'theory' },
    },
    {
      path: '/theory-endings/:type(win|draw)/:puzzleId',
      redirect: (to) => ({
        name: 'theory-endings-play',
        params: { type: to.params.type, puzzleId: to.params.puzzleId },
      }),
    },
    {
      path: '/study',
      name: 'study',
      component: () => import('../views/StudyView.vue'),
      meta: { isGame: true, game: 'study', requiresAuth: true }, // Optional requiresAuth
    },
    {
      path: '/practical-chess',
      name: 'practical-chess',
      component: () => import('../views/PracticalChessSelectionView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/practical-chess/play/:id?',
      name: 'practical-chess-play',
      component: () => import('../views/PracticalChessView.vue'),
      meta: { isGame: true, requiresAuth: true, game: 'practical-chess' },
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
  const analysisStore = useAnalysisStore()
  if (analysisStore.isPanelVisible) {
    await analysisStore.resetAnalysisState()
  }

  const fromBaseRoute = String(from.name)
  const toBaseRoute = String(to.name)

  // Исключение для перехода из режима "Торнадо" на страницу ошибок "Торнадо"
  const isTornadoToMistakes = fromBaseRoute === 'tornado' && toBaseRoute === 'tornado-mistakes'

  if (fromBaseRoute === 'finish-him' && toBaseRoute !== 'finish-him') {
    useFinishHimStore().reset()
  } else if (fromBaseRoute === 'tornado' && toBaseRoute !== 'tornado' && !isTornadoToMistakes) {
    useTornadoStore().reset()
  } else if (fromBaseRoute?.startsWith('theory-endings') && !toBaseRoute?.startsWith('theory-endings')) {
    const { useTheoryEndingsStore } = await import('../stores/theoryEndings.store')
    useTheoryEndingsStore().reset()
  } else if (fromBaseRoute?.startsWith('practical-chess') && !toBaseRoute?.startsWith('practical-chess')) {
    const { usePracticalChessStore } = await import('../stores/practicalChess.store')
    usePracticalChessStore().reset()
  }
})

export default router
