// src/shared/components/boardView.ts
import type { BoardHandler, GameStatus } from '../../core/boardHandler';
import type { ChessboardService, CustomDrawShape } from '../../core/chessboard.service';
import type { Config as ChessgroundConfig } from 'chessground/config';
import type { Key, Dests, Color as ChessgroundColor, MoveMetadata } from 'chessground/types';
import logger from '../../utils/logger';
import { h, VNode } from 'snabbdom';
import type { Hooks } from 'snabbdom';
import { renderPromotionDialog } from '../../features/common/promotion/promotionView';

// --- Page Layout Types ---
export interface FinishHimPageViewLayout {
  left: VNode | null;
  center: VNode;
  right: VNode | null;
  topPanelContent?: VNode | null;
}
export interface TowerPageViewLayout {
  left: VNode | null;
  center: VNode;
  right: VNode | null;
  topPanelContent?: VNode | null;
}
export interface AttackPageViewLayout {
  left: VNode | null;
  center: VNode;
  right: VNode | null;
  topPanelContent?: VNode | null;
}
export interface TackticsPageViewLayout {
  left: VNode | null;
  center: VNode;
  right: VNode | null;
  topPanelContent?: VNode | null;
}

export class BoardView {
    public container: HTMLElement | null = null;
    public boardHandler: BoardHandler;
    public chessboardService: ChessboardService;
    private onUserMoveCallback: (orig: Key, dest: Key, metadata?: MoveMetadata) => Promise<void>;

    private boundHandleAppPanelResize: () => void;

    constructor(
        boardHandler: BoardHandler,
        chessboardService: ChessboardService,
        onUserMove: (orig: Key, dest: Key, metadata?: MoveMetadata) => Promise<void>
    ) {
        this.boardHandler = boardHandler;
        this.chessboardService = chessboardService;
        this.onUserMoveCallback = onUserMove;

        this.boundHandleAppPanelResize = this._handleAppPanelResize.bind(this);
        window.addEventListener('centerPanelResized', this.boundHandleAppPanelResize);
    }

    public setContainer(containerEl: HTMLElement): void {
        if (this.container === containerEl) return;
        if (this.chessboardService.ground) {
            this.chessboardService.destroy();
        }
        this.container = containerEl;
        this.initBoard();
    }

    public clearContainer(): void {
        this.container = null;
    }

    private _handleAppPanelResize(): void {
        logger.debug('[BoardView] Received centerPanelResized event. Notifying chessground.');
        this.notifyResize();
    }

    public notifyResize(): void {
        if (this.chessboardService.ground) {
            this.chessboardService.ground.redrawAll();
            logger.debug('[BoardView] Notified chessground of resize (redrawAll).');
        } else {
            logger.warn('[BoardView] notifyResize called, but ground not initialized.');
        }
    }

    private initBoard(): void {
        if (!this.container) {
            logger.warn('[BoardView] initBoard called but container is not set.');
            return;
        }
        const initialConfig = this._getBoardConfig();
        this.chessboardService.init(this.container, initialConfig);
        this.updateView();
        logger.info('[BoardView] Board initialized/verified and view updated.');
    }

    private _getBoardConfig(): ChessgroundConfig {
        const initialFen = this.boardHandler.getFen().split(' ')[0];
        const initialTurnColor = this.boardHandler.getBoardTurnColor();
        const initialOrientation = this.boardHandler.getHumanPlayerColor() || 'white';
        const gameStatus: GameStatus = this.boardHandler.getGameStatus();
        const isConfiguredForAnalysis = this.boardHandler.isBoardConfiguredForAnalysis();

        let movableColor: ChessgroundColor | 'both' | undefined = initialOrientation;
        let dests: Dests = this.boardHandler.getPossibleMoves();

        if (isConfiguredForAnalysis) {
            movableColor = 'both';
        } else if (gameStatus.isGameOver) {
            movableColor = undefined;
            dests = new Map();
        }

        return {
            fen: initialFen,
            orientation: initialOrientation,
            turnColor: initialTurnColor,
            movable: {
                free: false,
                color: movableColor,
                dests: dests,
                events: {
                    after: (orig: Key, dest: Key, metadata: MoveMetadata) => {
                        logger.debug(`[BoardView] User move on board: ${orig}-${dest}. Calling onUserMoveCallback.`);
                        this.onUserMoveCallback(orig, dest, metadata)
                            .catch(error => {
                                logger.error('[BoardView] Error in onUserMoveCallback:', error);
                            });
                    },
                },
                showDests: true,
            },
            premovable: {
                enabled: true,
            },
            highlight: {
                lastMove: true,
                check: true,
            },
            animation: {
                enabled: true,
                duration: 50,
            },
            events: {
                select: (key: Key) => {
                    logger.debug(`[BoardView] Square selected by user: ${key}`);
                },
            },
            drawable: {
                enabled: true,
                eraseOnClick: false,
                shapes: [],
            }
        };
    }

    public updateView(): void {
        const ground = this.chessboardService.ground;
        if (!ground) {
            logger.warn('[BoardView] updateView called but ground is not initialized in ChessboardService.');
            if (this.container && this.container.isConnected) {
                logger.warn('[BoardView] Attempting to re-initialize board as container exists and ground is missing.');
                this.initBoard();
            }
            return;
        }

        const gameStatus: GameStatus = this.boardHandler.getGameStatus();
        const currentFen = this.boardHandler.getFen().split(' ')[0];
        const turnColor = this.boardHandler.getBoardTurnColor();
        const orientation = this.boardHandler.getHumanPlayerColor() || ground.state.orientation;
        const isConfiguredForAnalysis = this.boardHandler.isBoardConfiguredForAnalysis();

        let lastMoveUciArray: [Key, Key] | undefined = undefined;
        const lastPgnNode = this.boardHandler.getLastPgnMoveNode();

        if (lastPgnNode && lastPgnNode.uci) {
            const lastUci = lastPgnNode.uci;
            if (typeof lastUci === 'string' && lastUci.length >= 4) {
                const orig = lastUci.substring(0, 2) as Key;
                const dest = lastUci.substring(2, 4) as Key;
                lastMoveUciArray = [orig, dest];
            }
        }

        let movableColor: ChessgroundColor | 'both' | undefined = orientation;
        let destsForGround: Dests = this.boardHandler.getPossibleMoves();

        if (isConfiguredForAnalysis) {
            movableColor = 'both';
        } else if (gameStatus.isGameOver) {
            movableColor = undefined;
            destsForGround = new Map();
        }

        const newConfig: Partial<ChessgroundConfig> = {
            fen: currentFen,
            turnColor: turnColor,
            orientation: orientation,
            movable: {
                free: false,
                color: movableColor,
                dests: destsForGround,
                showDests: true,
            },
            check: gameStatus.isCheck ? true : undefined,
            lastMove: lastMoveUciArray,
            drawable: {
                ...(ground.state.drawable || { enabled: true, eraseOnClick: false }),
                shapes: ground.state.drawable.shapes || []
            }
        };

        ground.set(newConfig);
    }

    public drawShapes(shapes: CustomDrawShape[]): void {
        if (this.chessboardService.ground) {
            this.chessboardService.drawShapes(shapes);
        } else {
            logger.warn('[BoardView] Cannot draw shapes, ground not initialized.');
        }
    }

    public clearShapes(): void {
         if (this.chessboardService.ground) {
            this.chessboardService.clearShapes();
        } else {
            logger.warn('[BoardView] Cannot clear shapes, ground not initialized.');
        }
    }

    public destroy(): void {
        window.removeEventListener('centerPanelResized', this.boundHandleAppPanelResize);
        if (this.chessboardService) {
            this.chessboardService.destroy();
            logger.info('[BoardView] Called chessboardService.destroy().');
        }
        this.container = null;
        logger.info('[BoardView] Destroyed, removed centerPanelResized listener.');
    }
}

export function renderBoardContainer(
    boardView: BoardView,
    keyPrefix: string
): VNode {
  const { boardHandler, chessboardService } = boardView;
  let promotionDialogVNode: VNode | null = null;
  if (chessboardService.ground) {
    const groundState = chessboardService.ground.state;
    const boardOrientation = groundState.orientation;
    const boardDomBounds = groundState.dom?.bounds();
    if (boardDomBounds) {
      promotionDialogVNode = renderPromotionDialog(boardHandler.promotionCtrl, boardOrientation, boardDomBounds);
    }
  }

  const boardWrapperHook: Hooks = {
    insert: (vnode: VNode) => {
        const wrapperEl = vnode.elm as HTMLElement;
        const boardContainerEl = wrapperEl.querySelector('#board-container') as HTMLElement | null;
        if (boardContainerEl) {
            boardView.setContainer(boardContainerEl);
        }
    },
    update: () => {
        boardView.updateView();
    },
    destroy: () => {
        boardView.clearContainer();
    }
  };

  return h('div#board-wrapper', {
    key: `board-wrapper-${keyPrefix}`,
    hook: boardWrapperHook
  }, [
    h('div#board-container.cg-wrap', { key: `board-container-${keyPrefix}` }),
    promotionDialogVNode
  ]);
}