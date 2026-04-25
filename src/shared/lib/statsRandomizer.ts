import {
  FINISH_HIM_THEMES,
  PRACTICAL_CHESS_CATEGORIES,
  THEORY_ENDING_CATEGORIES,
  TORNADO_THEMES,
  type LeaderboardApiResponse,
  type PersonalActivityStatsResponse,
  type UserProfileStatsDto,
  type UserSessionProfile,
  type ThematicLeaderboardEntry,
  type FinishHimLeaderboardEntry,
  type TornadoLeaderboardEntry,
  type TornadoMode
} from '@/shared/types/api.types'

/**
 * Generiert eine Zufallszahl zwischen min und max inkl.
 */
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Generiert ein zufälliges Benutzerprofil für die Beispiel-Ansicht.
 */
export function generateRandomUserProfile(): UserSessionProfile {
  const tiers: UserSessionProfile['subscriptionTier'][] = [
    'Pawn',
    'Knight',
    'Bishop',
    'Rook',
    'Queen',
    'King',
  ]
  const randomTier = tiers[getRandomInt(0, tiers.length - 1)]!
  const baseRating = getRandomInt(1200, 2200)

  return {
    id: 'example_user',
    username: 'ExtraPawnCOM',
    perfs: {
      blitz: {
        rating: baseRating + getRandomInt(-100, 100),
        prog: getRandomInt(-50, 50),
        games: getRandomInt(500, 5000),
      },
      rapid: {
        rating: baseRating + getRandomInt(-50, 150),
        prog: getRandomInt(-30, 30),
        games: getRandomInt(200, 3000),
      },
    },
    createdAt: Date.now() - 31536000000, // 1 year ago
    profile: {
      bio: 'Just an example user showing off the cabinet features.',
      location: 'Antigravity Workspace',
    },
    PawnCoins: getRandomInt(50, 1000),
    dailyLimit: 100,
    spentToday: getRandomInt(0, 50),
    base_puzzle_rating: baseRating,
    subscriptionTier: randomTier,
    TierExpire: null,
    tornadoHighScores: {
      bullet: getRandomInt(1500, 2500),
      blitz: getRandomInt(1500, 2500),
      rapid: getRandomInt(1500, 2500),
      classic: getRandomInt(1500, 2500),
    },
    validatedAt: Date.now(),
    today_activity: {
      puzzles_solved_today: {
        tornado: getRandomInt(0, 50),
        finish_him: getRandomInt(0, 20),
        theory: getRandomInt(0, 15),
        'practical-chess': getRandomInt(0, 10),
        total: 0, // Calculated below
      },
    },
    endgame_skill: baseRating + getRandomInt(-200, 200),
  }
}

/**
 * Generiert zufällige Aktivitätsstatistiken.
 */
export function generateRandomActivityStats(): PersonalActivityStatsResponse {
  const generatePeriod = (multiplier: number) => ({
    tornado: {
      puzzles_requested: getRandomInt(20, 100) * multiplier,
      puzzles_solved: getRandomInt(15, 95) * multiplier,
    },
    finish_him: {
      puzzles_requested: getRandomInt(10, 30) * multiplier,
      puzzles_solved: getRandomInt(8, 28) * multiplier,
    },
    theory: {
      puzzles_requested: getRandomInt(5, 20) * multiplier,
      puzzles_solved: getRandomInt(4, 18) * multiplier,
    },
    'practical-chess': {
      puzzles_requested: getRandomInt(5, 15) * multiplier,
      puzzles_solved: getRandomInt(4, 14) * multiplier,
    },
    rep_generator: {
      puzzles_requested: getRandomInt(2, 5) * multiplier,
      puzzles_solved: getRandomInt(1, 4) * multiplier,
    },
    'diamond-hunter': {
      puzzles_requested: getRandomInt(3, 8) * multiplier,
      puzzles_solved: getRandomInt(2, 7) * multiplier,
    },
    'opening-sparring': {
      puzzles_requested: getRandomInt(4, 10) * multiplier,
      puzzles_solved: getRandomInt(3, 9) * multiplier,
    },
    'study-reply': {
      puzzles_requested: getRandomInt(4, 12) * multiplier,
      puzzles_solved: getRandomInt(3, 11) * multiplier,
    },
    speedrun: {
      puzzles_requested: getRandomInt(5, 15) * multiplier,
      puzzles_solved: getRandomInt(4, 14) * multiplier,
    },
  })

  return {
    daily: generatePeriod(1),
    weekly: generatePeriod(7),
    monthly: generatePeriod(30),
  }
}

/**
 * Generiert detaillierte Statistiken mit hoher Streuung für die RoseCharts.
 */
export function generateRandomDetailedStats(baseRating: number = 1500): UserProfileStatsDto {
  const applyVariety = (themes: readonly string[]) => {
    return themes.map((theme) => {
      // Big spread: -400 to +600 from base
      const rating = baseRating + getRandomInt(-400, 600)
      const requested = getRandomInt(10, 200)
      // Success rate between 40% and 98%
      const success = Math.floor(requested * (getRandomInt(40, 98) / 100))
      return { theme, rating, success, requested }
    })
  }

  const theoryModes = (categories: readonly string[]) => ({
    Novice: applyVariety(categories),
    Pro: applyVariety(categories),
    Master: applyVariety(categories),
  })

  return {
    tornado: {
      highScores: {
        bullet: getRandomInt(20, 70),
        blitz: getRandomInt(20, 70),
        rapid: getRandomInt(20, 70),
        classic: getRandomInt(20, 70),
      },
      modes: {
        bullet: { mix: applyVariety(TORNADO_THEMES) },
        blitz: { mix: applyVariety(TORNADO_THEMES) },
        rapid: { mix: applyVariety(TORNADO_THEMES) },
        classic: { mix: applyVariety(TORNADO_THEMES) },
      },
    },
    finish_him: {
      modes: {
        win: theoryModes(FINISH_HIM_THEMES)
      },
    },
    theory: {
      modes: {
        win: theoryModes(THEORY_ENDING_CATEGORIES),
        draw: theoryModes(THEORY_ENDING_CATEGORIES)
      }
    },
    practical: { 
      modes: {
        win: theoryModes(PRACTICAL_CHESS_CATEGORIES)
      } 
    },
  }
}

/**
 * Generiert zufällige Hall of Fame Daten.
 */
export function generateRandomHallOfFame(): LeaderboardApiResponse {
  const usernames = ['ChessMaster', 'KnightRider', 'GambitPlayer', 'CheckmateKing', 'EnPassantExpert']
  const tiers: UserSessionProfile['subscriptionTier'][] = ['King', 'Queen', 'Rook', 'Bishop', 'Knight', 'Pawn']

  const genThematic = (): Record<string, ThematicLeaderboardEntry[]> => {
    const res: Record<string, ThematicLeaderboardEntry[]> = {}
    const categories = ['pawn', 'knight', 'bishop', 'rookPawn', 'queen', 'knightBishop', 'rookPieces', 'queenPieces', 'expert']
    categories.forEach(cat => {
      const items: ThematicLeaderboardEntry[] = Array.from({ length: 5 }, (_, i) => ({
        rank: 0,
        username: usernames[getRandomInt(0, usernames.length - 1)]!,
        lichess_id: `user_${i}`,
        score: getRandomInt(50, 400),
        days_old: getRandomInt(0, 10),
        subscriptionTier: tiers[getRandomInt(0, tiers.length - 1)]!
      }))
      
      // Sort by score descending
      items.sort((a, b) => b.score - a.score)
      // Update ranks
      items.forEach((item, index) => { item.rank = index + 1 })
      
      res[cat] = items
    })
    return res
  }

  const genFinishHim = (): Record<string, FinishHimLeaderboardEntry[]> => {
    const res: Record<string, FinishHimLeaderboardEntry[]> = {}
    const categories = ['pawn', 'knight', 'bishop', 'rookPawn', 'queen', 'knightBishop', 'rookPieces', 'queenPieces', 'expert']
    categories.forEach(cat => {
      const items: FinishHimLeaderboardEntry[] = Array.from({ length: 5 }, (_, i) => ({
        rank: 0,
        username: usernames[getRandomInt(0, usernames.length - 1)]!,
        lichess_id: `user_${i}`,
        best_time: getRandomInt(10, 300),
        puzzle_id: `puzzle_${i}`,
        days_old: getRandomInt(0, 10),
        subscriptionTier: tiers[getRandomInt(0, tiers.length - 1)]!
      }))
      
      // Sort by best_time ascending (lower is better for time)
      items.sort((a, b) => a.best_time - b.best_time)
      // Update ranks
      items.forEach((item, index) => { item.rank = index + 1 })
      
      res[cat] = items
    })
    return res
  }

  const genTornado = (): Record<string, TornadoLeaderboardEntry[]> => {
    const res: Record<string, TornadoLeaderboardEntry[]> = {}
    ;(['bullet', 'blitz', 'rapid', 'classic'] as const).forEach(mode => {
      const items: TornadoLeaderboardEntry[] = Array.from({ length: 5 }, (_, i) => ({
        rank: 0,
        username: usernames[getRandomInt(0, usernames.length - 1)]!,
        lichess_id: `user_${i}`,
        highScore: getRandomInt(30, 80),
        days_old: getRandomInt(0, 10),
        subscriptionTier: tiers[getRandomInt(0, tiers.length - 1)]!
      }))

      items.sort((a, b) => b.highScore - a.highScore)
      items.forEach((item, index) => { item.rank = index + 1 })

      res[mode] = items
    })
    return res
  }

  const genOverall = () => {
    const items = Array.from({ length: 15 }, (_, i) => {
      const modes = {
        finish_him: getRandomInt(100, 2000),
        tornado: getRandomInt(100, 2000),
        theory: getRandomInt(100, 2000),
        'practical-chess': getRandomInt(100, 2000),
      }
      const total_solved = Object.values(modes).reduce((a, b) => a + b, 0)
      return {
        lichess_id: `user_${i}`,
        username: usernames[getRandomInt(0, usernames.length - 1)]! + '_' + i,
        subscriptionTier: (tiers[getRandomInt(0, tiers.length - 1)]! as string),
        total_solved,
        total_score: total_solved * 5 + getRandomInt(0, 1000),
        solved_by_mode: modes
      }
    })
    
    // Sort by total_score descending
    return items.sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
  }

  const genStreaks = () => {
    const items = Array.from({ length: 10 }, (_, i) => {
      const streak = getRandomInt(5, 50)
      // Correlate puzzles solved with streak for visual "WOW" effect
      const baseSolved = streak * 50 + getRandomInt(100, 500)
      
      const modes = {
        finish_him: Math.floor(baseSolved * 0.2),
        tornado: Math.floor(baseSolved * 0.4),
        theory: Math.floor(baseSolved * 0.2),
        'practical-chess': Math.floor(baseSolved * 0.2),
      }
      const total_solved = Object.values(modes).reduce((a, b) => a + b, 0)
      
      return {
        lichess_id: `user_streak_${i}`,
        username: usernames[getRandomInt(0, usernames.length - 1)]! + '_S' + i,
        current_streak: streak,
        subscriptionTier: (tiers[getRandomInt(0, tiers.length - 1)]! as string),
        total_solved,
        solved_by_mode: modes
      }
    })

    return items.sort((a, b) => b.current_streak - a.current_streak)
  }

  return {
    tornadoLeaderboard: (genTornado() as { [key in TornadoMode]?: TornadoLeaderboardEntry[] }),
    finishHimLeaderboard: genFinishHim(),
    theoryLeaderboard: genThematic(),
    practicalLeaderboard: genThematic(),
    overallSkillLeaderboard: genOverall(),
    skillStreakLeaderboard: genStreaks(),
    skillStreakMegaLeaderboard: genStreaks(),
    topTodayLeaderboard: genOverall(),
  }
}
