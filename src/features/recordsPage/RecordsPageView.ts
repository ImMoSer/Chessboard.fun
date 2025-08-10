// src/features/recordsPage/RecordsPageView.ts
import { h, VNode } from 'snabbdom';
import type { RecordsPageController, SkillPeriod } from './RecordsPageController';
import { t } from '../../core/i18n.service';
import logger from '../../utils/logger';
import type {
    OverallSkillLeaderboardEntry,
    SkillByMode,
    SkillStreakLeaderboardEntry,
    FinishHimLeaderboardEntry,
    TowerLeaderboardEntry,
    AttackLeaderboardEntry,
    TowerId
} from '../../core/api.types';
import { TOWER_DEFINITIONS } from '../tower/tower.types';

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

function renderSkillProgressBar(skillByMode: SkillByMode, totalSkill: number): VNode {
    const modes: (keyof SkillByMode)[] = ['finishHim', 'attack', 'tower', 'tacticalTrainer'];
    const segments = modes.map(mode => {
        const skillValue = skillByMode[mode] || 0;
        if (skillValue === 0) return null;
        const width = totalSkill > 0 ? (skillValue / totalSkill) * 100 : 0;
        return h(`div.skill-bar-segment.${mode}`, {
            style: { width: `${width}%` },
            attrs: { title: `${t(`userCabinet.stats.modes.${mode}`)}: ${skillValue}` }
        });
    }).filter(Boolean) as VNode[];

    return h('div.skill-progress-bar', segments);
}

function renderSkillLegend(): VNode {
    const modes: { key: keyof SkillByMode, nameKey: string }[] = [
        { key: 'finishHim', nameKey: 'userCabinet.stats.modes.finishHim' },
        { key: 'attack', nameKey: 'userCabinet.stats.modes.attack' },
        { key: 'tower', nameKey: 'userCabinet.stats.modes.tower' },
        { key: 'tacticalTrainer', nameKey: 'userCabinet.stats.modes.tacticalTrainer' },
    ];

    return h('div.skill-legend', modes.map(mode =>
        h('div.legend-item', [
            h(`span.legend-color-swatch.${mode.key}`),
            h('span.legend-label', t(mode.nameKey))
        ])
    ));
}

function renderOverallSkillLeaderboard(controller: RecordsPageController): VNode | null {
    const { overallSkillData, selectedSkillPeriod, isSkillLeaderboardLoading } = controller.state;

    const periodOptions: { value: SkillPeriod, textKey: string, default: string }[] = [
        { value: '7', textKey: 'userCabinet.stats.periods.week', default: 'Last 7 days' },
        { value: '14', textKey: 'records.periods.days14', default: 'Last 14 days' },
        { value: '21', textKey: 'records.periods.days21', default: 'Last 21 days' },
        { value: '30', textKey: 'userCabinet.stats.periods.month', default: 'Last 30 days' },
    ];

    const filters = h('div.stats-filters', [
        h('select', {
            on: { change: (e: Event) => controller.handleSkillPeriodChange((e.target as HTMLSelectElement).value as SkillPeriod) }
        }, periodOptions.map(opt => h('option', { props: { value: opt.value, selected: selectedSkillPeriod === opt.value } }, t(opt.textKey, {defaultValue: opt.default }))))
    ]);

    let tableContent: VNode;
    if (isSkillLeaderboardLoading) {
        tableContent = h('p.records-page__no-data-message', t('common.loading'));
    } else if (!overallSkillData || overallSkillData.length === 0) {
        tableContent = h('p.records-page__no-data-message', t('records.table.noEntries'));
    } else {
        tableContent = h('table.records-page__table', [
            h('thead', h('tr', [
                h('th.text-center', t('records.table.rank')),
                h('th.text-left', t('records.table.player')),
                h('th.text-right', t('records.table.totalSkill')),
            ])),
            h('tbody', overallSkillData.map((entry: OverallSkillLeaderboardEntry, index) =>
                h('tr', { key: entry.lichess_id }, [
                    h('td.text-center', (index + 1).toString()),
                    h('td.text-left', [
                        renderSubscriptionIcon(entry.subscriptionTier),
                        h('a', { props: { href: `https://lichess.org/@/${entry.lichess_id}`, target: '_blank', rel: 'noopener noreferrer' } }, entry.username)
                    ]),
                    h('td.text-right', [
                        h('span.total-skill-value', entry.total_skill.toString()),
                        renderSkillProgressBar(entry.skill_by_mode, entry.total_skill)
                    ]),
                ])
            ))
        ]);
    }

    return h('div.records-page__table-container.records-page__table-container--overall-skill', [
        h('h3.records-page__table-title', t('records.titles.overallSkill', { defaultValue: 'Overall Skill' })),
        filters,
        renderSkillLegend(),
        tableContent
    ]);
}

function renderSkillStreakLeaderboard(controller: RecordsPageController): VNode | null {
    const { skillStreakData } = controller.state;
    if (!skillStreakData || skillStreakData.length === 0) return null;

    let tableContent: VNode;
    tableContent = h('table.records-page__table', [
        h('thead', h('tr', [
            h('th.text-center', t('records.table.rank')),
            h('th.text-left', t('records.table.player')),
            h('th.text-right', t('records.table.streakDays')),
        ])),
        h('tbody', skillStreakData.map((entry: SkillStreakLeaderboardEntry, index) =>
            h('tr', { key: entry.lichess_id }, [
                h('td.text-center', (index + 1).toString()),
                h('td.text-left', [
                    h('a', { props: { href: `https://lichess.org/@/${entry.lichess_id}`, target: '_blank', rel: 'noopener noreferrer' } }, entry.username)
                ]),
                h('td.text-right', entry.current_streak.toString()),
            ])
        ))
    ]);

    return h('div.records-page__table-container.records-page__table-container--skill-streak', [
        h('h3.records-page__table-title', t('records.titles.skillStreak', { defaultValue: 'Skill Streak' })),
        tableContent
    ]);
}

// <<< НАЧАЛО ИЗМЕНЕНИЙ: Адаптация таблицы Finish Him
function renderFinishHimLeaderboard(data: FinishHimLeaderboardEntry[] | null, controller: RecordsPageController): VNode | null {
    if (!data || data.length === 0) return null;

    return h('div.records-page__table-container.records-page__table-container--finishHimLeaderboard', [
        h('h3.records-page__table-title', t('records.titles.topFinishHim')),
        h('table.records-page__table', [
            h('thead', h('tr', [
                h('th.text-center', t('records.table.rank')),
                h('th.text-left', t('records.table.player')),
                h('th.text-right', t('records.table.time')),
                h('th.text-right', t('records.table.daysOld')),
                h('th.text-center', t('records.table.action')),
            ])),
            h('tbody', data.map(entry =>
                h('tr', { key: entry.puzzle_id + entry.lichess_id }, [
                    h('td.text-center', entry.rank),
                    h('td.text-left', [
                        renderSubscriptionIcon(entry.subscriptionTier),
                        h('a', { props: { href: `https://lichess.org/@/${entry.lichess_id}`, target: '_blank' } }, entry.username)
                    ]),
                    h('td.text-right', `${entry.best_time}s`),
                    h('td.text-right', `${entry.days_old}d`),
                    h('td.text-center', [
                        h('button.records-page__challenge-button', {
                            on: { click: () => controller.services.appController.navigateTo('finishHim', true, null, entry.puzzle_id) }
                        }, t('records.table.challenge'))
                    ]),
                ])
            ))
        ])
    ]);
}
// <<< КОНЕЦ ИЗМЕНЕНИЙ

function renderTowerLeaderboards(data: { [key in TowerId]?: TowerLeaderboardEntry[] } | null, controller: RecordsPageController): VNode | null {
    if (!data) return null;

    const towerTables = TOWER_DEFINITIONS.map(towerDef => {
        const leaderboard = data[towerDef.id];
        if (!leaderboard || leaderboard.length === 0) return null;

        const headerRow = h('tr.records-page__table-section-header', { class: { [`records-page__table-section-header--${towerDef.id}`]: true } }, [
            h('th', { props: { colSpan: 5 } }, t(towerDef.nameKey, { defaultValue: towerDef.defaultName }))
        ]);

        const dataRows = leaderboard.map(entry =>
            h('tr', { key: entry.tower_id + entry.lichess_id }, [
                h('td.text-center', entry.rank),
                h('td.text-left', [
                    renderSubscriptionIcon(entry.subscriptionTier),
                    h('a', { props: { href: `https://lichess.org/@/${entry.lichess_id}`, target: '_blank' } }, entry.username)
                ]),
                h('td.text-right', `${entry.best_time}s`),
                h('td.text-right', `${entry.days_old}d`),
                h('td.text-center', [
                    h('button.records-page__challenge-button', {
                        on: { click: () => controller.services.appController.navigateTo('tower', true, null, null, entry.tower_id) }
                    }, t('records.table.challenge'))
                ]),
            ])
        );

        return [headerRow, ...dataRows];
    }).flat().filter(Boolean) as VNode[];

    if (towerTables.length === 0) return null;

    return h('div.records-page__table-container.records-page__table-container--towerLeaderboard', [
        h('h3.records-page__table-title', t('records.titles.towerLeaderboard')),
        h('table.records-page__table', [
            h('thead', h('tr', [
                h('th.text-center', t('records.table.rank')),
                h('th.text-left', t('records.table.player')),
                h('th.text-right', t('records.table.time')),
                h('th.text-right', t('records.table.daysOld')),
                h('th.text-center', t('records.table.action')),
            ])),
            h('tbody', towerTables)
        ])
    ]);
}

function renderAttackLeaderboard(data: AttackLeaderboardEntry[] | null, controller: RecordsPageController): VNode | null {
    if (!data || data.length === 0) return null;

    return h('div.records-page__table-container.records-page__table-container--attackLeaderboard', [
        h('h3.records-page__table-title', t('records.titles.topAttack')),
        h('table.records-page__table', [
            h('thead', h('tr', [
                h('th.text-center', t('records.table.rank')),
                h('th.text-left', t('records.table.player')),
                h('th.text-right', t('records.table.time')),
                h('th.text-right', t('records.table.daysOld')),
                h('th.text-center', t('records.table.action')),
            ])),
            h('tbody', data.map(entry =>
                h('tr', { key: entry.puzzle_id + entry.lichess_id }, [
                    h('td.text-center', entry.rank),
                    h('td.text-left', [
                        renderSubscriptionIcon(entry.subscriptionTier),
                        h('a', { props: { href: `https://lichess.org/@/${entry.lichess_id}`, target: '_blank' } }, entry.username)
                    ]),
                    h('td.text-right', `${entry.best_time}s`),
                    h('td.text-right', `${entry.days_old}d`),
                    h('td.text-center', [
                        h('button.records-page__challenge-button', {
                            on: { click: () => controller.services.appController.navigateTo('attack', true, null, entry.puzzle_id) }
                        }, t('records.table.challenge'))
                    ]),
                ])
            ))
        ])
    ]);
}


export function renderRecordsPage(controller: RecordsPageController): VNode {
  const { state } = controller;
  logger.debug('[RecordsPageView] Rendering Records Page with combined state:', state);

  const pageContainerClass = 'div.records-page';

  const pageBanner = h('img.records-page__banner', {
    props: { src: '/svg/ChessBoardLeader.svg', alt: t('records.bannerAlt', { defaultValue: 'Leaderboards Banner' }) }
  });

  let content: (VNode | null)[];
  if (state.isLoading) {
    content = [h('p', t('common.loading', { defaultValue: 'Loading data...' }))];
  } else if (state.error) {
    content = [h('p.records-page__error-message', `${t('common.error', { defaultValue: 'Error' })}: ${state.error}`)];
  } else {
    const { worktableLeaderboards } = state;
    content = [
        renderSkillStreakLeaderboard(controller),
        renderTowerLeaderboards(worktableLeaderboards?.towerLeaderboards ?? null, controller),
        renderFinishHimLeaderboard(worktableLeaderboards?.finishHimLeaderboard ?? null, controller),
        renderAttackLeaderboard(worktableLeaderboards?.attackLeaderboard ?? null, controller),
        renderOverallSkillLeaderboard(controller),
    ];
  }

  return h(pageContainerClass, [
    pageBanner,
    h('div.records-page__grid', content.filter(Boolean) as VNode[])
  ]);
}
