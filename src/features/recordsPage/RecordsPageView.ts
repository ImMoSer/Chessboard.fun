// src/features/recordsPage/RecordsPageView.ts
import { h, VNode } from 'snabbdom';
import type { RecordsPageController, RecordsPageControllerState, LeaderboardTableConfig, ProcessedLeaderboardEntry, ProcessedActivityEntry, ActivityPeriod, ActivityMode } from './RecordsPageController';
import { t } from '../../core/i18n.service';
import logger from '../../utils/logger';
import type { TowerLeaderboardEntry, AttackLeaderboardEntry, FinishHimLeaderboardEntry } from '../../core/webhook.service';

const tierToPieceMap: { [key: string]: string } = {
  'Pawn': 'wP.svg',
  'Knight': 'wN.svg',
  'Bishop': 'wB.svg',
  'Rook': 'wR.svg',
  'Queen': 'wQ.svg',
  'King': 'wK.svg',
};

function renderSubscriptionIcon(tier?: string): VNode | null {
  if (!tier || !tierToPieceMap[tier]) {
    return null;
  }
  const pieceFile = tierToPieceMap[tier];
  return h('img.records-page__sub-icon', {
    props: {
      src: `/piece/alpha/${pieceFile}`,
      alt: tier,
      title: tier,
    }
  });
}

// <<< НАЧАЛО ИЗМЕНЕНИЙ: Новая функция для рендеринга таблицы активности
function renderActivityLeaderboard(controller: RecordsPageController): VNode | null {
  const { processedActivityData, selectedActivityPeriod, selectedActivityMode } = controller.state;

  const periodOptions: { value: ActivityPeriod, textKey: string }[] = [
    { value: 'daily', textKey: 'userCabinet.stats.periods.day' },
    { value: 'weekly', textKey: 'userCabinet.stats.periods.week' },
    { value: 'monthly', textKey: 'userCabinet.stats.periods.month' },
  ];

  const modeOptions: { value: ActivityMode, textKey: string }[] = [
    { value: 'all', textKey: 'userCabinet.stats.modes.all' },
    { value: 'finishHim', textKey: 'userCabinet.stats.modes.finishHim' },
    { value: 'attack', textKey: 'userCabinet.stats.modes.attack' },
    { value: 'tower', textKey: 'userCabinet.stats.modes.tower' },
    { value: 'tacticalTrainer', textKey: 'userCabinet.stats.modes.tacticalTrainer' },
  ];

  const filters = h('div.stats-filters', [
    h('select', {
      on: { change: (e: Event) => controller.handleActivityPeriodChange((e.target as HTMLSelectElement).value as ActivityPeriod) }
    }, periodOptions.map(opt => h('option', { props: { value: opt.value, selected: selectedActivityPeriod === opt.value } }, t(opt.textKey, {defaultValue: opt.value})))),
    h('select', {
      on: { change: (e: Event) => controller.handleActivityModeChange((e.target as HTMLSelectElement).value as ActivityMode) }
    }, modeOptions.map(opt => h('option', { props: { value: opt.value, selected: selectedActivityMode === opt.value } }, t(opt.textKey, {defaultValue: opt.value}))))
  ]);

  let tableContent: VNode | VNode[];
  if (processedActivityData === null) {
      tableContent = h('p.records-page__no-data-message', t('common.loading'));
  } else if (processedActivityData.length === 0) {
      tableContent = h('p.records-page__no-data-message', t('records.table.noEntries'));
  } else {
      tableContent = h('table.records-page__table', [
          h('thead', h('tr', [
              h('th.text-center', '#'),
              h('th.text-left', t('records.table.player')),
              h('th.text-right', t('records.table.solved')),
              h('th.text-right', t('records.table.requested')),
              h('th.text-right', t('records.table.successRate')),
          ])),
          h('tbody', processedActivityData.map((entry: ProcessedActivityEntry) => 
              h('tr', { key: entry.lichess_id }, [
                  h('td.text-center', entry.rank.toString()),
                  h('td.text-left', [
                      renderSubscriptionIcon(entry.subscriptionTier),
                      h('a', { props: { href: `https://lichess.org/@/${entry.lichess_id}`, target: '_blank', rel: 'noopener noreferrer' } }, entry.username)
                  ]),
                  h('td.text-right', entry.solved.toString()),
                  h('td.text-right', entry.requested.toString()),
                  h('td.text-right', `${entry.successRate.toFixed(0)}%`),
              ])
          ))
      ]);
  }

  return h('div.records-page__table-container.records-page__table-container--activity', [
    h('h3.records-page__table-title', t('records.titles.activity', { defaultValue: 'Player Activity' })),
    filters,
    tableContent
  ]);
}
// <<< КОНЕЦ ИЗМЕНЕНИЙ

function renderSingleLeaderboardTable(
  tableData: { config: LeaderboardTableConfig; entries: ProcessedLeaderboardEntry[] } | null,
  controller: RecordsPageController
): VNode | null {
  if (!tableData) return null;

  const { config, entries } = tableData;
  const containerClass = `div.records-page__table-container.records-page__table-container--${config.id}`;

  return h(containerClass, { key: config.id }, [
    h('h3.records-page__table-title', t(config.titleKey, { defaultValue: config.defaultTitle })),
    entries.length === 0
      ? h('p.records-page__no-data-message', t('records.table.noEntries'))
      : h('table.records-page__table', [
          h('thead', [
            h('tr', config.columns.map(col =>
              h(`th.text-${col.textAlign || 'left'}`, t(col.headerKey, { defaultValue: col.defaultHeader }))
            ))
          ]),
          h('tbody', entries.map((entry) =>
            h('tr', { key: `${config.id}-${entry.lichess_id}-${entry.rank}` }, config.columns.map(col => {
                let cellContent: (VNode | string | null)[];
                if (col.headerKey === 'records.table.challenge' && config.id === 'attackLeaderboard') {
                    cellContent = [h('button.records-page__challenge-button', {
                        on: { click: (e: Event) => {
                            e.preventDefault();
                            const attackEntry = entry as AttackLeaderboardEntry;
                            controller.services.appController.navigateTo('attack', true, null, attackEntry.puzzle_id);
                        }}
                      }, t('records.table.playButton', { defaultValue: 'Play' }))];
                } else if (col.headerKey === 'records.table.player') {
                    cellContent = [
                        renderSubscriptionIcon((entry as FinishHimLeaderboardEntry).subscriptionTier),
                        h('a', { props: { href: `https://lichess.org/@/${entry.lichess_id}`, target: '_blank', rel: 'noopener noreferrer' } }, String(col.cellValueExtractor(entry)))
                      ];
                } else {
                    cellContent = [String(col.cellValueExtractor(entry))];
                }
                return h(`td.text-${col.textAlign || 'left'}`, cellContent.filter(c => c !== null) as (VNode | string)[]);
              }
            ))
          ))
        ])
  ]);
}

function renderConsolidatedTowerTable(
    towerData: NonNullable<RecordsPageControllerState['consolidatedTowerData']>,
    controller: RecordsPageController
): VNode | null {
    if (!towerData || towerData.sections.length === 0) return null;

    const { config, sections } = towerData;
    const containerClass = `div.records-page__table-container.records-page__table-container--${config.id}`;
    
    const tableBodyContent = sections.flatMap(section => {
        const sectionHeader = h(`tr.records-page__table-section-header.records-page__table-section-header--${section.id}`, [
            h('th', { props: { colSpan: config.columns.length } }, t(section.titleKey, { defaultValue: section.defaultTitle }))
        ]);

        const sectionRows = section.entries.map(entry => 
            h('tr', { key: `${config.id}-${section.id}-${entry.lichess_id}-${entry.rank}` }, config.columns.map(col => {
                let cellContent: (VNode | string | null)[];
                if (col.headerKey === 'records.table.challenge') {
                    cellContent = [h('button.records-page__challenge-button', {
                        on: { click: (e: Event) => {
                            e.preventDefault();
                            controller.services.appController.navigateTo('tower', true, null, null, (entry as TowerLeaderboardEntry).tower_id);
                        }}
                      }, t('records.table.playButton', { defaultValue: 'Play' }))];
                } else if (col.headerKey === 'records.table.player') {
                    cellContent = [
                        renderSubscriptionIcon((entry as TowerLeaderboardEntry).subscriptionTier),
                        h('a', { props: { href: `https://lichess.org/@/${entry.lichess_id}`, target: '_blank', rel: 'noopener noreferrer' } }, String(col.cellValueExtractor(entry)))
                      ];
                } else {
                    cellContent = [String(col.cellValueExtractor(entry))];
                }

                return h(`td.text-${col.textAlign || 'left'}`, {
                  class: { 'col-days-old': col.headerKey === 'records.table.daysOld' }
                }, cellContent.filter(c => c !== null) as (VNode | string)[]);
            }))
        );

        return [sectionHeader, ...sectionRows];
    });

    return h(containerClass, { key: config.id }, [
        h('h3.records-page__table-title', t(config.titleKey, { defaultValue: config.defaultTitle })),
        h('table.records-page__table.records-page__table--consolidated-tower', [
            h('thead', [
                h('tr', config.columns.map(col =>
                    h(`th.text-${col.textAlign || 'left'}`, {
                      class: { 'col-days-old': col.headerKey === 'records.table.daysOld' }
                    }, t(col.headerKey, { defaultValue: col.defaultHeader }))
                ))
            ]),
            h('tbody', tableBodyContent)
        ])
    ]);
}


export function renderRecordsPage(controller: RecordsPageController): VNode {
  const { state } = controller;
  logger.debug('[RecordsPageView] Rendering Records Page with state:', state);
  
  const pageContainerClass = 'div.records-page';

  const pageBanner = h('img.records-page__banner', {
    props: { src: '/svg/ChessBoardLeader.svg', alt: t('records.bannerAlt', { defaultValue: 'Leaderboards Banner' }) }
  });

  let content: VNode[];
  if (state.isLoading) {
    content = [h('p', t('common.loading', { defaultValue: 'Loading data...' }))];
  } else if (state.error) {
    content = [h('p.records-page__error-message', `${t('common.error', { defaultValue: 'Error' })}: ${state.error}`)];
  } else {
    // <<< НАЧАЛО ИЗМЕНЕНИЙ: Рендерим новую таблицу активности
    const activityTable = renderActivityLeaderboard(controller);
    const attackTable = renderSingleLeaderboardTable(state.attackTableData, controller);
    const finishHimTable = renderSingleLeaderboardTable(state.finishHimTableData, controller);
    const towerTable = state.consolidatedTowerData 
        ? renderConsolidatedTowerTable(state.consolidatedTowerData, controller) 
        : null;
    content = [activityTable, attackTable, finishHimTable, towerTable].filter(Boolean) as VNode[];
    // <<< КОНЕЦ ИЗМЕНЕНИЙ

    if (content.length === 0) {
        content = [h('p.records-page__no-data-message', t('records.errors.noLeaderboards', { defaultValue: 'No leaderboards available at the moment.' }))];
    }
  }

  return h(pageContainerClass, [
    pageBanner,
    ...content
  ]);
}
