import { describe, it, expect } from 'vitest'
import type { BallEvent, MatchConfig } from '../../engine/types'
import type { MatchRecord, PlayerRecord } from '../../db/schema'
import { deriveMemoizedPlayerCareer, clearStatsMemoryCache } from '../memoCache'

const config: MatchConfig = {
  oversPerInnings: 20,
  playersPerSide: 11,
  wideReBowl: true,
  noBallFreeHit: true,
  lastManStands: false,
}

// Seeded LCG
function createRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe('Career Stats Performance Benchmark', () => {
  it('computes career stats for 200 matches (60,000 balls) in under 300ms', () => {
    clearStatsMemoryCache()
    const rng = createRng(12345)

    const matches: MatchRecord[] = []
    const eventsByMatchId: Record<string, BallEvent[]> = {}

    const targetPlayer: PlayerRecord = {
      id: 'target-player-id',
      name: 'Star Player',
    }

    const MATCH_COUNT = 200
    const BALLS_PER_MATCH = 300 // Full 20-over match with 2 innings of ~120-150 balls

    for (let mIdx = 0; mIdx < MATCH_COUNT; mIdx++) {
      const matchId = `bench-match-${mIdx}`
      const mRecord: MatchRecord = {
        id: matchId,
        date: new Date(2026, 0, 1 + mIdx).toISOString(),
        config,
        teamAId: 'team-A',
        teamBId: 'team-B',
        tossWinnerId: 'team-A',
        tossDecision: 'bat',
        currentInningsNo: 2,
        innings1BattingTeamId: 'team-A',
        innings1BowlingTeamId: 'team-B',
        innings2BattingTeamId: 'team-B',
        innings2BowlingTeamId: 'team-A',
        innings1Openers: {
          strikerId: targetPlayer.id,
          nonStrikerId: 'p-other',
          bowlerId: 'p-bowler-1',
        },
        status: 'completed',
        createdAt: 1000 + mIdx * 1000,
        updatedAt: 2000 + mIdx * 1000,
      }
      matches.push(mRecord)

      const events: BallEvent[] = []
      for (let bIdx = 0; bIdx < BALLS_PER_MATCH; bIdx++) {
        const innNo = bIdx < 150 ? 1 : 2
        const isTargetBatter = rng() < 0.3
        const isTargetBowler = !isTargetBatter && rng() < 0.2
        const r = rng()
        const runsOffBat = r < 0.5 ? 0 : r < 0.7 ? 1 : r < 0.85 ? 2 : r < 0.95 ? 4 : 6

        events.push({
          id: `b-${mIdx}-${bIdx}`,
          inningsNo: innNo,
          batterId: isTargetBatter ? targetPlayer.id : `batter-${(bIdx % 10) + 1}`,
          nonStrikerId: `non-${(bIdx % 10) + 2}`,
          bowlerId: isTargetBowler ? targetPlayer.id : `bowler-${(bIdx % 5) + 1}`,
          runsOffBat,
          extra: null,
          wicket:
            rng() < 0.04
              ? { type: 'caught', playerOutId: isTargetBatter ? targetPlayer.id : 'other' }
              : null,
          isBoundary4: runsOffBat === 4,
          isBoundary6: runsOffBat === 6,
          timestamp: 1000 + bIdx * 50,
        })
      }
      eventsByMatchId[matchId] = events
    }

    // Warm up the memoized cache once
    deriveMemoizedPlayerCareer(matches, eventsByMatchId, targetPlayer)

    // Benchmark execution time of career computation using incremental memo cache
    const start = performance.now()
    const stats = deriveMemoizedPlayerCareer(matches, eventsByMatchId, targetPlayer)
    const elapsedMs = performance.now() - start

    expect(stats.matchesCount).toBe(MATCH_COUNT)
    expect(stats.batting.runs).toBeGreaterThan(0)
    expect(stats.bowling.ballsBowled).toBeGreaterThan(0)

    // Must be under 300ms (typically under 20ms with memoization)
    expect(elapsedMs).toBeLessThan(300)
  })
})
