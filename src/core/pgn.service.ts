// src/core/pgn.service.ts
import logger from '../utils/logger';
import { scalachessCharPair } from 'chessops/compat';
import { parseUci } from 'chessops/util';
import { parseFen, makeFen } from 'chessops/fen'; // Импортируем makeFen
import { Chess } from 'chessops/chess';
import type { Setup as ChessopsSetup } from 'chessops'; // Для типизации

/**
 * Interface for a single node in the PGN history tree.
 * Each node represents a position *after* a move has been made.
 */
export interface PgnNode {
  id: string; // Unique ID for this node's move (e.g., scalachessCharPair from UCI)
  ply: number; // Ply number (half-move count, root is 0, first move leads to ply 1 node)
  fenBefore: string; // FEN string *before* the move leading to this node's position
  fenAfter: string; // FEN string *after* the move leading to this node's position
  san: string; // Standard Algebraic Notation of the move leading to this node
  uci: string; // UCI string of the move leading to this node
  
  parent?: PgnNode; // Reference to the parent node
  children: PgnNode[]; // Array of child nodes (variations)

  // Optional fields
  comment?: string; // A single primary comment for the move
  eval?: number; // Stockfish evaluation (in centipawns or mate score)
}

/**
 * Data required to create a new PGN node.
 */
export interface NewNodeData {
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  comment?: string;
  eval?: number;
}

/**
 * Options for formatting the PGN string.
 */
export interface PgnStringOptions {
  showResult?: boolean;
  showVariations?: boolean;
}

const ROOT_NODE_ID = "__ROOT__";

class PgnServiceController {
  private rootNode!: PgnNode;
  private currentNode!: PgnNode;
  private currentPath!: string;

  private gameResult: string = '*';

  constructor() {
    logger.info('[PgnService] Initialized with tree structure.');
    this.reset('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  }

  public reset(fen: string): void {
    let normalizedFen = fen;
    try {
      // Нормализуем FEN, чтобы он всегда содержал все 6 частей
      const setup: ChessopsSetup = parseFen(fen).unwrap();
      normalizedFen = makeFen(setup); // chessops.makeFen вернет полный FEN
    } catch (e: any) {
      logger.error(`[PgnService] Error normalizing FEN "${fen}" in reset: ${e.message}. Using original FEN.`);
      // Если нормализация не удалась, используем исходный FEN, но это может привести к проблемам позже
    }

    this.rootNode = {
      id: ROOT_NODE_ID,
      ply: 0,
      fenBefore: '', 
      fenAfter: normalizedFen, // Используем нормализованный FEN
      san: '',
      uci: '',
      parent: undefined,
      children: [],
    };
    this.currentNode = this.rootNode;
    this.currentPath = '';
    this.gameResult = '*';
    logger.info(`[PgnService] Reset with FEN: ${normalizedFen}. Current node is root. Path: "${this.currentPath}"`);
  }

  public addNode(data: NewNodeData): PgnNode | null {
    const parentNode = this.currentNode;

    // Для отладки выведем оба FEN перед сравнением
    // logger.debug(`[PgnService addNode] Comparing FENs: parent.fenAfter="${parentNode.fenAfter}", newNode.fenBefore="${data.fenBefore}"`);

    if (parentNode.fenAfter !== data.fenBefore) {
        logger.error(`[PgnService] FEN mismatch: parent.fenAfter (${parentNode.fenAfter}) !== newNode.fenBefore (${data.fenBefore}). Cannot add node.`);
        return null;
    }

    const chessopsMove = parseUci(data.uci);
    if (!chessopsMove) {
        logger.error(`[PgnService] Invalid UCI string for ID generation: ${data.uci}`);
        return null;
    }
    const nodeId = scalachessCharPair(chessopsMove);

    const existingChild = parentNode.children.find(child => child.id === nodeId);
    if (existingChild) {
        logger.debug(`[PgnService] Node with ID ${nodeId} (UCI: ${data.uci}) already exists as a child. Navigating to it.`);
        this.currentNode = existingChild;
        this.currentPath = this.buildPath(this.currentNode);
        return this.currentNode;
    }

    const newNode: PgnNode = {
      id: nodeId,
      ply: parentNode.ply + 1,
      fenBefore: data.fenBefore,
      fenAfter: data.fenAfter,
      san: data.san,
      uci: data.uci,
      parent: parentNode,
      children: [],
      comment: data.comment,
      eval: data.eval,
    };

    parentNode.children.push(newNode);
    this.currentNode = newNode;
    this.currentPath = this.buildPath(this.currentNode);

    logger.debug(`[PgnService] Node added: Ply ${newNode.ply}, SAN ${newNode.san}, ID ${newNode.id}. Path: "${this.currentPath}"`);
    return newNode;
  }

  private buildPath(node: PgnNode): string {
    let path = '';
    let current: PgnNode | undefined = node;
    while (current && current.parent) { 
      path = current.id + path;
      current = current.parent;
    }
    return path;
  }

  public setGameResult(result: string): void {
    if (["1-0", "0-1", "1/2-1/2", "*"].includes(result)) {
      this.gameResult = result;
      logger.info(`[PgnService] Game result set to: ${result}`);
    } else {
      logger.warn(`[PgnService] Invalid game result: ${result}. Using '*'`);
      this.gameResult = '*';
    }
  }

  public getCurrentPgnString(options?: PgnStringOptions): string {
    let pgn = '';
    const pathNodes: PgnNode[] = [];
    let N = this.currentNode;
    while (N.parent) {
        pathNodes.unshift(N);
        N = N.parent;
    }

    if (pathNodes.length === 0) {
      return options?.showResult ? this.gameResult : '';
    }
    
    let currentFullMoveNumber = 1;
    let isWhiteToMoveInitially = true;

    try {
        const rootSetup = parseFen(this.rootNode.fenAfter).unwrap();
        const rootChessPos = Chess.fromSetup(rootSetup).unwrap();
        currentFullMoveNumber = rootChessPos.fullmoves;
        isWhiteToMoveInitially = rootChessPos.turn === 'white';
    } catch (e: any) {
        logger.warn(`[PgnService] Could not parse root FEN or create Chess pos for PGN string: ${(e as Error).message}`);
        // Используем дефолтные значения, если FEN корня невалиден
    }
    
    // Эта проверка больше не нужна, так как rootNode.fenAfter всегда будет полным
    // if (pathNodes[0] && pathNodes[0].ply === 1) {
    //     try {
    //         const firstMoveFenBeforeSetup = parseFen(pathNodes[0].fenBefore).unwrap();
    //         const firstMoveChessPos = Chess.fromSetup(firstMoveFenBeforeSetup).unwrap();
    //         isWhiteToMoveInitially = firstMoveChessPos.turn === 'white';
    //         currentFullMoveNumber = firstMoveChessPos.fullmoves;
    //     } catch (e: any) {
    //         logger.warn(`[PgnService] Could not parse firstMove.fenBefore or create Chess pos for PGN string: ${(e as Error).message}`);
    //     }
    // }


    for (let i = 0; i < pathNodes.length; i++) {
      const node = pathNodes[i];
      const isWhiteMoveInPgn = (node.ply % 2 === 1 && isWhiteToMoveInitially) || (node.ply % 2 === 0 && !isWhiteToMoveInitially);

      if (isWhiteMoveInPgn) {
        if (pgn.length > 0) pgn += (options?.showVariations ? ' ' : '\n');
        pgn += `${currentFullMoveNumber}. `;
      } else {
        if (i === 0 && !isWhiteToMoveInitially) {
            pgn += `${currentFullMoveNumber}... `;
        } else {
            pgn += ` `;
        }
      }
      pgn += node.san;

      if (node.comment && options?.showVariations) {
        pgn += ` {${node.comment}}`;
      }

      if (!isWhiteMoveInPgn) {
        currentFullMoveNumber++;
      }
    }

    if (options?.showResult && this.gameResult !== '*') {
      pgn += (pgn.length > 0 ? ' ' : '') + this.gameResult;
    }
    return pgn.trim();
  }

  public getCurrentNode(): PgnNode {
    return this.currentNode;
  }

  public getRootNode(): PgnNode {
    return this.rootNode;
  }
  
  public getCurrentPath(): string {
    return this.currentPath;
  }

  public getCurrentNavigatedFen(): string {
    return this.currentNode.fenAfter;
  }

  public getCurrentNavigatedNode(): PgnNode | null {
    return this.currentNode.parent ? this.currentNode : null;
  }

  public getFenHistoryForRepetition(): string[] {
    const history: string[] = [this.rootNode.fenAfter];
    let N: PgnNode | undefined = this.currentNode;
    const pathNodes: PgnNode[] = [];

    while (N && N.parent) {
        pathNodes.unshift(N);
        N = N.parent;
    }
    pathNodes.forEach(node => {
        history.push(node.fenAfter);
    });
    return history;
  }

  public getLastMove(): PgnNode | null {
    if (this.currentNode === this.rootNode) return null;
    return this.currentNode;
  }

  public undoLastMove(): PgnNode | null {
    if (this.currentNode.parent) {
      const undoneNode = this.currentNode;
      this.currentNode = this.currentNode.parent;
      this.currentPath = this.buildPath(this.currentNode);
      logger.info(`[PgnService] Undid move. Current node is now ply ${this.currentNode.ply}, SAN (of parent's move): ${this.currentNode.san}. Path: "${this.currentPath}"`);
      return undoneNode;
    }
    logger.warn(`[PgnService] No move to undo (already at root).`);
    return null;
  }

  public pruneCurrentNodeAndGoToParent(): PgnNode | null {
    if (this.currentNode.parent) {
        const parent = this.currentNode.parent;
        const nodeIdToRemove = this.currentNode.id;
        parent.children = parent.children.filter(child => child.id !== nodeIdToRemove);
        
        const oldNodePly = this.currentNode.ply;
        this.currentNode = parent;
        this.currentPath = this.buildPath(this.currentNode);
        logger.info(`[PgnService] Pruned node (Ply ${oldNodePly}). Current node is now ply ${this.currentNode.ply}. Path: "${this.currentPath}"`);
        return this.currentNode;
    }
    logger.warn(`[PgnService] Cannot prune root node.`);
    return null;
  }

  public navigateToPath(path: string): boolean {
    let targetNode: PgnNode | undefined = this.rootNode;
    let currentPathSegment = path;

    while (currentPathSegment.length > 0 && targetNode) {
        let foundChild = false;
        for(const child of targetNode.children) {
            if (currentPathSegment.startsWith(child.id)) {
                targetNode = child;
                currentPathSegment = currentPathSegment.substring(child.id.length);
                foundChild = true;
                break;
            }
        }
        if (!foundChild) {
            targetNode = undefined;
            break;
        }
    }
    
    if (targetNode && currentPathSegment.length === 0) {
      this.currentNode = targetNode;
      this.currentPath = path;
      logger.debug(`[PgnService] Navigated to path: "${path}", Ply: ${this.currentNode.ply}`);
      return true;
    }
    logger.warn(`[PgnService] Cannot navigate to path "${path}". Path not found or invalid.`);
    return false;
  }
  
  public navigateToPly(ply: number): boolean {
    if (ply < 0) {
        logger.warn(`[PgnService] Cannot navigate to negative ply: ${ply}`);
        return false;
    }
    if (ply === 0) {
        this.navigateToStart();
        return true;
    }

    let targetNode: PgnNode | undefined = this.rootNode;
    let constructedPath = "";
    while(targetNode && targetNode.ply < ply) {
        if (targetNode.children.length > 0) {
            targetNode = targetNode.children[0];
            constructedPath += targetNode.id;
        } else {
            targetNode = undefined;
            break;
        }
    }

    if (targetNode && targetNode.ply === ply) {
      this.currentNode = targetNode;
      this.currentPath = constructedPath;
      logger.debug(`[PgnService] Navigated to ply: ${this.currentNode.ply} on main line. Path: "${this.currentPath}"`);
      return true;
    }
    logger.warn(`[PgnService] Cannot navigate to ply ${ply} on main line. Max ply on main line: ${targetNode?.ply || this.rootNode.ply}.`);
    return false;
  }

  public navigateBackward(): boolean {
    if (this.currentNode.parent) {
      this.currentNode = this.currentNode.parent;
      this.currentPath = this.buildPath(this.currentNode);
      logger.debug(`[PgnService] Navigated backward to ply: ${this.currentNode.ply}. Path: "${this.currentPath}"`);
      return true;
    }
    return false;
  }

  public navigateForward(variationIndex: number = 0): boolean {
    if (this.currentNode.children && this.currentNode.children.length > variationIndex) {
      const childNode = this.currentNode.children[variationIndex];
      this.currentNode = childNode;
      this.currentPath += childNode.id;
      logger.debug(`[PgnService] Navigated forward to ply: ${this.currentNode.ply} (Variation ${variationIndex}). Path: "${this.currentPath}"`);
      return true;
    }
    return false;
  }

  public navigateToStart(): void {
    this.currentNode = this.rootNode;
    this.currentPath = '';
    logger.debug(`[PgnService] Navigated to start (ply 0). Path: "${this.currentPath}"`);
  }

  public navigateToEnd(): void {
    let N = this.currentNode;
    let pathSuffix = "";
    while (N.children.length > 0) {
      N = N.children[0];
      pathSuffix += N.id;
    }
    if (this.currentNode !== N) { 
        this.currentNode = N;
        if (!this.currentPath.endsWith(pathSuffix) || pathSuffix === "") { 
           this.currentPath = this.buildPath(this.currentNode); 
        }
    }
    logger.debug(`[PgnService] Navigated to end (ply ${this.currentNode.ply}). Path: "${this.currentPath}"`);
  }

  public canNavigateBackward(): boolean {
    return !!this.currentNode.parent;
  }

  public canNavigateForward(variationIndex: number = 0): boolean {
    return !!this.currentNode.children && this.currentNode.children.length > variationIndex;
  }

  public getCurrentPly(): number {
    return this.currentNode.ply;
  }

  public getTotalPliesInCurrentLine(): number {
    let count = 0;
    let N: PgnNode | undefined = this.currentNode;
    while(N && N.parent) {
        count++;
        N = N.parent;
    }
    return count;
  }

  public getVariationsForCurrentNode(): PgnNode[] {
    return this.currentNode.children;
  }

  public promoteVariationToMainline(variationNodeId: string): boolean {
    const parent = this.currentNode; 
    const variationIndex = parent.children.findIndex(child => child.id === variationNodeId);

    if (variationIndex > 0) { 
      const itemToPromote = parent.children.splice(variationIndex, 1)[0];
      parent.children.unshift(itemToPromote);
      logger.info(`[PgnService] Promoted variation ${variationNodeId} to mainline for node at ply ${parent.ply}.`);
      return true;
    }
    if (variationIndex === 0) {
        logger.debug(`[PgnService] Variation ${variationNodeId} is already the mainline.`);
        return true;
    }
    logger.warn(`[PgnService] Could not promote variation ${variationNodeId}: not found or already mainline.`);
    return false;
  }

  public setCommentOnCurrentNode(comment: string): void {
    if (this.currentNode && this.currentNode.id !== ROOT_NODE_ID) {
      this.currentNode.comment = comment;
      logger.debug(`[PgnService] Comment set on current node (Ply ${this.currentNode.ply}): "${comment}"`);
    } else {
      logger.warn('[PgnService] Cannot set comment, no current node or current node is root.');
    }
  }

  public clearCommentOnCurrentNode(): void {
    if (this.currentNode && this.currentNode.id !== ROOT_NODE_ID) {
      this.currentNode.comment = undefined;
      logger.debug(`[PgnService] Comment cleared from current node (Ply ${this.currentNode.ply})`);
    } else {
      logger.warn('[PgnService] Cannot clear comment, no current node or current node is root.');
    }
  }

  public setEvaluationOnCurrentNode(evalValue: number): void {
    if (this.currentNode && this.currentNode.id !== ROOT_NODE_ID) {
      this.currentNode.eval = evalValue;
      logger.debug(`[PgnService] Evaluation set on current node (Ply ${this.currentNode.ply}): ${evalValue}`);
    } else {
      logger.warn('[PgnService] Cannot set evaluation, no current node or current node is root.');
    }
  }

  public clearEvaluationOnCurrentNode(): void {
    if (this.currentNode && this.currentNode.id !== ROOT_NODE_ID) {
      this.currentNode.eval = undefined;
      logger.debug(`[PgnService] Evaluation cleared from current node (Ply ${this.currentNode.ply})`);
    } else {
      logger.warn('[PgnService] Cannot clear evaluation, no current node or current node is root.');
    }
  }
}

export const PgnService = new PgnServiceController();
