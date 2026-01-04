// src/stores/openingTrainer.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { openingApiService, type LichessMove, type OpeningDatabaseSource, type LichessParams } from '../services/OpeningApiService';
import { openingGraphService } from '../services/OpeningGraphService';
import { type SessionMove } from '../types/openingTrainer.types';
import { useBoardStore } from './board.store';
import { useGameStore } from './game.store';
import { useFinishHimStore } from './finishHim.store';
import logger from '../utils/logger';
import { soundService } from '../services/sound.service';

export const useOpeningTrainerStore = defineStore('openingTrainer', () => {
  const boardStore = useBoardStore();

  const currentStats = ref<any | null>(null);
  const sessionHistory = ref<SessionMove[]>([]);
  // const totalScore = ref(0); // REMOVED
  const isTheoryOver = ref(false);
  const isDeviation = ref(false);
  const variability = ref(5);
  const playerColor = ref<'white' | 'black'>('white');
  const openingName = ref('');
  const currentEco = ref('');
  const isLoading = ref(false);
  const isProcessingMove = ref(false);
  const error = ref<string | null>(null);
  const moveQueue = ref<string[]>([]);

  // Database settings
  const dbSource = ref<OpeningDatabaseSource>('masters');
  const lichessParams = ref<LichessParams>({
    ratings: [1800, 2000, 2200, 2500],
    speeds: ['blitz', 'rapid', 'classical']
  });

  // Request deduplication tracking
  const lastFetchedFen = ref<string>('');
  const lastFetchedConfig = ref<string>('');

  const movesHistoryUci = computed(() => sessionHistory.value.map(h => h.moveUci));

  // --- New Computed Stats ---
  const movesCount = computed(() => sessionHistory.value.length);

  const averagePopularity = computed(() => {
    if (movesCount.value === 0) return 0;
    const sum = sessionHistory.value.reduce((acc, m) => acc + m.popularity, 0);
    return Math.round(sum / movesCount.value);
  });

  const averageWinRate = computed(() => {
    if (movesCount.value === 0) return 0;
    const sum = sessionHistory.value.reduce((acc, m) => acc + m.winRate, 0);
    return Math.round(sum / movesCount.value);
  });

  const averageRating = computed(() => {
    if (movesCount.value === 0) return 0;
    const sum = sessionHistory.value.reduce((acc, m) => acc + m.rating, 0);
    return Math.round(sum / movesCount.value);
  });
  // --------------------------

  async function initializeSession(color: 'white' | 'black', startMoves: string[] = []) {
    reset();
    playerColor.value = color;
    isProcessingMove.value = true;
    
    try {
      await openingGraphService.loadBook();
      boardStore.setupPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', color);
      
      for (const move of startMoves) {
          boardStore.applyUciMove(move);
      }

      // Initial fetch
      await fetchStats();

      if (boardStore.turn !== color) {
        await triggerBotMove();
      }
    } finally {
      isProcessingMove.value = false;
    }
  }

  function reset() {
    currentStats.value = null;
    sessionHistory.value = [];
    // totalScore.value = 0; // REMOVED
    isTheoryOver.value = false;
    isDeviation.value = false;
    openingName.value = '';
    currentEco.value = '';
    error.value = null;
    isLoading.value = false;
    isProcessingMove.value = false;
    moveQueue.value = [];
    lastFetchedFen.value = '';
    lastFetchedConfig.value = '';
  }

  function setDatabaseSource(source: OpeningDatabaseSource) {
    if (dbSource.value !== source) {
      dbSource.value = source;
      fetchStats(false, true); // Force refresh
    }
  }

  function setLichessParams(params: Partial<LichessParams>) {
    lichessParams.value = { ...lichessParams.value, ...params };
    if (dbSource.value === 'lichess') {
      fetchStats(false, true); // Force refresh
    }
  }

  function generateConfigHash(): string {
      if (dbSource.value === 'masters') return 'masters';
      return `lichess:${lichessParams.value.ratings.slice().sort().join(',')}|${lichessParams.value.speeds.slice().sort().join(',')}`;
  }

  async function fetchStats(isGameplay = true, force = false, onlyCache = false) {
    const currentFen = boardStore.fen;
    const currentConfig = generateConfigHash();

    // Deduplication check
    // If onlyCache is requested, we don't care about "redundant" checks as much as just querying the cache quickly
    // But still, if lastFetched is same, we might skip if we already have the data in currentStats.
    if (!force && currentFen === lastFetchedFen.value && currentConfig === lastFetchedConfig.value && !onlyCache) {
        logger.info('[OpeningTrainer] Skipping redundant fetchStats (Already loaded).');
        return;
    }

    isLoading.value = true;
    error.value = null;
    try {
      const data = await openingApiService.getStats(
        currentFen, 
        dbSource.value, 
        lichessParams.value,
        { onlyCache }
      );
      
      // Update tracking only if we got data or if it was a real fetch attempt
      if (!onlyCache) {
          lastFetchedFen.value = currentFen;
          lastFetchedConfig.value = currentConfig;
      }

      if (data) {
        currentStats.value = data;
        
        if (data.opening && !openingName.value) {
          openingName.value = data.opening.name;
          if (data.opening.eco) currentEco.value = data.opening.eco;
        }

        if (data.moves.length === 0) {
          if (isGameplay) {
            logger.info(`[OpeningTrainer] Theory ended (${dbSource.value}).`);
            isTheoryOver.value = true;
            soundService.playSound('game_user_won');
          }
        }
      } else {
        // If onlyCache was true and we got null, it simply means cache miss. 
        // We do NOT treat this as "Theory Ended" or clear current stats necessarily, 
        // but for the UI to be consistent, if cache is empty, we probably shouldn't show old stats for a new position.
        // So clearing currentStats is correct behavior for navigation.
        if (onlyCache) {
            currentStats.value = null; 
        } else if (isGameplay) {
            isTheoryOver.value = true;
        }
      }
    } catch (err: any) {
      currentStats.value = null;
      if (err.message === '429') {
          error.value = 'Lichess Rate Limit (429). Waiting...';
      } else {
          error.value = `Failed to fetch stats from ${dbSource.value}.`;
      }
      logger.error('[OpeningTrainerStore] Error fetching stats:', err);
    } finally {
      isLoading.value = false;
    }
  }

  async function handlePlayerMove(moveUci: string) {
    isProcessingMove.value = true;
    moveQueue.value.push(moveUci);
    try {
      await processMoveQueue();
    } catch (e) {
      logger.error('Error handling player move:', e);
      isProcessingMove.value = false;
    }
  }

  async function processMoveQueue() {
    if (isLoading.value || error.value || !currentStats.value || moveQueue.value.length === 0) {
        return; 
    }

    const moveUci = moveQueue.value.shift()!;
    const moveData = currentStats.value.moves.find((m: LichessMove) => m.uci === moveUci);

    if (!moveData) {
      logger.warn(`[OpeningTrainer] Deviation! Move ${moveUci} not found in ${dbSource.value} book.`);
      isDeviation.value = true;
      soundService.playSound('game_user_won');
      moveQueue.value = [];
      isProcessingMove.value = false;
      return;
    }

    // --- New Metrics Calculation ---
    const allMoves = currentStats.value.moves as LichessMove[];
    
    // 1. Popularity (Raw Percentage of total games in this position)
    const totalGamesInPos = allMoves.reduce((acc, m) => acc + m.white + m.draws + m.black, 0);
    const moveGames = moveData.white + moveData.draws + moveData.black;
    const popularity = totalGamesInPos > 0 ? (moveGames / totalGamesInPos) * 100 : 0;

    // 2. WinRate (For player's color)
    const wins = playerColor.value === 'white' ? moveData.white : moveData.black;
    const winRateRaw = moveGames > 0 ? ((wins + 0.5 * moveData.draws) / moveGames) * 100 : 0;

    // 3. Average Rating
    const rating = moveData.averageRating || 0;
    // -------------------------------

    const graphMoves = openingGraphService.getMoves(boardStore.fen);
    const graphMoveData = graphMoves.find(m => m.uci === moveUci);
    
    if (graphMoveData) {
      if (graphMoveData.name) openingName.value = graphMoveData.name;
      if (graphMoveData.eco) currentEco.value = graphMoveData.eco;
    }

    sessionHistory.value.push({
      fen: boardStore.fen,
      moveUci,
      san: moveData.san,
      stats: moveData,
      popularity, // Store raw value
      winRate: winRateRaw, // Store raw value
      rating // Store raw value
    });

    await fetchStats();

    if (!isTheoryOver.value && !isDeviation.value) {
      await triggerBotMove();
    } else {
      isProcessingMove.value = false;
    }
  }

  async function triggerBotMove() {
    // We need fresh stats for the bot logic, but fetchStats handles caching/dedup automatically now.
    // However, fetchStats stores result in currentStats.value.
    // Ensure we have data for CURRENT position (should be loaded by previous step).
    
    if (!currentStats.value || currentStats.value.moves.length === 0) {
         // Try one last fetch if missing (shouldn't happen usually)
         await fetchStats(); 
         if (!currentStats.value || currentStats.value.moves.length === 0) {
            isTheoryOver.value = true;
            soundService.playSound('game_user_won');
            isProcessingMove.value = false;
            return;
         }
    }
    
    // Use currentStats directly as they are synced with boardStore.fen by processMoveQueue -> fetchStats
    let candidateMoves = currentStats.value.moves;
    const graphMoves = openingGraphService.getMoves(boardStore.fen);
    const academicMoves = candidateMoves.filter((lm: LichessMove) => 
      graphMoves.some(gm => gm.uci === lm.uci)
    );

    if (academicMoves.length > 0) {
      candidateMoves = academicMoves;
    }

    const topMoves = candidateMoves.slice(0, variability.value);
    if (topMoves.length === 0) {
      isTheoryOver.value = true;
      isProcessingMove.value = false;
      return;
    }

    const totalGames = topMoves.reduce((acc: number, m: LichessMove) => acc + (m.white + m.draws + m.black), 0);
    let random = Math.random() * totalGames;
    let selectedMove: LichessMove = topMoves[0]!;

    for (const move of topMoves) {
      const moveGames = move.white + move.draws + move.black;
      if (random < moveGames) {
        selectedMove = move;
        break;
      }
      random -= moveGames;
    }

    const selectedGraphData = graphMoves.find(m => m.uci === selectedMove.uci);
    if (selectedGraphData) {
      if (selectedGraphData.name) openingName.value = selectedGraphData.name;
      if (selectedGraphData.eco) currentEco.value = selectedGraphData.eco;
    }

    isProcessingMove.value = true;
    boardStore.applyUciMove(selectedMove.uci);
    await fetchStats();

    if (moveQueue.value.length > 0) {
        await processMoveQueue();
    } else {
        isProcessingMove.value = false;
    }
  }

  function hint() {
    if (!currentStats.value || currentStats.value.moves.length === 0) return;
    const bestMove = currentStats.value.moves[0];
    boardStore.drawableShapes = [{
      orig: bestMove.uci.substring(0, 2) as any,
      dest: bestMove.uci.substring(2, 4) as any,
      brush: 'green'
    }];
    setTimeout(() => {
      boardStore.drawableShapes = [];
    }, 2000);
  }

  return {
    currentStats,
    sessionHistory,
    // totalScore, // REMOVED
    averagePopularity,
    averageWinRate,
    averageRating,
    movesCount,
    isTheoryOver,
    isDeviation,
    variability,
    playerColor,
    openingName,
    currentEco,
    isLoading,
    isProcessingMove,
    error,
    dbSource,
    lichessParams,
    setDatabaseSource,
    setLichessParams,
    initializeSession,
    handlePlayerMove,
    fetchStats,
    reset,
    hint
  };
});