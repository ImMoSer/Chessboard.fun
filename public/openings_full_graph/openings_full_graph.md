# Документация: Openings Graph (Дебютная Книга)

## Обзор
Файл `openings_full_graph.json` представляет собой оптимизированную граф-базу шахматных дебютов, сгенерированную на основе датасета Lichess.

В отличие от древовидных структур, этот граф использует **Hash Map (Словарь)**, где ключом является позиция (FEN). Это позволяет:
1.  **Мгновенный поиск (O(1)):** Не нужно обходить дерево.
2.  **Поддержка транспозиций:** Если к позиции пришли с перестановкой ходов (например, `1. d4 Nf6 2. c4` вместо `1. c4 Nf6 2. d4`), граф корректно вернет продолжение, так как FEN позиции одинаков.

## Структура файла

Файл представляет собой плоский JSON-объект.

### Ключ (Key)
Ключом является **"Чистый FEN" (EPD)** — первые 4 части стандартного FEN.
*   Формат: `[Позиция] [Очередь] [Рокировки] [Битое поле]`
*   **Важно:** Счетчики полуходов и полных ходов (5-я и 6-я части FEN) удалены, чтобы объединить одинаковые позиции, возникшие на разных ходах.

Пример ключа: `"rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -"`

### Значение (Value)
Значением является объект, содержащий возможные ходы из этой позиции. Ключи этого объекта — ходы в нотации UCI (например, `g8f6`).

Поля объекта хода:
*   `n` (String, optional): Название дебюта (например, "King's Knight Opening").
*   `c` (String, optional): Код ECO (например, "C40").
*   `next` (String): Ключ (Clean FEN) следующей позиции, к которой приведет этот ход.

### Пример JSON
```json
{
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -": {
    "g8f6": {
      "n": "Alekhine Defense",
      "c": "B02",
      "next": "rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -"
    },
    "c7c5": {
      "n": "Sicilian Defense",
      "c": "B20",
      "next": "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -"
    }
  }
}
```

## Инструкция по использованию (Frontend)

### 1. Загрузка
Загрузите файл один раз при старте приложения (или лениво при первом использовании подсказок). Размер файла ~1.2 МБ (в сжатом виде по сети ~150 КБ).

```typescript
let openingBook: Record<string, any> | null = null;

async function loadBook() {
  if (!openingBook) {
    const res = await fetch('/openings_full_graph.json');
    openingBook = await res.json();
  }
}
```

### 2. Поиск ходов
Алгоритм получения подсказки для текущей позиции на доске.

**Важно:** Перед поиском нужно обязательно привести FEN с доски к формату ключа базы (удалить счетчики ходов).

```typescript
import { Chess } from 'chess.js'; // Пример с использованием chess.js

function getOpeningMoves(game: Chess) {
  if (!openingBook) return [];

  // 1. Получаем полный FEN (например: "rnbqk... - 0 1")
  const fullFen = game.fen();

  // 2. Отрезаем лишнее, оставляем первые 4 части
  // "rnbqk... - 0 1" -> ["rnbqk...", "w", "KQkq", "-"]
  const fenParts = fullFen.split(' ');
  const cleanFen = fenParts.slice(0, 4).join(' ');

  // 3. Ищем в базе
  const movesData = openingBook[cleanFen];

  if (!movesData) {
    return []; // Ходов в книге нет
  }

  // 4. Преобразуем в массив для удобства рендеринга
  return Object.entries(movesData).map(([uci, data]) => ({
    uci: uci,           // "e7e5"
    name: data.n,       // "Sicilian Defense" (может быть undefined)
    eco: data.c,        // "B20" (может быть undefined)
    nextFen: data.next  // FEN следующей позиции (для предзагрузки или навигации)
  }));
}
```

## Типизация (TypeScript)

```typescript
interface OpeningMoveData {
  n?: string; // Name
  c?: string; // ECO Code
  next: string; // Target Clean FEN
}

type OpeningBook = Record<string, Record<string, OpeningMoveData>>;
```
