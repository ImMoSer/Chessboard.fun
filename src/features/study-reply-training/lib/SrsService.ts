import type { PgnNode } from '@/shared/lib/pgn/PgnService'
import logger from '@/shared/lib/logger'

export interface TrainingMetadata {
  successes: number
  attempts: number
  lastTrained?: number
}

class SrsService {
  /**
   * Calculates a weight for a node based on its success rate and days since last training.
   * Higher weight means the node should be prioritized.
   */
  public calculateWeight(node: PgnNode): number {
     
    const training = (node.metadata?.training as TrainingMetadata) || {
      successes: 0,
      attempts: 0
    }

    if (training.attempts === 0) {
      // New nodes get maximum priority to ensure exploration
      // Mainline gets 1000. Variations get slightly less so main is tested first.
      let rankPenalty = 0
      if (node.parent && node.parent.children) {
        const index = node.parent.children.findIndex(c => c.id === node.id)
        if (index > 0) {
          rankPenalty = index * 50
        }
      }
      return 1000 - rankPenalty
    }

    const successRate = training.successes / training.attempts
    
    // 1. Success-based factor (0 to 1). Higher if performance is worse.
    const successFactor = 1.0 - successRate 

    // 2. Time-based factor (Ebbinghaus Forgetting Curve surrogate)
    // We add more weight if the node hasn't been trained for a long time.
    let ageFactor = 0
    if (training.lastTrained) {
      const msSinceLast = Date.now() - training.lastTrained
      const daysSinceLast = msSinceLast / (1000 * 60 * 60 * 24)
      
      // Weight increases by 1 for every 3 days of neglect (capped at 5.0)
      ageFactor = Math.min(daysSinceLast / 3, 5.0)
    } else {
      // If attempts > 0 but no timestamp, we treat it as "needs review"
      ageFactor = 1.0 
    }

    // Combined weight: "how much you struggle" + "how long you haven't seen it"
    return successFactor + ageFactor
  }

  /**
   * Picks the child node that represents the greatest challenge or needs most review.
   */
  public selectNextChallenge(nodes: PgnNode[]): PgnNode | null {
    if (nodes.length === 0) return null
    if (nodes.length === 1) return nodes[0]!

    // We can use a weighted random selection or a strict max selection.
    // Given the user request for an elegant "Reply Training", 
    // we'll use a selection that strongly favors higher weights.
    
    const weightedNodes = nodes.map(n => ({
      node: n,
      weight: this.calculateWeight(n)
    }))

    // Shuffle the array first using Fisher-Yates or simple random sort
    // so that nodes with the exact same weight (e.g. 1000 for untried) are selected randomly
    weightedNodes.sort(() => Math.random() - 0.5)

    // Sort by weight descending (highest weight = highest priority)
    // The underlying stable sort will keep the random order for ties.
    weightedNodes.sort((a, b) => b.weight - a.weight)

    logger.info(`[SrsService] Evaluated ${nodes.length} options for system reply:`)
    weightedNodes.forEach(wn => {
       const metadata = wn.node.metadata?.training as TrainingMetadata
       const ageStr = metadata?.lastTrained 
         ? Math.floor((Date.now() - metadata.lastTrained) / (1000 * 60 * 60 * 24)) + ' days'
         : 'Never'
       logger.info(`  - ${wn.node.uci} (Weight: ${wn.weight.toFixed(2)}, Attempts: ${metadata?.attempts || 0}, Age: ${ageStr})`)
    })
    logger.info(`[SrsService] -> Selected: ${weightedNodes[0]!.node.uci}`)

    return weightedNodes[0]!.node
  }
}

export const srsService = new SrsService()
