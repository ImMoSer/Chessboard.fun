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

  if (!first || !second || !third) return null

  return {
    first,
    second,
    third,
  }
})
</script>

<template>
  <!-- Главный контейнер трофеев - занимает максимально доступное пространство -->
  <div v-if="topThree" class="trophies-main-container">

    <!-- Родительский контейнер для всех трофеев - устанавливает границы -->
    <div class="trophies-parent-container">

      <!-- Трофейный контейнер #1 - 2-е место -->
      <div class="trophy-container trophy-container--second">
        <div class="trophy-container__image-wrapper">
          <img src="/jpg/club_trofee/platz_2.jpg" alt="2nd Place Trophy" class="trophy-container__image" />
        </div>
        <div class="trophy-container__nameplate">
          <span class="trophy-container__name">{{ topThree.second.username }}</span>
        </div>
      </div>

      <!-- Трофейный контейнер #2 - 1-е место -->
      <div class="trophy-container trophy-container--first">
        <div class="trophy-container__image-wrapper">
          <img src="/jpg/club_trofee/platz_1.jpg" alt="1st Place Trophy" class="trophy-container__image" />
        </div>
        <div class="trophy-container__nameplate">
          <span class="trophy-container__name">{{ topThree.first.username }}</span>
        </div>
      </div>

      <!-- Трофейный контейнер #3 - 3-е место -->
      <div class="trophy-container trophy-container--third">
        <div class="trophy-container__image-wrapper">
          <img src="/jpg/club_trofee/platz_3.jpg" alt="3rd Place Trophy" class="trophy-container__image" />
        </div>
        <div class="trophy-container__nameplate">
          <span class="trophy-container__name">{{ topThree.third.username }}</span>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Анимации */
@keyframes breathe-red {
  0% {
    box-shadow: 0 0 20px rgba(255, 0, 0, 0.6);
    transform: scale(1);
  }

  50% {
    box-shadow: 0 0 35px rgba(255, 0, 0, 0.9), 0 0 50px rgba(255, 0, 0, 0.4);
    transform: scale(1.03);
  }

  100% {
    box-shadow: 0 0 20px rgba(255, 0, 0, 0.6);
    transform: scale(1);
  }
}

@keyframes breathe-gold {
  0% {
    box-shadow: 0 0 25px rgba(255, 215, 0, 0.7), 0 0 15px rgba(255, 0, 0, 0.5);
    transform: scale(1);
  }

  50% {
    box-shadow: 0 0 45px rgba(255, 215, 0, 1), 0 0 35px rgba(255, 0, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.4);
    transform: scale(1.04);
  }

  100% {
    box-shadow: 0 0 25px rgba(255, 215, 0, 0.7), 0 0 15px rgba(255, 0, 0, 0.5);
    transform: scale(1);
  }
}

/* Главный контейнер - занимает максимально доступное место */
.trophies-main-container {
  width: 100%;
  height: auto;
  min-height: 200px;
  padding: 10px 5px;
  /* Увеличиваем padding для свечения */
  box-sizing: border-box;
}

/* Родительский контейнер для трофеев - устанавливает границы и лайаут */
.trophies-parent-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 2%;
  max-width: 1200px;
  margin: 0 auto;
  /* Убираем overflow: hidden чтобы свечение не обрезалось */
  padding: 30px 5px;
  /* Добавляем внутренний padding для "дыхания" */
}

/* Базовый трофейный контейнер */
.trophy-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  min-height: 250px;
  box-sizing: border-box;
  position: relative;
  padding: 5px;
  /* Добавляем внутренний padding для дыхания */
  /* Убираем overflow: hidden */
}

/* Размеры трофейных контейнеров */
.trophy-container--first {
  flex: 0 1 40%;
  order: 2;
  transform: translateY(-10px);
}

.trophy-container--second {
  flex: 0 1 35%;
  order: 1;
}

.trophy-container--third {
  flex: 0 1 35%;
  order: 3;
}

/* Обертка изображения - контролирует анимацию и эффекты */
.trophy-container__image-wrapper {
  width: calc(100% - 20px);
  /* Учитываем padding контейнера */
  height: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 20px;
  overflow: visible;
  /* Позволяем свечению быть видимым */
  animation: breathe-red 3s ease-in-out infinite;
  margin-bottom: 20px;
  /* Увеличиваем отступ */
  position: relative;
  z-index: 1;
}

/* Специальная анимация для первого места */
.trophy-container--first .trophy-container__image-wrapper {
  animation: breathe-gold 2.5s ease-in-out infinite;
}

/* Изображение трофея */
.trophy-container__image {
  width: 100%;
  height: auto;
  object-fit: contain;
  border-radius: 20px;
  transition: transform 0.3s ease;
}

/* Hover эффект для изображения */
.trophy-container:hover .trophy-container__image {
  transform: scale(1.05);
}

/* Табличка с именем - вписывается в дизайн контейнера */
.trophy-container__nameplate {
  width: calc(90% - 20px);
  /* Учитываем padding контейнера */
  background: linear-gradient(145deg, var(--color-bg-secondary), rgba(255, 255, 255, 0.05));
  border: 1px solid var(--color-border-hover);
  border-radius: 10px;
  padding: 12px 16px;
  box-shadow:
    0 4px 15px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  position: relative;
  z-index: 2;
}

/* Текст имени */
.trophy-container__name {
  font-weight: bold;
  color: var(--color-text-link);
  font-size: clamp(0.8rem, 2vw, 1.1rem);
  text-align: center;
  display: block;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

/* Hover эффект для таблички */
.trophy-container:hover .trophy-container__nameplate {
  transform: translateY(-3px);
  box-shadow:
    0 8px 25px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

/* Адаптивность для планшетов */
@media (max-width: 768px) {
  .trophies-main-container {
    padding: 30px 15px;
    /* Сохраняем место для свечения */
    min-height: 180px;
  }

  .trophies-parent-container {
    padding: 20px 8px;
  }

  .trophy-container {
    min-height: 200px;
    padding: 12px;
  }

  .trophy-container--first {
    transform: translateY(-10px);
  }

  .trophy-container__nameplate {
    padding: 10px 12px;
  }
}

/* Адаптивность для мобильных */
@media (max-width: 480px) {
  .trophies-main-container {
    padding: 25px 10px;
    min-height: 150px;
  }

  .trophies-parent-container {
    gap: 1%;
    padding: 15px 5px;
  }

  .trophy-container {
    min-height: 160px;
    padding: 10px;
  }

  .trophy-container--first {
    flex: 0 1 38%;
    transform: translateY(-8px);
  }

  .trophy-container--second,
  .trophy-container--third {
    flex: 0 1 31%;
  }

  .trophy-container__nameplate {
    padding: 8px 10px;
    width: calc(95% - 20px);
  }

  .trophy-container__name {
    font-size: clamp(0.7rem, 3vw, 0.9rem);
  }

  .trophy-container__image-wrapper {
    margin-bottom: 15px;
  }
}

/* Очень маленькие экраны */
@media (max-width: 320px) {
  .trophies-parent-container {
    gap: 0.5%;
  }

  .trophy-container--first {
    flex: 0 1 36%;
  }

  .trophy-container--second,
  .trophy-container--third {
    flex: 0 1 32%;
  }
}
</style>
