// src/services/PgnService.ts
import { ref, readonly } from 'vue'
import logger from '../utils/logger'
import { scalachessCharPair } from 'chessops/compat'
import { parseUci } from 'chessops/util'
import { parseFen, makeFen } from 'chessops/fen'
import { Chess } from 'chessops/chess'
import type { Setup as ChessopsSetup } from 'chessops'

export interface PgnNode {
  id: string
  ply: number
  fenBefore: string
  fenAfter: string
  san: string
  uci: string
  parent?: PgnNode | undefined
  children: PgnNode[]
  comment?: string | undefined
  eval?: number | undefined
}

export interface NewNodeData {
  san: string
  uci: string
  fenBefore: string
  fenAfter: string
  comment?: string
  eval?: number
}

export interface PgnStringOptions {
  showResult?: boolean
  showVariations?: boolean
}

const ROOT_NODE_ID = '__ROOT__'

const treeVersion = ref(0)

class PgnServiceController {
  private rootNode!: PgnNode
  private currentNode!: PgnNode
  private currentPath!: string
  private gameResult: string = '*'

  constructor() {
    logger.info('[PgnService] Initialized with tree structure.')
    this.reset('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  }

  public reset(fen: string): void {
    let normalizedFen = fen
    try {
      const setup: ChessopsSetup = parseFen(fen).unwrap()
      normalizedFen = makeFen(setup)
    } catch (e: any) {
      logger.error(
        `[PgnService] Error normalizing FEN "${fen}" in reset: ${e.message}. Using original FEN.`,
      )
    }

    this.rootNode = {
      id: ROOT_NODE_ID,
      ply: 0,
      fenBefore: '',
      fenAfter: normalizedFen,
      san: '',
      uci: '',
      children: [],
    }
    this.currentNode = this.rootNode
    this.currentPath = ''
    this.gameResult = '*'
    treeVersion.value++
    logger.info(
      `[PgnService] Reset with FEN: ${normalizedFen}. Current node is root. Path: "${this.currentPath}"`,
    )
  }

  public addNode(data: NewNodeData): PgnNode | null {
    const parentNode = this.currentNode

    if (parentNode.fenAfter !== data.fenBefore) {
      logger.error(
        `[PgnService] FEN mismatch: parent.fenAfter (${parentNode.fenAfter}) !== newNode.fenBefore (${data.fenBefore}). Cannot add node.`,
      )
      return null
    }

    const chessopsMove = parseUci(data.uci)
    if (!chessopsMove) {
      logger.error(`[PgnService] Invalid UCI string for ID generation: ${data.uci}`)
      return null
    }
    const nodeId = scalachessCharPair(chessopsMove)

    const existingChild = parentNode.children.find((child) => child.id === nodeId)
    if (existingChild) {
      // logger.debug(`[PgnService] Node with ID ${nodeId} (UCI: ${data.uci}) already exists as a child. Navigating to it.`)
      this.currentNode = existingChild
      this.currentPath = this.buildPath(this.currentNode)
      return this.currentNode
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
    }

    parentNode.children.push(newNode)
    this.currentNode = newNode
    this.currentPath = this.buildPath(this.currentNode)
    treeVersion.value++

    // logger.debug(`[PgnService] Node added: Ply ${newNode.ply}, SAN ${newNode.san}, ID ${newNode.id}. Path: "${this.currentPath}"`)
    return newNode
  }

  private buildPath(node: PgnNode): string {
    let path = ''
    let current: PgnNode | undefined = node
    while (current && current.parent) {
      path = current.id + path
      current = current.parent
    }
    return path
  }

  public buildPathToNode(node: PgnNode): string {
    return this.buildPath(node)
  }

  public navigateToNode(node: PgnNode): boolean {
    this.currentNode = node
    this.currentPath = this.buildPath(this.currentNode)
    treeVersion.value++
    // logger.debug(`[PgnService] Navigated directly to node: Ply ${node.ply}, SAN ${node.san}. Path: "${this.currentPath}"`)
    return true
  }

  public setGameResult(result: string): void {
    if (['1-0', '0-1', '1/2-1/2', '*'].includes(result)) {
      this.gameResult = result
      logger.info(`[PgnService] Game result set to: ${result}`)
    } else {
      logger.warn(`[PgnService] Invalid game result: ${result}. Using '*'`)
      this.gameResult = '*'
    }
  }

  public getCurrentPgnString(options?: PgnStringOptions): string {
    let pgn = ''
    const pathNodes: PgnNode[] = []
    let N: PgnNode | undefined = this.currentNode
    while (N && N.parent) {
      pathNodes.unshift(N)
      N = N.parent
    }

    if (pathNodes.length === 0) {
      return options?.showResult ? this.gameResult : ''
    }

    let currentFullMoveNumber = 1
    let isWhiteToMoveInitially = true

    try {
      const rootSetup = parseFen(this.rootNode.fenAfter).unwrap()
      const rootChessPos = Chess.fromSetup(rootSetup).unwrap()
      currentFullMoveNumber = rootChessPos.fullmoves
      isWhiteToMoveInitially = rootChessPos.turn === 'white'
    } catch (e: any) {
      logger.warn(
        `[PgnService] Could not parse root FEN or create Chess pos for PGN string: ${(e as Error).message
        }`,
      )
    }

    for (let i = 0; i < pathNodes.length; i++) {
      const node = pathNodes[i]
      if (!node) continue

      const isWhiteMoveInPgn =
        (node.ply % 2 === 1 && isWhiteToMoveInitially) ||
        (node.ply % 2 === 0 && !isWhiteToMoveInitially)

      if (isWhiteMoveInPgn) {
        if (pgn.length > 0) pgn += options?.showVariations ? ' ' : '\n'
        pgn += `${currentFullMoveNumber}. `
      } else {
        if (i === 0 && !isWhiteToMoveInitially) {
          pgn += `${currentFullMoveNumber}... `
        } else {
          pgn += ` `
        }
      }
      pgn += node.san

      if (node.comment && options?.showVariations) {
        pgn += ` {${node.comment}}`
      }

      if (!isWhiteMoveInPgn) {
        currentFullMoveNumber++
      }
    }

    if (options?.showResult && this.gameResult !== '*') {
      pgn += (pgn.length > 0 ? ' ' : '') + this.gameResult
    }
    return pgn.trim()
  }

  public getCurrentNode(): PgnNode {
    return this.currentNode
  }
  public getRootNode(): PgnNode {
    return this.rootNode
  }
  public getCurrentPath(): string {
    return this.currentPath
  }
  public getCurrentNavigatedFen(): string {
    return this.currentNode.fenAfter
  }
  public getCurrentNavigatedNode(): PgnNode | null {
    return this.currentNode.parent ? this.currentNode : null
  }

  public getFenHistoryForRepetition(): string[] {
    const history: string[] = [this.rootNode.fenAfter]
    let N: PgnNode | undefined = this.currentNode
    const pathNodes: PgnNode[] = []

    while (N && N.parent) {
      pathNodes.unshift(N)
      N = N.parent
    }
    pathNodes.forEach((node) => {
      if (node) {
        history.push(node.fenAfter)
      }
    })
    return history
  }

  public getLastMove(): PgnNode | null {
    if (this.currentNode === this.rootNode) return null
    return this.currentNode
  }

  public undoLastMove(): PgnNode | null {
    const parentNode = this.currentNode.parent
    if (parentNode) {
      const undoneNode = this.currentNode
      this.currentNode = parentNode
      this.currentPath = this.buildPath(this.currentNode)
      treeVersion.value++
      logger.info(
        `[PgnService] Undid move. Current node is now ply ${this.currentNode.ply}, SAN (of parent's move): ${this.currentNode.san}. Path: "${this.currentPath}"`,
      )
      return undoneNode
    }
    logger.warn(`[PgnService] No move to undo (already at root).`)
    return null
  }

  public navigateToPath(path: string): boolean {
    let targetNode: PgnNode | undefined = this.rootNode
    let currentPathSegment = path

    while (currentPathSegment.length > 0 && targetNode) {
      let foundChild = false
      // <<< НАЧАЛО ИЗМЕНЕНИЙ: Убрана некорректная аннотация типа
      for (const child of targetNode.children) {
        // <<< КОНЕЦ ИЗМЕНЕНИЙ
        if (currentPathSegment.startsWith(child.id)) {
          targetNode = child
          currentPathSegment = currentPathSegment.substring(child.id.length)
          foundChild = true
          break
        }
      }
      if (!foundChild) {
        targetNode = undefined
        break
      }
    }

    if (targetNode && currentPathSegment.length === 0) {
      this.currentNode = targetNode
      this.currentPath = path
      treeVersion.value++
      // logger.debug( `[PgnService] Navigated to path: "${path}", Ply: ${this.currentNode.ply}`      )
      return true
    }
    logger.warn(`[PgnService] Cannot navigate to path "${path}". Path not found or invalid.`)
    return false
  }

  public navigateToPly(ply: number): boolean {
    if (ply < 0) {
      logger.warn(`[PgnService] Cannot navigate to negative ply: ${ply}`)
      return false
    }
    if (ply === 0) {
      this.navigateToStart()
      return true
    }

    let targetNode: PgnNode | undefined = this.rootNode
    let constructedPath = ''
    while (targetNode && targetNode.ply < ply) {
      // <<< НАЧАЛО ИЗМЕНЕНИЙ: Явно указываем тип переменной
      const mainLineChild: PgnNode | undefined = targetNode.children[0]
      // <<< КОНЕЦ ИЗМЕНЕНИЙ
      if (mainLineChild) {
        targetNode = mainLineChild
        constructedPath += targetNode.id
      } else {
        targetNode = undefined
        break
      }
    }

    if (targetNode && targetNode.ply === ply) {
      this.currentNode = targetNode
      this.currentPath = constructedPath
      treeVersion.value++
      // logger.debug(`[PgnService] Navigated to ply: ${this.currentNode.ply} on main line. Path: "${this.currentPath}"`)
      return true
    }
    const maxPly = this.currentNode.ply
    logger.warn(
      `[PgnService] Cannot navigate to ply ${ply} on main line. Max ply on main line is currently ${maxPly}.`,
    )
    return false
  }

  public navigateBackward(): boolean {
    const parentNode = this.currentNode.parent
    if (parentNode) {
      this.currentNode = parentNode
      this.currentPath = this.buildPath(this.currentNode)
      treeVersion.value++
      // logger.debug(`[PgnService] Navigated backward to ply: ${this.currentNode.ply}. Path: "${this.currentPath}"`)
      return true
    }
    return false
  }

  public navigateForward(variationIndex: number = 0): boolean {
    if (this.currentNode.children && this.currentNode.children.length > variationIndex) {
      const childNode = this.currentNode.children[variationIndex]
      if (childNode) {
        this.currentNode = childNode
        this.currentPath += childNode.id
        treeVersion.value++
        // logger.debug(`[PgnService] Navigated forward to ply: ${this.currentNode.ply} (Variation ${variationIndex}). Path: "${this.currentPath}"`)
        return true
      }
    }
    return false
  }

  public navigateToStart(): void {
    this.currentNode = this.rootNode
    this.currentPath = ''
    treeVersion.value++
    // logger.debug(`[PgnService] Navigated to start (ply 0). Path: "${this.currentPath}"`)
  }

  public navigateToEnd(): void {
    let N: PgnNode = this.currentNode
    while (N.children.length > 0) {
      const nextNode = N.children[0]
      if (nextNode) {
        N = nextNode
      } else {
        break
      }
    }
    if (this.currentNode !== N) {
      this.currentNode = N
      this.currentPath = this.buildPath(this.currentNode)
      treeVersion.value++
    }
    // logger.debug( `[PgnService] Navigated to end (ply ${this.currentNode.ply}). Path: "${this.currentPath}"`, )   )
  }

  public canNavigateBackward(): boolean {
    return !!this.currentNode.parent
  }
  public canNavigateForward(variationIndex: number = 0): boolean {
    return !!this.currentNode.children && this.currentNode.children.length > variationIndex
  }
  public getCurrentPly(): number {
    return this.currentNode.ply
  }
}

export const pgnService = new PgnServiceController()

export const pgnTreeVersion = readonly(treeVersion)
