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
    NModal,
    NSpace,
    NTag,
    NText,
    NThing,
    NButton,
    useMessage,
} from 'naive-ui'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiClient } from '@/shared/api/client'

const { t } = useI18n()

// Subscription values and colors
const PAWN_COINS = 150
const KNIGHT_COINS = 300
const BISHOP_COINS = 500
const ROOK_COINS = 1000
const QUEEN_COINS = 5000
const KING_COINS = 10000

const PAWN_COLOR = 'var(--color-neon-cyan)'
const KNIGHT_COLOR = 'var(--color-neon-cyan)'
const BISHOP_COLOR = 'var(--color-accent-warning)'
const ROOK_COLOR = 'var(--color-neon-purple)'
const QUEEN_COLOR = 'var(--color-accent-error)'
const KING_COLOR = 'var(--color-neon-gold)' // Gold for King

const showBonusModal = ref(false)

const loadingTier = ref<string | null>(null)

const subscriptionTiers = [
  {
    id: 'pawn',
    name: t('pricing.tiers.pawn.name'),
    icon: '/piece/alpha/wP.svg',
    pawncoins: PAWN_COINS,
    color: PAWN_COLOR,
    price: t('pricing.tiers.pawn.price'),
    highlight: true,
  },
  {
    id: 'knight',
    name: t('pricing.tiers.knight.name'),
    icon: '/piece/alpha/wN.svg',
    pawncoins: KNIGHT_COINS,
    color: KNIGHT_COLOR,
    price: t('pricing.tiers.price.bonus'),
    isBonus: true,
  },
  {
    id: 'bishop',
    name: t('pricing.tiers.bishop.name'),
    icon: '/piece/alpha/wB.svg',
    pawncoins: BISHOP_COINS,
    color: BISHOP_COLOR,
    price: t('pricing.tiers.price.bonus'),
    isBonus: true,
  },
  {
    id: 'rook',
    name: t('pricing.tiers.rook.name'),
    role: t('pricing.tiers.rook.role'),
    icon: '/piece/alpha/wR.svg',
    pawncoins: ROOK_COINS,
    color: ROOK_COLOR,
    priceMonthly: t('pricing.tiers.rook.priceMonthly'),
    priceYearly: t('pricing.tiers.rook.priceYearly'),
    isPurchasable: true,
  },
  {
    id: 'queen',
    name: t('pricing.tiers.queen.name'),
    role: t('pricing.tiers.queen.role'),
    icon: '/piece/alpha/wQ.svg',
    pawncoins: QUEEN_COINS,
    color: QUEEN_COLOR,
    priceMonthly: t('pricing.tiers.queen.priceMonthly'),
    priceYearly: t('pricing.tiers.queen.priceYearly'),
    isPurchasable: true,
  },
  {
    id: 'king',
    name: t('pricing.tiers.king.name'),
    role: t('pricing.tiers.king.role'),
    icon: '/piece/alpha/wK.svg',
    pawncoins: KING_COINS,
    color: KING_COLOR,
    priceMonthly: t('pricing.tiers.king.priceMonthly'),
    priceYearly: t('pricing.tiers.king.priceYearly'),
    isPurchasable: true,
  },
]

const gameCosts = [
  { name: t('nav.tacktics'), icon: '🧩', cost: 15 },
  { name: t('nav.theoryEndings'), icon: '📚', cost: 5 },
  { name: t('nav.practicalChess'), icon: '♟️', cost: 5 },
  { name: t('nav.finishHim'), icon: '🎯', cost: 10 },
  { name: t('nav.openingTrainer'), icon: '💎', cost: 15 },
  { name: t('nav.openingSparring'), icon: '🤺', cost: 20 },
  { name: t('nav.study'), icon: '📖', cost: 25 },
]

interface SubscriptionTier {
  id: string
  name: string
  icon: string
  pawncoins: number
  color: string
  price?: string
  priceMonthly?: string
  priceYearly?: string
  highlight?: boolean
  isBonus?: boolean
  isPurchasable?: boolean
  role?: string
}

const message = useMessage()

const handleTierClick = (tier: SubscriptionTier) => {
  if (tier.isBonus) {
    showBonusModal.value = true
  }
}

const handleCheckout = async (tierId: string, interval: 'monthly' | 'yearly') => {
  try {
    loadingTier.value = tierId + '-' + interval
    const response = await apiClient<{ success: boolean; url: string }>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ tier: tierId, interval })
    })

    if (response.success && response.url) {
      window.location.href = response.url // Redirect to Polar
    }
  } catch (error: unknown) {
    console.error('Checkout error:', error)
    message.error(t('pricing.checkoutError', 'Error initiating checkout. Please try again.'))
  } finally {
    loadingTier.value = null
  }
}
</script>

<template>
  <n-layout class="pricing-page-layout">
    <n-layout-content
      class="pricing-content"
      content-style="padding: 24px; max-width: 1200px; margin: 0 auto;"
    >
      <n-space vertical size="large">
        <n-h1 align-text class="page-title">
          <n-text style="color: var(--color-neon-cyan)">{{ t('pricing.title') }}</n-text>
        </n-h1>

        <n-alert type="info" :bordered="false" class="intro-alert">
          <n-text depth="2">
            {{ t('pricing.intro.p1') }}
          </n-text>
        </n-alert>

        <n-divider title-placement="left">
          <n-h2 prefix="bar" align-text type="success">
            {{ t('pricing.tiers.title') }}
          </n-h2>
        </n-divider>

        <n-grid cols="1 600:2 900:3" x-gap="16" y-gap="16">
          <n-gi v-for="tier in subscriptionTiers" :key="tier.name">
            <n-card
              hoverable
              class="tier-card"
              :class="{ 'highlight-tier': tier.highlight, 'clickable-tier': tier.isBonus }"
              @click="handleTierClick(tier)"
            >
              <template #header>
                <n-space vertical :size="0">
                  <n-text strong>{{ tier.name }}</n-text>
                  <n-text v-if="tier.role" depth="3" style="font-size: 0.75em; font-weight: normal">
                    {{ tier.role }}
                  </n-text>
                </n-space>
              </template>
              <template #header-extra>
                <img :src="tier.icon" :alt="tier.name" style="width: 32px; height: 32px" />
              </template>

              <n-thing>
                <template #description>
                  <n-text depth="3" style="font-size: 0.9em">
                    {{ t('pricing.tiers.pawn.description').split('{pawncoins}')[0] }}
                    <n-text :style="{ color: tier.color, fontWeight: 'bold', fontSize: '1.2em' }">
                      {{ tier.pawncoins }}
                    </n-text>
                    {{ t('pricing.tiers.pawn.description').split('{pawncoins}')[1] }}
                  </n-text>
                </template>
                <n-divider dashed style="margin: 12px 0" />
                
                <div v-if="tier.isPurchasable" style="min-height: 72px;">
                  <n-space vertical size="small">
                    <n-button 
                      block 
                      type="primary" 
                      ghost 
                      @click.stop="handleCheckout(tier.id, 'monthly')"
                      :loading="loadingTier === tier.id + '-monthly'"
                      :disabled="loadingTier !== null"
                    >
                      {{ tier.priceMonthly }}
                    </n-button>
                    <n-button 
                      block 
                      type="success" 
                      @click.stop="handleCheckout(tier.id, 'yearly')"
                      :loading="loadingTier === tier.id + '-yearly'"
                      :disabled="loadingTier !== null"
                    >
                      {{ tier.priceYearly }}
                    </n-button>
                  </n-space>
                </div>
                <div v-else style="min-height: 72px; display: flex; align-items: center; justify-content: center;">
                  <n-text strong type="success" style="font-size: 1.1em; text-align: center;">
                    {{ tier.price }}
                  </n-text>
                </div>

              </n-thing>
            </n-card>
          </n-gi>
        </n-grid>

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
                  <n-text style="font-size: 1.5em">{{ game.icon }}</n-text>
                  <n-text strong style="font-size: 0.9em">{{ game.name }}</n-text>
                </n-space>
              </template>
              <n-thing>
                <template #description>
                  <n-space justify="space-between" align="center">
                    <n-text depth="3">{{ t('pricing.costs.pawncoinLabel') }}</n-text>
                    <n-text strong type="warning" style="font-size: 1.4em">
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

    <n-modal
      v-model:show="showBonusModal"
      preset="card"
      style="max-width: 600px; background-color: var(--color-bg-panel)"
      :title="t('pricing.bonusInfo.title')"
    >
      <n-space vertical>
        <n-text depth="2">
          <p>{{ t('pricing.bonusInfo.p1') }}</p>
          <p>{{ t('pricing.bonusInfo.p2') }}</p>
          <p>{{ t('pricing.bonusInfo.p3') }}</p>
          <div style="margin-top: 12px">
            <a
              href="https://lichess.org/team/xtrapawn"
              target="_blank"
              style="color: var(--color-neon-cyan); text-decoration: none; font-weight: bold"
            >
              🔗 {{ t('pricing.bonusInfo.teamLink') }}
            </a>
          </div>
        </n-text>
        <n-divider />
        <n-text strong>{{ t('pricing.bonusInfo.howItWorks') }}</n-text>
        <n-space vertical :size="8">
          <n-tag type="info">{{ t('pricing.bonusInfo.knight') }}</n-tag>
          <n-tag type="warning">{{ t('pricing.bonusInfo.bishop') }}</n-tag>
        </n-space>
        <n-divider dashed />
        <n-text depth="3" italic style="font-size: 0.9em">
          <p>{{ t('pricing.bonusInfo.p6') }}</p>
          <p>{{ t('pricing.bonusInfo.p7') }}</p>
        </n-text>
        <template #footer>
          <n-text strong style="color: var(--color-accent-primary)">
            {{ t('pricing.bonusInfo.p8') }}
          </n-text>
        </template>
      </n-space>
    </n-modal>
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

.clickable-tier {
  cursor: pointer;
}

.highlight-tier {
  border: 1px solid var(--color-neon-cyan) !important;
  box-shadow: 0 0 15px rgba(0, 242, 255, 0.2);
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
