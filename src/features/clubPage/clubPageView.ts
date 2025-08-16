// src/features/clubPage/clubPageView.ts
import { h } from 'snabbdom';
import type { VNode, VNodeData } from 'snabbdom';
import type { ClubPageController, ClubPageTableKey, ClubPageTabId } from './ClubPageController';
import type {
  TournamentHistoryEntry,
  TournamentPlayer,
  ClubLeader,
  TournamentInfo,
  MedalDetail,
  PlayerData
} from '../../core/api.types';
import { t } from '../../core/i18n.service';
import logger from '../../utils/logger';

const VISIBLE_COUNT_INCREMENT = 10;

function renderClubBanner(clubId: string): VNode {
    const bannerUrlJpg = `/clubPageBanner/club_id_${clubId}.jpg`;
    const bannerUrlPng = `/clubPageBanner/club_id_${clubId}.png`;
    const bannerUrlWebp = `/clubPageBanner/club_id_${clubId}.webp`;

    const onErrorHandler = (event: Event) => {
        const imgElement = event.target as HTMLImageElement;
        const currentSrc = imgElement.src;

        if (currentSrc.endsWith('.jpg')) {
            imgElement.src = bannerUrlPng;
        } else if (currentSrc.endsWith('.png')) {
            imgElement.src = bannerUrlWebp;
        } else {
            imgElement.style.display = 'none';
        }
    };

    return h('img.club-page__banner', {
        key: `banner-${clubId}`,
        props: {
            src: bannerUrlJpg,
            alt: t('clubPage.bannerAlt', { defaultValue: 'Club Banner' })
        },
        on: {
            error: onErrorHandler
        }
    });
}


function renderFlairIcon(flair?: string | null): VNode | null {
  if (!flair) return null;
  const flairUrl = `https://lichess1.org/assets/flair/img/${flair}.webp`;
  return h('img.club-page__flair-icon', { 
    props: { src: flairUrl, alt: 'Flair', title: flair } 
  });
}

// <<< НАЧАЛО ИЗМЕНЕНИЙ: Функция для рендера иконки короны
function renderCrownIcon(): VNode {
    const crownUrl = `/flair/objects.crown.webp`;
    return h('img.club-page__crown-icon', {
        props: { src: crownUrl, alt: 'Crown', title: 'Зачетный игрок' },
        style: { 'vertical-align': 'middle', 'margin-right': '4px', 'height': '1em' }
    });
}
// <<< КОНЕЦ ИЗМЕНЕНИЙ

function renderPlayerCell(player: PlayerData): VNode {
    return h('td.text-left', [
        h('a', { 
            props: { 
                href: `https://lichess.org/@/${player.lichess_id}`, 
                target: '_blank',
                rel: 'noopener noreferrer'
            } 
        }, player.username),
        renderFlairIcon(player.flair)
    ]);
}

function renderLeaderTable(leaders: ClubLeader[]): VNode {
  if (!leaders || leaders.length === 0) {
    return h('p.club-page__no-data-message', t('clubPage.noLeaders', { defaultValue: 'No leaders listed.' }));
  }
  return h('div.club-page__leaders-section', [
    h('h3.club-page__section-title', t('clubPage.leadersTitle', { defaultValue: 'Club Leaders' })),
    h('ul.club-page__leaders-list', leaders.map(leader =>
      h('li', [
        h('a', {
          props: { href: `https://lichess.org/@/${leader.id}`, target: '_blank', rel: 'noopener noreferrer' }
        }, [
            `${leader.title ? leader.title + ' ' : ''}${leader.name}`,
            renderFlairIcon(leader.flair)
        ])
      ])
    ))
  ]);
}

function renderFollowButton(controller: ClubPageController): VNode | null {
    if (!controller.getIsUserAuthenticated()) return null;
    const { isFollowingCurrentClub, isFollowRequestProcessing } = controller.state;
    return h('button.club-page__follow-button', {
        class: { 'following': isFollowingCurrentClub, 'not-following': !isFollowingCurrentClub },
        attrs: { disabled: isFollowRequestProcessing },
        on: { click: () => controller.toggleFollowCurrentClub() }
    }, isFollowRequestProcessing ? t('common.processing') : (isFollowingCurrentClub ? t('clubPage.button.unfollow') : t('clubPage.button.follow')));
}

function renderMedalDetailsRow(tournaments: TournamentInfo[], key: string): VNode {
  return h('tr.club-page__medal-details-row', { key }, [
    h('td', { props: { colSpan: 6 } }, [
      h('ul.club-page__medal-tournament-list', tournaments.map(tourney => 
        h('li', [
          h('a', { props: { href: tourney.url, target: '_blank', rel: 'noopener noreferrer' }}, tourney.name),
          h('span.date', ` (${formatDateForUser(tourney.date)})`)
        ])
      ))
    ])
  ]);
}

function formatDateForUser(isoDateString: string): string {
    try {
        const date = new Date(isoDateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);
        return `${day}.${month}.${year}`;
    } catch (e) {
        logger.error('[clubPageView] Error formatting date:', e);
        return isoDateString;
    }
}

function renderShowMoreButton(
    totalCount: number,
    visibleCount: number,
    tableKey: ClubPageTableKey,
    controller: ClubPageController
): VNode | null {
    if (totalCount <= visibleCount) {
        return null;
    }
    return h('div.club-page__show-more-container', [
        h('button.club-page__show-more-button', {
            on: { click: () => controller.showMore(tableKey) }
        }, t('clubPage.button.showMore', {
            defaultValue: `Show more (+${VISIBLE_COUNT_INCREMENT})`
        }))
    ]);
}

function renderOverviewTable(players: PlayerData[], controller: ClubPageController): VNode {
    const tableKey: ClubPageTableKey = 'overview';
    const visibleCount = controller.state.visiblePlayerCounts[tableKey];
    const visiblePlayers = players.slice(0, visibleCount);

    const headers = [
        { label: '#', className: 'text-center' },
        { label: t('clubPage.table.player'), className: 'text-left' },
        { label: 'VECTOR', className: 'text-right' },
        { label: t('clubPage.table.totalScore'), className: 'text-right' },
        { label: t('clubPage.table.tournaments'), className: 'text-right' },
        { label: t('clubPage.table.gamesPlayed'), className: 'text-right' },
        { label: t('clubPage.table.avgPerf'), className: 'text-right' },
        { label: '🚀', className: 'text-center' },
        { label: '🥇', className: 'text-center' },
    ];

    return h('div.club-page__table-container.club-page__table-container--overview', [
        h('h3.club-page__table-title', t('clubPage.overview.title', {defaultValue: 'Club Overview'})),
        h('div.club-page__overview-wrapper', [
            h('table.club-page__table.club-page__overview-table', [
                h('thead', h('tr', headers.map(header => h('th', {class: {[header.className]: true}}, header.label)))),
                h('tbody', visiblePlayers.map((player, index) => {
                    const teamMedalSum = player.medals_in_team.gold.count + player.medals_in_team.silver.count + player.medals_in_team.bronze.count;
                    const arenaMedalSum = player.medals_in_arena.gold.count + player.medals_in_arena.silver.count + player.medals_in_arena.bronze.count;
                    return h('tr', { key: player.lichess_id }, [
                        h('td.text-center', { attrs: { 'data-label': '#' } }, (index + 1).toString()),
                        h('td.text-left', { attrs: { 'data-label': t('clubPage.table.player') } }, [
                            h('a', { props: { href: `https://lichess.org/@/${player.lichess_id}`, target: '_blank' } }, player.username),
                            renderFlairIcon(player.flair)
                        ]),
                        h('td.text-right.bold', { attrs: { 'data-label': 'VECTOR' } }, player.vector.toString()),
                        h('td.text-right', { attrs: { 'data-label': t('clubPage.table.totalScore') } }, player.total_score.toString()),
                        h('td.text-right', { attrs: { 'data-label': t('clubPage.table.tournaments') } }, player.tournaments_played.toString()),
                        h('td.text-right', { attrs: { 'data-label': t('clubPage.table.gamesPlayed') } }, player.total_games_played.toString()),
                        h('td.text-right', { attrs: { 'data-label': t('clubPage.table.avgPerf') } }, player.performance_stats.avg.toString()),
                        h('td.text-center', { attrs: { 'data-label': '🚀' } }, player.total_berserk_wins.toString()),
                        h('td.text-center', { attrs: { 'data-label': '🥇' } }, (teamMedalSum + arenaMedalSum).toString()),
                    ])
                })),
            ]),
        ]),
        renderShowMoreButton(players.length, visibleCount, tableKey, controller),
    ]);
}


function renderMvpTable(players: PlayerData[], controller: ClubPageController): VNode {
  const tableKey: ClubPageTableKey = 'mvp';
  const visibleCount = controller.state.visiblePlayerCounts[tableKey];
  const visiblePlayers = players.slice(0, visibleCount);

  return h('div.club-page__table-container.club-page__table-container--mvp', [
    h('h3.club-page__table-title', t('clubPage.mostValuablePlayersTitle')),
    h('table.club-page__table', [
      h('thead', h('tr', [
          h('th.text-center', '#'), h('th.text-left', t('clubPage.table.player')), h('th.text-right', t('clubPage.table.totalScore')),
      ])),
      h('tbody', visiblePlayers.map((player, index) => {
          return h('tr', { key: player.lichess_id }, [
              h('td.text-center', (index + 1).toString()),
              renderPlayerCell(player),
              h('td.text-right', player.total_score.toString()),
          ]);
      })),
    ]),
    renderShowMoreButton(players.length, visibleCount, tableKey, controller),
  ]);
}

function renderMostActiveTable(players: PlayerData[], controller: ClubPageController): VNode {
  const tableKey: ClubPageTableKey = 'active';
  const visibleCount = controller.state.visiblePlayerCounts[tableKey];
  const visiblePlayers = players.slice(0, visibleCount);

  return h('div.club-page__table-container.club-page__table-container--active', [
    h('h3.club-page__table-title', t('clubPage.mostActivePlayersTitle')),
    h('table.club-page__table', [
      h('thead', h('tr', [
          h('th.text-center', '#'), h('th.text-left', t('clubPage.table.player')), h('th.text-right', t('clubPage.table.tournaments')),
      ])),
      h('tbody', visiblePlayers.map((player, index) => {
          return h('tr', { key: player.lichess_id }, [
            h('td.text-center', (index + 1).toString()), 
            renderPlayerCell(player), 
            h('td.text-right', player.tournaments_played.toString()),
          ]);
      })),
    ]),
    renderShowMoreButton(players.length, visibleCount, tableKey, controller),
  ]);
}

function renderTotalGamesTable(players: PlayerData[], controller: ClubPageController): VNode {
    const tableKey: ClubPageTableKey = 'totalGames';
    const visibleCount = controller.state.visiblePlayerCounts[tableKey];
    const visiblePlayers = players.slice(0, visibleCount);

    return h('div.club-page__table-container.club-page__table-container--games', [
        h('h3.club-page__table-title', t('clubPage.mostGamesPlayedTitle', { defaultValue: 'Hard Workers (Games)' })),
        h('table.club-page__table', [
            h('thead', h('tr', [
                h('th.text-center', '#'), h('th.text-left', t('clubPage.table.player')), h('th.text-right', t('clubPage.table.gamesPlayed')),
            ])),
            h('tbody', visiblePlayers.map((player, index) => {
                return h('tr', { key: player.lichess_id }, [
                    h('td.text-center', (index + 1).toString()),
                    renderPlayerCell(player),
                    h('td.text-right', player.total_games_played.toString()),
                ]);
            })),
        ]),
        renderShowMoreButton(players.length, visibleCount, tableKey, controller),
    ]);
}

function renderWinStreaksTable(players: PlayerData[], controller: ClubPageController): VNode {
    const tableKey: ClubPageTableKey = 'winStreaks';
    const visibleCount = controller.state.visiblePlayerCounts[tableKey];
    const visiblePlayers = players.slice(0, visibleCount);

    return h('div.club-page__table-container.club-page__table-container--win-streaks', [
        h('h3.club-page__table-title', t('clubPage.winStreakMastersTitle', { defaultValue: 'Win Streak Masters' })),
        h('table.club-page__table', [
            h('thead', h('tr', [
                h('th.text-center', '#'), h('th.text-left', t('clubPage.table.player')), h('th.text-right', t('clubPage.table.maxWinStreak')),
            ])),
            h('tbody', visiblePlayers.map((player, index) => {
                return h('tr', { key: player.lichess_id }, [
                    h('td.text-center', (index + 1).toString()),
                    renderPlayerCell(player),
                    h('td.text-right', player.max_longest_win_streak_ever.toString()),
                ]);
            })),
        ]),
        renderShowMoreButton(players.length, visibleCount, tableKey, controller),
    ]);
}

function renderBerserkersTable(players: PlayerData[], controller: ClubPageController): VNode {
  const tableKey: ClubPageTableKey = 'berserkers';
  const visibleCount = controller.state.visiblePlayerCounts[tableKey];
  const visiblePlayers = players.slice(0, visibleCount);
  
  return h('div.club-page__table-container.club-page__table-container--berserkers', [
    h('h3.club-page__table-title', t('clubPage.berserkKingsTitle')),
    h('table.club-page__table', [
      h('thead', h('tr', [
          h('th.text-center', '#'), h('th.text-left', t('clubPage.table.player')), h('th.text-right', `🚀 ${t('clubPage.table.berserkWins')}`),
      ])),
      h('tbody', visiblePlayers.map((player, index) => {
          return h('tr', { key: player.lichess_id }, [
            h('td.text-center', (index + 1).toString()), 
            renderPlayerCell(player), 
            h('td.text-right', player.total_berserk_wins.toString()),
          ]);
      })),
    ]),
    renderShowMoreButton(players.length, visibleCount, tableKey, controller),
  ]);
}

function renderPerformanceTable(players: PlayerData[], controller: ClubPageController): VNode {
  const tableKey: ClubPageTableKey = 'performance';
  const visibleCount = controller.state.visiblePlayerCounts[tableKey];
  const visiblePlayers = players.slice(0, visibleCount);
    
  return h('div.club-page__table-container.club-page__table-container--performance', [
    h('h3.club-page__table-title', t('clubPage.performanceLeadersTitle')),
    h('table.club-page__table', [
      h('thead', h('tr', [
          h('th.text-center', '#'), h('th.text-left', t('clubPage.table.player')), h('th.text-right', t('clubPage.table.avgPerf')),
          h('th.text-right', t('clubPage.table.maxPerf')), h('th.text-right', t('clubPage.table.minPerf')),
      ])),
      h('tbody', visiblePlayers.map((player, index) => {
          return h('tr', { key: player.lichess_id }, [
            h('td.text-center', (index + 1).toString()), 
            renderPlayerCell(player),
            h('td.text-right', player.performance_stats.avg.toString()),
            h('td.text-right', player.performance_stats.max.toString()),
            h('td.text-right', player.performance_stats.min.toString()),
          ]);
      })),
    ]),
    renderShowMoreButton(players.length, visibleCount, tableKey, controller),
  ]);
}

function renderRatingTable(players: PlayerData[], controller: ClubPageController): VNode {
  const tableKey: ClubPageTableKey = 'rating';
  const visibleCount = controller.state.visiblePlayerCounts[tableKey];
  const visiblePlayers = players.slice(0, visibleCount);

  return h('div.club-page__table-container.club-page__table-container--rating', [
    h('h3.club-page__table-title', t('clubPage.ratingLeadersTitle')),
    h('table.club-page__table', [
      h('thead', h('tr', [
          h('th.text-center', '#'), h('th.text-left', t('clubPage.table.player')), h('th.text-right', t('clubPage.table.avgRating')),
          h('th.text-right', t('clubPage.table.maxRating')), h('th.text-right', t('clubPage.table.minRating')),
      ])),
      h('tbody', visiblePlayers.map((player, index) => {
          return h('tr', { key: player.lichess_id }, [
            h('td.text-center', (index + 1).toString()), 
            renderPlayerCell(player),
            h('td.text-right', player.rating_stats.avg.toString()),
            h('td.text-right', player.rating_stats.max.toString()),
            h('td.text-right', player.rating_stats.min.toString()),
          ]);
      })),
    ]),
    renderShowMoreButton(players.length, visibleCount, tableKey, controller),
  ]);
}

function renderMedalStandings(type: 'team' | 'arena', playersData: PlayerData[], controller: ClubPageController): VNode {
    const isTeam = type === 'team';
    
    const getMedalSum = (player: PlayerData) => {
        const medals = isTeam ? player.medals_in_team : player.medals_in_arena;
        return (medals.gold?.count || 0) + (medals.silver?.count || 0) + (medals.bronze?.count || 0);
    };

    const sortedPlayers = [...playersData]
        .filter(p => getMedalSum(p) > 0)
        .sort((a, b) => getMedalSum(b) - getMedalSum(a));

    return h(`div.club-page__table-container.club-page__table-container--${type}-medals`, [
        h('h3.club-page__table-title', t(isTeam ? 'clubPage.medalStandings.teamTitle' : 'clubPage.medalStandings.arenaTitle')),
        h('table.club-page__table', [
            h('thead', h('tr', [
                h('th.text-center', '#'), h('th.text-left', t('clubPage.table.player')),
                h('th.text-center', '🥇'), h('th.text-center', '🥈'),
                h('th.text-center', '🥉'), h('th.text-center', 'Σ'),
            ])),
            h('tbody', sortedPlayers.flatMap((player, index) => {
                const medalSum = getMedalSum(player);
                const playerRow = h('tr', { key: player.lichess_id }, [
                    h('td.text-center', (index + 1).toString()),
                    renderPlayerCell(player),
                    renderMedalCell(player, type, 'gold', controller),
                    renderMedalCell(player, type, 'silver', controller),
                    renderMedalCell(player, type, 'bronze', controller),
                    h('td.text-center.bold', medalSum.toString()),
                ]);

                const expandedKey = controller.state.expandedMedalInfoKey;
                let detailsRow = null;
                
                if (expandedKey) {
                    const parts = expandedKey.split('::');
                    if (parts.length === 3) {
                        const encodedId = parts[0];
                        const keyType = parts[1];
                        
                        if (keyType === type && btoa(player.lichess_id) === encodedId) {
                             const keyMedal = parts[2] as 'gold' | 'silver' | 'bronze';
                             const medalData = player[`medals_in_${type}`][keyMedal];
                             if (medalData && medalData.tournaments.length > 0) {
                                 detailsRow = renderMedalDetailsRow(medalData.tournaments, expandedKey);
                             }
                        }
                    }
                }
                
                return [playerRow, detailsRow].filter(Boolean) as VNode[];
            })),
        ]),
    ]);
}

function renderMedalCell(player: PlayerData, type: 'team' | 'arena', medal: 'gold' | 'silver' | 'bronze', controller: ClubPageController): VNode {
  const medalData: MedalDetail = player[`medals_in_${type}`][medal];
  const hasMedals = medalData && medalData.count > 0;
  const key = `${btoa(player.lichess_id)}::${type}::${medal}`;

  const props: VNodeData = {
    class: { 
      'club-page__medal-cell--expandable': hasMedals,
      'expanded': controller.state.expandedMedalInfoKey === key
    }
  };

  if (hasMedals) {
    props.on = {
      click: () => controller.toggleMedalDetails(key)
    };
  }

  return h('td.text-center', props, [
    h('span', hasMedals ? medalData.count.toString() : '0'),
    hasMedals ? h('span.expand-arrow', ' ▼') : null
  ]);
}

function renderTournamentPlayersList(players: TournamentPlayer[]): VNode {
  if (!players || players.length === 0) {
    return h('p.club-page__no-data-message', t('clubPage.noPlayersInTournament'));
  }
  const sortedPlayers = [...players].sort((a: TournamentPlayer, b: TournamentPlayer) => a.user_inTeamRank - b.user_inTeamRank);

  return h('div.club-page__sub-table-container', [
    h('h4.club-page__sub-table-title', t('clubPage.tournamentPlayersTitle')),
    h('table.club-page__table.club-page__table--sub', [
        h('thead', h('tr', [
            h('th.text-center', '#'), h('th.text-left', t('clubPage.table.player')),
            h('th.text-right', t('clubPage.table.score')), h('th.text-center', 'W/D/L'),
            h('th.text-right', t('clubPage.table.performance')), h('th.text-center', '🚀'),
            h('th.text-right', t('clubPage.table.arenaRank')),
        ])),
        h('tbody', sortedPlayers.map((player) =>
            h('tr', {key: player.lichess_id }, [
                h('td.text-center', player.user_inTeamRank.toString()),
                // <<< НАЧАЛО ИЗМЕНЕНИЙ: Отображение короны
                h('td.text-left', [
                    player.crone ? renderCrownIcon() : null,
                    h('a', { props: { href: `https://lichess.org/@/${player.username}`, target: '_blank'} }, player.username),
                    renderFlairIcon(player.user_flair)
                ]),
                // <<< КОНЕЦ ИЗМЕНЕНИЙ
                h('td.text-right.bold', player.user_score.toString()),
                h('td.text-center', [
                    h('span.win-color', player.calculatedStats.wins),
                    ' / ',
                    h('span.draw-color', player.calculatedStats.draws),
                    ' / ',
                    h('span.loss-color', player.calculatedStats.losses)
                ]),
                h('td.text-right', player.user_performance.toString()),
                h('td.text-center', player.calculatedStats.berserkWins.toString()),
                h('td.text-right', player.user_inArenaRank.toString()),
            ])
        ))
    ])
  ]);
}

function renderTournamentHistoryTable(
    tournaments: TournamentHistoryEntry[],
    expandedBattleId: string | null,
    onToggleBattle: (arenaId: string) => void
): VNode {
  return h('div.club-page__table-container.club-page__table-container--history', [
    h('h3.club-page__table-title', t('clubPage.tournamentHistoryTitle')),
    h('table.club-page__table.club-page__table--history', [
      h('thead', h('tr', [
          h('th.text-left', t('clubPage.table.date')), h('th.text-left', t('clubPage.table.tournamentName')),
          h('th.text-right', t('clubPage.table.clubRank')), h('th.text-right', t('clubPage.table.clubScore')),
      ])),
      h('tbody', tournaments.flatMap(tournament =>
        {
          const cleanedTournamentName = tournament.tournament_name.replace(/ Team Battle$/, '');

          return [
            h('tr.club-page__expandable-row', {
              key: tournament.arena_id,
              class: { 'expanded': expandedBattleId === tournament.arena_id },
              on: { click: () => onToggleBattle(tournament.arena_id) }
            }, [
              h('td.text-left', formatDateForUser(tournament.starts_at_date)),
              h('td.text-left', h('a', { props: { href: tournament.arena_url, target: '_blank' } }, cleanedTournamentName)),
              // <<< НАЧАЛО ИЗМЕНЕНИЙ: Отображение ранга клуба
              h('td.text-right', tournament.club_in_arena_rank ? tournament.club_in_arena_rank.toString() : '-'),
              // <<< КОНЕЦ ИЗМЕНЕНИЙ
              h('td.text-right', tournament.team_score.toString()),
            ]),
            expandedBattleId === tournament.arena_id ?
              h('tr.club-page__details-row', { key: `details-${tournament.arena_id}` }, [
                h('td', { props: { colSpan: 4 } }, [ renderTournamentPlayersList(tournament.players) ])
              ]) : null
          ];
        }
      ).filter(Boolean) as VNode[]),
    ]),
  ]);
}

function renderTabs(controller: ClubPageController): VNode {
    const { activeTab } = controller.state;
    const tabs: {id: ClubPageTabId, label: string}[] = [
        { id: 'overview', label: t('clubPage.tabs.overview', { defaultValue: 'Обзор' }) },
        { id: 'key_indicators', label: t('clubPage.tabs.keyIndicators', { defaultValue: 'Ключевые показатели' }) },
        { id: 'play_style', label: t('clubPage.tabs.playStyle', { defaultValue: 'Стиль игры' }) },
        { id: 'ratings', label: t('clubPage.tabs.ratings', { defaultValue: 'Рейтинги' }) },
        { id: 'medals', label: t('clubPage.tabs.medals', { defaultValue: 'Медальный зачет' }) },
    ];

    return h('div.club-page__tabs', tabs.map(tab =>
        h('button.club-page__tab-button', {
            class: { active: activeTab === tab.id },
            on: { click: () => controller.setActiveTab(tab.id) }
        }, tab.label)
    ));
}

export function renderClubPage(controller: ClubPageController): VNode {
  const { state } = controller;
  logger.debug('[ClubPageView] Rendering Club Page with state:', state);

  const mainContainerClass = 'div.club-page';

  if (state.isLoading) {
    return h(mainContainerClass, { key: `club-page-loading` }, [ h('p', t('common.loading')) ]);
  }

  if (state.error) {
    return h(mainContainerClass, { key: `club-page-error` }, [ h('p.club-page__error-message', `${t('common.error')}: ${state.error}`) ]);
  }

  if (!state.clubData) {
    return h(mainContainerClass, { key: `club-page-no-data` }, [ h('p.club-page__no-data-message', t('clubPage.error.noDataFound', { clubId: state.clubId })) ]);
  }

  const { clubData, expandedBattleId, activeTab } = state;
  const { club_info, players_data, tournament_history } = clubData;

  let tabContent: VNode | null = null;
  switch (activeTab) {
      case 'overview':
          tabContent = renderOverviewTable(controller.getSortedPlayers('overview'), controller);
          break;
      case 'key_indicators':
          tabContent = h('div.club-page__stats-grid-3-cols', [
              renderMvpTable(controller.getSortedPlayers('mvp'), controller),
              renderMostActiveTable(controller.getSortedPlayers('active'), controller),
              renderTotalGamesTable(controller.getSortedPlayers('totalGames'), controller),
          ]);
          break;
      case 'play_style':
          tabContent = h('div.club-page__stats-grid-2-cols', [
              renderBerserkersTable(controller.getSortedPlayers('berserkers'), controller),
              renderWinStreaksTable(controller.getSortedPlayers('winStreaks'), controller),
          ]);
          break;
      case 'ratings':
          tabContent = h('div.club-page__stats-grid-2-cols', [
              renderPerformanceTable(controller.getSortedPlayers('performance'), controller),
              renderRatingTable(controller.getSortedPlayers('rating'), controller),
          ]);
          break;
      case 'medals':
          tabContent = h('div.club-page__stats-grid-2-cols', [
              renderMedalStandings('team', players_data, controller),
              renderMedalStandings('arena', players_data, controller),
          ]);
          break;
  }

  return h(mainContainerClass, { key: `club-page-${club_info.club_id}` }, [
    renderClubBanner(club_info.club_id),
    h('header.club-page__header', [
      h('div.club-page__header-info', [
        h('a.club-page__name-link', { props: { href: `https://lichess.org/team/${club_info.club_id}`, target: '_blank' } }, [
            h('h1.club-page__name', club_info.club_name)
        ]),
        h('p.club-page__meta', [
            t('clubPage.founder'),
            ': ',
            h('a', { props: { href: `https://lichess.org/@/${club_info.grunder.name}`, target: '_blank' } }, club_info.grunder.name),
            ` | ${t('clubPage.members')}: ${club_info.nb_members}`
        ]),
      ]),
    ]),
    renderLeaderTable(club_info.leaders),

    renderTabs(controller),
    h('div.club-page__tab-content', [tabContent]),
    
    renderTournamentHistoryTable(tournament_history, expandedBattleId, controller.toggleTournamentDetails.bind(controller)),

    h('div.club-page__follow-button-container', [
        renderFollowButton(controller)
    ]),
  ]);
}
