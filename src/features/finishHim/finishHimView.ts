// src/features/finishHim/finishHimView.ts
import { h } from 'snabbdom';
import type { VNode } from 'snabbdom';
import type { Key } from 'chessground/types';
import { FinishHimController, formatPlayoutTimer } from './finishHimController';
import { renderAnalysisPanel } from '../analysis/analysisPanelView';
import { t } from '../../core/i18n.service';
import type { PuzzleResultEntry, AppPuzzle } from '../../core/api.types';
import { renderBoardContainer, type FinishHimPageViewLayout } from '../../shared/components/boardView';

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

function renderFinalPositionPreview(puzzle: AppPuzzle, pieceSetName: string): VNode | null {
  const fenToUse = puzzle.fen_final; 
  if (!fenToUse) {
    return null;
  }

  const { playerPieces, botPieces } = parseFenForSortedRows(fenToUse, puzzle.bot_color);

  const playerPieceIcons = playerPieces.map((p, i) =>
    h('img.sorted-piece-icon', { key: `player-${puzzle.PuzzleId}-${i}`, props: { src: `/piece/${pieceSetName}/${p.pieceFile}` } })
  );

  const botPieceIcons = botPieces.map((p, i) =>
    h('img.sorted-piece-icon', { key: `bot-${puzzle.PuzzleId}-${i}`, props: { src: `/piece/${pieceSetName}/${p.pieceFile}` } })
  );

  return h('div.final-position-preview-item', [
    h('h5.final-position-preview-title', t('finishHim.finalPositionTitle', { defaultValue: 'Final Position Material' })),
    h('div.sorted-pieces-rows-container', [
      h('div.pieces-row.player-pieces', playerPieceIcons),
      h('div.pieces-row.bot-pieces', botPieceIcons)
    ])
  ]);
}

function formatTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds < 0) return "--:--";
  const totalSeconds = Math.ceil(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function renderFavoriteButton(controller: FinishHimController): VNode | null {
    const { activePuzzle, isCurrentPuzzleFavorite } = controller.state;
    const userId = controller.services.authService.getUserProfile()?.id;

    if (!activePuzzle || !userId) {
        return null;
    }

    return h('button.button.favorite-puzzle-button', {
        class: { 'is-favorite': isCurrentPuzzleFavorite },
        on: { click: () => controller.toggleFavorite() },
        attrs: { title: t('finishHim.puzzleActions.toggleFavorite', {defaultValue: 'Add to/Remove from Favorites'}) }
    }, '★');
}

function renderPuzzleLeaderboard(results: PuzzleResultEntry[] | null): VNode | null {
    if (!results || results.length === 0) {
        return null;
    }

    const sortedResults = [...results].sort((a, b) => a.time_in_seconds - b.time_in_seconds);

    return h('div.puzzle-leaderboard-container', [
        h('h4.puzzle-leaderboard-title', t('finishHim.leaderboard.title', { defaultValue: 'Best Times' })),
        h('table.puzzle-leaderboard-table', [
            h('thead', [
                h('tr', [
                    h('th.rank', t('records.table.rank', {defaultValue: '#'})),
                    h('th.player', t('finishHim.leaderboard.player', { defaultValue: 'Player' })),
                    h('th.time', t('finishHim.leaderboard.time', { defaultValue: 'Time' }))
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

function renderPuzzleInfo(controller: FinishHimController): VNode | null {
    const { activePuzzle, puzzleResults } = controller.state;
    const currentPieceSet = controller.services.themeService.getCurrentTheme().pieces;

    if (!activePuzzle) {
        return null;
    }

    // FIXED: Destructure solve_time directly from activePuzzle
    const { Tactical_Rating, PlayOut_Rating, fun_value, solve_time } = activePuzzle;

    const infoItems = [
        Tactical_Rating !== undefined ? h('div.puzzle-info-item', [
            h('span.info-label', t('finishHim.puzzleInfo.tacticalRating') + ': '),
            h('span.info-value', String(Tactical_Rating))
        ]) : null,
        PlayOut_Rating !== undefined ? h('div.puzzle-info-item', [
            h('span.info-label', t('finishHim.puzzleInfo.playoutRating') + ': '),
            h('span.info-value', String(PlayOut_Rating))
        ]) : null,
        // FIXED: Use solve_time from puzzle data
        solve_time !== undefined ? h('div.puzzle-info-item', [
            h('span.info-label', t('finishHim.puzzleInfo.solveTime') + ': '),
            h('span.info-value', formatTime(solve_time))
        ]) : null,
        fun_value !== undefined ? h('div.puzzle-info-item', [
            h('span.info-label', t('finishHim.puzzleInfo.funValue', { defaultValue: 'Fun Value' }) + ': '),
            h('span.info-value', String(fun_value))
        ]) : null,
    ].filter(Boolean) as VNode[];

    const finalPositionPreview = renderFinalPositionPreview(activePuzzle, currentPieceSet);

    return h('div.puzzle-info-container', [
        h('div.puzzle-info-header', [
            h('h4.puzzle-info-title', t('finishHim.puzzleInfo.title')),
            renderFavoriteButton(controller)
        ]),
        infoItems.length > 0 ? h('div.puzzle-info-grid', infoItems) : null,
        finalPositionPreview,
        renderPuzzleLeaderboard(puzzleResults)
    ].filter(Boolean) as VNode[]);
}

function renderTimer(controller: FinishHimController): VNode {
    const timeString = formatPlayoutTimer(controller.state.outplayTimeRemainingMs);
    return h('div.finish-him-timer-container', [
        h('span#finish-him-timer-display', timeString)
    ]);
}

export function renderFinishHimUI(controller: FinishHimController): FinishHimPageViewLayout {
  const fhState = controller.state;
  const boardHandler = controller.boardHandler;
  const onUserMoveCallback = (orig: Key, dest: Key) => controller.handleUserMove(orig, dest);

  const centerContent = renderBoardContainer(
    boardHandler,
    controller.services.chessboardService,
    onUserMoveCallback,
    'fh'
  );

  const feedbackVNode = h('div#finish-him-feedback', {}, [
    h('p', {
      style: {
        fontWeight: 'bold',
        color: fhState.gameOverMessage ? 'var(--color-accent-error)' : 'var(--color-text-default)'
      }
    },
      fhState.gameOverMessage || fhState.feedbackMessage
    ),
  ]);

  const analysisPanelWrapper = (fhState.gamePhase === 'GAMEOVER')
    ? h('div.analysis-panel-wrapper', [
        renderAnalysisPanel(controller.analysisController)
      ])
    : null;

  const rightPanelElements: (VNode | null)[] = [];

  if (fhState.gamePhase === 'GAMEOVER') {
      rightPanelElements.push(analysisPanelWrapper);
      rightPanelElements.push(renderTimer(controller));
      rightPanelElements.push(renderPuzzleInfo(controller));
  } else {
      rightPanelElements.push(renderTimer(controller));
      rightPanelElements.push(renderPuzzleInfo(controller));
      rightPanelElements.push(analysisPanelWrapper);
  }

  const rightPanelContent = h('div.finish-him-right-panel', {
    style: { display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }
  }, rightPanelElements.filter(Boolean) as VNode[]);

  const leftPanelContent = h('div.finish-him-left-panel', [
    // This container remains for layout consistency.
  ]);

  return {
    left: leftPanelContent,
    center: centerContent,
    right: rightPanelContent,
    topPanelContent: feedbackVNode
  };
}
