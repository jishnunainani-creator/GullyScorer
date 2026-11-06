import { describe, it, expect } from 'vitest'
import type { BallEvent, MatchConfig } from '../../engine/types'
import {
  calculatePlayerMvp,
  sortMvpRankings,
  deriveMatchMvp,
  MVP_WEIGHTS,
} from '../mvp'

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

describe('MVP / Impact Points Engine', () => {
  it('awards 1 point per run scored off bat', () => {
    const events = [createBall({ batterId: 'p-1', runsOffBat: 1 })]
    const mvp = calculatePlayerMvp(events, config, 'm-1', 'p-1')
    expect(mvp.battingPoints).toBe(1)
    expect(mvp.totalPoints).toBe(1)
  })

  it('awards +1 bonus for four (total 5 pts)', () => {
    const events = [createBall({ batterId: 'p-1', runsOffBat: 4, isBoundary4: true })]
    const mvp = calculatePlayerMvp(events, config, 'm-1', 'p-1')
    expect(mvp.battingPoints).toBe(4 * MVP_WEIGHTS.run + MVP_WEIGHTS.four) // 5 pts
  })

  it('awards +2 bonus for six (total 8 pts)', () => {
    const events = [createBall({ batterId: 'p-1', runsOffBat: 6, isBoundary6: true })]
    const mvp = calculatePlayerMvp(events, config, 'm-1', 'p-1')
    expect(mvp.battingPoints).toBe(6 * MVP_WEIGHTS.run + MVP_WEIGHTS.six) // 8 pts
  })

  it('penalizes duck dismissals with -5 points', () => {
    const events = [
      createBall({
        batterId: 'p-1',
        runsOffBat: 0,
        wicket: { type: 'bowled', playerOutId: 'p-1' },
      }),
    ]
    const mvp = calculatePlayerMvp(events, config, 'm-1', 'p-1')
    expect(mvp.battingPoints).toBe(-5)
    expect(mvp.totalPoints).toBe(-5)
  })

  it('awards strike-rate bonus (>150) when min 10 balls faced', () => {
    const events: BallEvent[] = []
    for (let i = 0; i < 10; i++) {
      events.push(createBall({ batterId: 'p-1', runsOffBat: 2 })) // 20 runs off 10 balls = SR 200
    }
    const mvp = calculatePlayerMvp(events, config, 'm-1', 'p-1')
    expect(mvp.runs).toBe(20)
    expect(mvp.bonusPoints).toBe(MVP_WEIGHTS.strikeRate200Bonus) // +20
  })

  it('does NOT award strike-rate bonus when under 10 balls faced', () => {
    const events: BallEvent[] = [
      createBall({ batterId: 'p-1', runsOffBat: 6, isBoundary6: true }),
      createBall({ batterId: 'p-1', runsOffBat: 6, isBoundary6: true }),
    ] // 12 off 2 balls (SR 600)
    const mvp = calculatePlayerMvp(events, config, 'm-1', 'p-1')
    expect(mvp.bonusPoints).toBe(0)
  })

  it('awards 25 points per bowler wicket', () => {
    const events = [
      createBall({
        bowlerId: 'p-bowl',
        runsOffBat: 1, // run scored so ball is not a dot ball
        wicket: { type: 'bowled', playerOutId: 'p-bat' },
      }),
    ]
    const mvp = calculatePlayerMvp(events, config, 'm-1', 'p-bowl')
    expect(mvp.bowlingPoints).toBe(25)
  })

  it('awards dot-ball points to the bowler', () => {
    const events = [
      createBall({ bowlerId: 'p-bowl', runsOffBat: 0 }),
      createBall({ bowlerId: 'p-bowl', runsOffBat: 0 }),
    ]
    const mvp = calculatePlayerMvp(events, config, 'm-1', 'p-bowl')
    expect(mvp.bowlingPoints).toBe(2 * MVP_WEIGHTS.bowlerDotBall)
  })

  it('awards maiden over bonus (+10 pts)', () => {
    const events: BallEvent[] = []
    for (let i = 0; i < 6; i++) {
      events.push(createBall({ bowlerId: 'p-bowl', runsOffBat: 0 }))
    }
    const mvp = calculatePlayerMvp(events, config, 'm-1', 'p-bowl')
    // 6 dot balls (6 pts) + maiden (10 pts) = 16 pts
    expect(mvp.bowlingPoints).toBe(6 + 10)
  })

  it('awards economy bonus when bowling at least 12 balls with economy < 6', () => {
    const events: BallEvent[] = []
    for (let i = 0; i < 12; i++) {
      events.push(createBall({ bowlerId: 'p-bowl', runsOffBat: 0 }))
    }
    const mvp = calculatePlayerMvp(events, config, 'm-1', 'p-bowl')
    // 0 runs in 12 balls (econ 0.00 < 4.5)
    expect(mvp.bonusPoints).toBe(MVP_WEIGHTS.economyBonusBelow4_5)
  })

  it('awards fielding points for catches (+10)', () => {
    const events = [
      createBall({
        wicket: { type: 'caught', playerOutId: 'p-1', fielderId: 'p-fielder' },
      }),
    ]
    const mvp = calculatePlayerMvp(events, config, 'm-1', 'p-fielder')
    expect(mvp.fieldingPoints).toBe(10)
    expect(mvp.catches).toBe(1)
  })

  it('awards fielding points for run-outs (+15)', () => {
    const events = [
      createBall({
        wicket: { type: 'runout', playerOutId: 'p-1', fielderId: 'p-fielder' },
      }),
    ]
    const mvp = calculatePlayerMvp(events, config, 'm-1', 'p-fielder')
    expect(mvp.fieldingPoints).toBe(15)
    expect(mvp.runOuts).toBe(1)
  })

  it('awards fielding points for stumpings (+15)', () => {
    const events = [
      createBall({
        wicket: { type: 'stumped', playerOutId: 'p-1', fielderId: 'p-fielder' },
      }),
    ]
    const mvp = calculatePlayerMvp(events, config, 'm-1', 'p-fielder')
    expect(mvp.fieldingPoints).toBe(15)
    expect(mvp.stumpings).toBe(1)
  })

  it('handles zero-stat player cleanly with 0 points', () => {
    const mvp = calculatePlayerMvp([], config, 'm-1', 'p-idle')
    expect(mvp.totalPoints).toBe(0)
    expect(mvp.runs).toBe(0)
    expect(mvp.wickets).toBe(0)
  })

  it('sorts MVP rankings by points desc, then wickets, then runs, then ID', () => {
    const p1 = {
      playerId: 'p-B',
      battingPoints: 20,
      bowlingPoints: 0,
      fieldingPoints: 0,
      bonusPoints: 0,
      totalPoints: 20,
      runs: 20,
      wickets: 0,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
    }
    const p2 = {
      playerId: 'p-A',
      battingPoints: 0,
      bowlingPoints: 25,
      fieldingPoints: 0,
      bonusPoints: 0,
      totalPoints: 25,
      runs: 0,
      wickets: 1,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
    }
    const p3 = {
      playerId: 'p-C',
      battingPoints: 25,
      bowlingPoints: 0,
      fieldingPoints: 0,
      bonusPoints: 0,
      totalPoints: 25,
      runs: 25,
      wickets: 0,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
    }

    const sorted = sortMvpRankings([p1, p2, p3])
    // p2 has 25 pts and 1 wkt; p3 has 25 pts and 0 wkts; p1 has 20 pts
    expect(sorted[0]!.playerId).toBe('p-A')
    expect(sorted[1]!.playerId).toBe('p-C')
    expect(sorted[2]!.playerId).toBe('p-B')
  })

  it('correctly identifies Player of the Match, best batter, bowler, and fielder', () => {
    const events = [
      createBall({ batterId: 'p-bat', bowlerId: 'p-bowl', runsOffBat: 30 }),
      createBall({
        bowlerId: 'p-bowl',
        wicket: { type: 'caught', playerOutId: 'p-out', fielderId: 'p-field' },
      }),
    ]

    const result = deriveMatchMvp(events, config, 'm-1', [
      'p-bat',
      'p-bowl',
      'p-field',
    ])

    expect(result.bestBatter?.playerId).toBe('p-bat')
    expect(result.bestBowler?.playerId).toBe('p-bowl')
    expect(result.bestFielder?.playerId).toBe('p-field')
    expect(result.playerOfTheMatch).not.toBeNull()
  })
})
