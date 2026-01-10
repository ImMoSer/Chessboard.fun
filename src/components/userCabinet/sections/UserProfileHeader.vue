<!-- src/components/userCabinet/sections/UserProfileHeader.vue -->
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store'
import type { TornadoMode } from '@/types/api.types'
import { Calendar, Flash, Timer } from '@vicons/ionicons5'
import { storeToRefs } from 'pinia'
import { computed, type Component } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const authStore = useAuthStore()
const { userProfile } = storeToRefs(authStore)


const tierToPieceMap: Record<string, string> = {
  Pawn: 'wP.svg',
  Knight: 'wN.svg',
  Bishop: 'wB.svg',
  Rook: 'wR.svg',
  Queen: 'wQ.svg',
  King: 'wK.svg',
  Administrator: 'wK.svg',
}

const avatarUrl = computed(() => {
  const tier = userProfile.value?.subscriptionTier
  if (tier && tierToPieceMap[tier]) {
    return `/piece/alpha/${tierToPieceMap[tier]}`
  }
  return 'https://lichess1.org/assets/images/avatar_default.png'
})

const formatTierExpireDate = (isoDate: string | null | undefined) => {
  if (!isoDate) return t('userCabinet.info.tierPermanent')
  const date = new Date(isoDate)
  return t('userCabinet.info.tierExpires', { date: date.toLocaleDateString() })
}

const getTierType = (tier: string = '') => {
  const t = tier.toLowerCase()
  if (t === 'platinum' || t === 'gold') return 'warning'
  if (t === 'silver' || t === 'bronze') return 'info'
  if (t === 'administrator') return 'error'
  return 'default'
}

// Tornado ratings logic
const modeMeta: Record<TornadoMode, { color: string; icon: Component }> = {
  bullet: { color: 'var(--color-accent-primary)', icon: Flash },
  blitz: { color: 'var(--color-accent-success)', icon: Flash },
  rapid: { color: 'var(--color-accent-warning)', icon: Timer },
  classic: { color: 'var(--color-accent-error)', icon: Calendar },
}

const tornadoScores = computed(() => {
  if (!userProfile.value?.tornadoHighScores) return []
  const modes: TornadoMode[] = ['bullet', 'blitz', 'rapid', 'classic']
  return modes.map((mode) => ({
    mode,
    score: userProfile.value?.tornadoHighScores?.[mode] || 0,
  }))
})
</script>

<template>
  <n-card v-if="userProfile" class="header-card" :bordered="false">
    <div class="header-main-grid">
      <!-- Left side: User Profile Info -->
      <div class="profile-basic-info">
        <div class="avatar-container">
          <!-- KEEP CLEAR: No elements should be placed directly under the avatar -->
          <n-avatar round :size="150" :src="avatarUrl"
            fallback-src="https://lichess1.org/assets/images/avatar_default.png" class="user-avatar" />
        </div>

        <div class="user-main-info">
          <n-h1 class="username">{{ userProfile.username }}</n-h1>
          <n-space size="small" align="center" wrap class="tier-info">
            <n-tag :type="getTierType(userProfile.subscriptionTier)" round size="small">
              {{ userProfile.subscriptionTier }}
            </n-tag>
            <n-text depth="3" class="expire-date">
              {{ formatTierExpireDate(userProfile.TierExpire) }}
            </n-text>
          </n-space>

          <div class="funcoins-stat">
            <n-statistic :label="t('userCabinet.stats.funcoinsLabel')" :value="userProfile.FunCoins">
              <template #prefix>🪙</template>
            </n-statistic>
          </div>
        </div>
      </div>

      <!-- Right: Tornado Ratings (taking remaining space) -->
      <div class="tornado-ratings-section">
        <div class="section-title">{{ t('userCabinet.stats.tornadoTitle') }}</div>
        <n-grid :cols="2" :x-gap="12" :y-gap="12">
          <n-grid-item v-for="stat in tornadoScores" :key="stat.mode">
            <div class="score-item" :style="{ borderColor: modeMeta[stat.mode].color }">
              <n-icon :component="modeMeta[stat.mode].icon" :color="modeMeta[stat.mode].color" size="20" />
              <div class="score-details">
                <div class="mode-name">{{ stat.mode }}</div>
                <div class="mode-score">{{ stat.score }}</div>
              </div>
            </div>
          </n-grid-item>
        </n-grid>
      </div>
    </div>
  </n-card>
</template>

<style scoped>
.header-card {
  background-color: var(--color-bg-tertiary);
  border-radius: 12px;
  border: 1px solid var(--color-border-hover);
}

.header-main-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 48px;
}


.profile-basic-info {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.avatar-container {

  padding: 10px;
  border-radius: 20%;
  border: 1px solid var(--color-blue-base);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  box-sizing: border-box;
}

.user-avatar {
  background-color: var(--color-bg-tertiary);
}

.user-main-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  min-height: 170px;
}

.username {
  margin: 0 0 8px 0 !important;
  font-family: var(--font-family-primary);
  color: var(--color-accent-primary);
  font-size: 2.2rem;
}

.tier-info {
  margin-bottom: 12px;
}

.expire-date {
  font-size: var(--font-size-tiny);
}

.funcoins-stat {
  margin-top: 4px;
}

.section-title {
  font-family: var(--font-family-primary);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: bold;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.score-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background-color: var(--color-bg-secondary);
  border-left: 4px solid;
  border-radius: 6px;
}

.mode-name {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: capitalize;
}

.mode-score {
  font-weight: bold;
  font-size: 1.1rem;
  color: var(--color-accent-warning);
}

@media (max-width: 1100px) {
  .header-main-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

:deep(.n-statistic-label) {
  font-family: var(--font-family-primary);
}

:deep(.n-statistic-value__content) {
  font-family: var(--font-family-primary);
  font-weight: bold;
}
</style>
