# Архитектурный Аудит: Chess Frontend (FSD Compliance & ATAM)

**Статус:** 🛑 CRITICAL ISSUES FOUND
**Дата:** 22 февраля 2026 г.
**Аудитор:** Senior Solution Architect (Gemini CLI)

---

## ЧАСТЬ 1: FITNESS FUNCTIONS (Нарушения FSD)

| УРОВЕНЬ РИСКА | Место | Описание проблемы | Нарушенное правило |
| :--- | :--- | :--- | :--- |
| **[CRITICAL]** | `src/entities/game/model/game.store.ts` | Стор содержит тип `GameMode` с перечислением конкретных фич (`tornado`, `finish-him`, `opening-trainer`). Сущность "знает" о сценариях использования. | **Entity Purity** (Leak of Feature logic) |
| **[CRITICAL]** | `src/entities/game/model/game.store.ts` | Внутри методов `handleUserMove` и `_triggerBotMove` захардкожена логика для режимов `tornado` и `opening-trainer`. | **Slice Isolation** (Entity knows about Features) |
| **[CRITICAL]** | `src/entities/game/lib/GameplayService.ts` | Содержит хардкод конфигурации движков (`engineConfigs`) и логику выбора между локальным/серверным движком. | **Entity Purity / Leaky Abstractions** |
| **[HIGH]** | `src/entities/analysis/api/AnalysisService.ts` | Напрямую импортирует и оркеструет `multiThreadEngineManager` и `singleThreadEngineManager`. | **Downstream Rule** (Entity coupled to implementation) |
| **[HIGH]** | `src/entities/game` vs `src/entities/analysis` | Дублирование логики взаимодействия с движком. Два разных сервиса управляют одними и теми же менеджерами из `shared`. | **Architectural Cohesion** (Fragmentation) |
| **[MEDIUM]** | `src/entities/game/ui/WebChessBoard.vue` | Устаревшие комментарии в коде указывают на путь `src/components`, что вводит в заблуждение при аудите. | **Maintainability** |

---

## ЧАСТЬ 2: ATAM СЦЕНАРИИ (Анализ компромиссов)

### Сценарий А: "Замена движка" (Stockfish -> Remote API)
*   **Оценка:** ⚠️ HIGH EFFORT
*   **Анализ:** Несмотря на наличие `shared/lib/engine`, логика настройки специфичных параметров (Threads, MultiPV, Contempt) размазана по `GameplayService` (в `entities/game`) и `AnalysisService` (в `entities/analysis`). Замена движка потребует хирургического вмешательства в два разных слоя сущностей.
*   **Вердикт:** Провал. Сущности слишком сильно связаны с протоколом общения с движком.

### Сценарий Б: "Удаление DiamondHunter"
*   **Оценка:** ✅ LOW EFFORT
*   **Анализ:** Фича `diamond-hunter` хорошо изолирована. Она не импортируется в `shared` или `entities`. Удаление папки и ссылки в `pages/DiamondHunterView.vue` не сломает сборку проекта.
*   **Вердикт:** Успех. Слайс изолирован.

### Сценарий В: "Circular Dependency" (game <-> analysis)
*   **Оценка:** ⚠️ POTENTIAL RISK
*   **Анализ:** Прямой циклической зависимости импортов (`.ts` -> `.ts`) не обнаружено. Однако, обнаружена "логическая петля": `analysis.store` следит за `gameStore.gamePhase`, а `gameStore` управляет состоянием, которое инициирует работу `analysis`. Это создает неявную связь через состояние (state-driven coupling).
*   **Вердикт:** Удовлетворительно, но требует внимания при усложнении логики.

---

## ИТОГОВОЕ ЗАКЛЮЧЕНИЕ
Проект успешно прошел миграцию на FSD в плане структуры папок, но **бизнес-логика осталась монолитной**. 
Слой `entities/game` является "Божественным Объектом" (God Object), который пытается быть одновременно и доской, и менеджером турниров, и оркестратором движков.

### Рекомендация:
Немедленный рефакторинг `entities/game` с выносом логики сценариев в соответствующие фичи. Сущность `game` должна предоставлять только API для управления позицией и получения ходов, не зная о том, "Торнадо" это или "Учебный режим".

---
*Конец отчета.*
