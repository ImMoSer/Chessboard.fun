// src/features/analysis/analysisPanelView.ts
import { h } from 'snabbdom';
import type { VNode, VNodeData } from 'snabbdom';
import type { AnalysisController, AnalysisPanelState } from './analysisController';
import { t } from '../../core/i18n.service';
import logger from '../../utils/logger';
import type { PgnNode } from '../../core/pgn.service';

// --- PGN Display Rendering (No changes) ---
function renderPgnRecursive(
    nodes: PgnNode[], 
    currentPath: string, 
    onMoveClick: (path: string) => void, 
    pathPrefix: string = ''
): VNode[] {
    if (!nodes || nodes.length === 0) return [];
    const mainlineNode = nodes[0];
    const variations = nodes.slice(1);
    const elements: VNode[] = [];
    const movePath = pathPrefix + mainlineNode.id;
    const isCurrent = movePath === currentPath;

    if (mainlineNode.ply % 2 !== 0) {
        elements.push(h('span.move-number', `${Math.ceil(mainlineNode.ply / 2)}. `));
    }

    const moveVNodeData: VNodeData = {
        class: { current: isCurrent },
        on: { click: () => onMoveClick(movePath) },
        key: movePath,
    };
    elements.push(h('span.pgn-move', moveVNodeData, mainlineNode.san));
    
    if (variations.length > 0) {
        variations.forEach(variationNode => {
            const variationElements = renderPgnRecursive([variationNode], currentPath, onMoveClick, pathPrefix);
            elements.push(h('span.pgn-variation', [' (', ...variationElements, ') ']));
        });
    }

    if (mainlineNode.children.length > 0) {
        elements.push(...renderPgnRecursive(mainlineNode.children, currentPath, onMoveClick, movePath));
    }
    
    return elements;
}

function renderPgnDisplay(controller: AnalysisController, panelState: AnalysisPanelState): VNode | null {
    if (!panelState.isAnalysisActive || !panelState.pgnRootNode) return null;
    const onMoveClick = (path: string) => controller.handlePgnMoveClick(path);
    const onWheelNav = (event: WheelEvent) => controller.handlePgnNavViaWheel(event);

    return h('div#pgn-display-container', {
        hook: {
            insert: (vnode: VNode) => { (vnode.elm as HTMLElement).addEventListener('wheel', onWheelNav, { passive: false }); },
            destroy: (vnode: VNode) => { (vnode.elm as HTMLElement).removeEventListener('wheel', onWheelNav); }
        },
    }, renderPgnRecursive(panelState.pgnRootNode.children, panelState.currentPgnPath || '', onMoveClick));
}

// --- Analysis Lines Rendering ---
/**
 * ИЗМЕНЕНО: Функция теперь рендерит линии анализа декларативно на основе состояния
 */
function renderAnalysisLinesContainer(controller: AnalysisController, panelState: AnalysisPanelState): VNode {
    const { analysisLines } = panelState;

    if (!analysisLines || analysisLines.length === 0) {
        // Возвращаем пустой контейнер, если нет линий для отображения
        return h('div.analysis-lines-section', [
            h('div#analysis-lines-section-content')
        ]);
    }

    const lineNodes = analysisLines.map((line, i) => {
        const scoreValue = line.score.type === 'cp'
            ? (line.score.value / 100).toFixed(2)
            : `${t('analysis.mateInShort', { value: Math.abs(line.score.value) })}${line.score.value < 0 ? '-' : ''}`;

        let pvString = "";
        let currentMoveNumber = line.initialFullMoveNumber;
        let turnForPv = line.initialTurn;
        line.pvSan.forEach((san, sanIndex) => {
            if (turnForPv === 'white') pvString += `${currentMoveNumber}. ${san} `;
            else if (sanIndex === 0) pvString += `${currentMoveNumber}...${san} `;
            else pvString += `${san} `;
            if (turnForPv === 'black') currentMoveNumber++;
            turnForPv = turnForPv === 'white' ? 'black' : 'white';
        });

        const scoreButtonClasses = {
            'analysis-score-button': true,
            'best-line-score': i === 0,
            'second-line-score': i === 1,
            'third-line-score': i === 2,
            'other-line-score': i > 2,
        };

        return h('div.analysis-line-entry', { key: `line-entry-${i}` }, [
            h('span.line-depth', String(line.depth)),
            h('button', {
                class: scoreButtonClasses,
                on: {
                    click: () => {
                        if (line.pvUci[0]) {
                            controller.playMoveFromAnalysisLine(line.pvUci[0]);
                        }
                    }
                },
            }, scoreValue),
            h('span.analysis-pv-text', { props: { title: pvString.trim() } }, pvString.trim())
        ]);
    });

    return h('div.analysis-lines-section', [
        h('div#analysis-lines-section-content', lineNodes)
    ]);
}


// --- Main Panel Rendering ---
function renderPgnControls(controller: AnalysisController, panelState: AnalysisPanelState): VNode {
  const pgnNavDisabled = !panelState.isAnalysisActive;
  return h('div#pgn-navigation-controls.button-group.horizontal', [
    h('button.button.pgn-nav-button', { attrs: { disabled: pgnNavDisabled || !panelState.canNavigatePgnBackward, title: t('pgn.nav.start') }, on: { click: () => controller.pgnNavigateToStart() } }, '|◀'),
    h('button.button.pgn-nav-button', { attrs: { disabled: pgnNavDisabled || !panelState.canNavigatePgnBackward, title: t('pgn.nav.prev') }, on: { click: () => controller.pgnNavigateBackward() } }, '◀'),
    h('button.button.pgn-nav-button', { attrs: { disabled: pgnNavDisabled || !panelState.canNavigatePgnForward, title: t('pgn.nav.next') }, on: { click: () => controller.pgnNavigateForward(0) } }, '▶'),
    h('button.button.pgn-nav-button', { attrs: { disabled: pgnNavDisabled || !panelState.canNavigatePgnForward, title: t('pgn.nav.end') }, on: { click: () => controller.pgnNavigateToEnd() } }, '▶|'),
  ]);
}

function renderAnalysisControls(controller: AnalysisController, panelState: AnalysisPanelState): VNode {
  const isDisabled = controller.isPromotionActive();

  return h('div.analysis-controls-container', [
    h('div.control-group.toggle-group', [
      h('label.control-label', t('analysis.engine')),
      h('label.toggle-switch', [
        h('input', { 
          props: { type: 'checkbox', checked: panelState.isAnalysisActive, disabled: isDisabled },
          on: { change: () => controller.toggleAnalysisEngine() }
        }),
        h('span.slider.round')
      ])
    ]),
    
    h('div.control-group.dropdown-group', [
      h('label.control-label', { props: { for: 'lines-select' } }, t('analysis.lines')),
      h('select#lines-select', {
        attrs: { disabled: isDisabled || !panelState.isAnalysisActive },
        on: { change: (e: Event) => controller.setNumLines(Number((e.target as HTMLSelectElement).value)) }
      }, [
        h('option', { props: { value: 1, selected: panelState.numLines === 1 } }, '1'),
        h('option', { props: { value: 2, selected: panelState.numLines === 2 } }, '2'),
        h('option', { props: { value: 3, selected: panelState.numLines === 3 } }, '3'),
      ])
    ]),

    h('div.control-group.dropdown-group', [
      h('label.control-label', { props: { for: 'threads-select' } }, t('analysis.threads')),
      h('select#threads-select', {
        attrs: { disabled: isDisabled || !panelState.isAnalysisActive },
        on: { change: (e: Event) => controller.setNumThreads(Number((e.target as HTMLSelectElement).value)) }
      }, 
        Array.from({ length: panelState.maxThreads }, (_, i) => i + 1).map(num => 
          h('option', { props: { value: num, selected: panelState.numThreads === num } }, String(num))
        )
      )
    ]),
  ]);
}

export function renderAnalysisPanel(controller: AnalysisController): VNode {
  const panelState = controller.getPanelState();
  logger.debug('[AnalysisPanelView] Rendering with state:', panelState);

  const pgnDisplaySection = renderPgnDisplay(controller, panelState);

  let content: (VNode | null)[];

  if (panelState.isAnalysisActive) {
      if (panelState.isAnalysisLoading) {
          content = [
              renderPgnControls(controller, panelState),
              h('div.analysis-lines-section', [h('div.loading-message', t('analysis.loading'))]),
              pgnDisplaySection,
              renderAnalysisControls(controller, panelState),
          ];
      } else {
          content = [
              renderPgnControls(controller, panelState),
              // ИЗМЕНЕНО: Передаем panelState в функцию рендеринга
              renderAnalysisLinesContainer(controller, panelState),
              pgnDisplaySection,
              renderAnalysisControls(controller, panelState),
          ];
      }
  } else {
      content = [
          renderPgnControls(controller, panelState),
          pgnDisplaySection,
          renderAnalysisControls(controller, panelState),
      ];
  }

  return h('div#analysis-panel-container', content.filter(Boolean) as VNode[]);
}
