# Project Overview

Это проект Vue.js для интерактивной веб-платформы для любителей шахмат под названием Chessboard.fun. Он предлагает уникальные режимы тренировок, подробную статистику и мощные инструменты анализа.

Фронтенд построен с использованием TypeScript и Vue.js, Pinia для управления состоянием, Vue Router для маршрутизации и `vue-i18n` для интернационализации. Пользовательский интерфейс отображается с помощью Chessground. Приложение интегрируется с Lichess API для аутентификации пользователей и баз данных головоломок.

Бэкенд работает на n8n.io и Nest.js, а приложение использует Stockfish.js для локального шахматного анализа, а также имеет серверный движок.

Приложение включает в себя различные игровые режимы, такие как "finish-him", "attack", "tower", "tornado", "advantage", и "sandbox", а также разделы для кабинета пользователя, "О нас", "Цены", "Фан-клуб" и "Записи".

# Building and Running

## Prerequisites

- Node.js (версия указана в `package.json`, рекомендуется `^20.19.0 || >=22.12.0`)
- pnpm

## Key Commands

- **Установить зависимости:** `pnpm install`
- **Запустить сервер разработки:** `pnpm dev`
- **Собрать для production:** `pnpm build`
- **Запустить модульные тесты:** `pnpm test:unit`
- **Линтинг и исправление кода:** `pnpm lint`
- **Форматировать код:** `pnpm format`
- **Проверка типов:** `pnpm type-check`

# Development Conventions

## Coding Style

Проект использует Prettier для форматирования кода и ESLint для линтинга. Файлы конфигурации для обоих присутствуют в корневом каталоге (`.prettierrc.json`, `eslint.config.ts`).

## Testing

Модульные тесты написаны с использованием Vitest и могут быть найдены в каталоге `src/__tests__`.

## Contribution

Файл `README.md` содержит четкие рекомендации по внесению вклада в проект. Рекомендуется создать issue для обсуждения любых изменений перед отправкой pull request.

# Recent Changes

- **Refactoring Stage 2 (Chessboard Optimization)**:
  - **Architecture**: Decoupled `Chessboard.vue` from `board.store.ts`. Removed `groundApi` from global store.
  - **Performance**: Implemented atomic watchers in `Chessboard.vue` to preventing unnecessary re-renders.
  - **Premoves**: Added native Chessground premove support (`premovable: true`) with robust server-side validation flow (`check-premove` event).
  - **UI**: Added CSS Grid implementation for `PromotionDialog` for pixel-perfect positioning overlay.

# Правила взаимодействия:

- Коммуникация **только на русском языке**

- Ответы краткие и по существу, без лишних разъяснений

- Детали только по запросу

# Инструкции для работы с кодом:

## Принципы:

- **"Never change the running system"** - только необходимые изменения!

- Максимальная чистота кода без излишних комментариев

- Избегать неиспользуемых импортов/переменных

## Формат кода:

- Каждый модуль в отдельном артефакте

- Всегда полный код модуля для копипаста. ты пишешь код а я копирую и вставлю его целиком! неполные коды вызывают ошибки!

- Первая строка: путь к файлу (// src/puzzles/puzzles.service.ts)

## КРИТИЧЕСКИ ВАЖНО:

- **ЛЮБЫЕ** модификации кода только с явного разрешения

- Перед изменением модуля обязательно запросить разрешение с указанием имени модуля

- Получить подтверждение

- Выполнить изменения
