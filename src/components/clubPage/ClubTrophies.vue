<!-- src/components/clubPage/ClubTrophies.vue -->
<script setup lang="ts">
import { computed, type PropType } from 'vue'
import type { TeamBattlePlayerSummary } from '../../types/api.types'

// --- PROPS ---
const props = defineProps({
  players: {
    type: Array as PropType<TeamBattlePlayerSummary[]>,
    required: true,
  },
  sortKey: {
    type: String as PropType<keyof TeamBattlePlayerSummary>,
    required: true,
  },
})

// --- COMPUTED ---
const topThree = computed(() => {
  if (props.players.length < 3) {
    return null
  }

  const sorted = [...props.players].sort((a, b) => {
    const valA = a[props.sortKey]
    const valB = b[props.sortKey]
    if (typeof valA === 'number' && typeof valB === 'number') {
      return valB - valA
    }
    return 0
  })

  const [first, second, third] = sorted
  return { first, second, third }
})
</script>

<template>
  <div v-if="topThree" class="trophies-main-wrapper">
    <n-grid :cols="3" x-gap="12" class="trophies-grid" align-items="end">
      <!-- 2-е место -->
      <n-grid-item v-if="topThree.second" class="trophy-item second">
        <div class="trophy-content">
          <div class="image-box breathe-red">
            <n-image src="/jpg/club_trofee/platz_2.jpg" preview-disabled class="trophy-img" />
          </div>
          <n-card size="small" class="name-card">
            <n-a
              :href="`https://lichess.org/@/${topThree.second.lichess_id}`"
              target="_blank"
              class="player-link"
            >
              <n-ellipsis style="max-width: 100%">{{ topThree.second.username }}</n-ellipsis>
            </n-a>
          </n-card>
        </div>
      </n-grid-item>

      <!-- 1-е место -->
      <n-grid-item v-if="topThree.first" class="trophy-item first">
        <div class="trophy-content">
          <div class="image-box breathe-gold">
            <n-image src="/jpg/club_trofee/platz_1.jpg" preview-disabled class="trophy-img" />
          </div>
          <n-card size="small" class="name-card gold-border">
            <n-a
              :href="`https://lichess.org/@/${topThree.first.lichess_id}`"
              target="_blank"
              class="player-link first-place"
            >
              <n-ellipsis style="max-width: 100%">{{ topThree.first.username }}</n-ellipsis>
            </n-a>
          </n-card>
        </div>
      </n-grid-item>

      <!-- 3-е место -->
      <n-grid-item v-if="topThree.third" class="trophy-item third">
        <div class="trophy-content">
          <div class="image-box breathe-red">
            <n-image src="/jpg/club_trofee/platz_3.jpg" preview-disabled class="trophy-img" />
          </div>
          <n-card size="small" class="name-card">
            <n-a
              :href="`https://lichess.org/@/${topThree.third.lichess_id}`"
              target="_blank"
              class="player-link"
            >
              <n-ellipsis style="max-width: 100%">{{ topThree.third.username }}</n-ellipsis>
            </n-a>
          </n-card>
        </div>
      </n-grid-item>
    </n-grid>
  </div>
</template>

<style scoped>
@keyframes breathe-red {
  0% {
    box-shadow: 0 0 15px rgba(255, 0, 0, 0.4);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 30px rgba(255, 0, 0, 0.7);
    transform: scale(1.02);
  }
  100% {
    box-shadow: 0 0 15px rgba(255, 0, 0, 0.4);
    transform: scale(1);
  }
}

@keyframes breathe-gold {
  0% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
    transform: scale(1);
  }
  50% {
    box-shadow:
      0 0 40px rgba(255, 215, 0, 0.8),
      0 0 20px rgba(255, 0, 0, 0.4);
    transform: scale(1.05);
  }
  100% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
    transform: scale(1);
  }
}

.trophies-main-wrapper {
  width: 100%;
  padding: 20px 0;
}

.trophies-grid {
  max-width: 900px;
  margin: 0 auto;
}

.trophy-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.trophy-item.first {
  transform: translateY(-15px);
}

.trophy-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.image-box {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  line-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-primary);
}

.trophy-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.trophy-item:hover .trophy-img {
  transform: scale(1.08);
}

.name-card {
  width: 90%;
  text-align: center;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.gold-border {
  border-color: var(--color-gold) !important;
}

.player-link {
  text-decoration: none;
  font-weight: bold;
  font-family: var(--font-family-primary);
  font-size: var(--font-size-large);
}

.first-place {
  color: var(--color-gold) !important;
}

@media (max-width: 768px) {
  .trophies-main-wrapper {
    padding: 10px 0;
  }

  .player-link {
    font-size: var(--font-size-small);
  }

  .trophy-item.first {
    transform: translateY(-5px);
  }
}
</style>
