// src/core/puzzle-storage.service.ts
import logger from '../utils/logger';

// <<< НАЧАЛО ИЗМЕНЕНИЙ: Новый интерфейс для хранения данных
export interface FavoritePuzzleInfo {
  id: string;
  fen_final: string;
  bot_color: 'w' | 'b';
}
// <<< КОНЕЦ ИЗМЕНЕНИЙ

enum StorageCollectionType {
  Solved = 'solved_puzzles',
  Favorites = 'favorite_puzzles',
}

class PuzzleStorageServiceController {
  private _getKey(userId: string, type: StorageCollectionType): string {
    return `${type}_${userId}`;
  }

  // <<< ИЗМЕНЕНО: Тип возвращаемого значения для _readCollection
  private _readCollection(userId: string, type: StorageCollectionType.Solved): string[];
  private _readCollection(userId: string, type: StorageCollectionType.Favorites): FavoritePuzzleInfo[];
  private _readCollection(userId: string, type: StorageCollectionType): (string[] | FavoritePuzzleInfo[]) {
    try {
      const key = this._getKey(userId, type);
      const data = localStorage.getItem(key);
      if (data) {
        const parsedData = JSON.parse(data);
        if (Array.isArray(parsedData)) {
          // Простая проверка для обратной совместимости
          if (type === StorageCollectionType.Favorites && parsedData.length > 0 && typeof parsedData[0] === 'string') {
            logger.warn('[PuzzleStorageService] Found old string-based favorites format. Data will be lost on next favorite toggle.');
            return [];
          }
          return parsedData;
        }
      }
    } catch (error) {
      logger.error(`[PuzzleStorageService] Failed to read or parse collection '${type}' for user ${userId}:`, error);
    }
    return [];
  }

  // <<< ИЗМЕНЕНО: Тип параметра collection
  private _writeCollection(userId: string, type: StorageCollectionType, collection: string[] | FavoritePuzzleInfo[]): void {
    try {
      const key = this._getKey(userId, type);
      localStorage.setItem(key, JSON.stringify(collection));
    } catch (error) {
      logger.error(`[PuzzleStorageService] Failed to write collection '${type}' for user ${userId}:`, error);
    }
  }

  public isPuzzleSolved(userId: string, puzzleId: string): boolean {
    const solvedCollection = this._readCollection(userId, StorageCollectionType.Solved);
    return solvedCollection.includes(puzzleId);
  }

  public markPuzzleAsSolved(userId: string, puzzleId: string): void {
    const solvedCollection = this._readCollection(userId, StorageCollectionType.Solved);
    if (!solvedCollection.includes(puzzleId)) {
      solvedCollection.push(puzzleId);
      this._writeCollection(userId, StorageCollectionType.Solved, solvedCollection);
      logger.info(`[PuzzleStorageService] Puzzle ${puzzleId} marked as solved for user ${userId}.`);
    }
  }

  public isPuzzleFavorite(userId: string, puzzleId: string): boolean {
    const favoritesCollection = this._readCollection(userId, StorageCollectionType.Favorites);
    return favoritesCollection.some(p => p.id === puzzleId);
  }

  // <<< ИЗМЕНЕНО: Метод toggleFavorite теперь принимает объект
  public toggleFavorite(userId: string, puzzleInfo: FavoritePuzzleInfo): boolean {
    const favoritesCollection = this._readCollection(userId, StorageCollectionType.Favorites);
    const index = favoritesCollection.findIndex(p => p.id === puzzleInfo.id);

    if (index > -1) {
      favoritesCollection.splice(index, 1);
      this._writeCollection(userId, StorageCollectionType.Favorites, favoritesCollection);
      logger.info(`[PuzzleStorageService] Puzzle ${puzzleInfo.id} removed from favorites for user ${userId}.`);
      return false;
    } else {
      // Убедимся, что fen_final и bot_color существуют
      if (puzzleInfo.fen_final && puzzleInfo.bot_color) {
        favoritesCollection.push(puzzleInfo);
        this._writeCollection(userId, StorageCollectionType.Favorites, favoritesCollection);
        logger.info(`[PuzzleStorageService] Puzzle ${puzzleInfo.id} added to favorites for user ${userId}.`);
        return true;
      } else {
        logger.error(`[PuzzleStorageService] Cannot add puzzle ${puzzleInfo.id} to favorites: missing fen_final or bot_color.`);
        return false;
      }
    }
  }

  // <<< ИЗМЕНЕНО: Тип возвращаемого значения
  public getFavoritePuzzles(userId: string): FavoritePuzzleInfo[] {
    return this._readCollection(userId, StorageCollectionType.Favorites);
  }
}

export const PuzzleStorageService = new PuzzleStorageServiceController();
