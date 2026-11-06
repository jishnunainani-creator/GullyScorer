import { describe, it, expect } from 'vitest'
import type { BallEvent, MatchConfig } from '../../engine/types'
import { deriveInningsBowling, deriveCareerBowling } from '../bowling'

const standardConfig: MatchConfig = {
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
    batterId: 'p-bat',
    nonStrikerId: 'p-non',
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

describe('Bowling Stats - Innings & Career', () => {
  it('correctly tracks legal deliveries, wickets, runs conceded, and economy', () => {
    const events: BallEvent[] = [
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 1 }),
      createBall({ runsOffBat: 0, wicket: { type: 'bowled', playerOutId: 'p-bat' } }),
      createBall({ runsOffBat: 4, isBoundary4: true }),
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0 }),
    ]

    const stats = deriveInningsBowling(events, 'm-1', 1, standardConfig)['p-bowl']!

    expect(stats.ballsBowled).toBe(6)
    expect(stats.overs).toBe('1.0')
    expect(stats.runsConceded).toBe(5)
    expect(stats.wickets).toBe(1)
    expect(stats.economy).toBe(5.0)
    expect(stats.average).toBe(5.0)
    expect(stats.strikeRate).toBe(6.0)
    expect(stats.maidens).toBe(0)
  })

  it('detects maiden over when 6 legal deliveries concede 0 bowler runs', () => {
    const events: BallEvent[] = [
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0 }),
    ]

    const stats = deriveInningsBowling(events, 'm-1', 1, standardConfig)['p-bowl']!

    expect(stats.ballsBowled).toBe(6)
    expect(stats.overs).toBe('1.0')
    expect(stats.runsConceded).toBe(0)
    expect(stats.maidens).toBe(1)
  })

  it('does NOT count maiden if a wide was bowled in that over (wide concedes runs)', () => {
    const events: BallEvent[] = [
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0, extra: { type: 'wide', runs: 1 } }),
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0 }), // 6th legal ball
    ]

    const stats = deriveInningsBowling(events, 'm-1', 1, standardConfig)['p-bowl']!

    expect(stats.ballsBowled).toBe(6)
    expect(stats.runsConceded).toBe(1) // 1 wide run
    expect(stats.maidens).toBe(0)
    expect(stats.widesConceded).toBe(1)
  })

  it('still counts maiden if byes or leg-byes occurred (not charged to bowler)', () => {
    const events: BallEvent[] = [
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0, extra: { type: 'bye', runs: 2 } }),
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0, extra: { type: 'legbye', runs: 1 } }),
      createBall({ runsOffBat: 0 }),
    ]

    const stats = deriveInningsBowling(events, 'm-1', 1, standardConfig)['p-bowl']!

    expect(stats.ballsBowled).toBe(6)
    expect(stats.runsConceded).toBe(0)
    expect(stats.maidens).toBe(1)
  })

  it('does NOT credit bowler for run-outs or retired batters', () => {
    const events: BallEvent[] = [
      createBall({
        runsOffBat: 1,
        wicket: { type: 'runout', playerOutId: 'p-bat', fielderId: 'f-1' },
      }),
      createBall({
        runsOffBat: 0,
        wicket: { type: 'retired', playerOutId: 'p-bat' },
      }),
    ]

    const stats = deriveInningsBowling(events, 'm-1', 1, standardConfig)['p-bowl']!

    expect(stats.wickets).toBe(0)
    expect(stats.runsConceded).toBe(1)
  })

  it('credits bowler for bowled, caught, lbw, stumped, and hitwicket', () => {
    const events: BallEvent[] = [
      createBall({ wicket: { type: 'bowled', playerOutId: 'p-1' } }),
      createBall({ wicket: { type: 'caught', playerOutId: 'p-2', fielderId: 'f-1' } }),
      createBall({ wicket: { type: 'lbw', playerOutId: 'p-3' } }),
      createBall({ wicket: { type: 'stumped', playerOutId: 'p-4', fielderId: 'f-1' } }),
      createBall({ wicket: { type: 'hitwicket', playerOutId: 'p-5' } }),
    ]

    const stats = deriveInningsBowling(events, 'm-1', 1, standardConfig)['p-bowl']!

    expect(stats.wickets).toBe(5)
    expect(stats.wicketTypes.bowled).toBe(1)
    expect(stats.wicketTypes.caught).toBe(1)
    expect(stats.wicketTypes.lbw).toBe(1)
    expect(stats.wicketTypes.stumped).toBe(1)
    expect(stats.wicketTypes.hitwicket).toBe(1)
  })

  it('detects a hat-trick (3 consecutive wicket balls)', () => {
    const events: BallEvent[] = [
      createBall({ wicket: { type: 'bowled', playerOutId: 'p-1' } }),
      createBall({ wicket: { type: 'caught', playerOutId: 'p-2', fielderId: 'f-1' } }),
      createBall({ wicket: { type: 'lbw', playerOutId: 'p-3' } }),
    ]

    const stats = deriveInningsBowling(events, 'm-1', 1, standardConfig)['p-bowl']!

    expect(stats.wickets).toBe(3)
    expect(stats.hatTricks).toBe(1)
  })

  it('detects a hat-trick spanning across over boundaries', () => {
    // 5 balls, then wickets on balls 5 & 6, then another bowler bowls an over, then 1st bowler takes wicket on ball 1 of next over
    const events: BallEvent[] = [
      // Bowler A over 1 (balls 1 to 4 dot)
      createBall({ bowlerId: 'p-A' }),
      createBall({ bowlerId: 'p-A' }),
      createBall({ bowlerId: 'p-A' }),
      createBall({ bowlerId: 'p-A' }),
      // Wicket on ball 5 & 6
      createBall({ bowlerId: 'p-A', wicket: { type: 'bowled', playerOutId: 'p-1' } }),
      createBall({ bowlerId: 'p-A', wicket: { type: 'caught', playerOutId: 'p-2', fielderId: 'f' } }),

      // Bowler B bowls over 2 (6 legal balls)
      createBall({ bowlerId: 'p-B' }),
      createBall({ bowlerId: 'p-B' }),
      createBall({ bowlerId: 'p-B' }),
      createBall({ bowlerId: 'p-B' }),
      createBall({ bowlerId: 'p-B' }),
      createBall({ bowlerId: 'p-B' }),

      // Bowler A returns for over 3, takes wicket on ball 1!
      createBall({ bowlerId: 'p-A', wicket: { type: 'lbw', playerOutId: 'p-3' } }),
    ]

    const statsA = deriveInningsBowling(events, 'm-1', 1, standardConfig)['p-A']!

    expect(statsA.wickets).toBe(3)
    expect(statsA.hatTricks).toBe(1)
  })

  it('resets hat-trick counter when a non-wicket ball is delivered', () => {
    const events: BallEvent[] = [
      createBall({ wicket: { type: 'bowled', playerOutId: 'p-1' } }),
      createBall({ wicket: { type: 'caught', playerOutId: 'p-2', fielderId: 'f-1' } }),
      createBall({ runsOffBat: 0 }), // Non-wicket dot ball resets streak
      createBall({ wicket: { type: 'lbw', playerOutId: 'p-3' } }),
    ]

    const stats = deriveInningsBowling(events, 'm-1', 1, standardConfig)['p-bowl']!

    expect(stats.wickets).toBe(3)
    expect(stats.hatTricks).toBe(0)
  })

  it('aggregates career bowling: best figures, averages, and multi-wicket hauls', () => {
    const inn1 = deriveInningsBowling(
      [
        createBall({ wicket: { type: 'bowled', playerOutId: 'p-1' } }),
        createBall({ wicket: { type: 'bowled', playerOutId: 'p-2' } }),
        createBall({ wicket: { type: 'bowled', playerOutId: 'p-3' } }),
        createBall({ runsOffBat: 12 }),
      ],
      'm-1',
      1,
      standardConfig,
    )['p-bowl']! // 3/12

    const inn2 = deriveInningsBowling(
      [
        createBall({ wicket: { type: 'bowled', playerOutId: 'p-4' } }),
        createBall({ runsOffBat: 20 }),
      ],
      'm-2',
      1,
      standardConfig,
    )['p-bowl']! // 1/20

    const career = deriveCareerBowling([inn1, inn2], 'p-bowl')

    expect(career.matches).toBe(2)
    expect(career.wickets).toBe(4)
    expect(career.runsConceded).toBe(32)
    expect(career.average).toBe(8.0) // 32 / 4
    expect(career.bestFiguresDisplay).toBe('3/12')
    expect(career.threeWickets).toBe(1)
    expect(career.fiveWickets).toBe(0)
  })

  it('handles bowler with 0 wickets (null average and strike rate)', () => {
    const inn1 = deriveInningsBowling(
      [createBall({ runsOffBat: 8 })],
      'm-1',
      1,
      standardConfig,
    )['p-bowl']!

    const career = deriveCareerBowling([inn1], 'p-bowl')
    expect(career.wickets).toBe(0)
    expect(career.average).toBeNull()
    expect(career.strikeRate).toBeNull()
    expect(career.bestFiguresDisplay).toBe('0/0')
  })
})
