// src/features/lichessClubs/lichessClubsView.ts
import { h } from 'snabbdom';
import type { VNode } from 'snabbdom';
import type { LichessClubsController, LichessClubsControllerState } from './LichessClubsController';
import type { LichessClubStat, ClubIdNamePair } from '../../core/api.types';
import { t } from '../../core/i18n.service';

function renderLichessClubsBanner(): VNode {
  return h('img.lichess-clubs-page__banner', {
    props: {
      src: '/jpg/lichess_clubs.jpg',
      alt: t('lichessClubs.bannerAlt', { defaultValue: 'All Clubs Banner' })
    }
  });
}

// НОВАЯ ФУНКЦИЯ: Рендер иконки-флаера
function renderFlairIcon(flair?: string | null): VNode | null {
  if (!flair) return null;
  const flairUrl = `https://lichess1.org/assets/flair/img/${flair}.webp`;
  // Добавлен стиль для вертикального выравнивания
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


// ИЗМЕНЕНО: Таблица полностью переделана под новые данные
function renderClubsTable(controller: LichessClubsController): VNode | null {
    const { clubsData } = controller.state;

    if (!clubsData) {
        return null;
    }
    
    if (clubsData.length === 0) {
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

    return h('div.lichess-clubs-page__table-container', [
        h('h3.lichess-clubs-page__table-title', controller.state.pageTitle),
        h('table.lichess-clubs-page__table', [
            h('thead', [
                h('tr', tableHeaders.map(header =>
                    h(`th.text-${header.textAlign}`, header.labelKey ? t(header.labelKey, { defaultValue: header.default }) : header.label)
                ))
            ]),
            h('tbody', clubsData.map((club: LichessClubStat) =>
                h('tr', { key: club.club_id }, [
                    h('td.text-left', [
                        renderFlairIcon(club.club_flair), // Отображаем флаер
                        h('a', {
                            props: { href: `/#/clubs/${club.club_id}` },
                            on: {
                                click: (e: Event) => {
                                    e.preventDefault();
                                    controller.services.appController.navigateTo('clubPage', true, club.club_id);
                                }
                            }
                        }, club.club_name)
                    ]),
                    h('td.text-right', String(club.active_players)),
                    h('td.text-right', String(club.tournaments_played)),
                    h('td.text-right', String(club.total_score)),
                    // ИСПРАВЛЕНО: Округление до целого числа
                    h('td.text-right', String(Math.round(club.average_score))),
                    h('td.text-center', String(club.medals.gold)),
                    h('td.text-center', String(club.medals.silver)),
                    h('td.text-center', String(club.medals.bronze)),
                ])
            ))
        ])
    ]);
}

export function renderLichessClubsPage(controller: LichessClubsController): VNode {
  const state: LichessClubsControllerState = controller.state;
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
