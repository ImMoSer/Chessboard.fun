# Документация: Optimized Openings Graph (Production Version)

## 1. Обзор

Файл `openings_optimized.json` — это версия для продакшена. Она оптимизирована для минимального потребления трафика и оперативной памяти браузера.

**Метод сжатия:** Дедупликация строк (Названия и ECO коды вынесены в отдельные массивы и заменены на числовые индексы).
**Экономия:** Уменьшение размера файла в 5-10 раз по сравнению с полной версией.

## 2. Спецификация формата данных

```json
{
  "names": ["Alekhine Defense", "Sicilian Defense", ...],
  "ecos": ["B02", "B20", ...],
  "graph": {
    "rnbqk...": {
      "g8f6": [0, 0, "rnbq...next..."],
      "c7c5": [1, 1, "rnbq...next..."]
    }
  }
}
```

### Структура

1.  **names** (`string[]`): Глобальная таблица имен.
2.  **ecos** (`string[]`): Глобальная таблица кодов ECO.
3.  **graph**: Основной объект поиска.
    - Ключ: `Clean FEN`.
    - Значение: Объект, где ключ — ход (UCI), а значение — массив (Tuple).

### Формат данных хода (Tuple)

Массив вида `[nameIdx, ecoIdx, nextFen]`:

- `0`: **Name Index** (number). Индекс в массиве `names`. Если `-1`, имя отсутствует.
- `1`: **ECO Index** (number). Индекс в массиве `ecos`. Если `-1`, код отсутствует.
- `2`: **Next FEN** (string). `Clean FEN` следующей позиции.

## 3. Готовое решение для Frontend (TypeScript)

Скопируйте этот код для создания сервиса работы с дебютной книгой. Он инкапсулирует логику распаковки индексов.

```typescript
// types/opening.ts

export interface OpeningMove {
  uci: string // Ход в нотации UCI (e2e4)
  name: string | null
  eco: string | null
  nextFen: string // FEN позиции после хода
}

// Внутренние типы JSON файла
type CompressedMove = [number, number, string] // [nameIdx, ecoIdx, nextFen]

interface OptimizedGraphJson {
  names: string[]
  ecos: string[]
  graph: Record<string, Record<string, CompressedMove>>
}

// services/OpeningService.ts

export class OpeningService {
  private data: OptimizedGraphJson | null = null
  private isLoaded = false

  constructor(private readonly jsonUrl: string = '/openings_optimized.json') {}

  /**
   * Асинхронная загрузка базы данных.
   */
  async load(): Promise<void> {
    if (this.isLoaded) return

    try {
      const response = await fetch(this.jsonUrl)
      if (!response.ok) {
        throw new Error(`Failed to load openings: ${response.statusText}`)
      }
      this.data = await response.json()
      this.isLoaded = true
    } catch (error) {
      console.error('OpeningService init error:', error)
      // Можно добавить логику ретрая или фолбэка
    }
  }

  /**
   * Возвращает список доступных дебютных ходов для позиции.
   * @param currentFen Любой валидный FEN (можно с счетчиками ходов)
   */
  getMoves(currentFen: string): OpeningMove[] {
    if (!this.data || !this.data.graph) return []

    // Приводим FEN к ключу базы (удаляем счетчики)
    const cleanFen = this.normalizeFen(currentFen)
    const node = this.data.graph[cleanFen]

    if (!node) return []

    // Преобразуем сжатые данные (индексы) в полные объекты
    return Object.entries(node).map(([uci, [nameIdx, ecoIdx, nextFen]]) => ({
      uci,
      name: nameIdx !== -1 ? this.data!.names[nameIdx] : null,
      eco: ecoIdx !== -1 ? this.data!.ecos[ecoIdx] : null,
      nextFen,
    }))
  }

  /**
   * Проверяет, является ли позиция известной теорией.
   */
  isTheory(fen: string): boolean {
    if (!this.data) return false
    return this.data.graph.hasOwnProperty(this.normalizeFen(fen))
  }

  /**
   * Утилита для очистки FEN (оставляет только позицию, цвет, рокировки и битое поле).
   */
  private normalizeFen(fen: string): string {
    return fen.split(' ').slice(0, 4).join(' ')
  }
}
```

### Пример использования в React компоненте

```tsx
import { useEffect, useState } from 'react'
import { Chess } from 'chess.js'
import { OpeningService } from './services/OpeningService'

const openingService = new OpeningService()

export const ChessBoardWithHints = () => {
  const [game, setGame] = useState(new Chess())
  const [hints, setHints] = useState([])

  useEffect(() => {
    // Инициализация сервиса
    openingService.load().then(() => {
      updateHints()
    })
  }, [])

  const updateHints = () => {
    const moves = openingService.getMoves(game.fen())
    setHints(moves)
  }

  const onDrop = (source, target) => {
    // ... логика хода ...
    updateHints() // Обновляем подсказки после хода
  }

  return (
    <div>
      {/* Рендер доски */}
      <div className="hints">
        <h3>Дебютные ходы:</h3>
        <ul>
          {hints.map((move) => (
            <li key={move.uci}>
              <b>{move.uci}</b>
              {move.name && ` - ${move.name}`}
              {move.eco && ` (${move.eco})`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

# логи после последнего прогона скрипта:

Загрузка датасета Lichess/chess-openings...
Загружено 3616 дебютных линий.
Построение графа и оптимизация на лету...
Обработано 3500...
Базовый граф построен. Узлов: 5175
Поиск транспозиций (сшивание графа)...
Найдено новых транспозиций: 492
Уникальных позиций (Clean FEN): 5175
Уникальных имен: 3136
Уникальных ECO: 496
Сохранение в c:\PROJEKTS\analysis_vue\public\oppening\openings_optimized.json...
Успешно завершено.
===========================================
