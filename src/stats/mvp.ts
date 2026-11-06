import type { BallEvent, MatchConfig } from '../engine/types'
import { deriveInningsBatting } from './batting'
import { deriveInningsBowling } from './bowling'
import { deriveFieldingStats } from './fielding'
import type { MvpBreakdown } from './types'

export interface MvpFormulaWeights {
  run: number
  four: number
  six: number
  strikeRate150Bonus: number
  strikeRate200Bonus: number
  minBallsForStrikeRateBonus: number
  wicket: number
  bowlerDotBall: number
  maiden: number
  economyBonusBelow6: number
  economyBonusBelow4_5: number
  minBallsForEconomyBonus: number
  catchTaken: number
  runOutEnacted: number
  stumpingEnacted: number
  duckPenalty: number
}

export const MVP_WEIGHTS: MvpFormulaWeights = {
  run: 1,
  four: 1,
  six: 2,
  strikeRate150Bonus: 10,
  strikeRate200Bonus: 20,
  minBallsForStrikeRateBonus: 10,
  wicket: 25,
  bowlerDotBall: 1,
  maiden: 10,
  economyBonusBelow6: 10,
  economyBonusBelow4_5: 15,
  minBallsForEconomyBonus: 12, // 2 overs
  catchTaken: 10,
  runOutEnacted: 15,
  stumpingEnacted: 15,
  duckPenalty: -5,
}

export function calculatePlayerMvp(
  events: BallEvent[],
  config: MatchConfig,
  matchId: string,
  playerId: string,
  weights: MvpFormulaWeights = MVP_WEIGHTS,
): MvpBreakdown {
  const inn1Bat = deriveInningsBatting(events, matchId, 1)[playerId]
  const inn2Bat = deriveInningsBatting(events, matchId, 2)[playerId]
  const inn1Bowl = deriveInningsBowling(events, matchId, 1, config)[playerId]
  const inn2Bowl = deriveInningsBowling(events, matchId, 2, config)[playerId]
  const fielding = deriveFieldingStats(events, playerId)

  // Aggregate batting
  const runs = (inn1Bat?.runs ?? 0) + (inn2Bat?.runs ?? 0)
  const fours = (inn1Bat?.fours ?? 0) + (inn2Bat?.fours ?? 0)
  const sixes = (inn1Bat?.sixes ?? 0) + (inn2Bat?.sixes ?? 0)
  const ballsFaced = (inn1Bat?.ballsFaced ?? 0) + (inn2Bat?.ballsFaced ?? 0)
  const isDuck = (inn1Bat?.runs === 0 && inn1Bat.isOut) || (inn2Bat?.runs === 0 && inn2Bat.isOut)

  let battingPoints =
    runs * weights.run +
    fours * weights.four +
    sixes * weights.six

  if (isDuck) {
    battingPoints += weights.duckPenalty
  }

  // Strike rate bonus
  let bonusPoints = 0
  if (ballsFaced >= weights.minBallsForStrikeRateBonus) {
    const sr = (runs / ballsFaced) * 100
    if (sr >= 200) {
      bonusPoints += weights.strikeRate200Bonus
    } else if (sr >= 150) {
      bonusPoints += weights.strikeRate150Bonus
    }
  }

  // Aggregate bowling
  const wickets = (inn1Bowl?.wickets ?? 0) + (inn2Bowl?.wickets ?? 0)
  const maidens = (inn1Bowl?.maidens ?? 0) + (inn2Bowl?.maidens ?? 0)
  const dotBalls = (inn1Bowl?.dotBalls ?? 0) + (inn2Bowl?.dotBalls ?? 0)
  const ballsBowled = (inn1Bowl?.ballsBowled ?? 0) + (inn2Bowl?.ballsBowled ?? 0)
  const runsConceded = (inn1Bowl?.runsConceded ?? 0) + (inn2Bowl?.runsConceded ?? 0)

  let bowlingPoints =
    wickets * weights.wicket +
    maidens * weights.maiden +
    dotBalls * weights.bowlerDotBall

  if (ballsBowled >= weights.minBallsForEconomyBonus) {
    const econ = (runsConceded / ballsBowled) * 6
    if (econ < 4.5) {
      bonusPoints += weights.economyBonusBelow4_5
    } else if (econ < 6.0) {
      bonusPoints += weights.economyBonusBelow6
    }
  }

  // Fielding
  const catches = fielding.catches
  const runOuts = fielding.runOuts
  const stumpings = fielding.stumpings

  const fieldingPoints =
    catches * weights.catchTaken +
    runOuts * weights.runOutEnacted +
    stumpings * weights.stumpingEnacted

  const totalPoints = battingPoints + bowlingPoints + fieldingPoints + bonusPoints

  return {
    playerId,
    battingPoints,
    bowlingPoints,
    fieldingPoints,
    bonusPoints,
    totalPoints,
    runs,
    wickets,
    catches,
    runOuts,
    stumpings,
  }
}

export function sortMvpRankings(rankings: MvpBreakdown[]): MvpBreakdown[] {
  return [...rankings].sort((a, b) => {
    // 1. Total points
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints
    }
    // 2. Higher wickets
    if (b.wickets !== a.wickets) {
      return b.wickets - a.wickets
    }
    // 3. Higher runs
    if (b.runs !== a.runs) {
      return b.runs - a.runs
    }
    // 4. Alphabetical tiebreak
    return a.playerId.localeCompare(b.playerId)
  })
}

export function deriveMatchMvp(
  events: BallEvent[],
  config: MatchConfig,
  matchId: string,
  allPlayerIds: string[],
  weights: MvpFormulaWeights = MVP_WEIGHTS,
): {
  rankings: MvpBreakdown[]
  playerOfTheMatch: MvpBreakdown | null
  bestBatter: MvpBreakdown | null
  bestBowler: MvpBreakdown | null
  bestFielder: MvpBreakdown | null
} {
  const breakdowns = allPlayerIds.map((pId) =>
    calculatePlayerMvp(events, config, matchId, pId, weights),
  )

  const rankings = sortMvpRankings(breakdowns)
  const playerOfTheMatch = rankings[0] ?? null

  // Best Batter: max runs, then batting points
  let bestBatter: MvpBreakdown | null = null
  for (const p of rankings) {
    if (p.runs > 0) {
      if (!bestBatter || p.runs > bestBatter.runs || (p.runs === bestBatter.runs && p.battingPoints > bestBatter.battingPoints)) {
        bestBatter = p
      }
    }
  }

  // Best Bowler: max wickets, then bowling points
  let bestBowler: MvpBreakdown | null = null
  for (const p of rankings) {
    if (p.wickets > 0) {
      if (!bestBowler || p.wickets > bestBowler.wickets || (p.wickets === bestBowler.wickets && p.bowlingPoints > bestBowler.bowlingPoints)) {
        bestBowler = p
      }
    }
  }

  // Best Fielder: max fielding points
  let bestFielder: MvpBreakdown | null = null
  for (const p of rankings) {
    if (p.fieldingPoints > 0) {
      if (!bestFielder || p.fieldingPoints > bestFielder.fieldingPoints) {
        bestFielder = p
      }
    }
  }

  return {
    rankings,
    playerOfTheMatch,
    bestBatter,
    bestBowler,
    bestFielder,
  }
}
