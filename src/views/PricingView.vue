<!-- src/views/PricingView.vue -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// --- НАЧАЛО ИЗМЕНЕНИЙ ---
// Задаем значения и цвета для подписок как переменные
const PAWN_FUNCOINS = 100
const KNIGHT_FUNCOINS = 200
const BISHOP_FUNCOINS = 300
const ROOK_FUNCOINS = 500
const QUEEN_FUNCOINS = 1000

const PAWN_COLOR = 'var(--color-accent-success-hover)'
const KNIGHT_COLOR = 'var(--color-accent-primary-hover)'
const BISHOP_COLOR = 'var(--color-accent-warning)'
const ROOK_COLOR = 'var(--color-violett-lichess)'
const QUEEN_COLOR = 'var(--color-accent-error-hover)'
// --- КОНЕЦ ИЗМЕНЕНИЙ ---

// Данные для карточек подписок
const subscriptionTiers = [
  {
    name: t('pricing.tiers.pawn.name'),
    icon: '/piece/alpha/wP.svg',
    // --- НАЧАЛО ИЗМЕНЕНИЙ: Обновляем описание с выделением цветом и размером шрифта ---
    description: `${t('pricing.tiers.pawn.description').replace(
      String(PAWN_FUNCOINS),
      `<span style="color: ${PAWN_COLOR}; font-weight: bold; font-size: 1.1em;">${PAWN_FUNCOINS}</span>`,
    )}`,
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---
    price: t('pricing.tiers.pawn.price'),
    highlight: true,
  },
  {
    name: t('pricing.tiers.knight.name'),
    icon: '/piece/alpha/wN.svg',
    // --- НАЧАЛО ИЗМЕНЕНИЙ: Обновляем описание с выделением цветом и размером шрифта ---
    description: `${t('pricing.tiers.knight.description').replace(
      String(KNIGHT_FUNCOINS),
      `<span style="color: ${KNIGHT_COLOR}; font-weight: bold; font-size: 1.2em;">${KNIGHT_FUNCOINS}</span>`,
    )}`,
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---
    price: t('pricing.tiers.price.soon'),
  },
  {
    name: t('pricing.tiers.bishop.name'),
    icon: '/piece/alpha/wB.svg',
    // --- НАЧАЛО ИЗМЕНЕНИЙ: Обновляем описание с выделением цветом и размером шрифта ---
    description: `${t('pricing.tiers.bishop.description').replace(
      String(BISHOP_FUNCOINS),
      `<span style="color: ${BISHOP_COLOR}; font-weight: bold; font-size: 1.3em;">${BISHOP_FUNCOINS}</span>`,
    )}`,
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---
    price: t('pricing.tiers.price.soon'),
  },
  {
    name: t('pricing.tiers.rook.name'),
    icon: '/piece/alpha/wR.svg',
    // --- НАЧАЛО ИЗМЕНЕНИЙ: Обновляем описание с выделением цветом и размером шрифта ---
    description: `${t('pricing.tiers.rook.description').replace(
      String(ROOK_FUNCOINS),
      `<span style="color: ${ROOK_COLOR}; font-weight: bold; font-size: 1.4em;">${ROOK_FUNCOINS}</span>`,
    )}`,
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---
    price: t('pricing.tiers.price.soon'),
  },
  {
    name: t('pricing.tiers.queen.name'),
    icon: '/piece/alpha/wQ.svg',
    // --- НАЧАЛО ИЗМЕНЕНИЙ: Обновляем описание с выделением цветом и размером шрифта ---
    description: `${t('pricing.tiers.queen.description').replace(
      String(QUEEN_FUNCOINS),
      `<span style="color: ${QUEEN_COLOR}; font-weight: bold; font-size: 1.5em;">${QUEEN_FUNCOINS}</span>`,
    )}`,
    // --- КОНЕЦ ИЗМЕНЕНИЙ ---
    price: t('pricing.tiers.price.soon'),
  },
]

// Данные для стоимости режимов
const gameCosts = [
  {
    name: t('nav.finishHim'),
    icon: '🎯',
    cost: 10,
  },
  {
    name: t('nav.tower'),
    icon: '🏁',
    cost: 25,
  },
  {
    name: t('nav.attack'),
    icon: '⚔️',
    cost: 10,
  },
  {
    name: t('nav.tacktics'),
    icon: '🧩',
    cost: 1,
  },
]
</script>

<template>
  <div class="pricing-page-container">
    <h1 class="page-title">{{ t('pricing.title') }}</h1>

    <div class="intro-text">
      <p>
        {{ t('pricing.intro.p1') }}
      </p>
      <p class="highlight-text">
        {{ t('pricing.intro.p2') }}
      </p>
    </div>

    <div class="section">
      <h2 class="section-title">{{ t('pricing.tiers.title') }}</h2>
      <div class="tiers-grid">
        <div
          v-for="tier in subscriptionTiers"
          :key="tier.name"
          class="tier-card"
          :class="{ highlight: tier.highlight }"
        >
          <img :src="tier.icon" :alt="tier.name" class="tier-icon" />
          <!-- <h3 class="tier-name">{{ tier.name }}</h3> -->
          <p class="tier-description" v-html="tier.description"></p>
          <div class="tier-price">{{ tier.price }}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">{{ t('pricing.costs.title') }}</h2>
      <ul class="costs-list">
        <li v-for="game in gameCosts" :key="game.name" class="cost-item">
          <div class="cost-item-info">
            <span class="cost-item-icon">{{ game.icon }}</span>
            <span class="cost-item-name">{{ game.name }}</span>
          </div>
          <div class="cost-item-price">
            {{ game.cost }} <span class="funcoin-label">{{ t('pricing.costs.funcoinLabel') }}</span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.pricing-page-container {
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

.page-title {
  font-size: var(--font-size-xxlarge);
  color: var(--color-accent-primary);
  text-align: center;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--color-border-hover);
  padding-bottom: 15px;
}

.intro-text {
  text-align: center;
  margin-bottom: 40px;
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
}

.intro-text .highlight-text {
  color: var(--color-accent-warning);
  font-weight: var(--font-weight-bold);
  background-color: var(--color-bg-tertiary);
  padding: 10px;
  border-radius: var(--panel-border-radius);
}

.section {
  margin-bottom: 40px;
}

.section-title {
  font-size: var(--font-size-xlarge);
  color: var(--color-accent-success);
  text-align: center;
  margin-bottom: 25px;
}

.tiers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.tier-card {
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--panel-border-radius);
  padding: 25px 20px;
  text-align: center;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.tier-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}

.tier-card.highlight {
  border-color: var(--color-accent-success);
  box-shadow: 0 0 15px rgba(157, 214, 0, 0.2);
}

.tier-icon {
  width: 60px;
  height: 60px;
  margin-bottom: 15px;
}
/*
.tier-name {
  font-size: var(--font-size-large);
  color: var(--color-text-default);
  margin: 0 0 10px 0;
}
*/

.tier-description {
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
  min-height: 50px;
}

.tier-price {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-accent-success);
  margin-top: 15px;
}

.costs-list {
  list-style: none;
  padding: 0;
  margin: 0 auto;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.cost-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-bg-tertiary);
  padding: 15px 20px;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border);
}

.cost-item-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.cost-item-icon {
  font-size: 1.8em;
}

.cost-item-name {
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
}

.cost-item-price {
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  color: var(--color-accent-warning);
}

.cost-item-price .funcoin-label {
  font-size: 0.7em;
  color: var(--color-text-muted);
  margin-left: 5px;
}

@media (max-width: 768px) {
  .pricing-page-container {
    width: 100%;
    padding: 15px;
    font-size: var(--font-size-small);
  }

  .page-title {
    font-size: var(--font-size-xlarge);
  }

  .section-title {
    font-size: var(--font-size-large);
  }

  .tiers-grid {
    grid-template-columns: 1fr 1fr;
  }

  .tier-card {
    padding: 15px;
  }
}
</style>
