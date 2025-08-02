// src/appView.ts
import { h } from 'snabbdom';
import type { VNode, Hooks } from 'snabbdom';
import type { AppController, AppPage, Toast } from './AppController';
import { FinishHimController } from './features/finishHim/finishHimController';
import { renderFinishHimUI, type FinishHimPageViewLayout } from './features/finishHim/finishHimView';
import { WelcomeController } from './features/welcome/welcomeController';
import { renderWelcomePage } from './features/welcome/welcomeView';
import { ClubPageController } from './features/clubPage/ClubPageController';
import { renderClubPage } from './features/clubPage/clubPageView';
import { RecordsPageController } from './features/recordsPage/RecordsPageController';
import { renderRecordsPage } from './features/recordsPage/RecordsPageView';
import { UserCabinetController } from './features/userCabinet/UserCabinetController';
import { renderUserCabinetPage } from './features/userCabinet/userCabinetView';
import { TowerController } from './features/tower/TowerController';
import { renderTowerUI, type TowerPageViewLayout } from './features/tower/towerView';
import { AttackController } from './features/attack/attackController';
import { renderAttackUI, type AttackPageViewLayout } from './features/attack/attackView';
import { TackticsController } from './features/tacktics/tackticsController';
import { renderTackticsUI, type TackticsPageViewLayout } from './features/tacktics/tackticsView';
import { LichessClubsController } from './features/lichessClubs/LichessClubsController';
import { renderLichessClubsPage } from './features/lichessClubs/lichessClubsView';
import { renderAboutPage } from './features/about/aboutView';
import logger from './utils/logger';
import { getCurrentLang, t } from './core/i18n.service';
import { initializeResizer } from './features/common/resizer';
import type { BoardTheme, PieceSet } from './core/theme.service';
import { renderControlPanel } from './shared/components/controlPanelView';

function renderToasts(controller: AppController): VNode | null {
  const { toasts } = controller.state;
  if (!toasts || toasts.length === 0) {
    return null;
  }

  return h('div.toast-container', toasts.map((toast: Toast) => 
    h('div.toast-message', {
      key: toast.id,
      class: {
        'toast--success': toast.type === 'success',
        'toast--error': toast.type === 'error',
      },
      hook: {
        insert: (vnode) => {
          (vnode.elm as HTMLElement).classList.add('fade-in');
        }
      }
    }, toast.message)
  ));
}

function renderModal(controller: AppController): VNode | null {
  const appState = controller.state;

  if (appState.isConfirmationModalVisible) {
    const confirmText = appState.confirmButtonText || t('common.confirm', { defaultValue: 'Confirm' });
    const cancelText = appState.cancelButtonText || t('common.cancel', { defaultValue: 'Cancel' });

    return h('div.modal-overlay.confirmation-overlay', {
      on: { click: () => controller.handleCancelConfirmation() }
    }, [
      h('div.modal-content', {
        on: { click: (e: Event) => e.stopPropagation() }
      }, [
        h('p.modal-message', appState.confirmationModalMessage || ''),
        h('div.modal-button-group', [
          h('button.button.modal-cancel-button', {
            on: { click: () => controller.handleCancelConfirmation() }
          }, cancelText),
          h('button.button.modal-confirm-button', {
            on: { click: () => controller.handleConfirm() }
          }, confirmText)
        ])
      ])
    ]);
  }

  if (appState.isRateLimited) {
    const modalContentChildren = [
      h('h3.rate-limit-title', t('errors.rateLimit.title', { defaultValue: 'Too Many Requests' })),
      h('p.modal-message', appState.modalMessage),
    ];

    if (appState.rateLimitCooldownSeconds <= 0) {
      modalContentChildren.push(
        h('button.button.modal-ok-button', {
          on: { click: () => controller.handleRateLimitModalOk() }
        }, t('common.ok', { defaultValue: 'OK' }))
      );
    }

    return h('div.modal-overlay.rate-limit-overlay', {}, [
      h('div.modal-content', {
        on: { click: (e: Event) => e.stopPropagation() }
      }, modalContentChildren)
    ]);
  }

  if (!appState.isModalVisible || !appState.modalMessage) {
    return null;
  }

  return h('div.modal-overlay', {
    on: { click: () => controller.hideModal() }
  }, [
    h('div.modal-content', {
      on: { click: (e: Event) => e.stopPropagation() }
    }, [
      h('p.modal-message', appState.modalMessage),
      h('button.button.modal-ok-button', {
        on: { click: () => controller.hideModal() }
      }, t('common.ok', { defaultValue: 'OK' }))
    ])
  ]);
}

// Переместил эту функцию сюда, чтобы ее можно было повторно использовать в разных представлениях.
export function renderLanguageSwitcher(controller: AppController): VNode {
  const currentLanguage = getCurrentLang();
  return h('div.language-switcher', [
    h('button.lang-button', {
      class: { active: currentLanguage === 'ru' },
      on: { click: () => controller.handleLanguageChange('ru') }
    }, 'RU'),
    h('span.lang-separator', '|'),
    h('button.lang-button', {
      class: { active: currentLanguage === 'en' },
      on: { click: () => controller.handleLanguageChange('en') }
    }, 'EN'),
    h('span.lang-separator', '|'),
    h('button.lang-button', {
      class: { active: currentLanguage === 'de' },
      on: { click: () => controller.handleLanguageChange('de') }
    }, 'DE')
  ]);
}


function getLinkHref(page: AppPage | undefined): string {
    if (!page) {
        return '#';
    }
    switch (page) {
        case 'recordsPage':
            return '#/records';
        case 'lichessClubs':
            return '#/clubs';
        case 'userCabinet':
            return '#/cabinet';
        default:
            return `#/${page}`;
    }
}

function renderAuthButton(controller: AppController): VNode {
  const isAuthenticated = controller.services.authService.getIsAuthenticated();
  const isProcessing = controller.state.isLoadingAuth;
  const buttonText = isAuthenticated ? t('nav.logout', { defaultValue: 'Logout' }) : t('nav.login', { defaultValue: 'Login' });
  const buttonClass = isAuthenticated ? 'logout-button' : 'login-button';
  return h(`button.button.header-auth-button.${buttonClass}`, {
    attrs: { disabled: isProcessing },
    on: {
      click: async (e: Event) => {
        e.preventDefault();
        if (isAuthenticated) {
          logger.info('[appView] Logout button clicked.');
          await controller.services.authService.logout();
        } else {
          logger.info('[appView] Login button clicked.');
          await controller.services.authService.login();
        }
      }
    }
  }, isProcessing ? t('common.processing', { defaultValue: 'Processing...' }) : buttonText);
}

function renderFunCoinsBalance(controller: AppController): VNode | null {
    const user = controller.state.currentUser;
    if (!user) return null;
    return h('div.funcoins-balance', [
        h('span.coin-icon', '🪙'),
        h('span.coin-amount', String(user.FunCoins ?? 0))
    ]);
}

function renderBoardSelector(controller: AppController): VNode {
    const themeService = controller.services.themeService;
    const availableBoards = themeService.getAvailableBoards();
    const currentBoardName = controller.state.currentTheme.board;

    return h('div.board-selector-panel', [
        h('h4.dropdown-panel-title', t('theme.selectBoard', { defaultValue: 'Select Board' })),
        h('div.board-selector-grid', availableBoards.map((board: BoardTheme) =>
            h('div.board-selector-item', {
                key: board.name,
                class: { selected: board.name === currentBoardName },
                on: { click: () => controller.handleBoardChange(board.name) }
            }, [
                h('img', { props: { src: `/board/jpg_png/${board.thumbnailFile}`, alt: board.name } })
            ])
        ))
    ]);
}

function renderPieceSetSelector(controller: AppController): VNode {
    const themeService = controller.services.themeService;
    const availablePieceSets = themeService.getAvailablePieceSets();
    const currentPieceSetName = controller.state.currentTheme.pieces;

    return h('div.piece-set-selector-panel', [
        h('h4.dropdown-panel-title', t('theme.selectPieces', { defaultValue: 'Select Pieces' })),
        h('div.piece-set-selector-list', availablePieceSets.map((pieceSet: PieceSet) =>
            h('div.piece-set-selector-item', {
                key: pieceSet.name,
                class: { selected: pieceSet.name === currentPieceSetName },
                on: { click: () => controller.handlePieceSetChange(pieceSet.name) }
            }, [
                h('img', { props: { src: pieceSet.previewPieceFile, alt: pieceSet.name } })
            ])
        ))
    ]);
}

function renderVolumeControl(controller: AppController): VNode {
  const { voiceVolume } = controller.state;
  return h('div.dropdown-item.volume-control-item', [
    h('label.volume-label', { props: { for: 'volume-slider' } }, t('settings.voiceVolume', { defaultValue: 'Voice Volume' })),
    h('input#volume-slider.volume-slider', {
      props: {
        type: 'range',
        min: 0,
        max: 1,
        step: 0.1,
        value: voiceVolume,
      },
      on: {
        input: (e: Event) => {
          const target = e.target as HTMLInputElement;
          controller.handleVolumeChange(parseFloat(target.value));
        }
      }
    })
  ]);
}

function renderUserAndAuthSection(controller: AppController): VNode {
    const appState = controller.state;
    const isAuthenticated = controller.services.authService.getIsAuthenticated();
    const username = controller.services.authService.getUserProfile()?.username;

    let dropdownContent: VNode | VNode[] | null = null;
    switch (appState.activeDropdown) {
        case 'user':
            dropdownContent = [
                h('a.dropdown-item', { on: { click: () => { controller.navigateTo('userCabinet'); controller.toggleDropdown(null); } } }, t('nav.userCabinet')),
                h('div.dropdown-item', { on: { click: () => controller.toggleDropdown('board') } }, t('theme.selectBoard')),
                h('div.dropdown-item', { on: { click: () => controller.toggleDropdown('pieces') } }, t('theme.selectPieces')),
                renderVolumeControl(controller),
                h('div.dropdown-item.language-switcher-item', [renderLanguageSwitcher(controller)]), 
                h('div.dropdown-divider'),
                h('a.dropdown-item.logout-link', { on: { click: () => controller.services.authService.logout() } }, t('nav.logout')),
            ];
            break;
        case 'board':
            dropdownContent = renderBoardSelector(controller);
            break;
        case 'pieces':
            dropdownContent = renderPieceSetSelector(controller);
            break;
    }

    return h('div.user-auth-section', [
        renderFunCoinsBalance(controller),
        isAuthenticated ? h('li.dropdown-container', { key: 'user-dropdown' }, [
            h('a.dropdown-trigger', {
                class: { active: appState.activeDropdown !== null },
                props: { title: username || t('nav.profile') },
                on: { click: (e: Event) => { e.preventDefault(); e.stopPropagation(); controller.toggleDropdown('user'); } }
            }, '⚙️'),
            appState.activeDropdown !== null ? h('div.dropdown-menu', {
                on: { click: (e: Event) => e.stopPropagation() }
            }, dropdownContent) : null
        ]) : renderAuthButton(controller)
    ]);
}


export function renderAppUI(controller: AppController): VNode {
  const appState = controller.state;
  const activePageController = controller.activePageController;
  const isAuthenticated = controller.services.authService.getIsAuthenticated();
  
  const navLinksConfig: Array<{
    page?: AppPage,
    textKey?: string,
    text?: string,
    requiresAuth?: boolean,
    hideWhenAuth?: boolean,
  }> = [
    { page: 'finishHim', textKey: 'nav.finishHim', requiresAuth: true },
    { page: 'tower', textKey: 'nav.tower', requiresAuth: true },
    { page: 'attack', textKey: 'nav.attack', requiresAuth: true },
    { page: 'tacktics', textKey: 'nav.tacktics', requiresAuth: true },
    { page: 'lichessClubs', textKey: 'nav.lichessClubs', requiresAuth: true },
    { page: 'recordsPage', textKey: 'nav.leaderboards', requiresAuth: true },
    { page: 'about', textKey: 'nav.about', requiresAuth: false },
  ];

  const visibleNavLinks = navLinksConfig.filter(link => {
    if (link.requiresAuth && !isAuthenticated) return false;
    if (link.hideWhenAuth && isAuthenticated) return false;
    return true;
  });

  let pageSpecificContentVNode: VNode;

  if (appState.isLoadingAuth && appState.currentPage !== 'welcome') {
    pageSpecificContentVNode = h('div.global-loader-container', [
        h('h2', t('auth.processingLogin', {defaultValue: "Processing Login..."})),
        h('div.loading-spinner')
    ]);
  } else if (activePageController) {
    switch (appState.currentPage) {
      case 'welcome':
        pageSpecificContentVNode = renderWelcomePage(activePageController as WelcomeController, controller);
        break;
      case 'finishHim':
        pageSpecificContentVNode = h('div.finish-him-placeholder');
        break;
      case 'tower':
        pageSpecificContentVNode = h('div.tower-placeholder');
        break;
      case 'attack':
        pageSpecificContentVNode = h('div.attack-placeholder');
        break;
      case 'tacktics':
        pageSpecificContentVNode = h('div.tacktics-placeholder');
        break;
      case 'clubPage':
        pageSpecificContentVNode = renderClubPage(activePageController as ClubPageController);
        break;
      case 'lichessClubs':
        pageSpecificContentVNode = renderLichessClubsPage(activePageController as LichessClubsController);
        break;
      case 'recordsPage':
        pageSpecificContentVNode = renderRecordsPage(activePageController as RecordsPageController);
        break;
      case 'userCabinet':
        pageSpecificContentVNode = renderUserCabinetPage(activePageController as UserCabinetController);
        break;
      case 'about':
        pageSpecificContentVNode = renderAboutPage(controller);
        break;
      default:
        const exhaustiveCheck: never = appState.currentPage;
        pageSpecificContentVNode = h('p', t('errorPage.unknownPage', { pageName: exhaustiveCheck }));
        logger.error(`[appView] Reached default case in page switch with page: ${exhaustiveCheck}`);
    }
  } else {
    pageSpecificContentVNode = h('p', t('common.loadingController'));
    logger.debug(`[appView] No active page controller for page: ${appState.currentPage}`);
  }

  const resizeHandleHook: Hooks = {
    insert: (vnode: VNode) => {
        const handleEl = vnode.elm as HTMLElement;
        const cleanup = initializeResizer(handleEl, controller);
        (vnode.data as any).cleanupResizer = cleanup;
    },
    destroy: (vnode: VNode) => {
        const cleanup = (vnode.data as any)?.cleanupResizer;
        if (typeof cleanup === 'function') {
            cleanup();
        }
    }
  };

  let mainContentStructure: VNode;

  if (['finishHim', 'tower', 'attack', 'tacktics'].includes(appState.currentPage)) {
    let layout: FinishHimPageViewLayout | TowerPageViewLayout | AttackPageViewLayout | TackticsPageViewLayout | null = null;
    let keyPrefix = '';

    if (appState.currentPage === 'finishHim' && activePageController instanceof FinishHimController) {
        layout = renderFinishHimUI(activePageController);
        keyPrefix = 'fh';
    } else if (appState.currentPage === 'tower' && activePageController instanceof TowerController) {
        layout = renderTowerUI(activePageController);
        keyPrefix = 'tower';
    } else if (appState.currentPage === 'attack' && activePageController instanceof AttackController) {
        layout = renderAttackUI(activePageController);
        keyPrefix = 'attack';
    } else if (appState.currentPage === 'tacktics' && activePageController instanceof TackticsController) {
        layout = renderTackticsUI(activePageController);
        keyPrefix = 'tacktics';
    }

    if (layout) {
        mainContentStructure = h('div.three-column-layout', {
            class: {
                'portrait-mode-layout': appState.isPortraitMode,
                'no-left-panel': !layout.left && !appState.isPortraitMode,
                'no-right-panel': !layout.right && !appState.isPortraitMode,
            }
        },[
            layout.left ? h('aside#left-panel', { class: { 'portrait-mode-layout': appState.isPortraitMode } }, [layout.left]) : null,
            h('div#center-panel-resizable-wrapper', {
                key: `center-wrapper-${keyPrefix}`,
                class: { 'portrait-mode-layout': appState.isPortraitMode }
            }, [
              h('div.top-board-panel', { key: `top-panel-${keyPrefix}` }, [layout.topPanelContent]),
              h('section#center-panel', [layout.center]),
              h('div.bottom-board-panel', { key: `bottom-panel-${keyPrefix}` }, [renderControlPanel(controller)]),
              appState.isPortraitMode ? null : h('div.resize-handle-center', { hook: resizeHandleHook, key: `center-resize-handle-${keyPrefix}` })
            ]),
            layout.right ? h('aside#right-panel', { class: { 'portrait-mode-layout': appState.isPortraitMode } }, [layout.right]) : null,
        ].filter(Boolean) as VNode[]);
    } else {
        mainContentStructure = pageSpecificContentVNode;
    }
  } else {
    mainContentStructure = pageSpecificContentVNode;
  }

  return h('div#app-layout', {
      on: { 
          click: () => {
              if (appState.activeDropdown) {
                  controller.toggleDropdown(null);
              }
              if (appState.engineSelectorOpen) {
                  controller.toggleEngineSelector();
              }
          }
      }
  }, [
    h('header#app-header', { class: { 'menu-open': appState.isNavExpanded && appState.isPortraitMode } }, [
      h('div.nav-header-content', [
        h('img.app-logo', {
          props: { src: '/svg/1920_Banner.svg', alt: t('app.title') },
          on: { click: () => controller.navigateTo('welcome', true, null) }
        }),
        h('button.nav-toggle-button', {
            on: { click: () => controller.toggleNav() }
        }, appState.isNavExpanded ? '✕' : '☰'),

        h('ul.nav-links',
          [
            ...visibleNavLinks.map(link =>
              h('li', [
                h('a', {
                  class: { active: link.page ? appState.currentPage === link.page : false },
                  props: { href: getLinkHref(link.page) },
                  on: {
                    click: (e: Event) => {
                      e.preventDefault();
                      if (link.page) {
                        controller.navigateTo(link.page, true, null);
                        if (appState.isPortraitMode && appState.isNavExpanded) {
                            controller.toggleNav();
                        }
                      }
                    }
                  }
                }, link.textKey ? t(link.textKey, { defaultValue: link.text || '' }) : (link.text || ''))
              ])
            ),
          ].filter(Boolean) as VNode[]
        ),
        
        renderUserAndAuthSection(controller)
      ])
    ]),
    h('main#page-content-wrapper', [
        mainContentStructure
    ]),
    renderModal(controller),
    renderToasts(controller)
  ]);
}
