import { describe, it, expect } from 'vitest'
import type { BallEvent } from '../../engine/types'
import { deriveInningsBatting, deriveCareerBatting } from '../batting'

function createBall(overrides: Partial<BallEvent>): BallEvent {
  return {
    id: `b-${Math.random()}`,
    inningsNo: 1,
    batterId: 'p-1',
    nonStrikerId: 'p-2',
    bowlerId: 'p-bowler',
    runsOffBat: 0,
    extra: null,
    wicket: null,
    isBoundary4: false,
    isBoundary6: false,
    timestamp: 1000,
    ...overrides,
  }
}

describe('Batting Stats - Innings & Career', () => {
  it('correctly tracks runs off bat and balls faced', () => {
    const events: BallEvent[] = [
      createBall({ runsOffBat: 1 }),
      createBall({ runsOffBat: 2 }),
      createBall({ runsOffBat: 4, isBoundary4: true }),
      createBall({ runsOffBat: 6, isBoundary6: true }),
    ]

    const stats = deriveInningsBatting(events, 'm-1', 1)
    const p1 = stats['p-1']!

    expect(p1.runs).toBe(13)
    expect(p1.ballsFaced).toBe(4)
    expect(p1.fours).toBe(1)
    expect(p1.sixes).toBe(1)
    expect(p1.strikeRate).toBe(325.0)
    expect(p1.isOut).toBe(false)
  })

  it('does NOT count wides as balls faced by the batter', () => {
    const events: BallEvent[] = [
      createBall({ runsOffBat: 0, extra: { type: 'wide', runs: 1 } }),
      createBall({ runsOffBat: 0, extra: { type: 'wide', runs: 2 } }),
      createBall({ runsOffBat: 4, isBoundary4: true }),
    ]

    const stats = deriveInningsBatting(events, 'm-1', 1)
    const p1 = stats['p-1']!

    expect(p1.ballsFaced).toBe(1) // Only the boundary ball
    expect(p1.runs).toBe(4)
    expect(p1.strikeRate).toBe(400.0)
  })

  it('credits bat runs scored on a no-ball to the batter and counts as ball faced', () => {
    const events: BallEvent[] = [
      createBall({ runsOffBat: 4, extra: { type: 'noball', runs: 1 }, isBoundary4: true }),
    ]

    const stats = deriveInningsBatting(events, 'm-1', 1)
    const p1 = stats['p-1']!

    expect(p1.runs).toBe(4) // Only bat runs
    expect(p1.ballsFaced).toBe(1) // No ball counts as faced
    expect(p1.fours).toBe(1)
  })

  it('does NOT credit byes or leg-byes to the batter', () => {
    const events: BallEvent[] = [
      createBall({ runsOffBat: 0, extra: { type: 'bye', runs: 2 } }),
      createBall({ runsOffBat: 0, extra: { type: 'legbye', runs: 1 } }),
    ]

    const stats = deriveInningsBatting(events, 'm-1', 1)
    const p1 = stats['p-1']!

    expect(p1.runs).toBe(0)
    expect(p1.ballsFaced).toBe(2)
    expect(p1.strikeRate).toBe(0)
  })

  it('tracks dot balls accurately', () => {
    const events: BallEvent[] = [
      createBall({ runsOffBat: 0 }), // dot
      createBall({ runsOffBat: 1 }), // not dot
      createBall({ runsOffBat: 0, extra: { type: 'bye', runs: 1 } }), // bye is not dot for team but 0 off bat
      createBall({ runsOffBat: 0 }), // dot
    ]

    const stats = deriveInningsBatting(events, 'm-1', 1)
    const p1 = stats['p-1']!

    expect(p1.dotBalls).toBe(2)
  })

  it('handles batter run out at the non-striker end correctly', () => {
    const events: BallEvent[] = [
      createBall({
        batterId: 'p-1',
        nonStrikerId: 'p-2',
        runsOffBat: 1,
        wicket: { type: 'runout', playerOutId: 'p-2', fielderId: 'f-1' },
      }),
    ]

    const stats = deriveInningsBatting(events, 'm-1', 1)
    const p1 = stats['p-1']!
    const p2 = stats['p-2']!

    expect(p1.runs).toBe(1)
    expect(p1.ballsFaced).toBe(1)
    expect(p1.isOut).toBe(false)

    expect(p2.runs).toBe(0)
    expect(p2.ballsFaced).toBe(0)
    expect(p2.isOut).toBe(true)
    expect(p2.dismissalType).toBe('runout')
    expect(p2.fielderId).toBe('f-1')
  })

  it('does NOT mark retired batter as an out dismissal', () => {
    const events: BallEvent[] = [
      createBall({
        batterId: 'p-1',
        runsOffBat: 15,
        wicket: { type: 'retired', playerOutId: 'p-1' },
      }),
    ]

    const stats = deriveInningsBatting(events, 'm-1', 1)
    const p1 = stats['p-1']!

    expect(p1.runs).toBe(15)
    expect(p1.isOut).toBe(false)
  })

  it('records shot zones when provided', () => {
    const events: BallEvent[] = [
      createBall({ runsOffBat: 4, isBoundary4: true, shot: { zone: 2 } }),
      createBall({ runsOffBat: 6, isBoundary6: true, shot: { zone: 7 } }),
    ]

    const stats = deriveInningsBatting(events, 'm-1', 1)
    const p1 = stats['p-1']!

    expect(p1.shotZones[2]).toBe(4)
    expect(p1.shotZones[7]).toBe(6)
    expect(p1.shotZones[1]).toBe(0)
  })

  it('computes career averages, strike rates, milestones, and ducks', () => {
    const inn1 = deriveInningsBatting(
      [
        createBall({ runsOffBat: 50, isBoundary4: true }),
        createBall({ wicket: { type: 'bowled', playerOutId: 'p-1' } }),
      ],
      'm-1',
      1,
    )['p-1']!

    const inn2 = deriveInningsBatting(
      [
        createBall({ runsOffBat: 30 }),
      ],
      'm-2',
      1,
    )['p-1']!

    const career = deriveCareerBatting([inn1, inn2], 'p-1')

    expect(career.matches).toBe(2)
    expect(career.innings).toBe(2)
    expect(career.notOuts).toBe(1)
    expect(career.runs).toBe(80)
    expect(career.highestScore).toBe(50)
    expect(career.highestScoreNotOut).toBe(false)
    expect(career.fifties).toBe(1)
    expect(career.thirties).toBe(1)
    expect(career.average).toBe(80.0) // 80 runs / 1 dismissal
  })

  it('handles player with 0 dismissals (undefined / null average)', () => {
    const inn1 = deriveInningsBatting(
      [createBall({ runsOffBat: 45 })],
      'm-1',
      1,
    )['p-1']!

    const career = deriveCareerBatting([inn1], 'p-1')
    expect(career.runs).toBe(45)
    expect(career.notOuts).toBe(1)
    expect(career.average).toBeNull()
    expect(career.highestScore).toBe(45)
    expect(career.highestScoreNotOut).toBe(true)
  })

  it('tracks golden ducks accurately (out on ball 1 for 0)', () => {
    const inn1 = deriveInningsBatting(
      [
        createBall({
          runsOffBat: 0,
          wicket: { type: 'caught', playerOutId: 'p-1', fielderId: 'f-1' },
        }),
      ],
      'm-1',
      1,
    )['p-1']!

    const career = deriveCareerBatting([inn1], 'p-1')
    expect(career.ducks).toBe(1)
    expect(career.goldenDucks).toBe(1)
  })

  it('handles empty innings without throwing', () => {
    const stats = deriveInningsBatting([], 'm-1', 1)
    expect(Object.keys(stats).length).toBe(0)

    const career = deriveCareerBatting([], 'p-empty')
    expect(career.runs).toBe(0)
    expect(career.innings).toBe(0)
    expect(career.average).toBeNull()
  })
})
