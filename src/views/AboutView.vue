<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const appVersion = import.meta.env.VITE_APP_VERSION || '2.0.0'
</script>

<template>
  <div class="about-page-container">
    <h1>
      {{ t('about.title') }}
      <span class="app-version"> ({{ appVersion }})</span>
    </h1>
    <p><strong>Chessboard.fun</strong>{{ t('about.intro') }}</p>

    <h2>{{ t('about.sections.mainModesTitle') }}</h2>
    <ul>
      <li>
        <strong>{{ t('about.modes.conversionTitle') }}</strong
        >{{ t('about.modes.conversion') }}
      </li>
      <li>
        <strong>{{ t('about.modes.speedrunTitle') }}</strong
        >{{ t('about.modes.speedrun') }}
      </li>
      <li>
        <strong>{{ t('about.modes.attackTitle') }}</strong
        >{{ t('about.modes.attack') }}
      </li>
      <li>
        <strong>{{ t('about.modes.automaticTacticalTrainerTitle') }}</strong
        >{{ t('about.modes.automaticTacticalTrainer') }}
      </li>
      <li>
        <strong>{{ t('about.modes.lichessClubsTitle') }}</strong
        >{{ t('about.modes.lichessClubs') }}
      </li>
      <li>
        <strong>{{ t('about.modes.userCabinetTitle') }}</strong
        >{{ t('about.modes.userCabinet') }}
      </li>
      <li>
        <strong>{{ t('about.modes.analysisPanelTitle') }}</strong
        >{{ t('about.modes.analysisPanel') }}
      </li>
    </ul>

    <h2>{{ t('about.sections.keyFeaturesTitle') }}</h2>
    <ul>
      <li>
        <strong>{{ t('about.features.lichessIntegrationTitle') }}</strong
        >{{ t('about.features.lichessIntegration') }}
      </li>
      <li>
        <strong>{{ t('about.features.advancedStatsTitle') }}</strong
        >{{ t('about.features.advancedStats') }}
      </li>
      <li>
        <strong>{{ t('about.features.puzzleDatabaseTitle') }}</strong
        >{{ t('about.features.puzzleDatabase')
        }}<a href="https://database.lichess.org/#puzzles" target="_blank" rel="noopener noreferrer"
          >https://database.lichess.org/#puzzles</a
        >
      </li>
      <li>
        <strong>{{ t('about.features.modernUITitle') }}</strong
        >{{ t('about.features.modernUI') }}
      </li>
      <li>
        <strong>{{ t('about.features.localizationTitle') }}</strong
        >{{ t('about.features.localization') }}
      </li>
      <li>
        <strong>{{ t('about.modes.botSelectionTitle') }}</strong
        >{{ t('about.modes.botSelectionIntro') }}
        <ul class="bot-list">
          <li><strong>'Rbleipzig 2200+'</strong>{{ t('about.modes.bots.rbleipzig') }}</li>
          <li><strong>'Krokodil 2100+'</strong>{{ t('about.modes.bots.krokodil') }}</li>
          <li><strong>'Karde 2000+'</strong>{{ t('about.modes.bots.karde') }}</li>
          <li><strong>'MoZeR 1900+'</strong>{{ t('about.modes.bots.mozer') }}</li>
          <li><strong>'Dimas 1800+'</strong>{{ t('about.modes.bots.dimas') }}</li>
          <li><strong>'Darko 1700+'</strong>{{ t('about.modes.bots.darko') }}</li>
        </ul>
      </li>
    </ul>

    <h2>{{ t('about.sections.techStackTitle') }}</h2>
    <ul>
      <li>
        <strong>{{ t('about.techStack.frontend') }}</strong
        >{{ t('about.techStack.frontendStack') }}
      </li>
      <li>
        <strong>{{ t('about.techStack.backend') }}</strong
        >{{ t('about.techStack.backendStack') }}
      </li>
      <li>
        <strong>{{ t('about.techStack.chessLogic') }}</strong
        >{{ t('about.techStack.chessLogicStack') }}
      </li>
      <li>
        <strong>{{ t('about.techStack.boardRendering') }}</strong
        >{{ t('about.techStack.boardRenderingStack') }}
      </li>
      <li>
        <strong>{{ t('about.techStack.chessEngine') }}</strong
        >{{ t('about.techStack.chessEngineStack') }}
      </li>
      <li>
        <strong>{{ t('about.techStack.api') }}</strong
        >{{ t('about.techStack.apiStack')
        }}<a href="https://lichess.org/api" target="_blank" rel="noopener noreferrer"
          >https://lichess.org/api</a
        >{{ t('common.closingParenthesis') }}
      </li>
    </ul>

    <h2>{{ t('about.sections.licensingTitle') }}</h2>
    <h3>{{ t('about.licensing.stockfishTitle') }}</h3>
    <p>
      {{ t('about.licensing.stockfishIntro1') }}<strong>Stockfish</strong
      >{{ t('about.licensing.stockfishIntro2') }}<strong>GPLv3</strong>{{ t('common.period') }}
    </p>
    <p class="licensing-note">
      <strong>{{ t('about.licensing.gplNoteTitle') }}</strong
      >{{ t('about.licensing.gplNote') }}
    </p>
    <ul class="licensing-links">
      <li>{{ t('about.licensing.projectSourceCode') }}</li>
      <li>
        {{ t('about.licensing.licenseText')
        }}<a
          href="https://www.gnu.org/licenses/gpl-3.0.html"
          target="_blank"
          rel="noopener noreferrer"
          >https://www.gnu.org/licenses/gpl-3.0.html</a
        >{{ t('common.period') }}
      </li>
    </ul>
    <p>{{ t('about.licensing.stockfishGratitude') }}</p>

    <h3>{{ t('about.licensing.chessgroundTitle') }}</h3>
    <p>
      {{ t('about.licensing.chessgroundIntro1') }}<strong>Chessground</strong
      >{{ t('about.licensing.chessgroundIntro2') }}<strong>MIT License</strong
      >{{ t('common.periodAndSpace') }}{{ t('about.licensing.chessgroundGratitude') }}
    </p>

    <h2>{{ t('about.sections.contributingTitle') }}</h2>
    <p>{{ t('about.contributing') }}</p>

    <h2>{{ t('about.sections.licenseTitle') }}</h2>
    <p>{{ t('about.licenseText') }}</p>

    <h2>{{ t('about.sections.acknowledgementsTitle') }}</h2>
    <ul>
      <li>
        <a href="https://stockfishchess.org/" target="_blank" rel="noopener noreferrer">Stockfish</a
        >{{ t('about.acknowledgements.stockfishDesc') }}
      </li>
      <li>
        <a href="https://lichess.org/" target="_blank" rel="noopener noreferrer">Lichess</a
        >{{ t('about.acknowledgements.lichessDesc') }}
      </li>
      <li>
        <a href="https://n8n.io/" target="_blank" rel="noopener noreferrer">n8n</a
        >{{ t('about.acknowledgements.n8nDesc') }}
      </li>
      <li>{{ t('about.acknowledgements.community') }}</li>
    </ul>

    <hr />

    <div class="author-section">
      <img class="author-photo" src="/jpg/me.jpg" :alt="t('about.author.photoAlt')" />
      <div class="author-bio">
        <h2 class="author-title">{{ t('about.author.title') }}</h2>
        <p>{{ t('about.author.bioPart1') }}</p>
        <p>{{ t('about.author.bioPart2') }}</p>
        <p>{{ t('about.author.bioPart3') }}</p>
        <div class="support-button-container">
          <a
            class="support-button"
            href="https://coff.ee/chessboard.fun"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path
                d="M18.5 3H6c-1.1 0-2 .9-2 2v5.71c0 3.38 2.72 6.13 6.1 6.28H14v-2.28c-2.23-.14-4-1.99-4-4.28V5h10v3h2V5c0-1.1-.9-2-2-2zm-2 13h-4c-1.1 0-2 .9-2 2v2h8v-2c0-1.1-.9-2-2-2z"
              ></path>
            </svg>
            {{ t('about.author.supportButtonText') }}
          </a>
        </div>
      </div>
    </div>

    <hr />

    <div class="contact-info">
      <p>
        {{ t('about.contact.telegram') }}{{ t('about.contact.separator')
        }}<a href="https://t.me/Chessboard_fun" target="_blank" rel="noopener noreferrer"
          >https://t.me/Chessboard.fun</a
        >
      </p>
      <p>
        {{ t('about.contact.email') }}{{ t('about.contact.separator')
        }}<a href="mailto:immozerai@gmail.com">immozerai@gmail.com</a>
      </p>
      <p>
        {{ t('about.contact.github') }}{{ t('about.contact.separator')
        }}<a
          href="https://github.com/ImMoSer/Chessboard.fun"
          target="_blank"
          rel="noopener noreferrer"
          >https://github.com/ImMoSer/Chessboard.fun</a
        >
      </p>
    </div>

    <p class="footer-note">{{ t('about.footerNote') }}</p>
  </div>
</template>

<style scoped>
.about-page-container {
  position: relative;
  padding: 20px 40px;
  box-sizing: border-box;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-default);
  width: 80vw;
  max-width: 1200px;
  margin: 20px auto;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
  font-size: var(--font-size-base);
  line-height: 1.7;
}

.about-page-container .language-switcher-container {
  position: absolute;
  top: 20px;
  right: 20px;
}

.about-page-container h1 {
  font-size: var(--font-size-xxlarge);
  color: var(--color-accent-primary);
  text-align: center;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--color-border-hover);
  padding-bottom: 15px;
}

.about-page-container h2 {
  font-size: var(--font-size-xlarge);
  color: var(--color-accent-success);
  margin-top: 30px;
  margin-bottom: 15px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--color-border);
}

.about-page-container h3 {
  font-size: var(--font-size-large);
  color: var(--color-accent-warning);
  margin-top: 20px;
  margin-bottom: 10px;
}

.about-page-container p,
.about-page-container li {
  color: var(--color-text-muted);
}

.about-page-container strong {
  color: var(--color-text-default);
  font-weight: var(--font-weight-bold);
}

.about-page-container a {
  color: var(--color-text-link);
  text-decoration: none;
}
.about-page-container a:hover {
  text-decoration: underline;
}

.about-page-container ul {
  list-style-type: '–  '; /* Custom bullet point */
  padding-left: 20px;
  margin-top: 0;
}

.about-page-container ul li {
  margin-bottom: 8px;
  padding-left: 10px;
}

/* <<< НАЧАЛО ИЗМЕНЕНИЙ: Стили для списка ботов */
.bot-list {
  margin-top: 10px;
  padding-left: 25px;
}

.bot-list li {
  margin-bottom: 5px;
}
/* <<< КОНЕЦ ИЗМЕНЕНИЙ */

.about-page-container .licensing-note {
  background-color: rgba(252, 98, 9, 0.1); /* var(--color-accent-warning) with alpha */
  border-left: 4px solid var(--color-accent-warning);
  padding: 15px;
  margin: 15px 0;
  border-radius: 4px;
}

.about-page-container .support-button-container {
  text-align: center;
  margin: 30px 0;
}

.about-page-container .support-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 28px;
  background-color: #ffdd00; /* Bright yellow, similar to Buy Me a Coffee */
  color: #000000;
  text-decoration: none;
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  border-radius: 12px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.about-page-container .support-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.about-page-container .support-button svg {
  width: 1.2em;
  height: 1.2em;
}

.about-page-container hr {
  border: none;
  border-top: 1px solid var(--color-border-hover);
  margin: 40px 0;
}

.author-section {
  display: flex;
  align-items: center;
  gap: 30px;
  margin: 40px 0;
  background-color: var(--color-bg-primary);
  padding: 25px;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border);
}

.author-photo {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--color-accent-primary);
  flex-shrink: 0;
}

.author-bio {
  flex-grow: 1;
}

.author-bio .author-title {
  border-bottom: none;
  margin-top: 0;
  color: var(--color-accent-primary);
}

.about-page-container .contact-info {
  text-align: center;
  margin-bottom: 20px;
}

.about-page-container .contact-info p {
  margin: 5px 0;
}

.about-page-container .footer-note {
  text-align: center;
  font-style: italic;
  color: var(--color-text-muted);
  margin-top: 30px;
}

@media (max-width: 768px) {
  .about-page-container {
    width: 100%;
    padding: 15px;
    font-size: var(--font-size-small);
  }

  .about-page-container .language-switcher-container {
    top: 10px;
    right: 10px;
  }

  .author-section {
    flex-direction: column;
    text-align: center;
    padding: 20px;
    gap: 20px;
  }

  .author-photo {
    width: 120px;
    height: 120px;
  }

  .about-page-container h1 {
    font-size: var(--font-size-xlarge);
  }

  .about-page-container h2 {
    font-size: var(--font-size-large);
  }

  .about-page-container h3 {
    font-size: var(--font-size-base);
  }
}
</style>
