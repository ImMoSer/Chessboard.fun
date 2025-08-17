// src/features/tacktics/tackticsView.ts
import { h } from 'snabbdom';
import type { VNode } from 'snabbdom';
import { TackticsController } from './tackticsController';
import { t } from '../../core/i18n.service';
import type { TacticalTrainerStats, TacticalThemeStat } from '../../core/api.types';
import { renderBoardContainer, type TackticsPageViewLayout } from '../../shared/components/boardView';
import type { TacticalLevel } from './tacktics.types';

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
    
    const localizedThemes = activePuzzle.Themes_PG
        .map(theme => t(`tacktics.themes.${theme}`, { defaultValue: theme }))
        .join(', ');

    return h('div.puzzle-info-container', [
        h('h4.puzzle-info-title', t('tacktics.puzzleInfo.title', { defaultValue: 'Puzzle Info' })),
        h('div.puzzle-info-grid', [
            h('div.puzzle-info-item', [
                h('span.info-label', t('tacktics.puzzleInfo.rating', { defaultValue: 'Rating' }) + ':'),
                h('span.info-value', String(activePuzzle.Rating))
            ]),
            h('div.puzzle-info-item', [
                h('span.info-label', t('tacktics.puzzleInfo.themes', { defaultValue: 'Themes' }) + ':'),
                h('span.info-value', localizedThemes)
            ]),
        ])
    ]);
}

function renderTackticsControls(controller: TackticsController): VNode {
    const { selectedLevel, isAutoLoadEnabled } = controller.state;
    const levels: TacticalLevel[] = ['easy', 'normal', 'hard'];

    return h('div.tacktics-controls-container', [
        h('div.tacktics-controls-header', [
            h('div.tacktics-level-selector', [
                h('h5', t('tacktics.controls.levelTitle', {defaultValue: 'Select Difficulty'})),
                h('select.level-select', {
                  on: {
                    change: (e: Event) => controller.setTacticalLevel((e.target as HTMLSelectElement).value as TacticalLevel)
                  }
                }, levels.map(level =>
                    h('option', {
                      props: { value: level, selected: selectedLevel === level }
                    }, t(`tacktics.controls.levels.${level}`, {defaultValue: level}))
                ))
            ]),
            h('div.tacktics-auto-load-toggle', [
                h('label.toggle-label', t('tacktics.controls.autoLoad', {defaultValue: 'Auto-load Next Puzzle'})),
                h('label.toggle-switch', [
                    h('input', {
                        props: { type: 'checkbox', checked: isAutoLoadEnabled },
                        on: { change: () => controller.toggleAutoLoad() }
                    }),
                    h('span.slider.round')
                ])
            ])
        ])
    ]);
}

export function renderTackticsUI(controller: TackticsController): TackticsPageViewLayout {
  const { state } = controller;

  const centerContent = renderBoardContainer(
    controller.boardView,
    state.activePuzzle?.PuzzleId || 'idle'
  );

  const analysisPanelWrapper = (state.gamePhase === 'GAMEOVER')
    ? h('div.analysis-panel-wrapper', [
        controller.analysisController.renderPanel()
      ])
    : null;
  
  let rightPanelContentChildren: VNode[] = [];
  if (state.gamePhase === 'GAMEOVER') {
    rightPanelContentChildren = [
      analysisPanelWrapper,
      renderTackticsControls(controller),
      renderPuzzleInfo(controller),
    ].filter(Boolean) as VNode[];
  } else {
    rightPanelContentChildren = [
      renderTackticsControls(controller),
      renderPuzzleInfo(controller),
      analysisPanelWrapper,
    ].filter(Boolean) as VNode[];
  }
  
  const rightPanelContent = h('div.tacktics-right-panel', rightPanelContentChildren);

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
