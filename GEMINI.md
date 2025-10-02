# Project Overview

This is a Vue.js project for an interactive web platform for chess enthusiasts called Chessboard.fun. It offers unique training modes, detailed statistics, and powerful analysis tools.

The frontend is built with TypeScript and Vue.js, using Pinia for state management, Vue Router for routing, and `vue-i18n` for internationalization. The UI is rendered using Chessground. The application integrates with the Lichess API for user authentication and puzzle databases.

The backend is powered by n8n.io and Nest.js, and the application uses Stockfish.js for local chess analysis and also has a server-side engine.

# Building and Running

## Prerequisites

- Node.js (version specified in `package.json`)
- pnpm

## Key Commands

- **Install dependencies:** `pnpm install`
- **Run development server:** `pnpm dev`
- **Build for production:** `pnpm build`
- **Run unit tests:** `pnpm test:unit`
- **Lint and fix code:** `pnpm lint`
- **Format code:** `pnpm format`

# Development Conventions

## Coding Style

The project uses Prettier for code formatting and ESLint for linting. Configuration files for both are present in the root directory (`.prettierrc.json`, `eslint.config.ts`).

## Testing

Unit tests are written using Vitest and can be found in the `src/__tests__` directory.

## Contribution

The `README.md` file provides clear guidelines for contributing to the project. It is recommended to create an issue to discuss any changes before submitting a pull request.

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

- Модификации без разрешения будут немедленно прерваны

- Запрещены попутные изменения, не связанные с задачей

## Рабочий процесс:

1. Изучить существующий код в папке `src`

2. Запросить разрешение на модификацию конкретного модуля

3. Получить подтверждение

4. Выполнить изменения

5. Shell pnpm type-check (Run TypeScript type checking to verify the fixes.)
