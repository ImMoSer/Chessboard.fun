// src/features/attack/attackView.ts
import { h } from 'snabbdom';
import type { VNode, Hooks } from 'snabbdom';
import type { Key } from 'chessground/types';
import { AttackController, formatElapsedTime } from './attackController';
import { BoardView } from '../../shared/components/boardView';
import { renderPromotionDialog } from '../common/promotion/promotionView';
import { t } from '../../core/i18n.service';
import { renderAnalysisPanel } from '../analysis/analysisPanelView';
import type { PuzzleResultEntry } from '../../core/api.types';

let boardViewInstance: BoardView | null = null;

export interface AttackPageViewLayout {
  left: VNode | null;
  center: VNode;
  right: VNode | null;
  topPanelContent?: VNode | null;
}

function renderTimer(controller: AttackController): VNode {
    const timeString = formatElapsedTime(controller.state.elapsedPlayoutTimeMs);
    return h('div.attack-timer-container', [
        h('span#attack-timer-display', timeString)
    ]);
}

function renderPuzzleLeaderboard(results: PuzzleResultEntry[] | null): VNode | null {
    if (!results || results.length === 0) {
        return null;
    }

    const sortedResults = [...results].sort((a, b) => a.time_in_seconds - b.time_in_seconds);

    return h('div.puzzle-leaderboard-container', [
        h('h4.puzzle-leaderboard-title', t('attack.leaderboard.title', { defaultValue: 'Best Times' })),
        h('table.puzzle-leaderboard-table', [
            h('thead', [
                h('tr', [
                    h('th.rank', t('records.table.rank', {defaultValue: '#'})),
                    h('th.player', t('attack.leaderboard.player', { defaultValue: 'Player' })),
                    h('th.time', t('attack.leaderboard.time', { defaultValue: 'Time' }))
                ])
            ]),
            h('tbody', sortedResults.map((result, index) => 
                h('tr', { key: result.lichess_id }, [
                    h('td.rank', `${index + 1}`),
                    h('td.player', h('a', { 
                        props: { href: `https://lichess.org/@/${result.lichess_id}`, target: '_blank', rel: 'noopener noreferrer' } 
                    }, result.username)),
                    h('td.time', `${result.time_in_seconds}s`)
                ])
            ))
        ])
    ]);
}

export function renderAttackUI(controller: AttackController): AttackPageViewLayout {
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
    key: `attack-board-wrapper-${state.activePuzzle?.PuzzleId || 'idle'}`, 
    hook: boardWrapperHook 
  }, [
    h('div#board-container.cg-wrap', { key: 'attack-board-container' }),
    promotionDialogVNode
  ]);

  const analysisPanelWrapper = (state.gamePhase === 'GAMEOVER')
    ? h('div.analysis-panel-wrapper', [
        renderAnalysisPanel(controller.analysisController)
      ])
    : null;

  const rightPanelContent = h('div.attack-right-panel', [
    renderTimer(controller),
    analysisPanelWrapper,
  ].filter(Boolean) as VNode[]);

  const leftPanelContent = h('div.attack-left-panel', [
    renderPuzzleLeaderboard(state.puzzleResults)
  ]);
  
  const feedbackVNode = h('div#attack-feedback', [
      h('p', state.gameOverMessage || state.feedbackMessage)
  ]);

  return {
    left: leftPanelContent,
    center: centerContent,
    right: rightPanelContent,
    topPanelContent: feedbackVNode,
  };
}
