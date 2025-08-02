// src/core/chessboard.service.ts

import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Config } from 'chessground/config';
import type {
  Key,
  Dests,
  Color,
  FEN,
  KeyPair,
} from 'chessground/types';
import type { DrawModifiers, DrawShapePiece } from 'chessground/draw';
import type { Role as ChessopsRole } from 'chessops/types';
import logger from '../utils/logger';

export interface CustomDrawShape {
  orig: Key;
  dest?: Key;
  brush: string;
  modifiers?: DrawModifiers;
  piece?: DrawShapePiece;
  customSvg?: {
    html: string;
    center?: 'orig' | 'dest' | 'label';
  };
  label?: {
    text: string;
    fill?: string;
  };
}


export class ChessboardService {
  public ground: Api | null = null;

  public init(element: HTMLElement, config?: Config): Api | null {
    if (this.ground) {
      logger.warn('Chessground already initialized.');
      return this.ground;
    }
    const defaultConfig: Config = {
      orientation: 'white',
    };
    const finalConfig: Config = { ...defaultConfig, ...config };
    try {
      this.ground = Chessground(element, finalConfig);
      logger.info('Chessground initialized');
      return this.ground;
    } catch (error) {
      logger.error('Failed to initialize Chessground:', error);
      return null;
    }
  }

  public getFen(): FEN | undefined {
    return this.ground?.getFen();
  }

  public setFen(fenPiecePlacement: string): void {
    if (this.ground) {
      this.ground.set({ fen: fenPiecePlacement });
    }
  }

  public setPieceAt(key: Key, piece: { role: ChessopsRole; color: Color } | null): void {
    if (this.ground) {
      const currentPieces = new Map(this.ground.state.pieces);
      if (piece) {
        currentPieces.set(key, { ...piece, promoted: piece.role !== 'pawn' });
      } else {
        currentPieces.delete(key);
      }
      this.ground.setPieces(currentPieces);
      logger.debug(`[ChessboardService] Piece at ${key} set to:`, piece);
    }
  }


  public move(orig: Key, dest: Key, _promotion?: string): void {
    logger.warn(`Programmatic move from ${orig} to ${dest} - implement logic if needed.`);
  }

  public setOrientation(color: Color): void {
    this.ground?.set({ orientation: color });
  }

  public drawShapes(shapes: Array<CustomDrawShape>): void {
    this.ground?.setShapes(shapes.map(s => ({
        orig: s.orig,
        dest: s.dest,
        brush: s.brush,
        ...(s.modifiers && { modifiers: s.modifiers }),
        ...(s.piece && { piece: s.piece }),
        ...(s.customSvg && { customSvg: s.customSvg }),
        ...(s.label && { label: s.label }),
    })));
  }

  public clearShapes(): void {
    this.ground?.setShapes([]);
  }

  public playPremove(): boolean {
    if (this.ground) {
      return this.ground.playPremove();
    }
    logger.warn('[ChessboardService] playPremove called, but ground not initialized.');
    return false;
  }
  
  public getCurrentPremove(): KeyPair | undefined {
    return this.ground?.state.premovable.current;
  }
  
  public cancelPremove(): void {
    this.ground?.cancelPremove();
  }

  public destroy(): void {
    if (this.ground) {
      this.ground.destroy();
      this.ground = null;
      logger.info('Chessground destroyed');
    }
  }

  public getDests(): Dests | undefined {
    const state = this.ground?.state;
    return state?.movable?.dests;
  }

  public setDests(dests: Dests): void {
    const currentMovable = this.ground?.state?.movable;
    this.ground?.set({
      movable: {
        ...(currentMovable || {}),
        dests: dests
      }
    });
  }
}
