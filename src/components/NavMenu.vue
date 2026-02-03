<script setup lang="ts">
import { NMenu, type MenuOption } from 'naive-ui'
import { computed, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

defineProps({
  collapsed: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select'])

/**
 * Рендерит иконку с эмодзи (возвращаем к "красивым иконкам как раньше")
 */
function renderEmojiIcon(emoji: string) {
  return () => h('span', { style: 'font-size: 18px;' }, emoji)
}

const menuOptions: MenuOption[] = [
  {
    label: () => t('nav.home'),
    key: '/',
    icon: renderEmojiIcon('🏠'),
  },
  {
    label: () => t('nav.tornado'),
    key: '/tornado',
    icon: renderEmojiIcon('🌪️'),
  },
  {
    label: () => t('nav.finishHim'),
    key: '/finish-him',
    icon: renderEmojiIcon('🎯'),
  },
  {
    label: () => t('nav.practicalChess'),
    key: '/practical-chess',
    icon: renderEmojiIcon('♟️'),
  },
  {
    label: () => t('nav.sandbox'),
    key: '/sandbox',
    icon: renderEmojiIcon('🔬'),
  },
  {
    label: () => t('nav.openingTrainer'),
    key: '/diamond-hunter',
    icon: renderEmojiIcon('💎'),
  },
  {
    label: () => t('nav.leaderboards'),
    key: '/records',
    icon: renderEmojiIcon('🏆'),
  },
  {
    label: () => t('nav.userCabinet'),
    key: '/user-cabinet',
    icon: renderEmojiIcon('👤'),
  },
  {
    label: () => t('nav.pricing'),
    key: '/pricing',
    icon: renderEmojiIcon('💰'),
  },
  {
    label: () => t('nav.study'),
    key: '/study',
    icon: renderEmojiIcon('🎓'),
  },
  {
    label: () => t('nav.about'),
    key: '/about',
    icon: renderEmojiIcon('ℹ️'),
  },
]

// Determine current active key based on route path
const activeKey = computed(() => {
  const path = route.path
  if (path === '/') return '/'

  // Find match
  const matched = menuOptions.find((opt) => opt.key && path.startsWith(opt.key as string))
  if (matched) return matched.key as string

  return path
})

const handleUpdateValue = (key: string) => {
  router.push(key)
  emit('select', key)
}
</script>

<template>
  <div class="nav-menu-wrapper">
    <n-menu
      :value="activeKey"
      :collapsed="collapsed"
      :collapsed-width="64"
      :collapsed-icon-size="22"
      :options="menuOptions"
      @update:value="handleUpdateValue"
    />
  </div>
</template>

<style scoped>
.nav-menu-wrapper {
  width: 100%;
}

:deep(.n-menu-item-content-header) {
  font-family: inherit;
  font-weight: 500;
}
</style>
