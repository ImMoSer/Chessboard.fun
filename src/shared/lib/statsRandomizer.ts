import {
  FINISH_HIM_THEMES,
  PRACTICAL_CHESS_CATEGORIES,
  THEORY_ENDING_CATEGORIES,
  TORNADO_THEMES,
  type LeaderboardApiResponse,
  type PersonalActivityStatsResponse,
  type UserProfileStatsDto,
  type UserSessionProfile,
  type UnifiedLeaderboardResponse,
  type UnifiedLeaderboardEntry
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

  const genThematic = (isTornado = false): UnifiedLeaderboardResponse => {
    const res: UnifiedLeaderboardResponse = {}
    const categories = isTornado 
      ? ['bullet', 'blitz', 'rapid', 'classic'] 
      : ['Novice', 'Pro', 'Master']
    
    categories.forEach(cat => {
      const items: UnifiedLeaderboardEntry[] = Array.from({ length: 5 }, (_, i) => ({
        id: `user_${i}`,
        username: usernames[getRandomInt(0, usernames.length - 1)]!,
        training_status: 'N',
        current_streak: getRandomInt(0, 5),
        tier: tiers[getRandomInt(0, tiers.length - 1)]!,
        sub_mode: cat,
        highScore: getRandomInt(800, 2200),
        solved: getRandomInt(10, 100),
        failed: getRandomInt(2, 20),
        rank: (i + 1).toString()
      }))
      
      items.sort((a, b) => b.highScore - a.highScore)
      items.forEach((item, index) => { item.rank = (index + 1).toString() })
      
      res[cat] = items
    })
    return res
  }

  const genOverall = () => {
    const items = Array.from({ length: 15 }, (_, i) => {
      const score = {
        finish_him: getRandomInt(100, 2000),
        tornado: getRandomInt(100, 2000),
        theory: getRandomInt(100, 2000),
        practical: getRandomInt(100, 2000),
      }
      const solved = {
        finish_him: Math.floor(score.finish_him / 5),
        tornado: score.tornado,
        theory: Math.floor(score.theory / 3),
        practical: Math.floor(score.practical / 5),
      }
      const failed = {
        finish_him: getRandomInt(0, 10),
        tornado: getRandomInt(0, 10),
        theory: getRandomInt(0, 10),
        practical: getRandomInt(0, 10),
      }

      return {
        id: `user_${i}`,
        username: usernames[getRandomInt(0, usernames.length - 1)]! + '_' + i,
        training_status: 'N' as const,
        current_streak: getRandomInt(0, 20),
        tier: (tiers[getRandomInt(0, tiers.length - 1)]! as string),
        score,
        solved,
        failed
      }
    })
    
    return items.sort((a, b) => {
      const scoreA = Object.values(a.score).reduce((sum, val) => sum + val, 0)
      const scoreB = Object.values(b.score).reduce((sum, val) => sum + val, 0)
      return scoreB - scoreA
    })
  }

  const genStreaks = () => {
    const items = Array.from({ length: 10 }, (_, i) => {
      const streak = getRandomInt(5, 50)
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
    tornadoLeaderboard: genThematic(true),
    finishHimLeaderboard: genThematic(false),
    theoryLeaderboard: genThematic(false),
    practicalLeaderboard: genThematic(false),
    overallSkillLeaderboard: {
      period: 30,
      entries: genOverall()
    },
    skillStreakLeaderboard: genStreaks(),
    skillStreakMegaLeaderboard: genStreaks(),
    topTodayLeaderboard: {
      period: 'heute',
      entries: genOverall()
    },
  }
}
