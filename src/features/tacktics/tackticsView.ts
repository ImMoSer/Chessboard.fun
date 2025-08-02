// src/features/tacktics/tackticsView.ts
import { h } from 'snabbdom';
import type { VNode, Hooks } from 'snabbdom';
import type { Key } from 'chessground/types';
import { TackticsController } from './tackticsController';
import { BoardView } from '../../shared/components/boardView';
import { renderPromotionDialog } from '../common/promotion/promotionView';
import { t } from '../../core/i18n.service';
import { renderAnalysisPanel } from '../analysis/analysisPanelView';
import type { TacticalTrainerStats, TacticalThemeStat } from '../../core/webhook.service';

let boardViewInstance: BoardView | null = null;

export interface TackticsPageViewLayout {
  left: VNode | null;
  center: VNode;
  right: VNode | null;
  topPanelContent?: VNode | null;
}

function renderUserStats(stats: TacticalTrainerStats | null): VNode {
    if (!stats) {
        return h('div.user-stats-container', [
            h('h4.stats-title', t('tacktics.stats.title', { defaultValue: 'Your Stats' })),
            h('p', t('common.loading', { defaultValue: 'Loading...' }))
        ]);
    }

    const themeRows = Object.entries(stats.theme_stats)
      .sort(([, a], [, b]) => b.total_attempts - a.total_attempts)
      .map(([theme, themeStat]: [string, TacticalThemeStat]) => {
        const successRate = themeStat.total_attempts > 0
            ? ((themeStat.solved / themeStat.total_attempts) * 100).toFixed(0) + '%'
            : '-';
        return h('tr', { key: theme }, [
            h('td.theme-name', t(`tacktics.themes.${theme}`, { defaultValue: theme })),
            h('td.theme-rating', String(themeStat.rating)),
            h('td.theme-progress', `${themeStat.solved}/${themeStat.total_attempts}`),
            h('td.theme-rate', successRate),
        ]);
    });

    return h('div.user-stats-container', [
        h('h4.stats-title', t('tacktics.stats.title', { defaultValue: 'Your Stats' })),
        h('div.global-rating-box', [
            h('span.global-rating-label', t('tacktics.stats.globalRating', { defaultValue: 'Global Rating' })),
            h('span.global-rating-value', String(stats.global_rating))
        ]),
        h('div.theme-stats-table-wrapper', [
            h('table.theme-stats-table', [
                h('thead', h('tr', [
                    h('th', t('tacktics.stats.theme')),
                    h('th', t('tacktics.stats.rating')),
                    h('th', t('tacktics.stats.progress')),
                    h('th', t('tacktics.stats.rate')),
                ])),
                h('tbody', themeRows)
            ])
        ])
    ]);
}

function renderPuzzleInfo(controller: TackticsController): VNode | null {
    const { activePuzzle } = controller.state;
    if (!activePuzzle) return null;
    
    // <<< НАЧАЛО ИЗМЕНЕНИЙ
    const localizedThemes = activePuzzle.Themes_PG
        .map(theme => t(`tacktics.themes.${theme}`, { defaultValue: theme }))
        .join(', ');
    // <<< КОНЕЦ ИЗМЕНЕНИЙ

    return h('div.puzzle-info-container', [
        h('h4.puzzle-info-title', t('tacktics.puzzleInfo.title', { defaultValue: 'Puzzle Info' })),
        h('div.puzzle-info-grid', [
            h('div.puzzle-info-item', [
                h('span.info-label', t('tacktics.puzzleInfo.rating', { defaultValue: 'Rating' }) + ':'),
                h('span.info-value', String(activePuzzle.Rating))
            ]),
            h('div.puzzle-info-item', [
                h('span.info-label', t('tacktics.puzzleInfo.themes', { defaultValue: 'Themes' }) + ':'),
                h('span.info-value', localizedThemes) // <<< ИСПОЛЬЗУЕМ ЛОКАЛИЗОВАННУЮ СТРОКУ
            ]),
        ])
    ]);
}

export function renderTackticsUI(controller: TackticsController): TackticsPageViewLayout {
  const { boardHandler, state } = controller;

  let promotionDialogVNode: VNode | null = null;
  if (controller.services.chessboardService.ground) {
    const groundState = controller.services.chessboardService.ground.state;
    const boardOrientation = groundState.orientation;
    const boardDomBounds = groundState.dom?.bounds();
    if (boardDomBounds) {
      promotionDialogVNode = renderPromotionDialog(boardHandler.promotionCtrl, boardOrientation, boardDomBounds);
    }
  }

  const boardWrapperHook: Hooks = {
    insert: (vnode: VNode) => {
      const wrapperEl = vnode.elm as HTMLElement;
      const boardContainerEl = wrapperEl.querySelector('#board-container') as HTMLElement | null;
      if (boardContainerEl) {
        boardViewInstance = new BoardView(
          boardContainerEl,
          boardHandler,
          controller.services.chessboardService,
          (orig: Key, dest: Key) => controller.handleUserMove(orig, dest)
        );
      }
    },
    update: (_oldVnode: VNode, vnode: VNode) => {
      if (boardViewInstance) {
        const newBoardContainerEl = (vnode.elm as Element)?.querySelector('#board-container') as HTMLElement | null;
        if (boardViewInstance.container !== newBoardContainerEl && newBoardContainerEl) {
            boardViewInstance.destroy();
            boardViewInstance = new BoardView(
              newBoardContainerEl,
              boardHandler,
              controller.services.chessboardService,
              (orig, dest) => controller.handleUserMove(orig, dest)
            );
        } else {
            boardViewInstance.updateView();
        }
      }
    },
    destroy: () => {
      if (boardViewInstance) {
        boardViewInstance.destroy();
        boardViewInstance = null;
      }
    }
  };

  const centerContent = h('div#board-wrapper', { 
    key: `tacktics-board-wrapper-${state.activePuzzle?.PuzzleId || 'idle'}`, 
    hook: boardWrapperHook 
  }, [
    h('div#board-container.cg-wrap', { key: 'tacktics-board-container' }),
    promotionDialogVNode
  ]);

  const analysisPanelWrapper = (state.gamePhase === 'GAMEOVER')
    ? h('div.analysis-panel-wrapper', [
        renderAnalysisPanel(controller.analysisController)
      ])
    : null;

  const rightPanelContent = h('div.tacktics-right-panel', [
    renderPuzzleInfo(controller),
    analysisPanelWrapper,
  ].filter(Boolean) as VNode[]);

  const leftPanelContent = h('div.tacktics-left-panel', [
    renderUserStats(state.tacticalStats)
  ]);
  
  const feedbackVNode = h('div#tacktics-feedback', [
      h('p', state.gameOverMessage || state.feedbackMessage)
  ]);

  return {
    left: leftPanelContent,
    center: centerContent,
    right: rightPanelContent,
    topPanelContent: feedbackVNode,
  };
}
