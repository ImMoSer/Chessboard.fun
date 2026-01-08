import pandas as pd
from datasets import load_dataset
import chess
import chess.pgn
import json
import os
import io
import sys
from typing import Dict, List, Any, Set, Tuple

# --- Конфигурация ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(BASE_DIR, "opening_chapters.json")

# Ограничения
MAX_VARIANTS_PER_NODE = 6   
MAX_DEPTH_PLY = 24          
TARGET_NESTING_LEVEL = 4    

def get_base_name(full_name: str) -> str:
    name = full_name.split(':')[0].strip()
    for suffix in [" Accepted", " Declined", " Refused"]:
        if name.endswith(suffix):
            name = name[:-len(suffix)]
            break
    return name.strip()

class TrieNode:
    def __init__(self):
        self.children: Dict[str, TrieNode] = {}
        self.count: int = 0
        self.names: Set[str] = set() 

def build_chapters_db():
    print("Загрузка датасета Lichess/chess-openings...")
    try:
        dataset = load_dataset("Lichess/chess-openings", split="train")
        df = dataset.to_pandas()
    except Exception as e:
        print(f"Ошибка загрузки: {e}")
        return

    print(f"Загружено {len(df)} строк.")

    families: Dict[str, List[Any]] = {} 
    family_ecos: Dict[str, str] = {}    

    print("Группировка по семействам...")
    for _, row in df.iterrows():
        base_name = get_base_name(row['name'])
        if base_name not in families:
            families[base_name] = []
            family_ecos[base_name] = row['eco'] 
        families[base_name].append(row)

    print(f"Найдено {len(families)} уникальных семейств.")

    chapters = []
    sorted_families = sorted(families.items(), key=lambda x: len(x[1]), reverse=True)
    
    processed_count = 0
    errors_count = 0

    for base_name, rows in sorted_families:
        if len(rows) < 3: 
            continue
            
        # 1. Строим Trie
        root_trie = TrieNode()
        for row in rows:
            uci_moves = row['uci'].split()
            full_name = row['name']
            
            node = root_trie
            node.count += 1
            
            for move in uci_moves:
                if move not in node.children:
                    node.children[move] = TrieNode()
                node = node.children[move]
                node.count += 1
            
            if full_name != base_name:
                short_name = full_name
                if full_name.startswith(base_name + ": "):
                    short_name = full_name[len(base_name) + 2:]
                elif full_name.startswith(base_name + " "):
                    short_name = full_name[len(base_name) + 1:]
                node.names.add(short_name)

        # 2. Строим PGN используя chess.pgn.GameNode
        game = chess.pgn.Game()
        game.headers["Event"] = base_name
        game.headers["ECO"] = family_ecos[base_name]

        # Рекурсивная функция заполнения дерева PGN
        # parent_pgn_node: узел, К КОТОРОМУ мы добавляем варианты
        # trie_node: узел Trie, из которого берем детей
        def build_pgn_tree(parent_pgn_node: chess.pgn.GameNode, trie_node: TrieNode, board: chess.Board, depth_ply: int, nesting_level: int):
            if not trie_node.children:
                return

            # Сортировка кандидатов
            candidates = sorted(trie_node.children.items(), key=lambda x: x[1].count, reverse=True)
            selected = candidates[:MAX_VARIANTS_PER_NODE]

            for i, (move_uci, child_trie_node) in enumerate(selected):
                # Если это не Mainline и мы достигли предела вложенности, пропускаем
                is_mainline_continuation = (i == 0)
                new_nesting = nesting_level if is_mainline_continuation else nesting_level + 1
                
                if new_nesting > TARGET_NESTING_LEVEL:
                    continue
                if depth_ply >= MAX_DEPTH_PLY:
                    continue

                try:
                    move = chess.Move.from_uci(move_uci)
                    
                    # Проверка легальности (на всякий случай, Trie должен быть корректным, но вдруг)
                    if not board.is_legal(move):
                        print(f"WARN: Illegal move {move_uci} in {base_name} at depth {depth_ply}")
                        continue

                    # Добавляем ход в PGN
                    # add_variation автоматически делает первый ход Mainline, остальные вариациями
                    new_pgn_node = parent_pgn_node.add_variation(move)

                    # Комментарий
                    if child_trie_node.names:
                        name_label = sorted(list(child_trie_node.names), key=len)[0]
                        new_pgn_node.comment = name_label

                    # Рекурсия
                    board.push(move)
                    build_pgn_tree(new_pgn_node, child_trie_node, board, depth_ply + 1, new_nesting)
                    board.pop()

                except ValueError:
                    print(f"WARN: Invalid UCI {move_uci}")
                    continue

        # Запускаем построение
        start_board = chess.Board()
        build_pgn_tree(game, root_trie, start_board, 0, 0)

        # Экспорт в строку
        exporter = chess.pgn.StringExporter(headers=False, variations=True, comments=True)
        pgn_str = game.accept(exporter)
        
        # 3. Валидация
        try:
            # Пытаемся прочитать то, что сгенерировали
            read_game = chess.pgn.read_game(io.StringIO(pgn_str))
            
            # Проверяем, что нет ошибок парсинга (хотя read_game ленивый)
            # Пройдемся по main line для проверки
            if read_game.errors:
                 print(f"ERROR: Generated PGN for {base_name} has errors: {read_game.errors}")
                 errors_count += 1
                 continue
                 
            # Все ок
            chapters.append({
                "name": base_name,
                "eco": family_ecos[base_name],
                "pgn": pgn_str.strip()
            })
            
        except Exception as e:
            print(f"ERROR: Validation failed for {base_name}: {e}")
            errors_count += 1
            continue
        
        processed_count += 1
        if processed_count % 50 == 0:
            print(f"Обработано {processed_count} семейств...", end='\r')

    print(f"\nСохранение {len(chapters)} глав...")
    if errors_count > 0:
        print(f"ВНИМАНИЕ: {errors_count} глав не прошли валидацию и были пропущены.")

    chapters.sort(key=lambda x: x['name'])
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(chapters, f, ensure_ascii=False, indent=2)
        
    print("Успешно.")

if __name__ == '__main__':
    build_chapters_db()
