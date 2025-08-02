// src/features/promotion/promotionCtrl.ts

import type { Key, Color as ChessgroundColor } from 'chessground/types';
import type { Role } from 'chessops/types'; // Используем Role из chessops

// Определяем интерфейс для состояния промоушена
export interface PromotingState {
  orig: Key; // Исходная клетка пешки
  dest: Key; // Клетка превращения
  color: ChessgroundColor; // Цвет пешки, которая превращается
  onComplete: (role: Role) => void; // Колбэк, вызываемый после выбора фигуры
}

export class PromotionCtrl {
  public promoting: PromotingState | null = null;

  constructor(private redraw: () => void) {}

  public start(
    orig: Key,
    dest: Key,
    pieceColor: ChessgroundColor,
    onCompleteCallback: (role: Role) => void
  ): void {
    this.promoting = {
      orig,
      dest,
      color: pieceColor,
      onComplete: onCompleteCallback,
    };
    this.redraw(); // Запрашиваем перерисовку, чтобы отобразить диалог
  }

  /**
   * Завершает процесс выбора фигуры.
   * Вызывается, когда пользователь кликает на одну из фигур в диалоге.
   * @param role - Роль фигуры, в которую превращается пешка (например, 'queen', 'rook').
   */
  public finish(role: Role): void {
    if (this.promoting) {
      const callback = this.promoting.onComplete;
      // Сначала сбрасываем состояние promoting, чтобы при следующем redraw диалог был скрыт.
      this.promoting = null;
      // Затем вызываем колбэк. Колбэк (processUserMove) сам обновит состояние игры
      // и вызовет redraw, который отобразит доску в новом состоянии и без диалога.
      callback(role);
      // Больше не вызываем this.redraw() здесь.
    }
  }

  /**
   * Отменяет процесс выбора фигуры.
   * Может быть вызван, например, кликом вне диалога.
   */
  public cancel(): void {
    if (this.promoting) {
      this.promoting = null; // Сбрасываем состояние
      this.redraw(); // Запрашиваем перерисовку, чтобы скрыть диалог немедленно
    }
  }

  public isActive(): boolean {
    return this.promoting !== null;
  }
}
