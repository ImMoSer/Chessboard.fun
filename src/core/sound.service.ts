// src/core/sound.service.ts
import logger from '../utils/logger';

const VOICE_VOLUME_STORAGE_KEY = 'user_voice_volume';

/**
 * Определяет, как звук должен воспроизводиться по отношению к другим.
 * - `parallel`: Воспроизводится немедленно, параллельно с другими звуками этого же типа.
 * - `sequential`: Воспроизводится после завершения всех параллельных звуков.
 * - `background`: Воспроизводится немедленно и независимо от других звуков.
 */
type SoundType = 'parallel' | 'sequential' | 'background';

/**
 * Определяет категорию звука для управления громкостью.
 * - `board`: Звуки доски (ходы, взятия). Громкость не регулируется.
 * - `voice`: Голосовые оповещения. Громкость регулируется пользователем.
 */
type SoundCategory = 'board' | 'voice';

/**
 * Определяет полную структуру звукового события.
 */
interface SoundDefinition {
  type: SoundType;
  category: SoundCategory;
  path: string | string[]; // Путь к файлу или массив путей для случайного выбора.
}

/**
 * Определяет все возможные звуковые события в приложении.
 */
export type SoundEvent =
  // === Звуки доски (Параллельные) ===
  | 'move'
  | 'capture'
  | 'promote'
  | 'position_loaded'
  | 'user_checks_bot'
  | 'bot_checks_player'
  | 'bot_checkmates_player'
  | 'tacktics_puzzle_loss'

  // === Звуки таймера (Параллельные) ===
  | 'timer_10_seconds_left'
  | 'timer_7_seconds_left'
  | 'timer_times_up'

  // === Звуки ничьи (Параллельные, Голосовые) ===
  | 'draw_by_stalemate'
  | 'draw_by_repetition'
  | 'draw_by_fifty_moves'
  | 'draw_by_insufficient_material'

  // === Звуки начала фазы (Параллельные, Голосовые) ===
  | 'playout_starts'

  // === Звуки входа в режим (Фоновые, Голосовые) ===
  | 'game_entry'

  // === Звуки результата (Последовательные, Голосовые) ===
  | 'user_won_playout'
  | 'user_lost_playout'

  // === Звуки победы в башне (Фоновые, Голосовые) ===
  | 'tower_series_win';

// --- Звуковые пулы для событий с рандомным выбором ---

const VOICE_POOL_ENTRY: string[] = [
  '/sounds/game_modus_entry/eleven_Let_see_what_you_are_made_of.mp3',
  '/sounds/game_modus_entry/eleven_Show_me_what_you_ve_got.mp3',
  '/sounds/game_modus_entry/zeig_mir_was_du_kannst.mp3',
  '/sounds/game_modus_entry/noch_eine_parte.mp3',
];
const VOICE_POOL_SUCCESS: string[] = [
  '/sounds/user_won/eleven_excellent.mp3',
  '/sounds/user_won/eleven_welldone.mp3',
  '/sounds/user_won/eleven_you_won.mp3',
  '/sounds/user_won/flawless_victory.mp3',
  '/sounds/user_won/good_game.mp3',
  '/sounds/user_won/gut_gemacht.mp3',
  '/sounds/user_won/gut_gespielt.mp3',
  '/sounds/user_won/impressive.mp3',
  '/sounds/user_won/krassavchick.mp3',
  '/sounds/user_won/molodez.mp3',
  '/sounds/user_won/that_was_sharp.mp3',
  '/sounds/user_won/well_played.mp3',
  '/sounds/user_won/wonderful.mp3',
];
const VOICE_POOL_FAILURE: string[] = [
  '/sounds/user_lost_playout/eleven_never_win.mp3',
  '/sounds/user_lost_playout/eleven_you_lost.mp3',
  '/sounds/user_lost_playout/tray_again.mp3',
  '/sounds/user_lost_playout/think_deeper_next_time.mp3',
  '/sounds/user_lost_playout/ist_das_wirklich_alles.mp3',
  '/sounds/user_lost_playout/failure_is_a_lesson.mp3',
];
const VOICE_POOL_PLAYOUT_START: string[] = [
    '/sounds/play_out_start/eleven_finish-him.mp3',
    '/sounds/play_out_start/punish_him.mp3',
    '/sounds/play_out_start/dobey_ego.mp3',
    '/sounds/play_out_start/deliver_checkmate.mp3',
    '/sounds/play_out_start/crush_his_defense.mp3',
    '/sounds/play_out_start/crush_him.mp3',
    '/sounds/play_out_start/bring_to_end.mp3',
];

/**
 * Карта, связывающая каждое звуковое событие с его определением.
 */
const soundDefinitions: Record<SoundEvent, SoundDefinition> = {
  // --- Параллельные звуки (board) ---
  move: { type: 'parallel', category: 'board', path: '/sounds/board/move.mp3' },
  capture: { type: 'parallel', category: 'board', path: '/sounds/board/capture.mp3' },
  promote: { type: 'parallel', category: 'board', path: '/sounds/board/swosh_22.mp3' },
  position_loaded: { type: 'parallel', category: 'board', path: '/sounds/swosh_11.mp3' },
  bot_checks_player: { type: 'parallel', category: 'board', path: '/sounds/board/eleven_check.mp3' },
  user_checks_bot: { type: 'parallel', category: 'board', path: '/sounds/board/user_checks_bot.mp3' },
  bot_checkmates_player: { type: 'parallel', category: 'board', path: '/sounds/board/eleven_checkmate.mp3' },
  tacktics_puzzle_loss: { type: 'parallel', category: 'board', path: '/sounds/Error.mp3' },
  timer_10_seconds_left: { type: 'parallel', category: 'board', path: '/sounds/board/timer_10_seconds_left.mp3' },
  timer_7_seconds_left: { type: 'parallel', category: 'board', path: '/sounds/board/timer_7_seconds_left.mp3' },
  timer_times_up: { type: 'parallel', category: 'board', path: '/sounds/board/timer_times_up.mp3' },

  // --- Параллельные звуки (voice) ---
  draw_by_stalemate: { type: 'parallel', category: 'voice', path: '/sounds/draw/eleven_ha-ha-ha_stalemate.mp3' },
  draw_by_repetition: { type: 'parallel', category: 'voice', path: '/sounds/draw/eleven_draw_by_repetition.mp3' },
  draw_by_fifty_moves: { type: 'parallel', category: 'voice', path: '/sounds/draw/eleven_fifty_moves_draw.mp3' },
  draw_by_insufficient_material: { type: 'parallel', category: 'voice', path: '/sounds/draw/eleven_insufficient_material_its_a_draw.mp3' },
  playout_starts: { type: 'parallel', category: 'voice', path: VOICE_POOL_PLAYOUT_START },

  // --- Последовательные звуки (voice) ---
  user_won_playout: { type: 'sequential', category: 'voice', path: VOICE_POOL_SUCCESS },
  user_lost_playout: { type: 'sequential', category: 'voice', path: VOICE_POOL_FAILURE },

  // --- Фоновые звуки (voice) ---
  game_entry: { type: 'background', category: 'voice', path: VOICE_POOL_ENTRY },
  tower_series_win: { type: 'background', category: 'voice', path: '/sounds/applaus.mp3' },
};

/**
 * Параметры для нового метода воспроизведения звуков.
 */
export interface SoundEventPayload {
  parallel?: SoundEvent[];
  sequential?: SoundEvent[];
}

class SoundServiceController {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private isInitialized: boolean = false;
  private initPromise: Promise<void>;
  private resolveInitPromise!: () => void;
  private voiceVolume: number = 1.0;

  constructor() {
    this.initPromise = new Promise<void>((resolve) => {
      this.resolveInitPromise = resolve;
    });
    this.loadVolume();
    this.initializeAudio();
  }

  private async initializeAudio(): Promise<void> {
    logger.info('[SoundService] Initializing audio assets...');
    const allLoadPromises: Promise<void>[] = [];

    Object.values(soundDefinitions).forEach(definition => {
      const paths = Array.isArray(definition.path) ? definition.path : [definition.path];
      paths.forEach(path => {
        if (!this.audioCache.has(path)) {
          allLoadPromises.push(this.createLoadPromise(path));
        }
      });
    });

    try {
      await Promise.all(allLoadPromises);
      this.isInitialized = true;
      logger.info('[SoundService] All audio assets initialized successfully.');
      this.resolveInitPromise();
    } catch (error) {
      logger.error('[SoundService] Failed to initialize one or more audio assets.', error);
    }
  }

  private createLoadPromise(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(path);
      audio.oncanplaythrough = () => {
        this.audioCache.set(path, audio);
        resolve();
      };
      audio.onerror = (e) => {
        const errorMsg = `Failed to load audio from '${path}'.`;
        logger.error(`[SoundService] ${errorMsg}`, e);
        reject(new Error(errorMsg));
      };
      audio.preload = 'auto';
      audio.load();
    });
  }

  private playSoundFromPath(path: string, category: SoundCategory): Promise<void> {
    return new Promise((resolve) => {
      const audio = this.audioCache.get(path);
      if (!audio) {
        logger.warn(`[SoundService] Audio not found in cache: ${path}.`);
        resolve();
        return;
      }

      audio.volume = category === 'voice' ? this.voiceVolume : 1.0;
      audio.currentTime = 0;
      
      const safetyTimeout = setTimeout(() => {
        audio.onended = null;
        resolve();
      }, (audio.duration || 1) * 1000 + 100);

      audio.onended = () => {
        clearTimeout(safetyTimeout);
        audio.onended = null;
        resolve();
      };

      audio.play().catch(error => {
        logger.warn(`[SoundService] Error playing sound '${path}':`, (error as Error).message);
        clearTimeout(safetyTimeout);
        audio.onended = null;
        resolve();
      });
    });
  }

  public async playSoundEvent(payload: SoundEventPayload): Promise<void> {
    if (!this.isInitialized) {
      await this.initPromise;
    }

    const parallelPromises: Promise<void>[] = [];
    if (payload.parallel) {
      for (const eventName of payload.parallel) {
        const definition = soundDefinitions[eventName];
        if (definition && definition.type === 'parallel') {
          const path = Array.isArray(definition.path) ? definition.path[Math.floor(Math.random() * definition.path.length)] : definition.path;
          parallelPromises.push(this.playSoundFromPath(path, definition.category));
        }
      }
    }
    
    await Promise.all(parallelPromises);

    if (payload.sequential && payload.sequential.length > 0) {
      const randomEventName = payload.sequential[Math.floor(Math.random() * payload.sequential.length)];
      const definition = soundDefinitions[randomEventName];
      if (definition && definition.type === 'sequential') {
        const path = Array.isArray(definition.path) ? definition.path[Math.floor(Math.random() * definition.path.length)] : definition.path;
        await this.playSoundFromPath(path, definition.category);
      }
    }
  }

  public async playBackgroundSound(eventName: SoundEvent): Promise<void> {
    if (!this.isInitialized) {
      await this.initPromise;
    }

    const definition = soundDefinitions[eventName];
    if (!definition || definition.type !== 'background') {
      logger.warn(`[SoundService] Event '${eventName}' is not a background sound.`);
      return;
    }

    const path = Array.isArray(definition.path) ? definition.path[Math.floor(Math.random() * definition.path.length)] : definition.path;
    this.playSoundFromPath(path, definition.category);
  }

  public setVoiceVolume(volume: number): void {
    this.voiceVolume = Math.max(0, Math.min(1, volume));
    try {
      localStorage.setItem(VOICE_VOLUME_STORAGE_KEY, String(this.voiceVolume));
      logger.info(`[SoundService] Voice volume set to ${this.voiceVolume}`);
    } catch (error) {
      logger.error('[SoundService] Failed to save voice volume to localStorage:', error);
    }
  }

  public getVoiceVolume(): number {
    return this.voiceVolume;
  }

  private loadVolume(): void {
    try {
      const savedVolume = localStorage.getItem(VOICE_VOLUME_STORAGE_KEY);
      if (savedVolume !== null) {
        const volume = parseFloat(savedVolume);
        if (!isNaN(volume)) {
          this.voiceVolume = volume;
        }
      }
    } catch (error) {
      logger.error('[SoundService] Failed to load voice volume from localStorage:', error);
    }
  }

  public async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return Promise.resolve();
    return this.initPromise;
  }

  public get isReady(): boolean {
    return this.isInitialized;
  }
}

export const SoundService = new SoundServiceController();
