# Техническое задание: Внедрение игрового режима "Advantage"

## Общее описание
Режим "Advantage" — это гибрид режимов "Finish-Him" и "Tornado". Игрок выбирает временной контроль, получает тактическую задачу, решает ее, а затем доигрывает позицию против шахматного движка.

---

## План реализации

### Этап 1: Подготовка инфраструктуры

- [x] **Маршрутизация (`src/router/index.ts`):**
    - [x] Добавить маршрут `/advantage` для выбора режима.
    - [x] Добавить маршрут `/advantage/:mode` для начала игры.
    - [x] Добавить маршрут `/advantage/:puzzleId` для входа по ссылке (с последующим выбором режима).
    - [x] Добавить маршрут `/advantage/:puzzleId/:mode` для прямого запуска игры по ссылке.

- [x] **Сервисный слой (`src/services/WebhookService.ts`):**
    - [x] Добавить метод `getAdvantageNextPuzzle(mode)` для `GET /api/advantage/next/:mode`.
    - [x] Добавить метод `postAdvantageResult(mode, body)` для `POST /api/advantage/result/:mode`.
    - [x] Добавить метод `getAdvantagePuzzleById(puzzleId)` для `GET /api/advantage/PuzzleId/:puzzleId`.

---

### Этап 2: Создание и настройка хранилища

- [x] **Хранилище (`src/stores/advantage.store.ts`):**
    - [x] Создать файл `advantage.store.ts` на основе `finishHim.store.ts`.
    - [x] Реализовать логику управления временными контролями (`bullet`, `blitz`, `rapid`, `classic`).
    - [x] Реализовать механику инкремента и его отключения при падении таймера ниже 10 секунд.
    - [x] Интегрировать вызовы новых методов из `WebhookService`.
    - [x] Реализовать механизм предупреждения при уходе со страницы во время активной игры.
    - [x] Добавить логику отправки `userStatsUpdate` в `auth.store.ts`.

---

### Этап 3: Рефакторинг и реализация UI

- [x] **Рефакторинг `TornadoSelectionView.vue`:**
    - [x] Переименовать `TornadoSelectionView.vue` в `ModeSelectionView.vue`.
    - [x] Модифицировать компонент для приема `prop` `gameMode` (`tornado` или `advantage`).
    - [x] Адаптировать компонент для формирования корректных URL в зависимости от `gameMode`.

- [x] **Создание `AdvantageView.vue`:**
    - [x] Создать компонент, использующий `advantage.store.ts`.
    - [x] Реализовать логику обработки `mode` и `puzzleId` из URL.

- [x] **Обновление `UserStats.vue`:**
    - [x] Добавить в шаблон блок для отображения статистики режима "Advantage".
    - [x] Добавить "Advantage" в массив `activityModes` для учета в общей статистике.