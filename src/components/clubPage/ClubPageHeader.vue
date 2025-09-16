<!-- src/components/clubPage/ClubPageHeader.vue -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { FunclubMeta } from '../../types/api.types'

const { t } = useI18n()

// Определяем props, которые компонент принимает от родителя
defineProps<{
  clubInfo: FunclubMeta
}>()

// Хелпер для получения URL иконки flair
const getFlairIconUrl = (flair?: string | null) => {
  if (!flair) return null
  return `https://lichess1.org/assets/flair/img/${flair}.webp`
}
</script>

<template>
  <div>
    <img src="/clubPageBanner/clubBanner.jpg" class="club-page__banner" :alt="t('clubPage.bannerAlt')"
      @error="($event.target as HTMLImageElement).style.display = 'none'" />
    <header class="club-page__header">
      <div class="club-page__header-info">
        <a :href="`https://lichess.org/team/${clubInfo.clubId}`" target="_blank" class="club-page__name-link">
          <h1 class="club-page__name">{{ clubInfo.name }}</h1>
        </a>
        <p class="club-page__meta">
          {{ t('clubPage.founder') }}:
          <a :href="`https://lichess.org/@/${clubInfo.leader.name}`" target="_blank">{{
            clubInfo.leader.name
          }}</a>
          | {{ t('clubPage.members') }}: {{ clubInfo.nbMembers }}
        </p>
      </div>
    </header>

    <div v-if="clubInfo.leaders && clubInfo.leaders.length > 0" class="club-page__leaders-section">
      <h3 class="club-page__section-title">{{ t('clubPage.leadersTitle') }}</h3>
      <ul class="club-page__leaders-list">
        <li v-for="leader in clubInfo.leaders" :key="leader.id">
          <a :href="`https://lichess.org/@/${leader.id}`" target="_blank">
            {{ leader.title ? `${leader.title} ` : '' }}{{ leader.name }}
            <img v-if="getFlairIconUrl(leader.flair)" :src="getFlairIconUrl(leader.flair)!" alt="Flair"
              class="club-page__flair-icon" />
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.club-page__banner {
  width: 100%;
  height: auto;
  max-height: 600px;
  object-fit: cover;
  border-radius: var(--panel-border-radius);
  background-color: var(--color-bg-tertiary);
  margin-bottom: -10px;
}

.club-page__header {
  text-align: center;
  border-bottom: 2px solid var(--color-border-hover);
  padding-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.club-page__header-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.club-page__name {
  font-size: var(--font-size-xxlarge);
  color: var(--color-accent-primary);
  margin: 0;
}

.club-page__meta {
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
  margin: 0;
}

.club-page__name-link,
.club-page__meta a {
  color: var(--color-text-link);
  text-decoration: none;
}

.club-page__name-link:hover,
.club-page__meta a:hover {
  text-decoration: underline;
}

.club-page__leaders-section {
  margin-top: 20px;
  padding: 0;
  background-color: var(--color-bg-tertiary);
  border-radius: var(--panel-border-radius);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.club-page__section-title {
  font-size: var(--font-size-xlarge);
  color: var(--color-text-dark);
  margin: 0;
  padding: 12px 15px;
  border-bottom: 1px solid var(--color-border-hover);
  background-color: var(--color-accent-primary);
}

.club-page__leaders-list {
  list-style: none;
  padding: 15px;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.club-page__leaders-list li a {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border-hover);
  border-radius: var(--panel-border-radius);
  color: var(--color-text-link);
  text-decoration: none;
  font-weight: bold;
  transition: all 0.2s ease;
}

.club-page__leaders-list li a:hover {
  background-color: var(--color-border-hover);
  border-color: var(--color-accent-primary);
  color: var(--color-text-link-hover);
}

.club-page__flair-icon {
  height: 20px;
  vertical-align: -0.15em;
  margin-left: 6px;
}

@media (orientation: portrait) {
  .club-page__header-info .club-page__name {
    font-size: var(--font-size-large);
  }

  .club-page__meta {
    font-size: var(--font-size-small);
  }

  .club-page__section-title {
    font-size: var(--font-size-base);
    padding: 8px 10px;
  }

  .club-page__leaders-list li a {
    font-size: var(--font-size-xsmall);
  }
}
</style>
