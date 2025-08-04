// src/features/about/aboutView.ts
import { h } from 'snabbdom';
import type { VNode } from 'snabbdom';
import { t } from '../../core/i18n.service'; // Импортируем t для использования ключей локализации
import { type AppController } from '../../AppController';
import { renderLanguageSwitcher } from '../../appView';

/**
 * Renders the "About" page with detailed information.
 * @param controller Экземпляр AppController для доступа к функциям приложения.
 * @returns A VNode representing the page.
 */
export function renderAboutPage(controller: AppController): VNode {
  return h('div.about-page-container', [
    h('div.language-switcher-container', [
        renderLanguageSwitcher(controller)
    ]),
    h('h1', [
      t('about.title'),
      h('span.app-version', ' (1.0.1)')
    ]),
    h('p', [
      h('strong', 'Chessboard.fun'),
      t('about.intro')
    ]),

    h('h2', t('about.sections.mainModesTitle')),
    h('ul', [
      h('li', [h('strong', t('about.modes.conversionTitle')), t('about.modes.conversion')]),
      h('li', [h('strong', t('about.modes.speedrunTitle')), t('about.modes.speedrun')]),
      h('li', [h('strong', t('about.modes.attackTitle')), t('about.modes.attack')]),
      h('li', [h('strong', t('about.modes.automaticTacticalTrainerTitle')), t('about.modes.automaticTacticalTrainer')]),
      h('li', [h('strong', t('about.modes.lichessClubsTitle')), t('about.modes.lichessClubs')]),
      h('li', [h('strong', t('about.modes.userCabinetTitle')), t('about.modes.userCabinet')]),
      h('li', [h('strong', t('about.modes.analysisPanelTitle')), t('about.modes.analysisPanel')]),
    ]),

    h('h2', t('about.sections.keyFeaturesTitle')),
    h('ul', [
      h('li', [h('strong', t('about.features.lichessIntegrationTitle')), t('about.features.lichessIntegration')]),
      h('li', [h('strong', t('about.features.advancedStatsTitle')), t('about.features.advancedStats')]),
      h('li', [h('strong', t('about.features.puzzleDatabaseTitle')), t('about.features.puzzleDatabase'), h('a', { props: { href: 'https://database.lichess.org/#puzzles', target: '_blank', rel: 'noopener noreferrer' } }, 'https://database.lichess.org/#puzzles')]),
      h('li', [h('strong', t('about.features.modernUITitle')), t('about.features.modernUI')]),
      h('li', [h('strong', t('about.features.localizationTitle')), t('about.features.localization')]),
      h('li', [h('strong', t('about.modes.botSelectionTitle')), t('about.modes.botSelection')]),
      h('li', [h('strong', t('about.modes.lichessClubsTitle')), t('about.modes.lichessClubs')]),
      h('li', [h('strong', t('about.modes.userCabinetTitle')), t('about.modes.userCabinet')]),
      h('li', [h('strong', t('about.modes.analysisPanelTitle')), t('about.modes.analysisPanel')]),
    ]),

    h('h2', t('about.sections.techStackTitle')),
    h('ul', [
      h('li', [h('strong', t('about.techStack.frontend')), t('about.techStack.frontendStack')]),
      h('li', [h('strong', t('about.techStack.backend')), t('about.techStack.backendStack')]),
      h('li', [h('strong', t('about.techStack.chessLogic')), t('about.techStack.chessLogicStack')]),
      h('li', [h('strong', t('about.techStack.boardRendering')), t('about.techStack.boardRenderingStack')]),
      h('li', [h('strong', t('about.techStack.chessEngine')), t('about.techStack.chessEngineStack')]),
      h('li', [h('strong', t('about.techStack.api')), t('about.techStack.apiStack'), h('a', { props: { href: 'https://lichess.org/api', target: '_blank', rel: 'noopener noreferrer' } }, 'https://lichess.org/api'), t('common.closingParenthesis')]),
    ]),

    h('h2', t('about.sections.licensingTitle')),
    h('h3', t('about.licensing.stockfishTitle')),
    h('p', [t('about.licensing.stockfishIntro1'), h('strong', 'Stockfish'), t('about.licensing.stockfishIntro2'), h('strong', 'GNU General Public License v3 (GPLv3)'), t('common.period')]),
    h('p.licensing-note', [
      h('strong', t('about.licensing.gplNoteTitle')),
      t('about.licensing.gplNote')
    ]),
    h('ul.licensing-links', [
      h('li', t('about.licensing.projectSourceCode')),
      h('li', [t('about.licensing.licenseText'), h('a', { props: { href: 'https://www.gnu.org/licenses/gpl-3.0.html', target: '_blank', rel: 'noopener noreferrer' } }, 'https://www.gnu.org/licenses/gpl-3.0.html'), t('common.period')]),
    ]),
    h('p', t('about.licensing.stockfishGratitude')),

    h('h3', t('about.licensing.chessgroundTitle')),
    h('p', [t('about.licensing.chessgroundIntro1'), h('strong', 'Chessground'), t('about.licensing.chessgroundIntro2'), h('strong', 'MIT License'), t('common.periodAndSpace'), t('about.licensing.chessgroundGratitude')]),

    h('h2', t('about.sections.contributingTitle')),
    h('p', t('about.contributing')),
    
    h('h2', t('about.sections.licenseTitle')),
    h('p', t('about.licenseText')),

    h('h2', t('about.sections.acknowledgementsTitle')),
    h('ul', [
      h('li', [h('a', { props: { href: 'https://stockfishchess.org/', target: '_blank', rel: 'noopener noreferrer' } }, 'Stockfish'), t('about.acknowledgements.stockfishDesc')]),
      h('li', [h('a', { props: { href: 'https://lichess.org/', target: '_blank', rel: 'noopener noreferrer' } }, 'Lichess'), t('about.acknowledgements.lichessDesc')]),
      h('li', [h('a', { props: { href: 'https://n8n.io/', target: '_blank', rel: 'noopener noreferrer' } }, 'n8n'), t('about.acknowledgements.n8nDesc')]),
      h('li', t('about.acknowledgements.community')),
    ]),
    
    h('hr'),

    // --- NEW "ABOUT THE AUTHOR" SECTION ---
    h('div.author-section', [
      h('img.author-photo', { props: { src: '/jpg/me.jpg', alt: t('about.author.photoAlt') } }),
      h('div.author-bio', [
        h('h2.author-title', t('about.author.title')),
        h('p', t('about.author.bioPart1')),
        h('p', t('about.author.bioPart2')),
        h('p', t('about.author.bioPart3')),
        h('div.support-button-container', [
            h('a.support-button', {
                props: {
                    href: 'https://coff.ee/chessboard.fun',
                    target: '_blank',
                    rel: 'noopener noreferrer'
                }
            }, [
                h('svg', { attrs: { viewBox: '0 0 24 24', width: '24', height: '24', fill: 'currentColor' } }, [
                    h('path', { attrs: { d: 'M18.5 3H6c-1.1 0-2 .9-2 2v5.71c0 3.38 2.72 6.13 6.1 6.28H14v-2.28c-2.23-.14-4-1.99-4-4.28V5h10v3h2V5c0-1.1-.9-2-2-2zm-2 13h-4c-1.1 0-2 .9-2 2v2h8v-2c0-1.1-.9-2-2-2z' } })
                ]),
                t('about.supportButtonText')
            ])
        ])
      ])
    ]),
    // --- END AUTHOR SECTION ---

    h('hr'),

    h('div.contact-info', [
      h('p', [t('about.contact.telegram'), t('about.contact.separator'), h('a', { props: { href: 'https://t.me/Chessboard_fun', target: '_blank', rel: 'noopener noreferrer' } }, 'https://t.me/Chessboard.fun')]),
      h('p', [t('about.contact.email'), t('about.contact.separator'), h('a', { props: { href: 'mailto:immozerai@gmail.com' } }, 'immozerai@gmail.com')]),
      h('p', [t('about.contact.github'), t('about.contact.separator'), h('a', { props: { href: 'https://github.com/ImMoSer/Chessboard.fun', target: '_blank', rel: 'noopener noreferrer' } }, 'https://github.com/ImMoSer/Chessboard.fun')]),
    ]),

    h('p.footer-note', t('about.footerNote')),
  ]);
}
