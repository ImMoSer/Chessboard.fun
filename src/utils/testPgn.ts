// src/utils/testPgn.ts
import { useBoardStore } from '@/stores/board.store'
import { pgnService } from '@/services/PgnService'

export function loadComplexTestPgn() {
    const boardStore = useBoardStore()

    // 1. Reset
    boardStore.resetBoardState()
    const root = pgnService.getRootNode()

    // 1. d4
    boardStore.applyUciMove('d2d4')
    const d4 = pgnService.getCurrentNode()

    // (1. c4 e5 2. Nc3 Nc6 (2... Nf6 3. g3 d5))
    boardStore.navigateToNode(root)
    boardStore.applyUciMove('c2c4')
    boardStore.applyUciMove('e7e5')
    boardStore.applyUciMove('b1c3')
    boardStore.applyUciMove('b8c6')
    const nc6 = pgnService.getCurrentNode()

    // (2... Nf6 3. g3 d5)
    boardStore.navigateToNode(nc6.parent!)
    boardStore.applyUciMove('g8f6')
    boardStore.applyUciMove('g2g3')
    boardStore.applyUciMove('d7d5')

    // (1. e4 c5 2. Nc3 Nf6 (2... e6 3. f4 d5))
    boardStore.navigateToNode(root)
    boardStore.applyUciMove('e2e4')
    boardStore.applyUciMove('c7c5')
    boardStore.applyUciMove('b1c3')
    boardStore.applyUciMove('g8f6')
    const nf6_var = pgnService.getCurrentNode()

    // (2... e6 3. f4 d5)
    boardStore.navigateToNode(nf6_var.parent!)
    boardStore.applyUciMove('e7e6')
    boardStore.applyUciMove('f2f4')
    boardStore.applyUciMove('d7d5')

    // 1... d5 2. c4
    boardStore.navigateToNode(d4)
    boardStore.applyUciMove('d7d5')
    boardStore.applyUciMove('c2c4')
    const c4_main = pgnService.getCurrentNode()

    // c6 (2... e6 3. cxd5 exd5)
    boardStore.applyUciMove('c7c6')
    const c6_main = pgnService.getCurrentNode()

    // (2... e6 3. cxd5 exd5)
    boardStore.navigateToNode(c6_main.parent!)
    boardStore.applyUciMove('e7e6')
    boardStore.applyUciMove('c4d5')
    boardStore.applyUciMove('e6d5')

    // 3. Nc3 e6 (3... Nf6 4. Nf3 e6)
    boardStore.navigateToNode(c6_main)
    boardStore.applyUciMove('b1c3')
    boardStore.applyUciMove('e7e6')
    const e6_main = pgnService.getCurrentNode()

    // (3... Nf6 4. Nf3 e6)
    boardStore.navigateToNode(e6_main.parent!)
    boardStore.applyUciMove('g8f6')
    boardStore.applyUciMove('g1f3')
    boardStore.applyUciMove('e7e6')

    // Back to d4 d5 c4 c6
    boardStore.navigateToNode(c6_main)
}
