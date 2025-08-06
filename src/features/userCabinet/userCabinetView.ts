// src/features/userCabinet/userCabinetView.ts
import { h } from 'snabbdom';
import type { VNode } from 'snabbdom';
import type { UserCabinetController, UserCabinetControllerState } from './UserCabinetController';
import type { UserSessionProfile as UserCabinetData, ClubIdNamePair, TowerStats, TowerAttempt, AttackStat, PersonalActivityStatsResponse, PersonalActivityModeStats, TowerId } from '../../core/api.types';
import { t } from '../../core/i18n.service';
import logger from '../../utils/logger';
import { TOWER_DEFINITIONS } from '../tower/tower.types';
import { LichessActivityEntry } from '../../core/lichess-api.service';

const pieceFileMap: { [key: string]: string } = {
  'r': 'bR.svg', 'n': 'bN.svg', 'b': 'bB.svg', 'q': 'bQ.svg', 'k': 'bK.svg', 'p': 'bP.svg',
  'R': 'wR.svg', 'N': 'wN.svg', 'B': 'wB.svg', 'Q': 'wQ.svg', 'K': 'wK.svg', 'P': 'wP.svg',
};
const pieceOrder: { [key: string]: number } = { 'P': 1, 'N': 2, 'B': 3, 'R': 4, 'Q': 5, 'K': 6 };
interface PieceInfo { pieceFile: string; pieceType: string; }

function parseFenForSortedRows(fen_string: string, botColor: 'w' | 'b'): { playerPieces: PieceInfo[], botPieces: PieceInfo[] } {
  const playerPieces: PieceInfo[] = [];
  const botPieces: PieceInfo[] = [];
  const fenBoard = fen_string.split(' ')[0];
  for (const char of fenBoard) {
    if (pieceFileMap[char]) {
      const pieceColor = char === char.toUpperCase() ? 'w' : 'b';
      const pieceInfo = { pieceFile: pieceFileMap[char], pieceType: char.toUpperCase() };
      if (pieceColor === botColor) botPieces.push(pieceInfo);
      else playerPieces.push(pieceInfo);
    }
  }
  const sortFn = (a: PieceInfo, b: PieceInfo) => (pieceOrder[a.pieceType] || 0) - (pieceOrder[b.pieceType] || 0);
  playerPieces.sort(sortFn);
  botPieces.sort(sortFn);
  return { playerPieces, botPieces };
}

function renderStatItem(labelKey: string, defaultValue: string, value: string | number | undefined | VNode): VNode {
  return h('div.user-cabinet__stat-item', [
    h('span.user-cabinet__stat-label', t(labelKey, { defaultValue }) + ': '),
    h('span.user-cabinet__stat-value', value !== undefined ? value : t('common.notAvailable', {defaultValue: 'N/A'})),
  ]);
}

function renderTelegramSection(controller: UserCabinetController): VNode {
  const { cabinetData } = controller.state;
  const telegramId = cabinetData?.telegram_id;
  const miniAppUrl = import.meta.env.VITE_MINIAPP_DIRECT_URL as string;

  let content: VNode;

  if (telegramId) {
    content = h('div.user-cabinet__telegram-status', [
      h('span.icon', '✅'),
      t('userCabinet.telegram.boundStatusSimple', { defaultValue: 'Your Telegram account is successfully linked.' })
    ]);
  } else {
    content = h('button.user-cabinet__telegram-button', {
      on: { click: () => { if (miniAppUrl) window.location.href = miniAppUrl; } }
    }, t('userCabinet.telegram.bindButton', {defaultValue: 'Bind Telegram Account'})
    );
  }

  return h('div.user-cabinet__telegram-section', [
    h('h3.user-cabinet__section-title', t('userCabinet.telegram.title', {defaultValue: 'Telegram'})),
    content
  ]);
}

function renderPersonalActivityStatsSection(state: UserCabinetControllerState): VNode {
  const { personalActivityStats, isPersonalActivityLoading } = state;

  let content: VNode | VNode[];
  if (isPersonalActivityLoading) {
    content = h('p', t('common.loading', { defaultValue: 'Loading...' }));
  } else if (!personalActivityStats || Object.keys(personalActivityStats).length === 0) {
    content = h('p', t('userCabinet.stats.noActivity', { defaultValue: 'No activity data available.' }));
  } else {
    const modeOrder: (keyof PersonalActivityStatsResponse)[] = ['finishHim', 'tower', 'attack', 'tacticalTrainer'];
    
    content = h('div.personal-activity__grid', modeOrder.map(modeKey => {
      const modeData = personalActivityStats[modeKey];
      if (!modeData) return null;

      const periods: { key: keyof PersonalActivityModeStats, labelKey: string }[] = [
        { key: 'daily', labelKey: 'userCabinet.stats.periods.day' },
        { key: 'weekly', labelKey: 'userCabinet.stats.periods.week' },
        { key: 'monthly', labelKey: 'userCabinet.stats.periods.month' },
      ];

      return h('div.personal-activity__card', [
        h('h4.card-title', t(`userCabinet.stats.modes.${modeKey}`, { defaultValue: modeKey })),
        ...periods.map(period => {
          const periodData = modeData[period.key];
          const solved = periodData?.solved ?? 0;
          const requested = periodData?.requested ?? 0;
          const successRate = requested > 0 ? ((solved / requested) * 100).toFixed(0) + '%' : '-';

          return h('div.card-period-stats', [
            h('span.period-label', t(period.labelKey)),
            h('div.stats-row', [
              h('span.stat-value', `${solved}`),
              h('span.stat-rate', successRate)
            ])
          ]);
        })
      ]);
    }).filter(Boolean) as VNode[]);
  }

  return h('div.user-cabinet__personal-activity-section', [
    h('h3.user-cabinet__section-title', t('userCabinet.stats.personal.title', { defaultValue: 'Personal Activity' })),
    content
  ]);
}

function renderFinishHimStats(cabinetData: UserCabinetData | null): VNode {
  const stats = cabinetData?.finishHimStats;

  if (!stats) {
    return h('p', t('userCabinet.stats.noStats', {defaultValue: 'Finish Him statistics are not available.'}));
  }
  return h('div.user-cabinet__stats-section.user-cabinet__stats-section--finish-him', [
    h('h3.user-cabinet__section-title', t('userCabinet.stats.finishHimTitle', {defaultValue: 'Finish Him Statistics'})),
    renderStatItem('userCabinet.stats.gamesPlayed', 'Games Played', stats.gamesPlayed),
    renderStatItem('userCabinet.stats.tacticalRating', 'Tactical Rating', stats.tacticalRating),
    renderStatItem('userCabinet.stats.tacticalWins', 'Tactical Wins', stats.tacticalWins),
    renderStatItem('userCabinet.stats.tacticalLosses', 'Tactical Losses', stats.tacticalLosses),
    renderStatItem('userCabinet.stats.finishHimRating', 'Playout Rating', stats.finishHimRating),
    renderStatItem('userCabinet.stats.playoutWins', 'Playout Wins', stats.playoutWins),
    renderStatItem('userCabinet.stats.playoutDraws', 'Playout Draws', stats.playoutDraws),
    renderStatItem('userCabinet.stats.playoutLosses', 'Playout Losses', stats.playoutLosses),
  ]);
}

function renderTowerStats(cabinetData: UserCabinetData | null, controller: UserCabinetController): VNode | null {
  const towerStats: TowerStats | undefined = cabinetData?.tower_stats;

  if (!towerStats || Object.keys(towerStats).length === 0) {
    return null; 
  }

  let totalTowersCompleted = 0;
  let totalAttempts = 0;

  for (const key in towerStats) {
      const attempts = towerStats[key as TowerId];
      if (attempts) {
          totalTowersCompleted += attempts.length;
          totalAttempts += attempts.reduce((sum, curr) => sum + curr.versuch, 0);
      }
  }

  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };
  
  return h('div.user-cabinet__stats-section.user-cabinet__stats-section--towers', [
    h('h3.user-cabinet__section-title', t('userCabinet.stats.towerTitle', { defaultValue: 'Tower Statistics' })),
    h('div.user-cabinet__stats-summary', [
        renderStatItem('userCabinet.stats.towersCompleted', 'Towers Completed', totalTowersCompleted),
        renderStatItem('userCabinet.stats.totalAttempts', 'Total Attempts', totalAttempts),
    ]),
    h('div.user-cabinet__tower-categories', TOWER_DEFINITIONS.map(towerDef => {
        const attemptsForCategory = towerStats[towerDef.id];
        if (!attemptsForCategory || attemptsForCategory.length === 0) {
            return null;
        }
        return h('div.user-cabinet__tower-category', [
            h('h4.user-cabinet__tower-category-title', t(towerDef.nameKey, {defaultValue: towerDef.defaultName})),
            h('ul.user-cabinet__tower-list', attemptsForCategory.map((attempt: TowerAttempt) => 
                h('li.user-cabinet__tower-item', [
                    h('a', { 
                        props: { href: `/#/tower/${attempt.tower_id}` },
                        on: { click: (e: Event) => {
                            e.preventDefault();
                            controller.services.appController.navigateTo('tower', true, null, null, attempt.tower_id);
                        }}
                    }, `${t('userCabinet.stats.bestTime', {defaultValue: 'Best Time'})}: ${formatTime(attempt.best_time)} (${attempt.versuch} ${t('userCabinet.stats.attempts', {defaultValue: 'attempts'})})`)
                ])
            ))
        ]);
    }).filter(Boolean) as VNode[])
  ]);
}

function renderAttackStats(cabinetData: UserCabinetData | null, controller: UserCabinetController): VNode | null {
  const attackStats: AttackStat[] | undefined = cabinetData?.attack_stats;

  if (!attackStats || attackStats.length === 0) {
    return null;
  }

  const sortedStats = [...attackStats].sort((a, b) => a.best_time - b.best_time);

  return h('div.user-cabinet__stats-section.user-cabinet__stats-section--attack', [
    h('h3.user-cabinet__section-title', t('userCabinet.stats.attackTitle', { defaultValue: 'Attack Mode Statistics' })),
    h('ul.user-cabinet__attack-list', sortedStats.map((stat: AttackStat) =>
      h('li.user-cabinet__attack-item', [
        h('a', {
          props: { href: `/#/attack/PuzzleId/${stat.PuzzleId}` },
          on: {
            click: (e: Event) => {
              e.preventDefault();
              controller.services.appController.navigateTo('attack', true, null, stat.PuzzleId);
            }
          }
        }, `${t('userCabinet.stats.puzzle', { defaultValue: 'Puzzle' })}: ${stat.PuzzleId} | ${t('userCabinet.stats.bestTime', { defaultValue: 'Best Time' })}: ${stat.best_time}s`)
      ])
    ))
  ]);
}

function renderClubList(
  titleKey: string,
  defaultTitle: string,
  clubData: ClubIdNamePair[] | undefined,
  controller: UserCabinetController
): VNode | null {
  if (!clubData || clubData.length === 0) {
    return h('div.user-cabinet__club-list-section', [
        h('h4.user-cabinet__club-list-title', t(titleKey, { defaultValue: defaultTitle })),
        h('p.user-cabinet__no-data-message', t('userCabinet.clubs.noClubsInThisRole', {defaultValue: 'No clubs in this category.'}))
    ]);
  }

  return h('div.user-cabinet__club-list-section', [
    h('h4.user-cabinet__club-list-title', t(titleKey, { defaultValue: defaultTitle })),
    h('ul.user-cabinet__club-list', clubData.map((club: ClubIdNamePair) =>
      h('li.user-cabinet__club-list-item', [
        h('a', {
          props: { href: `/#/clubs/${club.club_id}` }, 
          on: {
            click: (e: Event) => {
              e.preventDefault();
              controller.services.appController.navigateTo('clubPage', true, club.club_id);
            }
          }
        }, club.club_name) 
      ])
    ))
  ]);
}

function renderClubActivity(cabinetData: UserCabinetData | null, controller: UserCabinetController): VNode | null {
  if (!cabinetData) return null;

  const followedClubsNode = renderClubList('userCabinet.clubs.followedClubs', 'Followed Clubs', cabinetData.follow_clubs, controller);
  const founderClubsNode = renderClubList('userCabinet.clubs.founderOfClubs', 'Founder Of', cabinetData.club_founder, controller);

  if (!cabinetData.follow_clubs && !cabinetData.club_founder) {
     return h('div.user-cabinet__club-activity-section', [
        h('h3.user-cabinet__section-title', t('userCabinet.clubs.activityTitle', {defaultValue: 'Club Activity'})),
        h('p', t('userCabinet.clubs.noActivity', {defaultValue: 'No club activity to display.'}))
    ]);
  }

  return h('div.user-cabinet__club-activity-section', [
    h('h3.user-cabinet__section-title', t('userCabinet.clubs.activityTitle', {defaultValue: 'Club Activity'})),
    followedClubsNode,
    founderClubsNode,
  ].filter(Boolean) as VNode[]); 
}

function renderFavoritePuzzles(state: UserCabinetControllerState, controller: UserCabinetController): VNode | null {
    if (!state.favoritePuzzles || state.favoritePuzzles.length === 0) {
        return null;
    }
    const currentPieceSet = controller.services.themeService.getCurrentTheme().pieces;

    return h('div.user-cabinet__favorites-section', [
        h('h3.user-cabinet__section-title', t('userCabinet.favorites.title', {defaultValue: 'Favorite Puzzles'})),
        h('ul.user-cabinet__puzzle-list', state.favoritePuzzles.map(puzzle => {
            const { playerPieces, botPieces } = parseFenForSortedRows(puzzle.fen_final, puzzle.bot_color);
            const playerPieceIcons = playerPieces.map((p, i) => h('img.sorted-piece-icon', { key: `fav-player-${puzzle.id}-${i}`, props: { src: `/piece/${currentPieceSet}/${p.pieceFile}` } }));
            const botPieceIcons = botPieces.map((p, i) => h('img.sorted-piece-icon', { key: `fav-bot-${puzzle.id}-${i}`, props: { src: `/piece/${currentPieceSet}/${p.pieceFile}` } }));

            return h('li.user-cabinet__puzzle-list-item', { key: puzzle.id }, [
                h('a.puzzle-visual-link', {
                    props: { href: `/#/finishHim/PuzzleId/${puzzle.id}` },
                    on: {
                        click: (e: Event) => {
                            e.preventDefault();
                            controller.services.appController.navigateTo('finishHim', true, null, puzzle.id);
                        }
                    }
                }, [
                    h('div.sorted-pieces-rows-container', [
                        h('div.pieces-row.player-pieces', playerPieceIcons),
                        h('div.pieces-row.bot-pieces', botPieceIcons)
                    ]),
                ]),
                h('div.user-cabinet__puzzle-actions', [
                    h('button.puzzle-action-button.delete-button', {
                        attrs: { title: t('common.delete') },
                        on: {
                            click: (e: Event) => {
                                e.stopPropagation();
                                controller.handleRemoveFavorite(puzzle.id);
                            }
                        }
                    }, '🗑️'),
                    h('button.puzzle-action-button.play-button', {
                         attrs: { title: t('common.play') },
                         on: {
                             click: (e: Event) => {
                                 e.stopPropagation();
                                 controller.services.appController.navigateTo('finishHim', true, null, puzzle.id);
                             }
                         }
                    }, '▶️')
                ])
            ]);
        }))
    ]);
}

function renderRatingChange(rp: {before: number, after: number}): VNode {
    const diff = rp.after - rp.before;
    const sign = diff > 0 ? '+' : '';
    const colorClass = diff > 0 ? '.positive' : (diff < 0 ? '.negative' : '');
    
    return h('span.rating-change', [
        `${rp.before} → ${rp.after} (`,
        h(`span${colorClass}`, `${sign}${diff}`),
        ')'
    ]);
}

function renderActivityEntry(entry: LichessActivityEntry): VNode {
    const date = new Date(entry.interval.start).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const details: VNode[] = [];

    if (entry.games) {
        for (const gameType in entry.games) {
            const data = entry.games[gameType];
            details.push(h('div.activity-detail-item', [
                h('strong', `${gameType.charAt(0).toUpperCase() + gameType.slice(1)} Games:`),
                h('span', ` ${data.win}W / ${data.loss}L / ${data.draw}D`),
                h('br'),
                renderRatingChange(data.rp)
            ]));
        }
    }

    if (entry.puzzles) {
        const data = entry.puzzles.score;
        details.push(h('div.activity-detail-item', [
            h('strong', 'Puzzles:'),
            h('span', ` ${data.win}W / ${data.loss}L`),
            h('br'),
            renderRatingChange(data.rp)
        ]));
    }
    
    return h('tr.user-cabinet__activity-row', { key: entry.interval.start }, [
        h('td.user-cabinet__activity-date', date),
        h('td.user-cabinet__activity-details', details)
    ]);
}

function renderLichessActivity(state: UserCabinetControllerState): VNode {
    return h('div.user-cabinet__stats-section.user-cabinet__stats-section--lichess-activity', [
        h('h3.user-cabinet__section-title', t('userCabinet.activity.title', {defaultValue: 'Lichess Activity'})),
        state.isActivityLoading
            ? h('p', t('common.loading', {defaultValue: 'Loading...'}))
            : (!state.lichessActivity || state.lichessActivity.length === 0)
                ? h('p', t('userCabinet.activity.noActivity', {defaultValue: 'No recent Lichess activity found.'}))
                : h('table.user-cabinet__activity-table', [
                    h('thead', h('tr', [
                        h('th', t('userCabinet.activity.dateHeader', {defaultValue: 'Date'})),
                        h('th', t('userCabinet.activity.summaryHeader', {defaultValue: 'Activity Summary'}))
                    ])),
                    h('tbody', state.lichessActivity.map(renderActivityEntry))
                ])
    ]);
}

export function renderUserCabinetPage(controller: UserCabinetController): VNode {
  const state: UserCabinetControllerState = controller.state;
  logger.debug('[UserCabinetView] Rendering User Cabinet Page with state:', state);

  if (state.isLoading && !state.cabinetData) {
    return h('div.user-cabinet-page.loading', [
      h('h1', state.pageTitle),
      h('p', t('common.loading', { defaultValue: 'Loading data...' }))
    ]);
  }

  if (state.error) {
    return h('div.user-cabinet-page.error', [
      h('h1', state.pageTitle),
      h('p.error-message', `${t('common.error', { defaultValue: 'Error' })}: ${state.error}`)
    ]);
  }

  if (!state.cabinetData) {
    return h('div.user-cabinet-page.no-data', [
      h('h1', state.pageTitle),
      h('p', t('userCabinet.error.noDataFound', {defaultValue: 'No data found for user cabinet.'}))
    ]);
  }

  const { cabinetData } = state;

  let subscriptionValue: VNode | string = cabinetData.subscriptionTier;
  if (cabinetData.TierExpire) {
    const formattedDate = new Date(cabinetData.TierExpire).toLocaleDateString();
    subscriptionValue = h('span', [
        cabinetData.subscriptionTier,
        h('span.tier-expire-date', t('userCabinet.info.tierExpires', { date: formattedDate }))
    ]);
  } else if (cabinetData.subscriptionTier !== 'none') {
    subscriptionValue = h('span', [
        cabinetData.subscriptionTier,
        h('span.tier-expire-date', t('userCabinet.info.tierPermanent'))
    ]);
  }

  return h('div.user-cabinet-container', [
    h('header.user-cabinet__header', [
      h('h1.user-cabinet__page-main-title', state.pageTitle),
      h('div.user-cabinet__user-info-basic', [
        renderStatItem('userCabinet.info.lichessId', 'Lichess ID', cabinetData.id),
        renderStatItem('userCabinet.info.subscriptionTier', 'Subscription', subscriptionValue),
      ])
    ]),
    renderTelegramSection(controller),
    renderPersonalActivityStatsSection(state),
    renderLichessActivity(state),
    renderFinishHimStats(cabinetData),
    renderAttackStats(cabinetData, controller),
    renderTowerStats(cabinetData, controller),
    renderClubActivity(cabinetData, controller),
    renderFavoritePuzzles(state, controller),
  ]);
}
