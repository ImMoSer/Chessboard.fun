<!-- src/components/userCabinet/sections/UserProfileHeader.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth.store'

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
</script>

<template>
  <n-card v-if="userProfile" class="header-card" :bordered="false">
    <div class="header-flex">
      <div class="avatar-container">
        <n-avatar
          round
          :size="80"
          :src="avatarUrl"
          fallback-src="https://lichess1.org/assets/images/avatar_default.png"
          class="user-avatar"
        />
      </div>
      
      <div class="user-main-info">
        <n-h1 class="username">{{ userProfile.username }}</n-h1>
        
        <n-space size="small" align="center" wrap>
          <n-tag :type="getTierType(userProfile.subscriptionTier)" round size="small">
            {{ userProfile.subscriptionTier }}
          </n-tag>
          <n-text depth="3" class="expire-date">
            {{ formatTierExpireDate(userProfile.TierExpire) }}
          </n-text>
        </n-space>
      </div>

      <n-space class="header-stats" justify="end">
        <n-statistic :label="t('userCabinet.stats.finishHimRatingLabel')" :value="userProfile.finishHimRating?.rating || 0">
          <template #prefix>🏆</template>
        </n-statistic>
        <n-statistic :label="t('userCabinet.stats.funcoinsLabel')" :value="userProfile.FunCoins">
          <template #prefix>🪙</template>
        </n-statistic>
      </n-space>
    </div>
  </n-card>
</template>

<style scoped>
.header-card {
  background-color: var(--color-bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--color-border-hover);
}

.header-flex {
  display: flex;
  align-items: center;
  gap: 24px;
}

.avatar-container {
  background-color: var(--color-bg-primary);
  padding: 4px;
  border-radius: 50%;
  border: 2px solid var(--color-border-hover);
  line-height: 0;
}

.user-avatar {
  background-color: var(--color-bg-tertiary);
}

.user-main-info {
  flex: 1;
}

.username {
  margin: 0 0 8px 0 !important;
  font-family: var(--font-family-primary);
  color: var(--color-accent-primary);
}

.expire-date {
  font-size: var(--font-size-small);
}

.header-stats {
  min-width: 250px;
}

:deep(.n-statistic-label) {
  font-family: var(--font-family-primary);
}

:deep(.n-statistic-value__content) {
  font-family: var(--font-family-primary);
  font-weight: bold;
}

@media (max-width: 768px) {
  .header-flex {
    flex-direction: column;
    text-align: center;
  }
  
  .header-stats {
    justify-content: center;
    width: 100%;
    margin-top: 16px;
  }
}
</style>