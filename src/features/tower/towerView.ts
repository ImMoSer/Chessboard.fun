// src/features/tower/towerView.ts
import { h } from 'snabbdom';
import type { VNode, VNodeChildElement } from 'snabbdom';
import type { TowerController } from './TowerController';
import { type TowerDefinition } from './tower.types';
import { type TowerPositionEntry, type TowerResultEntry, type TowerTheme } from '../../core/api.types';
import { renderAnalysisPanel } from '../analysis/analysisPanelView';
import { t } from '../../core/i18n.service';
import logger from '../../utils/logger';
import { renderBoardContainer, type TowerPageViewLayout } from '../../shared/components/boardView';
import type { Key } from 'chessground/types';

const pieceFileMap: { [key: string]: string } = {
  'r': 'bR.svg', 'n': 'bN.svg', 'b': 'bB.svg', 'q': 'bQ.svg', 'k': 'bK.svg', 'p': 'bP.svg',
  'R': 'wR.svg', 'N': 'wN.svg', 'B': 'wB.svg', 'Q': 'wQ.svg', 'K': 'wK.svg', 'P': 'wP.svg',
};

const pieceOrder: { [key: string]: number } = { 'P': 1, 'N': 2, 'B': 3, 'R': 4, 'Q': 5, 'K': 6 };

interface PieceInfo {
  pieceFile: string;
  pieceType: string;
}

function parseFenForSortedRows(fen_string: string, botColor: 'w' | 'b'): { playerPieces: PieceInfo[], botPieces: PieceInfo[] } {
  const playerPieces: PieceInfo[] = [];
  const botPieces: PieceInfo[] = [];
  const fenBoard = fen_string.split(' ')[0]; 

  for (const char of fenBoard) {
    if (pieceFileMap[char]) {
      const pieceColor = char === char.toUpperCase() ? 'w' : 'b';
      const pieceInfo = {
        pieceFile: pieceFileMap[char],
        pieceType: char.toUpperCase(),
      };
      if (pieceColor === botColor) {
        botPieces.push(pieceInfo);
      } else {
        playerPieces.push(pieceInfo);
      }
    }
  }

  const sortFn = (a: PieceInfo, b: PieceInfo) => (pieceOrder[a.pieceType] || 0) - (pieceOrder[b.pieceType] || 0);
  playerPieces.sort(sortFn);
  botPieces.sort(sortFn);

  return { playerPieces, botPieces };
}


function strictEnsureVNodeChildren(children: (VNodeChildElement | null | undefined)[]): (VNode | string | number)[] {
    const result: (VNode | string | number)[] = [];
    for (const child of children) {
        if (child !== null && child !== undefined) {
            if (typeof child === 'object' && child.hasOwnProperty('sel')) {
                result.push(child as VNode);
            } else if (typeof child === 'string' || typeof child === 'number') {
                result.push(child);
            }
        }
    }
    return result;
}

function renderPositionPreview(position: TowerPositionEntry, index: number, pieceSetName: string): VNode {
  const fenToUse = position.fen_final; 
  if (!fenToUse) {
    logger.error(`[towerView] Missing 'fen_final' for position preview at index ${index}. Cannot render piece set.`);
    return h('div.position-preview-item.error', `Error: Missing FEN for position #${position.absoluteIndex}`);
  }

  const { playerPieces, botPieces } = parseFenForSortedRows(fenToUse, position.bot_color);
  const absoluteIndex = position.absoluteIndex;

  const playerPieceIcons = playerPieces.map((p, i) =>
    h('img.sorted-piece-icon', { key: `player-${index}-${i}`, props: { src: `/piece/${pieceSetName}/${p.pieceFile}` } })
  );

  const botPieceIcons = botPieces.map((p, i) =>
    h('img.sorted-piece-icon', { key: `bot-${index}-${i}`, props: { src: `/piece/${pieceSetName}/${p.pieceFile}` } })
  );

  return h('div.position-preview-item', [
    h('h5.position-preview-title', `${t('tower.ui.position', { defaultValue: 'Position' })} #${absoluteIndex} (Rating: ${position.rating})`),
    h('div.sorted-pieces-rows-container', [
      h('div.pieces-row.player-pieces', playerPieceIcons),
      h('div.pieces-row.bot-pieces', botPieceIcons)
    ])
  ]);
}

function renderUpcomingPositionsList(positions: TowerPositionEntry[], pieceSetName: string): VNode {
  return h('div.upcoming-positions-container', [
    h('h4.table-title', t('tower.ui.upcomingPositionsTitle', { defaultValue: 'Upcoming Positions' })),
    h('div.positions-list-scrollable', positions.map((pos, index) => renderPositionPreview(pos, index, pieceSetName)))
  ]);
}

function renderThemeSelection(controller: TowerController): VNode {
  const { availableThemes, selectedTheme, gamePhase } = controller.state;
  const selectionDisabled = gamePhase !== 'IDLE';

  const options = availableThemes.map(theme =>
    h('option', {
      props: { value: theme, selected: theme === selectedTheme }
    }, t(`tower.themes.${theme}`, { defaultValue: theme }))
  );

  return h('div.tower-theme-selector-container', [
    h('label.selector-label', { props: { for: 'tower-theme-select' } }, t('tower.ui.themeLabel', { defaultValue: 'Theme' })),
    h('select#tower-theme-select.custom-select', {
      attrs: { disabled: selectionDisabled },
      on: { change: (e: Event) => controller.selectTheme((e.target as HTMLSelectElement).value as TowerTheme) }
    }, options)
  ]);
}

function renderTowerSelection(controller: TowerController): VNode {
  const { availableTowers, selectedTowerId, gamePhase } = controller.state;
  const selectionDisabled = gamePhase !== 'IDLE';

  return h('div.towers-visual-container', {}, availableTowers.map((towerDef: TowerDefinition) => {
    const isSelected = selectedTowerId === towerDef.id;
    const numberOfBricks = towerDef.displayLevels;

    return h(`div.tower-visual-item${isSelected ? '.selected' : ''}`, {
      key: towerDef.id,
      class: { disabled: selectionDisabled && !isSelected },
      on: { click: () => !selectionDisabled && controller.selectTower(towerDef.id) },
    }, [
      h('div.button-price', [
          h('span.coin-icon', '🪙'),
          '10'
      ]),
      h('div.tower-bricks', {},
       Array(numberOfBricks).fill(null).map((_, i) =>
        h('div.tower-brick', { key: `${towerDef.id}-brick-${i}`, style: { backgroundColor: towerDef.color } })
      )),
      h('div.tower-label', t(towerDef.nameKey, { defaultValue: towerDef.defaultName })),
    ]);
  }));
}

function renderTowerResultsTable(results: TowerResultEntry[]): VNode {
  const sortedResults = [...results].sort((a, b) => a.time_in_seconds - b.time_in_seconds);

  return h('div.tower-results-table-container', [
    h('h4.table-title', t('tower.ui.leaderboardTitle', { defaultValue: 'Leaderboard' })),
    h('table.styled-table.tower-results-table', [
      h('thead', h('tr', [
        h('th.rank', t('tower.ui.tableRank', { defaultValue: '#' })),
        h('th.player', t('tower.ui.tablePlayer', { defaultValue: 'Player' })),
        h('th.time', t('tower.ui.tableTime', { defaultValue: 'Best Time' })),
      ])),
      h('tbody', sortedResults.map((result, index) => h('tr', { key: result.lichess_id }, [
        h('td.rank', `${index + 1}`),
        h('td.player', h('a', {
          props: { href: `https://lichess.org/@/${result.lichess_id}`, target: '_blank' }
        }, result.username)),
        h('td.time', new Date(result.time_in_seconds * 1000).toISOString().substr(14, 5)),
      ])))
    ])
  ]);
}

function renderLivesIndicator(lives: number): VNode {
  const lifeIcons = Array.from({ length: lives }, () => h('span.life-icon', '💊'));
  return h('div.tower-lives-container', [
    h('span.lives-label', `${t('tower.ui.livesLabel', { defaultValue: 'Lives' })}:`),
    ...lifeIcons
  ]);
}

function renderActiveTowerInfo(controller: TowerController): VNode | null {
  const { activeTowerState, gamePhase } = controller.state;

  if (!activeTowerState) {
    return null;
  }

  const { definition, positions, currentPositionIndex, lives } = activeTowerState;
  const towerColor = definition.color;
  const towerDisplayName = t(definition.nameKey, { defaultValue: definition.defaultName });
  const numberOfProgressBricks = positions.length;

  const progressBricks = h('div.active-tower-progress-bricks', {},
    Array(numberOfProgressBricks).fill(null).map((_, index) => {
      let brickClass = '.progress-brick';
      const style: { backgroundColor?: string } = {};

      if (index < currentPositionIndex) {
        brickClass += '.completed';
        style.backgroundColor = towerColor;
      } else if (index === currentPositionIndex && gamePhase === 'PLAYING') {
        brickClass += '.current';
      } else if (index === currentPositionIndex && (gamePhase === 'LEVEL_FAILED' || gamePhase === 'GAMEOVER' || gamePhase === 'LEVEL_RESIGNED')) {
        brickClass += '.failed';
      } else {
        brickClass += '.pending';
      }
      return h(`div${brickClass}`, { key: `progress-${index}`, style: style });
    })
  );

  return h('div.active-tower-info-container', {}, [
    h('div.active-tower-name', {}, towerDisplayName),
    progressBricks,
    renderLivesIndicator(lives),
  ]);
}

function renderTowerPuzzleInfo(controller: TowerController): VNode | null {
    const { activeTowerState } = controller.state;
    if (!activeTowerState) return null;

    const { theme, averageRating, bwValueTotal } = activeTowerState;

    const infoItems = [
        theme ? h('div.puzzle-info-item', [
            h('span.info-label', t('tower.ui.themeLabel', { defaultValue: 'Theme' }) + ': '),
            h('span.info-value', t(`tower.themes.${theme}`, { defaultValue: theme }))
        ]) : null,
        averageRating !== undefined ? h('div.puzzle-info-item', [
            h('span.info-label', t('tower.ui.averageRating', { defaultValue: 'Average Rating' }) + ': '),
            h('span.info-value', String(averageRating))
        ]) : null,
        bwValueTotal !== undefined ? h('div.puzzle-info-item', [
            h('span.info-label', t('finishHim.puzzleInfo.funValue', { defaultValue: 'Skill Value' }) + ': '),
            h('span.info-value', String(bwValueTotal))
        ]) : null,
    ].filter(Boolean) as VNode[];

    return h('div.puzzle-info-container', [
        h('h4.puzzle-info-title', t('tower.puzzleInfo.title', { defaultValue: 'Tower Info' })),
        h('div.puzzle-info-grid', infoItems)
    ]);
}

function renderTimer(controller: TowerController): VNode {
    const timeString = controller.formatTime(Math.round((controller.state.activeTowerState?.elapsedTimeMs ?? 0) / 1000));
    return h('div.tower-timer-container', [
        h('span#tower-timer-display', timeString)
    ]);
}


export function renderTowerUI(controller: TowerController): TowerPageViewLayout {
  const towerState = controller.state;
  const boardHandler = controller.boardHandler;
  const onUserMoveCallback = (orig: Key, dest: Key) => controller.handleUserMove(orig, dest);
  
  const currentPieceSet = controller.services.themeService.getCurrentTheme().pieces;

  const centerContent = renderBoardContainer(
    boardHandler,
    controller.services.chessboardService,
    onUserMoveCallback,
    'tower'
  );

  const leftPanelChildren: (VNode | null)[] = [];
  if(towerState.activeTowerState && towerState.activeTowerState.towerResults.length > 0) {
    leftPanelChildren.push(renderTowerResultsTable(towerState.activeTowerState.towerResults));
  }
  
  if (towerState.activeTowerState) {
    const remainingPositions = towerState.activeTowerState.positions.slice(
      towerState.activeTowerState.currentPositionIndex
    ).map((pos, index) => ({...pos, absoluteIndex: towerState.activeTowerState!.currentPositionIndex + index + 1 }));
    leftPanelChildren.push(renderUpcomingPositionsList(remainingPositions, currentPieceSet));
  }

  const leftPanelContent = h('div.tower-left-panel', {}, strictEnsureVNodeChildren(leftPanelChildren));


  const analysisPanelWrapper = (towerState.gamePhase === 'LEVEL_FAILED' || towerState.gamePhase === 'GAMEOVER' || towerState.gamePhase === 'LEVEL_RESIGNED') && controller.analysisController
    ? h('div.analysis-panel-wrapper', [ renderAnalysisPanel(controller.analysisController) ])
    : null;

  let rightPanelDynamicContentElements: VNodeChildElement[] = [];

  if (towerState.gamePhase === 'LOADING') {
    rightPanelDynamicContentElements.push(h('div.loading-indicator', t('common.loading', {defaultValue: "Loading..."})));
  }

  if (towerState.gamePhase === 'IDLE') {
    rightPanelDynamicContentElements.push(
      h('div.tower-selection-area', [
        renderThemeSelection(controller),
        renderTowerSelection(controller)
      ])
    );
  }
  
  if (towerState.activeTowerState && (towerState.gamePhase !== 'IDLE' && towerState.gamePhase !== 'LOADING')) {
      rightPanelDynamicContentElements.push(renderActiveTowerInfo(controller));
      rightPanelDynamicContentElements.push(renderTowerPuzzleInfo(controller));
  }
  
  if (analysisPanelWrapper) {
      rightPanelDynamicContentElements.push(analysisPanelWrapper);
  }

  const rightPanelContent = h('div.tower-right-panel', {}, [
      renderTimer(controller),
      ...strictEnsureVNodeChildren(rightPanelDynamicContentElements)
  ]);

  const feedbackVNode = h('div#tower-feedback', {
      class: { 'game-over-active': towerState.gamePhase === 'LEVEL_FAILED' || towerState.gamePhase === 'TOWER_COMPLETE' || towerState.gamePhase === 'LEVEL_RESIGNED' || towerState.gamePhase === 'GAMEOVER' }
  }, [
      h('p', towerState.gameOverMessage || towerState.feedbackMessage)
  ]);

  return {
    left: leftPanelContent,
    center: centerContent,
    right: rightPanelContent,
    topPanelContent: feedbackVNode
  };
}
