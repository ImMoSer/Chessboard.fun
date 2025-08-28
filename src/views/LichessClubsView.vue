<!-- src/views/LichessClubsView.vue -->
<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { useClubsStore } from '../stores/clubs.store'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { authService } from '../services/AuthService'
import ClubsListTable from '../components/lichessClubs/ClubsListTable.vue'

const clubsStore = useClubsStore()
const { t } = useI18n()

// Получаем реактивное состояние, относящееся к странице в целом
const {
  isLoading,
  error,
  clubsData,
  isFounder,
  registeredFounderClub,
  unregisteredFounderClubs,
  isFounderActionLoading,
  founderActionCooldownHours,
} = storeToRefs(clubsStore)

onMounted(() => {
  clubsStore.initializePage()
})

// Следим за изменениями в аутентификации для обновления UI основателя
watch(
  () => authService.getIsAuthenticated(),
  () => {
    clubsStore.processFounderClubs()
  },
  { immediate: true },
)

const getPageTitle = computed(() => {
  if (isLoading.value) {
    return t('lichessClubs.pageTitle.loading')
  } else if (error.value) {
    return t('lichessClubs.pageTitle.error')
  } else {
    return t('lichessClubs.pageTitle.loaded')
  }
})
</script>

<template>
  <div class="lichess-clubs-page">
    <img
      class="lichess-clubs-page__banner"
      src="/jpg/lichess_clubs.jpg"
      :alt="t('lichessClubs.bannerAlt')"
    />

    <!-- Логика основателя остается в главном компоненте -->
    <div v-if="isFounder" class="lichess-clubs-page__founder-controls">
      <template v-if="founderActionCooldownHours !== null">
        <div class="lichess-clubs-page__founder-item cooldown-message">
          <span>{{
            t('lichessClubs.founder.cooldownMessage', {
              hours: founderActionCooldownHours.toFixed(1),
            })
          }}</span>
        </div>
      </template>
      <template v-else-if="registeredFounderClub">
        <div class="lichess-clubs-page__founder-item">
          <span>{{
            t('lichessClubs.founder.clubIsListed', { clubName: registeredFounderClub.club_name })
          }}</span>
          <button
            class="lichess-clubs-page__founder-button remove-button"
            :disabled="isFounderActionLoading"
            @click="clubsStore.handleRemoveClub(registeredFounderClub.club_id)"
          >
            {{
              t('lichessClubs.founder.removeClub', { clubName: registeredFounderClub.club_name })
            }}
          </button>
        </div>
      </template>
      <template v-else-if="unregisteredFounderClubs.length > 0">
        <div
          v-for="club in unregisteredFounderClubs"
          :key="club.club_id"
          class="lichess-clubs-page__founder-item"
        >
          <span>{{ t('lichessClubs.founder.clubNotListed', { clubName: club.club_name }) }}</span>
          <button
            class="lichess-clubs-page__founder-button add-button"
            :disabled="isFounderActionLoading"
            @click="clubsStore.handleAddClub(club.club_id)"
          >
            {{ t('lichessClubs.founder.addClubButton', { clubName: club.club_name }) }}
          </button>
        </div>
      </template>
    </div>

    <div v-if="isLoading" class="loading-message">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="error" class="lichess-clubs-page__error-message">
      {{ t('common.error') }}: {{ error }}
    </div>

    <!-- Заменяем всю логику таблицы одним компонентом -->
    <div v-else-if="clubsData && clubsData.length > 0">
      <h3 class="lichess-clubs-page__table-title">{{ getPageTitle }}</h3>
      <ClubsListTable :clubs-data="clubsData" />
    </div>

    <div v-else class="lichess-clubs-page__no-data-message">
      {{ t('lichessClubs.table.noClubs') }}
    </div>
  </div>
</template>

<style scoped>
/* Оставляем только стили, относящиеся к самой странице, а не к таблице */
.lichess-clubs-page {
  padding: 20px;
  box-sizing: border-box;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-default);
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 70vw;
  max-width: 1200px;
  margin: 20px auto;
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-border-hover);
}

.lichess-clubs-page__banner {
  width: 100%;
  height: auto;
  max-height: 600px;
  object-fit: cover;
  border-radius: var(--panel-border-radius);
  background-color: var(--color-bg-tertiary);
  margin-bottom: 10px;
}

.lichess-clubs-page__error-message,
.lichess-clubs-page__no-data-message,
.loading-message {
  color: var(--color-text-error);
  background-color: color-mix(in srgb, var(--color-accent-error) 15%, transparent);
  border: 1px solid var(--color-accent-error);
  padding: 10px 15px;
  border-radius: var(--panel-border-radius);
  text-align: center;
  margin-top: 15px;
}
.loading-message {
  color: var(--color-text-muted);
  border-color: var(--color-border);
  background-color: var(--color-bg-tertiary);
}

.lichess-clubs-page__table-title {
  font-size: var(--font-size-large);
  color: var(--color-text-dark);
  background-color: var(--color-accent-success);
  padding: 5px 15px;
  margin: 0 0 10px 0;
  display: block;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
  border-radius: var(--panel-border-radius);
  font-weight: var(--font-weight-bold);
  font-family: var(--font-family-primary);
}

/* --- Founder Controls --- */
.lichess-clubs-page__founder-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--panel-border-radius);
  border: 1px solid var(--color-accent-primary);
}

.lichess-clubs-page__founder-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
}

.lichess-clubs-page__founder-button {
  padding: 8px 15px;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  border-radius: var(--panel-border-radius);
  cursor: pointer;
  transition: background-color 0.2s ease;
  border: 1px solid;
}

.lichess-clubs-page__founder-button.add-button {
  background-color: var(--color-accent-success);
  color: var(--color-text-dark);
}
.lichess-clubs-page__founder-button.remove-button {
  background-color: var(--color-accent-error);
  color: var(--color-text-on-accent);
}

@media (orientation: portrait) {
  .lichess-clubs-page {
    width: 100%;
    padding: 10px;
    margin: 0;
    gap: 15px;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
}
</style>
