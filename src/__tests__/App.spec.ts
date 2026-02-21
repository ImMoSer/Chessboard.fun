// src/__tests__/App.spec.ts
import App from '@/app/App.vue'
import i18n from '@/shared/config/i18n'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'

// Описываем группу тестов для корневого компонента App
describe('App', () => {
  // Тест проверяет, что компонент в принципе монтируется без ошибок
  it('mounts properly with all plugins', () => {
    // 1. Создаем экземпляры плагинов, от которых зависит App.vue
    const pinia = createPinia()
    const router = createRouter({
      history: createWebHistory(),
      routes: [{ path: '/', component: { template: '<div>Home</div>' } }], // Простой маршрут-заглушка
    })

    // 2. Монтируем компонент, передавая плагины в глобальные настройки
    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router, i18n],
      },
    })

    // 3. Проверяем, что компонент отрендерил что-то осмысленное.
    // Например, ищем элемент <header>, который является частью App.vue.
    // `expect(wrapper.find('header').exists()).toBe(true)` означает:
    // "Ожидаю, что внутри отрендеренного компонента существует тег <header>".
    expect(wrapper.find('header').exists()).toBe(true)
  })
})
