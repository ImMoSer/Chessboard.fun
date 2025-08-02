// src/features/welcome/welcomeView.ts
import { h } from 'snabbdom';
import type { VNode } from 'snabbdom';
import type { WelcomeController } from './welcomeController';
import logger from '../../utils/logger';
import { t } from '../../core/i18n.service';
import { type AppController } from '../../AppController';
import { renderLanguageSwitcher } from '../../appView';

function renderModeButton(textKey: string, defaultText: string, href: string, icon: string): VNode {
    return h('a.mode-button', { props: { href } }, [
        h('span.mode-button-icon', icon),
        h('span.mode-button-text', t(textKey, { defaultValue: defaultText }))
    ]);
}

export function renderWelcomePage(controller: WelcomeController, appController: AppController): VNode {
  const { isAuthProcessing, authError } = controller.state;
  const isAuthenticated = controller.authService.getIsAuthenticated();

  logger.debug('[WelcomeView] Rendering Welcome Page. isAuthProcessing:', isAuthProcessing, 'Error:', authError);

  return h('div.welcome-page-container', [
    h('div.welcome-content', [
      h('img.welcome-logo', {
        props: {
          src: '/png/ChessBoard.png',
          alt: t('app.title')
        }
      }),
      h('h1.welcome-title', t('welcome.titleV2', { defaultValue: 'Select a Game Mode' })),
      
      h('div.mode-selection-container', [
        renderModeButton('welcome.buttons.finishHim', 'Finish Him', '#/finishHim', '🎯'),
        renderModeButton('welcome.buttons.tower', 'Tower', '#/tower', '🏁'),
        renderModeButton('welcome.buttons.attack', 'Attack', '#/attack', '⚔️'),
        renderModeButton('welcome.buttons.tacktics', 'Tacktics', '#/tacktics', '🧩'),
        renderModeButton('welcome.buttons.clubs', 'Lichess Clubs', '#/clubs', '🏰'),
        // NEW: Добавляем кнопку для Leaderboards
        renderModeButton('welcome.buttons.leaderboards', 'Leaderboards', '#/recordsPage', '🏆') // ИСПРАВЛЕНО: ссылка на #/recordsPage
      ]),

      !isAuthenticated ? h('div.login-section', [
        h('p.login-prompt', t('welcome.loginPrompt', { defaultValue: 'Or log in to access all features:' })),
        h('button.login-button.button-primary', {
            on: { click: () => controller.handleLogin() },
            attrs: { disabled: isAuthProcessing }
        }, isAuthProcessing ? t('common.processing') : t('nav.loginWithLichess')),
      ]) : null,

      authError ? h('p.error-message', `Error: ${authError}`) : null,
    ]),
    h('div.language-switcher-container', [
      renderLanguageSwitcher(appController)
    ]),
  ]);
}
