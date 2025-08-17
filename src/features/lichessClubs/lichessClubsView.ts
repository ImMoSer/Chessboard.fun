// src/features/lichessClubs/lichessClubsView.ts
import { h } from 'snabbdom';
import type { VNode } from 'snabbdom';
import type { LichessClubsController } from './LichessClubsController';
import type { ListedClub, ClubIdNamePair, TopPlayerByScore, TopPlayerByMedals, TopPlayerByActivity, ClubMedalTournament } from '../../core/api.types';
import { t } from '../../core/i18n.service';

function renderLichessClubsBanner(): VNode {
  return h('img.lichess-clubs-page__banner', {
    props: {
      src: '/jpg/lichess_clubs.jpg',
      alt: t('lichessClubs.bannerAlt', { defaultValue: 'All Clubs Banner' })
    }
  });
}

function renderFlairIcon(flair?: string | null): VNode | null {
  if (!flair) return null;
  const flairUrl = `https://lichess1.org/assets/flair/img/${flair}.webp`;
  return h('img.club-flair-icon', { 
    props: { src: flairUrl, alt: 'Flair', title: flair },
    style: { verticalAlign: 'middle', marginRight: '8px', height: '20px' } 
  });
}

function renderFounderControls(controller: LichessClubsController): VNode | null {
    const { isFounder, registeredFounderClub, unregisteredFounderClubs, isFounderActionLoading, founderActionCooldownHours } = controller.state;

    if (!isFounder) {
        return null;
    }

    const controls: VNode[] = [];

    if (founderActionCooldownHours !== null) {
        controls.push(
            h('div.lichess-clubs-page__founder-item.cooldown-message', [
                h('span', t('lichessClubs.founder.cooldownMessage', { hours: founderActionCooldownHours.toFixed(1) }))
            ])
        );
    } else if (registeredFounderClub) {
        controls.push(
            h('div.lichess-clubs-page__founder-item', [
                h('span', t('lichessClubs.founder.clubIsListed', { clubName: registeredFounderClub.club_name })),
                h('button.lichess-clubs-page__founder-button.remove-button', {
                    on: { click: () => controller.handleRemoveClub(registeredFounderClub.club_id) },
                    attrs: { disabled: isFounderActionLoading }
                }, t('lichessClubs.founder.removeClub', { clubName: registeredFounderClub.club_name }))
            ])
        );
        if (unregisteredFounderClubs.length > 0) {
            controls.push(h('p.lichess-clubs-page__founder-info', t('lichessClubs.founder.limitReachedInfo', { defaultValue: 'You can only have one club listed at a time. To list another club, please remove the currently listed one.' })));
            unregisteredFounderClubs.forEach((club: ClubIdNamePair) => {
                controls.push(
                    h('div.lichess-clubs-page__founder-item.unregistered', [
                        h('span', club.club_name),
                    ])
                );
            });
        }
    } else if (unregisteredFounderClubs.length > 0) {
        unregisteredFounderClubs.forEach((club: ClubIdNamePair) => {
            controls.push(
                h('div.lichess-clubs-page__founder-item', [
                     h('span', t('lichessClubs.founder.clubNotListed', { clubName: club.club_name })),
                    h('button.lichess-clubs-page__founder-button.add-button', {
                        on: { click: () => controller.handleAddClub(club.club_id) },
                        attrs: { disabled: isFounderActionLoading }
                    }, t('lichessClubs.founder.addClubButton', { clubName: club.club_name }))
                ])
            );
        });
    }


    if (controls.length === 0) {
        return null;
    }

    return h('div.lichess-clubs-page__founder-controls', controls);
}

function renderHallOfFameWidget(players: TopPlayerByScore[]): VNode {
    return h('div.widget-container.hall-of-fame-widget', [
        h('h4.widget-title', t('lichessClubs.widgets.hallOfFameTitle', { defaultValue: 'Тащеры' })),
        h('table.widget-table', [
            h('thead', h('tr', [h('th', '#'), h('th', 'Игрок'), h('th', 'Очки')])),
            h('tbody', players.map((player, index) => 
                h('tr', { key: player.lichess_id }, [
                    h('td', `${index + 1}`),
                    h('td', h('a', { props: { href: `https://lichess.org/@/${player.lichess_id}`, target: '_blank' } }, player.username)),
                    h('td', String(player.total_score)),
                ])
            ))
        ])
    ]);
}

function renderMedalBearersWidget(players: TopPlayerByMedals[]): VNode {
    return h('div.widget-container.medal-bearers-widget', [
        h('h4.widget-title', t('lichessClubs.widgets.medalBearersTitle', { defaultValue: 'Медалисты' })),
        h('table.widget-table', [
            h('thead', h('tr', [h('th', '#'), h('th', 'Игрок'), h('th', 'Медали')])),
            h('tbody', players.map((player, index) => 
                h('tr', { key: player.lichess_id }, [
                    h('td', `${index + 1}`),
                    h('td', h('a', { props: { href: `https://lichess.org/@/${player.lichess_id}`, target: '_blank' } }, player.username)),
                    h('td', `�${player.medals.gold} 🥈${player.medals.silver} 🥉${player.medals.bronze}`),
                ])
            ))
        ])
    ]);
}

function renderHardWorkersWidget(players: TopPlayerByActivity[]): VNode {
    return h('div.widget-container.hard-workers-widget', [
        h('h4.widget-title', t('lichessClubs.widgets.hardWorkersTitle', { defaultValue: 'Рабочие лошадки' })),
        h('table.widget-table', [
            h('thead', h('tr', [h('th', '#'), h('th', 'Игрок'), h('th', 'Турниры')])),
            h('tbody', players.map((player, index) => 
                h('tr', { key: player.lichess_id }, [
                    h('td', `${index + 1}`),
                    h('td', h('a', { props: { href: `https://lichess.org/@/${player.lichess_id}`, target: '_blank' } }, player.username)),
                    h('td', String(player.tournaments_played)),
                ])
            ))
        ])
    ]);
}

// <<< НАЧАЛО ИЗМЕНЕНИЙ: Функция рендерит три независимых блока для медалей
function renderMedalTournamentsWidget(club: ListedClub): VNode | null {
    const medals = club.statistics_payload.club_medals;
    const hasAnyMedals = (medals.gold?.length || 0) > 0 || (medals.silver?.length || 0) > 0 || (medals.bronze?.length || 0) > 0;

    if (!hasAnyMedals) {
        return null; // Не рендерим ничего, если медалей нет
    }

    const renderTournamentList = (tournaments: ClubMedalTournament[]) => {
        if (!tournaments || tournaments.length === 0) {
            return h('p.no-tournaments-message', t('lichessClubs.widgets.noTournamentsForMedal', { defaultValue: 'No tournaments for this medal.' }));
        }
        return h('ul.tournament-list', tournaments.map(t => 
            h('li', [
                h('a', { props: { href: t.tournament_url, target: '_blank', rel: 'noopener noreferrer' } }, t.tournament_name)
            ])
        ));
    };

    const medalWidgets = [];

    if (medals.gold && medals.gold.length > 0) {
        medalWidgets.push(
            h('div.widget-container.medal-widget.gold', [
                h('h4.widget-title', '🥇 Gold'),
                renderTournamentList(medals.gold)
            ])
        );
    }
    if (medals.silver && medals.silver.length > 0) {
        medalWidgets.push(
            h('div.widget-container.medal-widget.silver', [
                h('h4.widget-title', '🥈 Silver'),
                renderTournamentList(medals.silver)
            ])
        );
    }
    if (medals.bronze && medals.bronze.length > 0) {
        medalWidgets.push(
            h('div.widget-container.medal-widget.bronze', [
                h('h4.widget-title', '🥉 Bronze'),
                renderTournamentList(medals.bronze)
            ])
        );
    }

    return h('div.medal-tournaments-wrapper', medalWidgets);
}

function renderClubDetailsRow(club: ListedClub): VNode {
    const stats = club.statistics_payload;
    return h('tr.club-details-row', { key: `details-${club.club_id}` }, [
        h('td', { props: { colSpan: 8 } }, [
            h('div.club-details-content', [
                renderHallOfFameWidget(stats.top_players_by_score),
                renderMedalBearersWidget(stats.top_players_by_medals),
                renderHardWorkersWidget(stats.top_players_by_activity),
                renderMedalTournamentsWidget(club)
            ].filter(Boolean) as VNode[])
        ])
    ]);
}
// <<< КОНЕЦ ИЗМЕНЕНИЙ

function renderClubsTable(controller: LichessClubsController): VNode | null {
    const { clubsData, expandedClubId } = controller.state;
    if (!clubsData || clubsData.length === 0) {
        return h('p.lichess-clubs-page__no-data-message', t('lichessClubs.table.noClubs', { defaultValue: 'No clubs statistics available.' }));
    }

    const tableHeaders = [
        { key: 'club_name', labelKey: 'lichessClubs.table.clubName', default: 'Club Name', textAlign: 'left' },
        { key: 'active_players', labelKey: 'lichessClubs.table.activePlayers', default: 'Active Players', textAlign: 'right' },
        { key: 'tournaments_played', labelKey: 'lichessClubs.table.tournamentsPlayed', default: 'Tournaments', textAlign: 'right' },
        { key: 'total_score', labelKey: 'lichessClubs.table.totalScore', default: 'Total Score', textAlign: 'right' },
        { key: 'average_score', labelKey: 'lichessClubs.table.averageScore', default: 'Avg. Score', textAlign: 'right' },
        { key: 'gold', label: '🥇', textAlign: 'center' },
        { key: 'silver', label: '🥈', textAlign: 'center' },
        { key: 'bronze', label: '🥉', textAlign: 'center' },
    ];

    const tableRows = clubsData.flatMap((club: ListedClub) => {
        const summary = club.statistics_payload.summary;
        const medals = club.statistics_payload.club_medals;
        const isExpanded = expandedClubId === club.club_id;

        const mainRow = h('tr.club-row.expandable', { 
            key: club.club_id,
            class: { expanded: isExpanded },
            on: { click: () => controller.toggleClubDetails(club.club_id) }
        }, [
            h('td.text-left', [
                renderFlairIcon(club.club_flair),
                h('span.club-name-text', club.club_name)
            ]),
            h('td.text-right', String(summary.active_players_count)),
            h('td.text-right', String(summary.tournaments_played)),
            h('td.text-right', String(summary.total_score)),
            h('td.text-right', String(Math.round(summary.average_score))),
            h('td.text-center', String(medals.gold?.length || 0)),
            h('td.text-center', String(medals.silver?.length || 0)),
            h('td.text-center', String(medals.bronze?.length || 0)),
        ]);

        const rows: (VNode | null)[] = [mainRow];
        if (isExpanded) {
            rows.push(renderClubDetailsRow(club));
        }
        return rows;
    });

    return h('div.lichess-clubs-page__table-container', [
        h('h3.lichess-clubs-page__table-title', controller.state.pageTitle),
        h('table.lichess-clubs-page__table', [
            h('thead', [
                h('tr', tableHeaders.map(header =>
                    h(`th.text-${header.textAlign}`, header.labelKey ? t(header.labelKey, { defaultValue: header.default }) : header.label)
                ))
            ]),
            h('tbody', tableRows.filter(Boolean) as VNode[])
        ])
    ]);
}

export function renderLichessClubsPage(controller: LichessClubsController): VNode {
  const { state } = controller;
  const pageContent: VNode[] = [];
  
  const founderControlsVNode = renderFounderControls(controller);
  if (founderControlsVNode) {
      pageContent.push(founderControlsVNode);
  }

  if (state.isLoading) {
    pageContent.push(h('p', t('common.loading', { defaultValue: 'Loading data...' })));
  } else if (state.error) {
    pageContent.push(h('p.lichess-clubs-page__error-message', `${t('common.error', { defaultValue: 'Error' })}: ${state.error}`));
  } else {
    const tableVNode = renderClubsTable(controller);
    if(tableVNode) {
        pageContent.push(tableVNode);
    }
  }

  return h('div.lichess-clubs-page', [
    renderLichessClubsBanner(),
    ...pageContent
  ]);
}