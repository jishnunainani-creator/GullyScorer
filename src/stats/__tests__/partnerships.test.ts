import { describe, it, expect } from 'vitest'
import type { BallEvent, MatchConfig } from '../../engine/types'
import { deriveInningsPartnerships } from '../partnerships'
import { deriveInningsPhaseStats, getMatchPhase } from '../phases'

const config: MatchConfig = {
  oversPerInnings: 10,
  playersPerSide: 11,
  wideReBowl: true,
  noBallFreeHit: true,
  lastManStands: false,
}

function createBall(overrides: Partial<BallEvent>): BallEvent {
  return {
    id: `b-${Math.random()}`,
    inningsNo: 1,
    batterId: 'p-1',
    nonStrikerId: 'p-2',
    bowlerId: 'p-bowl',
    runsOffBat: 0,
    extra: null,
    wicket: null,
    isBoundary4: false,
    isBoundary6: false,
    timestamp: 1000,
    ...overrides,
  }
}

describe('Partnerships and Match Phases', () => {
  it('tracks partnerships between batters and ends partnership on wicket', () => {
    const events: BallEvent[] = [
      createBall({ batterId: 'p-1', nonStrikerId: 'p-2', runsOffBat: 4, isBoundary4: true }),
      createBall({ batterId: 'p-1', nonStrikerId: 'p-2', runsOffBat: 1 }),
      createBall({ batterId: 'p-2', nonStrikerId: 'p-1', runsOffBat: 6, isBoundary6: true }),
      // Wicket of p-1
      createBall({
        batterId: 'p-2',
        nonStrikerId: 'p-1',
        wicket: { type: 'bowled', playerOutId: 'p-1' },
      }),
      // Next ball with incoming batter p-3
      createBall({ batterId: 'p-2', nonStrikerId: 'p-3', runsOffBat: 2 }),
    ]

    const { partnerships, bestPartnership, fallOfWickets } = deriveInningsPartnerships(
      events,
      1,
      config,
    )

    expect(partnerships.length).toBe(2)
    // First partnership: 11 runs (4 + 1 + 6)
    expect(partnerships[0]!.runs).toBe(11)
    expect(partnerships[0]!.batter1Runs).toBe(5)
    expect(partnerships[0]!.batter2Runs).toBe(6)

    // Fall of wickets
    expect(fallOfWickets.length).toBe(1)
    expect(fallOfWickets[0]!.wicketNo).toBe(1)
    expect(fallOfWickets[0]!.score).toBe(11)
    expect(fallOfWickets[0]!.playerOutId).toBe('p-1')

    // Best partnership
    expect(bestPartnership?.runs).toBe(11)
  })

  it('calculates dynamic phase thresholds based on total overs', () => {
    // 20 overs match: Powerplay = 1-5, Middle = 6-15, Death = 16-20
    expect(getMatchPhase(0, 20)).toBe('powerplay')
    expect(getMatchPhase(4, 20)).toBe('powerplay')
    expect(getMatchPhase(10, 20)).toBe('middle')
    expect(getMatchPhase(18, 20)).toBe('death')

    // 10 overs match: Powerplay = 1-3, Middle = 4-7, Death = 8-10
    expect(getMatchPhase(0, 10)).toBe('powerplay')
    expect(getMatchPhase(5, 10)).toBe('middle')
    expect(getMatchPhase(9, 10)).toBe('death')
  })

  it('aggregates runs, balls, wickets, and run rates by phase', () => {
    // 6 legal balls in over 0 (Powerplay), then 6 balls in over 1 (Powerplay)
    const events: BallEvent[] = []
    for (let i = 0; i < 6; i++) {
      events.push(createBall({ runsOffBat: 2 })) // 12 runs
    }

    const phases = deriveInningsPhaseStats(events, 1, config)
    expect(phases.powerplay.runs).toBe(12)
    expect(phases.powerplay.balls).toBe(6)
    expect(phases.powerplay.runRate).toBe(12.0)
    expect(phases.middle.runs).toBe(0)
    expect(phases.death.runs).toBe(0)
  })
})
