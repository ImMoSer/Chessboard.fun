import { Chess } from 'chessops/chess';
import { parseFen, makeFen } from 'chessops/fen';
import { parseSan } from 'chessops/san';
import { makeUci } from 'chessops/util';
import { type PgnNode } from './PgnService';

export interface ImportResult {
  tags: Record<string, string>;
  root: PgnNode;
}

export class PgnParserService {
  public parse(pgn: string): ImportResult {
    const tags = this.extractTags(pgn);
    const moveText = this.extractMoveText(pgn);
    const tokens = this.tokenize(moveText);

    const startFen = tags['FEN'] || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const root: PgnNode = {
      id: '__ROOT__',
      ply: 0,
      fenBefore: '',
      fenAfter: startFen,
      san: '',
      uci: '',
      children: []
    };

    this.buildTree(tokens, root);

    return { tags, root };
  }

  private extractTags(pgn: string): Record<string, string> {
    const tags: Record<string, string> = {};
    const tagRegex = /\[(\w+)\s+"(.*)"\]/g;
    let match;
    while ((match = tagRegex.exec(pgn)) !== null) {
      if (match[1] && match[2]) {
        tags[match[1]] = match[2];
      }
    }
    return tags;
  }

  private extractMoveText(pgn: string): string {
    const text = pgn.replace(/\[.*\]/g, '');
    return text.trim();
  }

  private tokenize(moveText: string): string[] {
    // Tokenize into: comments, variations, NAGs, move numbers, results, SAN moves
    return moveText.match(/\{[^}]*\}|\(|\)|\$\d+|\d+\.{1,3}|(?:\d+-\d+|1\/2-1\/2|\*)|[a-zA-Z0-9+#=/\-]+|[!?]+/g) || [];
  }

  private buildTree(tokens: string[], root: PgnNode) {
    let currentNode = root;
    const stack: PgnNode[] = [];

    const glyphToNag: Record<string, number> = {
      '!': 1, '?': 2, '!!': 3, '??': 4, '!?': 5, '?!': 6
    };

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token) continue;

      if (token === '(') {
        stack.push(currentNode);
        if (currentNode.parent) currentNode = currentNode.parent;
      } else if (token === ')') {
        const prev = stack.pop();
        if (prev) currentNode = prev;
      } else if (token.startsWith('{')) {
        if (currentNode !== root) {
          currentNode.comment = token.substring(1, token.length - 1).trim();
        }
      } else if (token.startsWith('$')) {
        if (currentNode !== root) {
          currentNode.nag = parseInt(token.substring(1));
        }
      } else if (token.match(/^[!?]+$/)) {
        if (currentNode !== root) {
          currentNode.nag = glyphToNag[token] || currentNode.nag;
        }
      } else if (token.match(/^\d+\.{1,3}$/) || token.match(/^(?:1-0|0-1|1\/2-1\/2|\*)$/)) {
        continue;
      } else {
        // It's a move (SAN)
        try {
          const fen = currentNode.fenAfter;
          const setup = parseFen(fen).unwrap();
          const pos = Chess.fromSetup(setup).unwrap();

          const move = parseSan(pos, token);

          if (move) {
            const uci = makeUci(move);
            pos.play(move);
            const fenAfter = makeFen(pos.toSetup());

            let nextNode = currentNode.children.find(c => c.san === token);
            if (!nextNode) {
              nextNode = {
                id: uci + Math.random().toString(36).substr(2, 4),
                ply: currentNode.ply + 1,
                fenBefore: fen,
                fenAfter: fenAfter,
                san: token,
                uci: uci,
                parent: currentNode,
                children: []
              };
              currentNode.children.push(nextNode);
            }
            if (nextNode) {
              currentNode = nextNode;
            }
          }
        } catch (e) {
          console.warn(`[PgnParser] Failed to parse move "${token}" at FEN ${currentNode.fenAfter}`, e);
        }
      }
    }
  }
}

export const pgnParserService = new PgnParserService();
