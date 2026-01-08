import pandas as pd
from datasets import load_dataset, Dataset, DatasetDict
import chess
import json
import sys
import os
from typing import Dict, Any, List, cast, Tuple

# --- Конфигурация ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(BASE_DIR, "openings_optimized.json")

def get_clean_fen(board: chess.Board) -> str:
    """
    Возвращает FEN без счетчиков ходов (Clean FEN / EPD).
    Пример: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -"
    """
    return " ".join(board.fen().split(' ')[:4])

def build_optimized_db():
    try:
        # --- 1. Загрузка данных ---
        print("Загрузка датасета Lichess/chess-openings...")
        # Указываем split='train', так как в этом датасете только train
        dataset = load_dataset("Lichess/chess-openings", split="train")
        df = dataset.to_pandas()
        
        print(f"Загружено {len(df)} дебютных линий.")

        # --- 2. Подготовка структур данных ---
        # Словари для быстрого поиска названий по последовательности ходов
        # uci_sequence -> {n: Name, c: ECO}
        uci_info_map = {}
        for _, row in df.iterrows():
            uci_str = row['uci']
            uci_info_map[uci_str] = {
                'n': row['name'],
                'c': row['eco']
            }

        # Глобальные списки для оптимизации (дедупликации строк)
        names_list: List[str] = []
        names_map: Dict[str, int] = {} # Name -> Index
        
        ecos_list: List[str] = []
        ecos_map: Dict[str, int] = {} # ECO -> Index

        # Основной граф: CleanFEN -> { MoveUCI: [nameIdx, ecoIdx, nextFen] }
        graph: Dict[str, Dict[str, List[Any]]] = {}

        # --- 3. Вспомогательные функции ---
        def get_name_index(name: str) -> int:
            if not name: return -1
            if name not in names_map:
                idx = len(names_list)
                names_list.append(name)
                names_map[name] = idx
            return names_map[name]

        def get_eco_index(eco: str) -> int:
            if not eco: return -1
            if eco not in ecos_map:
                idx = len(ecos_list)
                ecos_list.append(eco)
                ecos_map[eco] = idx
            return ecos_map[eco]

        # --- 4. Построение графа ---
        print("Построение графа и оптимизация на лету...")
        
        board = chess.Board()
        start_fen = get_clean_fen(board)
        processed_count = 0
        
        for _, row in df.iterrows():
            uci_moves = row['uci'].split()
            if not uci_moves:
                continue
                
            board.reset()
            current_fen = start_fen
            current_path_moves = []
            
            for move_uci in uci_moves:
                current_path_moves.append(move_uci)
                path_str = " ".join(current_path_moves)
                
                # Получаем информацию о текущей позиции (если она именована)
                info = uci_info_map.get(path_str)
                name_idx = get_name_index(info['n']) if info else -1
                eco_idx = get_eco_index(info['c']) if info else -1

                # Делаем ход
                try:
                    move = chess.Move.from_uci(move_uci)
                    board.push(move)
                except ValueError:
                    print(f"Skip invalid move {move_uci} in {path_str}")
                    break
                
                next_fen = get_clean_fen(board)
                
                # Добавляем узел в граф
                if current_fen not in graph:
                    graph[current_fen] = {}
                
                # Логика обновления узла
                # Если ход уже есть, мы можем обновить Name/ECO, если нашли более точное совпадение
                if move_uci not in graph[current_fen]:
                    graph[current_fen][move_uci] = [name_idx, eco_idx, next_fen]
                else:
                    # Если запись уже есть, проверим, не нашли ли мы имя/ECO для этой ветки сейчас
                    existing_data = graph[current_fen][move_uci]
                    # [0] - name_idx, [1] - eco_idx
                    if existing_data[0] == -1 and name_idx != -1:
                        existing_data[0] = name_idx
                    if existing_data[1] == -1 and eco_idx != -1:
                        existing_data[1] = eco_idx

                current_fen = next_fen
            
            processed_count += 1
            if processed_count % 500 == 0:
                print(f"Обработано {processed_count}...", end='\r')

        print(f"\nБазовый граф построен. Узлов: {len(graph)}")

        # --- 4.1. Поиск транспозиций (Cross-linking) ---
        print("Поиск транспозиций (сшивание графа)...")
        transposition_count = 0
        
        # Берем список ключей, так как будем менять граф (хотя добавляем только в значения, но лучше перестраховаться)
        all_fens = list(graph.keys())
        
        # Нам нужен board для генерации ходов
        board = chess.Board()
        
        for fen in all_fens:
            # Восстанавливаем позицию на доске
            # FEN в базе Clean (без счетчиков), для генерации ходов нужно добавить дефолтные счетчики, 
            # но для chess.Board достаточно и сокращенного FEN, он сам достроит.
            # Однако Clean FEN: "rnbqk... -" (4 части). chess.Board примет его.
            board.set_fen(fen)
            
            # Генерируем все легальные ходы
            for move in board.legal_moves:
                move_uci = move.uci()
                
                # Если этот ход уже есть в графе, пропускаем
                if move_uci in graph[fen]:
                    continue
                
                # Делаем ход, смотрим куда попадаем
                board.push(move)
                next_clean_fen = get_clean_fen(board)
                board.pop()
                
                # Если целевая позиция УЖЕ ЕСТЬ в графе, значит мы нашли транспозицию!
                if next_clean_fen in graph:
                    # Добавляем ребро. 
                    # Имя и ECO ставим пустыми (-1), так как это "мостик" в другой дебют.
                    # Интерфейс сам покажет продолжения из следующего узла.
                    graph[fen][move_uci] = [-1, -1, next_clean_fen]
                    transposition_count += 1

        print(f"Найдено новых транспозиций: {transposition_count}")

        print(f"Уникальных позиций (Clean FEN): {len(graph)}")
        print(f"Уникальных имен: {len(names_list)}")
        print(f"Уникальных ECO: {len(ecos_list)}")

        # --- 5. Сохранение ---
        final_db = {
            "names": names_list,
            "ecos": ecos_list,
            "graph": graph
        }
        
        print(f"Сохранение в {OUTPUT_FILE}...")
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(final_db, f, ensure_ascii=False, separators=(',', ':'))
            
        print("Успешно завершено.")

    except Exception as e:
        print(f"Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    build_optimized_db()
