<script setup lang="ts">
import {
    NAlert,
    NCard,
    NDivider,
    NGi,
    NGrid,
    NH1,
    NH2,
    NLayout,
    NLayoutContent,
    NSpace,
    NTag,
    NText,
    NThing
} from 'naive-ui'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Subscription values and colors
const PAWN_FUNCOINS = 100
const KNIGHT_FUNCOINS = 300
const BISHOP_FUNCOINS = 500
const ROOK_FUNCOINS = 1000
const QUEEN_FUNCOINS = 10000

const PAWN_COLOR = 'var(--color-neon-cyan)'
const KNIGHT_COLOR = 'var(--color-neon-cyan)'
const BISHOP_COLOR = 'var(--color-accent-warning)'
const ROOK_COLOR = 'var(--color-neon-purple)'
const QUEEN_COLOR = 'var(--color-accent-error)'

const subscriptionTiers = [
  {
    name: t('pricing.tiers.pawn.name'),
    icon: '/piece/alpha/wP.svg',
    funcoins: PAWN_FUNCOINS,
    color: PAWN_COLOR,
    price: t('pricing.tiers.pawn.price'),
    highlight: true,
  },
  {
    name: t('pricing.tiers.knight.name'),
    icon: '/piece/alpha/wN.svg',
    funcoins: KNIGHT_FUNCOINS,
    color: KNIGHT_COLOR,
    price: t('pricing.tiers.price.bonus'),
  },
  {
    name: t('pricing.tiers.bishop.name'),
    icon: '/piece/alpha/wB.svg',
    funcoins: BISHOP_FUNCOINS,
    color: BISHOP_COLOR,
    price: t('pricing.tiers.price.bonus'),
  },
  {
    name: t('pricing.tiers.rook.name'),
    icon: '/piece/alpha/wR.svg',
    funcoins: ROOK_FUNCOINS,
    color: ROOK_COLOR,
    price: t('pricing.tiers.price.bonus'),
  },
  {
    name: t('pricing.tiers.queen.name'),
    icon: '/piece/alpha/wQ.svg',
    funcoins: QUEEN_FUNCOINS,
    color: QUEEN_COLOR,
    price: t('pricing.tiers.price.soon'),
  },
]

const bonusLevels = [
  {
    name: t('pricing.bonusInfo.knight').split('—')[1] || 'Knight',
    threshold: t('pricing.bonusInfo.knight').split('—')[0]?.replace('♘ ', '') || '300',
    icon: '♘',
    type: 'info' as const
  },
  {
    name: t('pricing.bonusInfo.bishop').split('—')[1] || 'Bishop',
    threshold: t('pricing.bonusInfo.bishop').split('—')[0]?.replace('♗ ', '') || '500',
    icon: '♗',
    type: 'warning' as const
  },
  {
    name: t('pricing.bonusInfo.rook').split('—')[1] || 'Rook',
    threshold: t('pricing.bonusInfo.rook').split('—')[0]?.replace('♖ ', '') || '1000',
    icon: 'error' as const, // For color consistency with Rook (violet/error)
    iconText: '♖',
    type: 'error' as const
  }
]

const gameCosts = [
  { name: t('nav.tacktics'), icon: '🧩', cost: 1 },
  { name: t('nav.theoryEndings'), icon: '📚', cost: 5 },
  { name: t('nav.practicalChess'), icon: '♟️', cost: 5 },
  { name: t('nav.finishHim'), icon: '🎯', cost: 10 },
  { name: t('nav.openingTrainer'), icon: '💎', cost: 15 },
  { name: t('nav.openingSparring'), icon: '🤺', cost: 20 },
  { name: t('nav.study'), icon: '📖', cost: 25 },
]
</script>

<template>
  <n-layout class="pricing-page-layout">
    <n-layout-content class="pricing-content" content-style="padding: 24px; max-width: 1200px; margin: 0 auto;">
      <n-space vertical size="large">
        <n-h1 align-text class="page-title">
          <n-text style="color: var(--color-neon-cyan)">{{ t('pricing.title') }}</n-text>
        </n-h1>

        <n-alert type="info" :bordered="false" class="intro-alert">
          <n-text depth="2">
            {{ t('pricing.intro.p1') }}
          </n-text>
          <div style="margin-top: 8px;">
            <n-text strong type="warning">
              {{ t('pricing.intro.p2') }}
            </n-text>
          </div>
        </n-alert>

        <n-divider title-placement="left">
          <n-h2 prefix="bar" align-text type="success">
            {{ t('pricing.tiers.title') }}
          </n-h2>
        </n-divider>

        <n-grid cols="1 400:2 600:3 800:5" x-gap="16" y-gap="16">
          <n-gi v-for="tier in subscriptionTiers" :key="tier.name">
            <n-card
              hoverable
              class="tier-card"
              :class="{ 'highlight-tier': tier.highlight }"
            >
              <template #header>
                <n-text strong>{{ tier.name }}</n-text>
              </template>
              <template #header-extra>
                <img :src="tier.icon" :alt="tier.name" style="width: 32px; height: 32px;" />
              </template>

              <n-thing>
                <template #description>
                  <n-text depth="3" style="font-size: 0.9em;">
                    {{ t('pricing.tiers.pawn.description').split('{funcoins}')[0] }}
                    <n-text :style="{ color: tier.color, fontWeight: 'bold', fontSize: '1.2em' }">
                      {{ tier.funcoins }}
                    </n-text>
                    {{ t('pricing.tiers.pawn.description').split('{funcoins}')[1] }}
                  </n-text>
                </template>
                <n-divider dashed style="margin: 12px 0;" />
                <n-text strong type="success" style="font-size: 1.1em;">
                  {{ tier.price }}
                </n-text>
              </n-thing>
            </n-card>
          </n-gi>
        </n-grid>

        <n-divider title-placement="left">
          <n-h2 prefix="bar" align-text class="vibrant-bonus-header">
            {{ t('pricing.bonusInfo.title') }}
          </n-h2>
        </n-divider>

        <n-card :bordered="false" class="bonus-intro-card" embedded>
          <n-text depth="2">
            <p>{{ t('pricing.bonusInfo.p1') }}</p>
            <p>{{ t('pricing.bonusInfo.p2') }}</p>
            <p>{{ t('pricing.bonusInfo.p3') }}</p>
          </n-text>
        </n-card>

        <n-grid cols="1 600:3" x-gap="16" y-gap="16">
          <n-gi v-for="level in bonusLevels" :key="level.name">
            <n-card hoverable class="bonus-level-card">
              <template #header>
                <n-space align="center">
                  <n-text style="font-size: 1.5em;">{{ level.iconText || level.icon }}</n-text>
                  <n-text strong>{{ level.name }}</n-text>
                </n-space>
              </template>
              <template #header-extra>
                <n-tag :type="level.type" round size="small">
                  {{ level.threshold }}
                </n-tag>
              </template>
              <n-text depth="3">
                {{ t('pricing.bonusInfo.howItWorks') }}: {{ t('pricing.bonusInfo.p5') }}
              </n-text>
            </n-card>
          </n-gi>
        </n-grid>

        <n-card class="bonus-footer-card" embedded :bordered="false">
          <n-space vertical>
            <n-text depth="3" italic style="font-size: 0.9em;">
              <p>{{ t('pricing.bonusInfo.p6') }}</p>
              <p>{{ t('pricing.bonusInfo.p7') }}</p>
              <p style="text-align: center; font-weight: bold; color: var(--color-accent-primary);">{{ t('pricing.bonusInfo.p8') }}</p>
            </n-text>
          </n-space>
        </n-card>

        <n-divider title-placement="left">
          <n-h2 prefix="bar" align-text type="warning">
            {{ t('pricing.costs.title') }}
          </n-h2>
        </n-divider>

        <n-grid cols="1 500:2 800:4" x-gap="16" y-gap="16">
          <n-gi v-for="game in gameCosts" :key="game.name">
            <n-card hoverable class="game-cost-card">
              <template #header>
                <n-space align="center">
                  <n-text style="font-size: 1.5em;">{{ game.icon }}</n-text>
                  <n-text strong style="font-size: 0.9em;">{{ game.name }}</n-text>
                </n-space>
              </template>
              <n-thing>
                <template #description>
                  <n-space justify="space-between" align="center">
                    <n-text depth="3">{{ t('pricing.costs.funcoinLabel') }}</n-text>
                    <n-text strong type="warning" style="font-size: 1.4em;">
                      {{ game.cost }}
                    </n-text>
                  </n-space>
                </template>
              </n-thing>
            </n-card>
          </n-gi>
        </n-grid>
      </n-space>
    </n-layout-content>
  </n-layout>
</template>

<style scoped>
.pricing-page-layout,
.pricing-content {
  background-color: transparent !important;
}

.page-title {
  margin-bottom: 24px !important;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.intro-alert {
  background-color: var(--glass-bg) !important;
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--panel-border-radius);
}

.tier-card {
  height: 100%;
  background-color: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--panel-border-radius);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tier-card:hover {
  border-color: var(--color-neon-cyan);
  background-color: var(--glass-bg-hover);
  transform: translateY(-4px);
}

.highlight-tier {
  border: 1px solid var(--color-neon-cyan) !important;
  box-shadow: 0 0 15px rgba(0, 242, 255, 0.2);
}

.vibrant-bonus-header {
  color: var(--color-accent-warning);
  text-shadow: 0 0 8px rgba(242, 201, 125, 0.3);
}

.bonus-intro-card {
  border-radius: var(--panel-border-radius);
  margin-bottom: 8px;
  background-color: var(--glass-bg) !important;
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
}

.bonus-level-card {
  height: 100%;
  background-color: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--panel-border-radius);
  transition: all 0.3s ease;
}

.bonus-level-card:hover {
  border-color: var(--color-accent-warning);
  background-color: var(--glass-bg-hover);
  transform: translateY(-4px);
}

.bonus-footer-card {
  margin-top: 16px;
  background-color: var(--glass-bg) !important;
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--panel-border-radius);
}

.game-cost-card {
  height: 100%;
  background-color: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--panel-border-radius);
  transition: all 0.3s ease;
}

.game-cost-card:hover {
  border-color: var(--color-neon-cyan);
  background-color: var(--glass-bg-hover);
  transform: translateY(-4px);
}

@media (max-width: 768px) {
  .pricing-page-layout :deep(.n-layout-content) {
    padding: 12px !important;
  }
}
</style>
