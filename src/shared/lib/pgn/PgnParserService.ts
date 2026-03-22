import { Chess } from 'chessops/chess'
import { parseFen, makeFen } from 'chessops/fen'
import { parseSan } from 'chessops/san'
import { makeUci, parseUci } from 'chessops/util'
import { scalachessCharPair } from 'chessops/compat'
import { type PgnNode } from './PgnService'

export interface ImportResult {
  tags: Record<string, string>
  root: PgnNode
}

export class PgnParserService {
  public parseMultiple(pgn: string): ImportResult[] {
    const games = pgn.split(/(?=\[Event )/g)
    return games
      .map((game) => this.parse(game.trim()))
      .filter((res) => res.root.children.length > 0 || Object.keys(res.tags).length > 0)
  }

  public parse(pgn: string): ImportResult {
    const tags = this.extractTags(pgn)
    const moveText = this.extractMoveText(pgn)
    const tokens = this.tokenize(moveText)

    const startFen = tags['FEN'] || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const root: PgnNode = {
      id: '__ROOT__',
      ply: 0,
      fenBefore: '',
      fenAfter: startFen,
      san: '',
      uci: '',
      children: [],
    }

    this.buildTree(tokens, root)

    return { tags, root }
  }

  private extractTags(pgn: string): Record<string, string> {
    const tags: Record<string, string> = {}
    const tagRegex = /\[(\w+)\s+"(.*)"\]/g
    let match
    while ((match = tagRegex.exec(pgn)) !== null) {
      if (match[1] && match[2]) {
        tags[match[1]] = match[2]
      }
    }
    return tags
  }

  private extractMoveText(pgn: string): string {
    const text = pgn.replace(/\[.*\]/g, '')
    return text.trim()
  }

  private tokenize(moveText: string): string[] {
    // Tokenize into: comments, variations, NAGs, move numbers, results, SAN moves
    return (
      moveText.match(
        /\{[^}]*\}|\(|\)|\$\d+|\d+\.{1,3}|(?:\d+-\d+|1\/2-1\/2|\*)|[a-zA-Z0-9+#=/\-]+|[!?]+/g,
      ) || []
    )
  }

  private buildTree(tokens: string[], root: PgnNode) {
    let currentNode = root
    const nodeStack: PgnNode[] = []
    const posStack: Chess[] = []

    const glyphToNag: Record<string, number> = {
      '!': 1,
      '?': 2,
      '!!': 3,
      '??': 4,
      '!?': 5,
      '?!': 6,
    }

    // Initialize root position just once
    let currentPos: Chess
    try {
      const setup = parseFen(root.fenAfter).unwrap()
      currentPos = Chess.fromSetup(setup).unwrap()
    } catch {
      currentPos = Chess.default()
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (!token) continue

      if (token === '(') {
        // Variation start: push current node and clone the board state
        nodeStack.push(currentNode)
        posStack.push(currentPos.clone())
        
        if (currentNode.parent) {
          currentNode = currentNode.parent
        }
        
        // We must revert the board state to the parent's state.
        // The easiest way without tracking move history backwards is to clone from the last known state.
        // Wait, currentPos is the state AFTER the node. The parent is the state BEFORE.
        // Actually, if we just parse the FEN for the parent, it's safer. But let's try to keep it fast.
        try {
          const setup = parseFen(currentNode.fenAfter).unwrap()
          currentPos = Chess.fromSetup(setup).unwrap()
        } catch {}
      } else if (token === ')') {
        // Variation end: pop node and position
        const prevNode = nodeStack.pop()
        if (prevNode) {
          currentNode = prevNode
        }
        const prevPos = posStack.pop()
        if (prevPos) {
          currentPos = prevPos
        }
      } else if (token.startsWith('{')) {
        if (currentNode !== root) {
          currentNode.comment = token.substring(1, token.length - 1).trim()
        }
      } else if (token.startsWith('$')) {
        if (currentNode !== root) {
          currentNode.nag = parseInt(token.substring(1))
        }
      } else if (token.match(/^[!?]+$/)) {
        if (currentNode !== root) {
          currentNode.nag = glyphToNag[token] || currentNode.nag
        }
      } else if (token.match(/^\d+\.{1,3}$/) || token.match(/^(?:1-0|0-1|1\/2-1\/2|\*)$/)) {
        continue
      } else {
        // It's a move (SAN)
        try {
          const move = parseSan(currentPos, token)

          if (move) {
            const uci = makeUci(move)
            const fenBefore = currentNode.fenAfter
            
            // Fast execute move
            currentPos.play(move)
            const fenAfter = makeFen(currentPos.toSetup())

            let nextNode = currentNode.children.find((c) => c.san === token)
            
            if (!nextNode) {
              const moveData = parseUci(uci)
              const nodeId = moveData
                ? scalachessCharPair(moveData)
                : uci + Math.random().toString(36).substr(2, 4)

              nextNode = {
                id: nodeId,
                ply: currentNode.ply + 1,
                fenBefore: fenBefore,
                fenAfter: fenAfter,
                san: token,
                uci: uci,
                parent: currentNode,
                children: [],
              }
              currentNode.children.push(nextNode)
            }
            
            currentNode = nextNode
          }
        } catch {
          // Fast fail without logging to avoid blocking the main thread on large files
        }
      }
    }
  }
}

export const pgnParserService = new PgnParserService()
