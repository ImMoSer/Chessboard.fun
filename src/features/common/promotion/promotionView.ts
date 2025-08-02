// src/features/promotion/promotionView.ts

import { h } from 'snabbdom';
import type { VNode } from 'snabbdom'; // VNode теперь импортируется как тип
import type { PromotionCtrl } from './promotionCtrl';
// Key и ChessgroundRole удалены, так как не используются
import type { Color as ChessgroundColor } from 'chessground/types';
import type { Role as ChessopsRole } from 'chessops/types';
import { key2pos } from 'chessground/util'; // Утилита для конвертации Key в позицию [file, rank]

// Определяем, какие фигуры доступны для промоушена
const PROMOTION_ROLES: ChessopsRole[] = ['queen', 'rook', 'bishop', 'knight'];

/**
 * Рендерит диалог выбора фигуры для промоушена.
 * @param ctrl - Экземпляр PromotionCtrl.
 * @param boardOrientation - Текущая ориентация доски ('white' | 'black').
 * @param boardDomBounds - Размеры DOM-элемента доски (для корректного позиционирования оверлея).
 * Ожидается объект с { width: number, height: number }.
 * Можно получить из chessground.state.dom.bounds().
 * @returns VNode диалога или null, если промоушен не активен.
 */
export function renderPromotionDialog(
  ctrl: PromotionCtrl,
  boardOrientation: ChessgroundColor,
  boardDomBounds: { width: number; height: number } | undefined
): VNode | null {
  if (!ctrl.promoting || !boardDomBounds) {
    return null; // Не рендерим ничего, если промоушен не активен или нет размеров доски
  }

  const { dest, color: promotingPieceColor } = ctrl.promoting;
  // rankIndex удален из деструктуризации, так как не используется
  const [fileIndex] = key2pos(dest); // fileIndex: 0 (a) to 7 (h)

  // Позиционирование колонки выбора по горизонтали (слева)
  // fileIndex 0 -> a-file (0%), fileIndex 7 -> h-file (87.5%)
  let columnLeftPercentage: number;
  if (boardOrientation === 'white') {
    columnLeftPercentage = fileIndex * 12.5;
  } else {
    // Для черной ориентации, h-файл (индекс 7) становится слева (0%), a-файл (индекс 0) справа (87.5%)
    columnLeftPercentage = (7 - fileIndex) * 12.5;
  }

  const promotionSquaresVNodes: VNode[] = PROMOTION_ROLES.map((role, index) => {
    let squareTopPercentage: string;
    const squareLeftPercentage = `${columnLeftPercentage}%`;

    // Располагаем фигуры в столбец на клетке превращения
    // Порядок зависит от цвета пешки и ориентации доски, чтобы диалог не выходил за пределы доски.
    if (boardOrientation === 'white') {
        if (promotingPieceColor === 'white') { // Белая пешка, 8-я горизонталь сверху
            squareTopPercentage = `${index * 12.5}%`; // queen, rook, bishop, knight сверху вниз
        } else { // Черная пешка, 1-я горизонталь снизу
            squareTopPercentage = `${(7 - index) * 12.5}%`; // queen, rook, bishop, knight снизу вверх
        }
    } else { // boardOrientation === 'black'
        if (promotingPieceColor === 'white') { // Белая пешка, 8-я горизонталь снизу (для черной ориентации)
            squareTopPercentage = `${(7 - index) * 12.5}%`;
        } else { // Черная пешка, 1-я горизонталь сверху (для черной ориентации)
            squareTopPercentage = `${index * 12.5}%`;
        }
    }

    return h('div.promotion-square', {
      key: role, // Уникальный ключ для VNode
      style: {
        top: squareTopPercentage,
        left: squareLeftPercentage,
        // width и height уже заданы в CSS как 12.5%
      },
      on: {
        // При клике на квадрат выбора, завершаем промоушен с выбранной ролью
        // e.stopPropagation() предотвращает закрытие диалога по клику на оверлей, если квадрат внутри оверлея
        click: (e: MouseEvent) => {
          e.stopPropagation();
          ctrl.finish(role);
        },
      },
    }, [
      // Внутри квадрата отображаем фигуру соответствующего цвета и роли
      // Классы для фигур должны соответствовать тем, что используются в chessground.cburnett.css
      h(`piece.${role}.${promotingPieceColor}`, {
        // Атрибуты или свойства для piece, если нужны
      }),
    ]);
  });

  // Оверлей, который покрывает всю доску
  // Клик по оверлею (вне квадратов выбора) отменит промоушен
  return h('div#promotion-choice-overlay', {
    style: {
      width: `${boardDomBounds.width}px`,
      height: `${boardDomBounds.height}px`,
    },
    on: {
      click: () => ctrl.cancel(),
      // Предотвращаем открытие контекстного меню на оверлее
      contextmenu: (e: MouseEvent) => {
        e.preventDefault();
        return false;
      },
    },
  }, promotionSquaresVNodes); // Вкладываем квадраты выбора в оверлей
}
