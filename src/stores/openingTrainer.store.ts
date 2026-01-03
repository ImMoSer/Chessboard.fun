// src/stores/openingTrainer.store.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { openingApiService, type LichessMove } from '../services/OpeningApiService';
import { openingGraphService } from '../services/OpeningGraphService';
import { type SessionMove } from '../types/openingTrainer.types';
import { useBoardStore } from './board.store';
import { useGameStore } from './game.store';
import { useFinishHimStore } from './finishHim.store';
import logger from '../utils/logger';
import { soundService } from '../services/sound.service';

export const useOpeningTrainerStore = defineStore('openingTrainer', () => {
  const boardStore = useBoardStore();
  const gameStore = useGameStore();
  const finishHimStore = useFinishHimStore();

  const currentStats = ref<any | null>(null);
  const sessionHistory = ref<SessionMove[]>([]);
  const totalScore = ref(0);
  const isTheoryOver = ref(false);
  const isDeviation = ref(false);
  const variability = ref(5);
  const playerColor = ref<'white' | 'black'>('white');
  const openingName = ref('');
  const currentEco = ref('');
  const isLoading = ref(false);
  const isProcessingMove = ref(false); // Flag to suppress external fetch triggers (e.g. from View watcher)
  const error = ref<string | null>(null);
  const moveQueue = ref<string[]>([]);

  const movesHistoryUci = computed(() => sessionHistory.value.map(h => h.moveUci));

  async function initializeSession(color: 'white' | 'black', startMoves: string[] = []) {
    reset();
    playerColor.value = color;
    isProcessingMove.value = true;
    
    try {
      // Load the graph book if not loaded
      await openingGraphService.loadBook();

      boardStore.setupPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', color);
      
      // Apply setup moves if any
      for (const move of startMoves) {
          boardStore.applyUciMove(move);
      }

      await fetchStats();

      // If it's not the player's turn, trigger bot
      // Note: boardStore.turn is 'white' or 'black'
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
    totalScore.value = 0;
    isTheoryOver.value = false;
    isDeviation.value = false;
    openingName.value = '';
    currentEco.value = '';
    error.value = null;
    isLoading.value = false;
    isProcessingMove.value = false;
    moveQueue.value = [];
  }

  async function fetchStats(isGameplay = true) {
    isLoading.value = true;
    error.value = null;
    try {
      // Use Masters API for evaluation and UI display
      const data = await openingApiService.fetchMastersStats(boardStore.fen);
      
      if (data) {
        currentStats.value = data;
        
        const totalGames = data.white + data.draws + data.black;

        // Note: Masters API might not return opening name/eco in the same way Lichess does yet, 
        // but we can rely on Graph lookup in processMoveQueue for names.
        if (data.opening && !openingName.value) {
          openingName.value = data.opening.name;
          if (data.opening.eco) currentEco.value = data.opening.eco;
        }

        // Theory End Conditions (Based on Masters)
        if (data.moves.length === 0) {
          if (isGameplay) {
            logger.info(`[OpeningTrainer] Masters Theory ended.`);
            isTheoryOver.value = true;
            soundService.playSound('game_user_won');
          }
        }
      } else {
        logger.info('[OpeningTrainer] Theory ended: No data returned from Masters API.');
        if (isGameplay) {
            // Check Lichess as fallback? No, user wants strict Masters evaluation.
            isTheoryOver.value = true;
        }
      }
    } catch (err: any) {
      currentStats.value = null;
      error.value = 'Failed to fetch Masters stats.';
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

    // Check if move is in Masters Book
    if (!moveData) {
      logger.warn(`[OpeningTrainer] Deviation! Move ${moveUci} not found in Masters book.`);
      isDeviation.value = true;
      soundService.playSound('game_user_won');
      moveQueue.value = []; // Clear queue on deviation
      isProcessingMove.value = false; // Done
      return;
    }

    // Calculate Score based on Masters Stats
    const score = calculateMoveScore(moveData, currentStats.value.moves);
    totalScore.value += score;

    // Look up Move in Graph to get Name/ECO
    const graphMoves = openingGraphService.getMoves(boardStore.fen);
    const graphMoveData = graphMoves.find(m => m.uci === moveUci);
    
    if (graphMoveData) {
      if (graphMoveData.name) openingName.value = graphMoveData.name;
      if (graphMoveData.eco) currentEco.value = graphMoveData.eco;
    }

    // Add to history
    sessionHistory.value.push({
      fen: boardStore.fen,
      moveUci,
      san: moveData.san,
      stats: moveData,
      score
    });

    // Fetch next position stats (Masters)
    await fetchStats();

    if (!isTheoryOver.value && !isDeviation.value) {
      logger.info('[OpeningTrainer] Triggering bot move...');
      await triggerBotMove();
    } else {
      isProcessingMove.value = false; // Game/Turn sequence ended
    }
  }

  async function triggerBotMove() {
    // 1. Fetch Masters Stats for Bot Logic
    // We do NOT update currentStats here to avoid UI flicker/confusion.
    const mastersData = await openingApiService.fetchMastersStats(boardStore.fen);

    if (!mastersData || mastersData.moves.length === 0) {
      logger.info('[OpeningTrainer] Bot cannot move: No moves available in Masters DB.');
      isTheoryOver.value = true;
      soundService.playSound('game_user_won');
      isProcessingMove.value = false;
      return;
    }

    // 1. Get Candidates from Masters (Base Pool)
    let candidateMoves = mastersData.moves;

    // 2. Check Graph for "Academic" Moves
    const graphMoves = openingGraphService.getMoves(boardStore.fen);
    
    // 3. Intersect: Prefer moves that are in BOTH Masters AND Graph
    const academicMoves = candidateMoves.filter((lm: LichessMove) => 
      graphMoves.some(gm => gm.uci === lm.uci)
    );

    if (academicMoves.length > 0) {
      logger.info(`[OpeningTrainer] Using ${academicMoves.length} Academic moves from Graph.`);
      candidateMoves = academicMoves;
    } else {
      logger.info('[OpeningTrainer] No Academic moves found in Graph. Falling back to raw Masters stats.');
    }

    // Bot Weighted Random logic
    const topMoves = candidateMoves.slice(0, variability.value);
    
    if (topMoves.length === 0) {
      logger.info(`[OpeningTrainer] Bot cannot move: No candidate moves found.`);
      isTheoryOver.value = true;
      soundService.playSound('game_user_won');
      isProcessingMove.value = false;
      return;
    }

    const totalGames = topMoves.reduce((acc: number, m: LichessMove) => acc + (m.white + m.draws + m.black), 0);

    if (totalGames === 0) {
      logger.info(`[OpeningTrainer] Bot cannot move: Top ${variability.value} moves have 0 total games.`);
      isTheoryOver.value = true;
      soundService.playSound('game_user_won');
      isProcessingMove.value = false;
      return;
    }

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

    // Update Name/ECO from Graph for the selected move
    const selectedGraphData = graphMoves.find(m => m.uci === selectedMove.uci);
    if (selectedGraphData) {
      if (selectedGraphData.name) openingName.value = selectedGraphData.name;
      if (selectedGraphData.eco) currentEco.value = selectedGraphData.eco;
    }

    // Apply move to board
    logger.info(`[OpeningTrainer] Bot selected move: ${selectedMove.uci} (${selectedMove.san}) from ${topMoves.length} candidates.`);
    
    // Ensure processing flag is true before modifying board
    isProcessingMove.value = true;
    boardStore.applyUciMove(selectedMove.uci);

    // Fetch next position stats (Masters) for the User to see
    await fetchStats();

    // Process any queued user moves
    if (moveQueue.value.length > 0) {
        await processMoveQueue();
    } else {
        isProcessingMove.value = false; // Turn complete
    }
  }

  function calculateMoveScore(move: LichessMove, allMoves: LichessMove[]): number {
    const total = move.white + move.draws + move.black;
    if (total === 0) return 0;

    // WR = (Wins + 0.5 * Draws) / Total
    // If player is white, we look at move.white. If player is black, we look at move.black.
    const wins = playerColor.value === 'white' ? move.white : move.black;
    const wr = (wins + 0.5 * move.draws) / total;

    let points = 0;
    if (wr >= 0.55) points = 50;
    else if (wr >= 0.50) points = 30;
    else if (wr >= 0.45) points = 10;
    else points = -20;

    // Popularity bonus: Top-3 moves
    const index = allMoves.indexOf(move);
    if (index >= 0 && index < 3) {
      points += 10;
      logger.info(`[OpeningTrainer] Score: ${points} (Base: ${points - 10} + Bonus: 10). Move index: ${index}`);
    } else {
      logger.info(`[OpeningTrainer] Score: ${points} (Base only). Move index: ${index}`);
    }

    return points;
  }

  function hint() {
    if (!currentStats.value || currentStats.value.moves.length === 0) return;
    const bestMove = currentStats.value.moves[0];
    // Show hint logic (e.g. highlight move on board)
    // For now we can just log it or add a temporary arrow
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
    totalScore,
    isTheoryOver,
    isDeviation,
    variability,
    playerColor,
    openingName,
    currentEco,
    isLoading,
    isProcessingMove,
    error,
    initializeSession,
    handlePlayerMove,
    fetchStats,
    reset,
    hint
  };
});
