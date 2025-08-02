# src/tests/test_webhook.py
import requests
import json
import os
import time
from dotenv import load_dotenv
import sys 
import threading # Добавлено для параллельного выполнения

# Загружаем переменные окружения из файла .env
load_dotenv()

# --- Конфигурация тестирования ---
N_CONSECUTIVE_REQUESTS = 100  # Количество последовательных запросов к каждому вебхуку
DELAY_BETWEEN_REQUESTS_MS = 25  # Задержка между запросами в миллисекундах (внутри одной серии)
DELAY_BETWEEN_SERIES_START_MS = 10 # Задержка между стартом параллельных серий
SHOW_PROGRESS = True # Показывать простой индикатор прогресса (точки для параллельного режима)

# --- URL для n8n вебхуков ---
N8N_PUZZLE_FEN_WEBHOOK_URL = os.environ.get("VITE_WEBHOOK_PUZZLE_FEN")
N8N_USER_SESSION_WEBHOOK_URL = os.environ.get("VITE_WEBHOOK_USER_SESSION")
N8N_FINISH_HIM_STATS_WEBHOOK_URL = os.environ.get("VITE_WEBHOOK_FINISH_HIM_STATS")

# --- Общие заголовки для n8n ---
n8n_headers = {
    "Content-Type": "application/json",
    "Accept": "application/json"
}
# ------------------------

# Глобальная блокировка для синхронизации вывода в консоль из разных потоков
print_lock = threading.Lock()

# --- Функция для отправки одного запроса и возврата времени выполнения ---
def make_single_n8n_request(url, payload, attempt_num, total_attempts, webhook_name_short, verbose=False):
    start_time = time.perf_counter()
    response_ok = False
    status_code = None
    error_message = None

    try:
        response = requests.post(url, headers=n8n_headers, json=payload, timeout=30)
        status_code = response.status_code
        if response.ok:
            response_ok = True
        else:
            error_message = f"HTTP {status_code}"
        # Подробный вывод в verbose режиме остается для отладки, но не используется по умолчанию
        if verbose: 
            with print_lock: # Защищаем вывод даже в verbose режиме
                print(f"      Запрос {attempt_num}/{total_attempts} к {webhook_name_short}: Статус {status_code}")

    except requests.exceptions.Timeout:
        error_message = "Timeout"
        if verbose: 
            with print_lock:
                print(f"      Запрос {attempt_num}/{total_attempts} к {webhook_name_short}: Ошибка Timeout")
    except requests.exceptions.RequestException as e:
        error_message = f"RequestException: {e}"
        if verbose: 
            with print_lock:
                print(f"      Запрос {attempt_num}/{total_attempts} к {webhook_name_short}: Ошибка {e}")
    except Exception as e:
        error_message = f"Unexpected error: {e}"
        if verbose: 
            with print_lock:
                print(f"      Запрос {attempt_num}/{total_attempts} к {webhook_name_short}: Непредвиденная ошибка {e}")
    
    end_time = time.perf_counter()
    time_taken_ms = (end_time - start_time) * 1000
    return time_taken_ms, response_ok, status_code, error_message
# ---------------------------------------------------------

# --- Функция для тестирования одного вебхука N раз ---
def test_webhook_series(webhook_name_full, webhook_name_short, url, payload, num_requests, delay_ms, thread_id_str):
    # Начальный заголовок и проверка URL (под блокировкой)
    with print_lock:
        print(f"\n--- [{thread_id_str}] Тестирование вебхука: {webhook_name_full} ({num_requests} запросов) ---")
        if not url:
            print(f"!!! ВНИМАНИЕ: URL для вебхука '{webhook_name_full}' [{thread_id_str}] не определен в .env файле. Тестирование пропускается. !!!")
            print(f"Пожалуйста, определите соответствующую переменную окружения.")
            print("-" * 70)
            return

    request_times_ms = []
    successful_requests = 0
    failed_requests_summary = {} 

    # Основной цикл запросов
    for i in range(num_requests):
        time_taken, success, status_code, error_msg = make_single_n8n_request(
            url, payload, i + 1, num_requests, webhook_name_short, verbose=False 
        )
        
        if success:
            if time_taken is not None:
                request_times_ms.append(time_taken)
            successful_requests += 1
        else:
            error_key = error_msg if error_msg else "Unknown Error"
            if status_code:
                 error_key = f"HTTP {status_code}" if not error_msg or "HTTP" not in error_msg else error_msg
            failed_requests_summary[error_key] = failed_requests_summary.get(error_key, 0) + 1
            
        if SHOW_PROGRESS:
            with print_lock: # Блокировка для вывода точки прогресса
                sys.stdout.write(".")
                sys.stdout.flush()

        if i < num_requests - 1: 
            time.sleep(delay_ms / 1000.0)

    # Вывод итоговой информации (под блокировкой)
    with print_lock:
        if SHOW_PROGRESS and num_requests > 0: # Новая строка после точек прогресса
            print() 

        if successful_requests > 0:
            total_duration_ms = sum(request_times_ms)
            avg_time_ms = total_duration_ms / successful_requests
            min_time_ms = min(request_times_ms)
            max_time_ms = max(request_times_ms)
            print(f"Итог для {webhook_name_short} [{thread_id_str}]: {total_duration_ms / 1000:.3f} сек. (успешно {successful_requests}/{num_requests} запросов). "
                  f"Среднее: {avg_time_ms:.2f}мс, Мин: {min_time_ms:.2f}мс, Макс: {max_time_ms:.2f}мс")
        elif num_requests > 0:
            print(f"Итог для {webhook_name_short} [{thread_id_str}]: Все {num_requests} запросов не удались.")
        
        if failed_requests_summary:
            print(f"  Статистика ошибок для {webhook_name_short} [{thread_id_str}]:")
            for error, count in failed_requests_summary.items():
                print(f"    - {error}: {count} раз(а)")
            
        print("-" * 70)

# ---------------------------------------------------------

# --- Основная часть скрипта ---
print(f"\n--- Начинаем параллельное тестирование n8n вебхуков ({N_CONSECUTIVE_REQUESTS} запросов на каждый с задержкой {DELAY_BETWEEN_REQUESTS_MS}ms внутри серии) ---")
print(f"--- Задержка между стартом серий: {DELAY_BETWEEN_SERIES_START_MS}ms ---")

# Определяем полезные нагрузки (payloads)
user_session_payload = {
    "event": "userSessionUpsert",
    "lichess_id": "py_n8n_user_series_001", 
    "username": "PythonN8nUserSeries",
    "lichessAccessToken": "dummy_n8n_test_token_series_123"
}
finish_him_stats_payload = {
    "event": "finishHimRatingUpdate",
    "lichess_id": "py_n8n_user_series_001",
    "finishHimStats": {
        "gamesPlayed": 20, "tacticalRating": 1800, "tacticalWins": 10, "tacticalLosses": 10,
        "finishHimRating": 1850, "playoutWins": 9, "playoutDraws": 1, "playoutLosses": 3,
        "currentPieceCount": 18
    }
}
puzzle_payload = {
    "event": "FinishHim", "lichess_id": "py_n8n_user_series_001",
    "pieceCount": 18, "rating": 1800, "puzzleType": "endgame"
}

# Список тестов для запуска
webhook_tests_config = [
    {
        "full_name": "Сессия Пользователя (VITE_WEBHOOK_USER_SESSION)",
        "short_name": "UserSession",
        "url": N8N_USER_SESSION_WEBHOOK_URL,
        "payload": user_session_payload,
    },
    {
        "full_name": "Статистика FinishHim (VITE_WEBHOOK_FINISH_HIM_STATS)",
        "short_name": "FinishHimStats",
        "url": N8N_FINISH_HIM_STATS_WEBHOOK_URL,
        "payload": finish_him_stats_payload,
    },
    {
        "full_name": "Запрос Пазла (VITE_WEBHOOK_PUZZLE_FEN)",
        "short_name": "PuzzleFEN",
        "url": N8N_PUZZLE_FEN_WEBHOOK_URL,
        "payload": puzzle_payload,
    }
]

threads = []
for index, test_config in enumerate(webhook_tests_config):
    thread_id = f"Thread-{index+1}-{test_config['short_name']}"
    thread = threading.Thread(
        target=test_webhook_series,
        args=(
            test_config["full_name"],
            test_config["short_name"],
            test_config["url"],
            test_config["payload"],
            N_CONSECUTIVE_REQUESTS,
            DELAY_BETWEEN_REQUESTS_MS,
            thread_id # Передаем идентификатор потока для логирования
        )
    )
    threads.append(thread)
    thread.start()
    
    # Задержка перед запуском следующего потока (кроме последнего)
    if index < len(webhook_tests_config) - 1:
        time.sleep(DELAY_BETWEEN_SERIES_START_MS / 1000.0)

# Ожидаем завершения всех потоков
for thread in threads:
    thread.join()

print(f"\n--- Параллельное тестирование n8n вебхуков завершено ---")

