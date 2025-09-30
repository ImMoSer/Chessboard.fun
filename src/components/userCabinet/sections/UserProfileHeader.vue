<!-- src/components/userCabinet/sections/UserProfileHeader.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth.store'

const { t } = useI18n()
const authStore = useAuthStore()
const { userProfile } = storeToRefs(authStore)

const formatTierExpireDate = (isoDate: string | null | undefined) => {
  if (!isoDate) return t('userCabinet.info.tierPermanent')
  const date = new Date(isoDate)
  return t('userCabinet.info.tierExpires', { date: date.toLocaleDateString() })
}
</script>

<template>
  <header v-if="userProfile" class="user-cabinet__header">
    <h1 class="user-cabinet__page-main-title">
      {{ userProfile.username }}
    </h1>
    <div class="user-cabinet__user-info-basic">
      <div class="user-cabinet__stat-item">
        <span class="user-cabinet__stat-label">{{ t('userCabinet.info.lichessId') }}:</span>
        <span class="user-cabinet__stat-value">{{ userProfile.id }}</span>
      </div>
      <div class="user-cabinet__stat-item">
        <span class="user-cabinet__stat-label">{{ t('userCabinet.info.subscriptionTier') }}:</span>
        <span class="user-cabinet__stat-value">{{ userProfile.subscriptionTier }}
          <span class="tier-expire-date">{{
            formatTierExpireDate(userProfile.TierExpire)
          }}</span></span>
      </div>
      <!-- Обновленные и новые поля -->
      <div class="user-cabinet__stat-item">
        <span class="user-cabinet__stat-label">{{
          t('userCabinet.stats.endgameSkillLabel')
        }}</span>
        <span class="user-cabinet__stat-value">{{ userProfile.endgame_skill }}</span>
      </div>
      <div v-if="userProfile.finishHimRating" class="user-cabinet__stat-item">
        <span class="user-cabinet__stat-label">{{
          t('userCabinet.stats.finishHimRatingLabel')
        }}</span>
        <span class="user-cabinet__stat-value">{{ userProfile.finishHimRating.rating }}</span>
      </div>
      <div class="user-cabinet__stat-item">
        <span class="user-cabinet__stat-label">{{
          t('userCabinet.stats.attackSkillLabel')
        }}</span>
        <span class="user-cabinet__stat-value">{{ userProfile.attack_skill }}</span>
      </div>
      <div v-if="userProfile.attackRating" class="user-cabinet__stat-item">
        <span class="user-cabinet__stat-label">{{
          t('userCabinet.stats.attackRatingLabel')
        }}</span>
        <span class="user-cabinet__stat-value">{{ userProfile.attackRating.rating }}</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.user-cabinet__header {
  padding-bottom: 15px;
  margin-bottom: 20px;
  text-align: center;
}

.user-cabinet__page-main-title {
  font-size: var(--font-size-xxlarge);
  color: var(--color-accent-primary);
  margin-top: 0;
  margin-bottom: 10px;
  font-weight: var(--font-weight-bold);
}

.user-cabinet__user-info-basic {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 15px;
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
}

.user-cabinet__stat-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  border-bottom: 1px dotted var(--color-border);
  font-size: var(--font-size-base);
  background-color: var(--color-bg-primary);
  border-radius: 4px;
  align-items: center;
  gap: 10px;
}

.user-cabinet__stat-label {
  color: var(--color-text-muted);
  font-weight: var(--font-weight-normal);
}

.user-cabinet__stat-value {
  color: var(--color-accent-primary);
  font-weight: var(--font-weight-bold);
}

.tier-expire-date {
  font-style: italic;
  font-size: 0.8em;
  margin-left: 5px;
}
</style>
