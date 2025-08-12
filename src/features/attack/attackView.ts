// src/features/attack/attackView.ts
import { h } from 'snabbdom';
import type { VNode } from 'snabbdom';
import type { Key } from 'chessground/types';
import { AttackController, formatElapsedTime } from './attackController';
import { renderAnalysisPanel } from '../analysis/analysisPanelView';
import { t } from '../../core/i18n.service';
import type { PuzzleResultEntry } from '../../core/api.types';
import { renderBoardContainer, type AttackPageViewLayout } from '../../shared/components/boardView';

function renderTimer(controller: AttackController): VNode {
    const timeString = formatElapsedTime(controller.state.elapsedPlayoutTimeMs);
    return h('div.attack-timer-container', [
        h('span#attack-timer-display', timeString)
    ]);
}

function renderPuzzleInfo(controller: AttackController): VNode | null {
    const { activePuzzle } = controller.state;
    if (!activePuzzle) {
        return null;
    }

    const { Rating, bw_value } = activePuzzle;

    const infoItems = [
        Rating !== undefined ? h('div.puzzle-info-item', [
            h('span.info-label', t('attack.puzzleInfo.rating', { defaultValue: 'Rating' }) + ': '),
            h('span.info-value', String(Rating))
        ]) : null,
        bw_value !== undefined ? h('div.puzzle-info-item', [
            h('span.info-label', t('finishHim.puzzleInfo.funValue', { defaultValue: 'Fun Value' }) + ': '),
            h('span.info-value', String(bw_value))
        ]) : null,
    ].filter(Boolean) as VNode[];

    return h('div.puzzle-info-container', [
        h('div.puzzle-info-header', [
            h('h4.puzzle-info-title', t('attack.puzzleInfo.title', { defaultValue: 'Puzzle Info' })),
        ]),
        infoItems.length > 0 ? h('div.puzzle-info-grid', infoItems) : null,
    ].filter(Boolean) as VNode[]);
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
  const onUserMoveCallback = (orig: Key, dest: Key) => controller.handleUserMove(orig, dest);

  const centerContent = renderBoardContainer(
    boardHandler,
    controller.services.chessboardService,
    onUserMoveCallback,
    'attack'
  );

  const analysisPanelWrapper = (state.gamePhase === 'GAMEOVER')
    ? h('div.analysis-panel-wrapper', [
        renderAnalysisPanel(controller.analysisController)
      ])
    : null;

  const rightPanelContent = h('div.attack-right-panel', [
    renderTimer(controller),
    renderPuzzleInfo(controller),
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
