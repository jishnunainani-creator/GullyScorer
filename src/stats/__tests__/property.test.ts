import { describe, it, expect } from 'vitest'
import type { BallEvent, MatchConfig } from '../../engine/types'
import { deriveInningsBatting } from '../batting'
import { deriveInningsBowling } from '../bowling'
import { deriveInnings } from '../../engine/innings'

// Simple seeded Linear Congruential Generator (LCG) for reproducible fuzzing
function createRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const config: MatchConfig = {
  oversPerInnings: 5,
  playersPerSide: 6,
  wideReBowl: true,
  noBallFreeHit: true,
  lastManStands: false,
}

describe('Stats Invariant Property Tests (Identities Verification)', () => {
  it('verifies 3 fundamental mathematical invariants over 50 random innings', () => {
    const rng = createRng(42)

    for (let iteration = 0; iteration < 50; iteration++) {
      const events: BallEvent[] = []
      const batters = ['p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6']
      const bowlers = ['b-1', 'b-2', 'b-3']

      let strikerIdx = 0
      let nonStrikerIdx = 1
      let bowlerIdx = 0
      let totalLegalBalls = 0

      // Simulate up to 30 legal balls (5 overs)
      while (totalLegalBalls < 30 && strikerIdx < batters.length) {
        const roll = rng()
        const bowlerId = bowlers[bowlerIdx % bowlers.length]!
        const batterId = batters[strikerIdx]!
        const nonStrikerId = batters[nonStrikerIdx]!

        let runsOffBat = 0
        let extra: BallEvent['extra'] = null
        let is4 = false
        let is6 = false
        let isLegal = true

        if (roll < 0.1) {
          // Wide
          extra = { type: 'wide', runs: 1 }
          isLegal = false
        } else if (roll < 0.15) {
          // No-ball with 1 run off bat
          runsOffBat = 1
          extra = { type: 'noball', runs: 1 }
          isLegal = false
        } else if (roll < 0.2) {
          // Bye
          extra = { type: 'bye', runs: 1 }
          isLegal = true
        } else if (roll < 0.25) {
          // Leg-bye
          extra = { type: 'legbye', runs: 1 }
          isLegal = true
        } else if (roll < 0.5) {
          // Single
          runsOffBat = 1
          isLegal = true
        } else if (roll < 0.6) {
          // Four
          runsOffBat = 4
          is4 = true
          isLegal = true
        } else if (roll < 0.7) {
          // Six
          runsOffBat = 6
          is6 = true
          isLegal = true
        } else {
          // Dot
          runsOffBat = 0
          isLegal = true
        }

        const ball: BallEvent = {
          id: `fuzz-${iteration}-${events.length}`,
          inningsNo: 1,
          batterId,
          nonStrikerId,
          bowlerId,
          runsOffBat,
          extra,
          wicket: null,
          isBoundary4: is4,
          isBoundary6: is6,
          timestamp: Date.now() + events.length * 1000,
        }

        events.push(ball)
        if (isLegal) {
          totalLegalBalls++
          if (totalLegalBalls % 6 === 0) {
            bowlerIdx++
          }
        }
      }

      // Compute pure engine stats
      const engineInnings = deriveInnings(config, events)
      const battingStats = deriveInningsBatting(events, 'fuzz-m', 1)
      const bowlingStats = deriveInningsBowling(events, 'fuzz-m', 1, config)

      // INVARIANT 1: Sum of all batters' runs + extras == team total
      let sumBattersRuns = 0
      for (const b of Object.values(battingStats)) {
        sumBattersRuns += b.runs
      }
      expect(sumBattersRuns + engineInnings.extras.total).toBe(
        engineInnings.totalRuns,
      )

      // INVARIANT 2: Sum of bowler runs conceded + byes + leg-byes == team total
      let sumBowlerRunsConceded = 0
      for (const bowl of Object.values(bowlingStats)) {
        sumBowlerRunsConceded += bowl.runsConceded
      }
      const fieldExtras = engineInnings.extras.byes + engineInnings.extras.legByes
      expect(sumBowlerRunsConceded + fieldExtras).toBe(
        engineInnings.totalRuns,
      )

      // INVARIANT 3: Sum of balls faced by batters + wides == total deliveries bowled
      let sumBallsFaced = 0
      for (const b of Object.values(battingStats)) {
        sumBallsFaced += b.ballsFaced
      }
      const totalWides = events.filter((e) => e.extra?.type === 'wide').length
      expect(sumBallsFaced + totalWides).toBe(events.length)
    }
  })
})
