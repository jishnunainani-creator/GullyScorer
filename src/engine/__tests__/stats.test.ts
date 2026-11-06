import { describe, it, expect, beforeEach } from 'vitest'
import { deriveInnings } from '../innings'
import { createBall, createDefaultConfig, resetEventCounter } from './testHelpers'

describe('Batter & Bowler Statistics', () => {
  const config = createDefaultConfig()

  beforeEach(() => {
    resetEventCounter()
  })

  it('computes batter stats including strike rate, 4s, and 6s', () => {
    const balls = [
      createBall({ batterId: 'Alice', runsOffBat: 4, isBoundary4: true }), // 4 off 1
      createBall({ batterId: 'Alice', runsOffBat: 6, isBoundary6: true }), // 6 off 2
      createBall({ batterId: 'Alice', runsOffBat: 0 }),                     // 0 off 3
      createBall({ batterId: 'Alice', runsOffBat: 2 }),                     // 2 off 4
    ]
    const inn = deriveInnings(config, balls)
    const alice = inn.batterStats['Alice']
    expect(alice).toBeDefined()
    expect(alice?.runs).toBe(12)
    expect(alice?.ballsFaced).toBe(4)
    expect(alice?.fours).toBe(1)
    expect(alice?.sixes).toBe(1)
    expect(alice?.strikeRate).toBe(300) // (12 / 4) * 100
  })

  it('does not increment batter ballsFaced on a wide', () => {
    const balls = [
      createBall({
        batterId: 'Alice',
        runsOffBat: 0,
        extra: { type: 'wide', runs: 1 },
      }),
    ]
    const inn = deriveInnings(config, balls)
    const alice = inn.batterStats['Alice']
    expect(alice?.runs).toBe(0)
    expect(alice?.ballsFaced).toBe(0)
    expect(alice?.strikeRate).toBe(0)
  })

  it('increments batter ballsFaced on a no-ball', () => {
    const balls = [
      createBall({
        batterId: 'Alice',
        runsOffBat: 2,
        extra: { type: 'noball', runs: 1 },
      }),
    ]
    const inn = deriveInnings(config, balls)
    const alice = inn.batterStats['Alice']
    expect(alice?.runs).toBe(2)
    expect(alice?.ballsFaced).toBe(1)
    expect(alice?.strikeRate).toBe(200) // (2 / 1) * 100
  })

  it('computes bowler wickets excluding runout and retired', () => {
    const balls = [
      createBall({
        bowlerId: 'Charlie',
        runsOffBat: 0,
        wicket: { type: 'bowled', playerOutId: 'Alice' },
      }),
      createBall({
        bowlerId: 'Charlie',
        runsOffBat: 0,
        wicket: { type: 'caught', playerOutId: 'Bob' },
      }),
      createBall({
        bowlerId: 'Charlie',
        runsOffBat: 0,
        wicket: { type: 'runout', playerOutId: 'Dave' },
      }),
      createBall({
        bowlerId: 'Charlie',
        runsOffBat: 0,
        wicket: { type: 'retired', playerOutId: 'Eve' },
      }),
    ]
    const inn = deriveInnings(config, balls)
    const charlie = inn.bowlerStats['Charlie']
    expect(charlie?.wickets).toBe(2) // only bowled and caught
    expect(inn.wickets).toBe(4)     // all 4 are team wickets
  })

  it('does not charge byes, leg-byes, or penalties to the bowler', () => {
    const balls = [
      createBall({
        bowlerId: 'Charlie',
        runsOffBat: 0,
        extra: { type: 'bye', runs: 4 },
      }),
      createBall({
        bowlerId: 'Charlie',
        runsOffBat: 0,
        extra: { type: 'legbye', runs: 2 },
      }),
      createBall({
        bowlerId: 'Charlie',
        runsOffBat: 0,
        extra: { type: 'penalty', runs: 5 },
      }),
    ]
    const inn = deriveInnings(config, balls)
    const charlie = inn.bowlerStats['Charlie']
    expect(inn.totalRuns).toBe(11)
    expect(charlie?.runsConceded).toBe(0) // none charged to bowler
    expect(charlie?.economy).toBe(0)
  })

  it('charges bat runs, wides, and no-balls to the bowler and computes economy', () => {
    const balls = [
      createBall({ bowlerId: 'Charlie', runsOffBat: 2 }),
      createBall({
        bowlerId: 'Charlie',
        runsOffBat: 0,
        extra: { type: 'wide', runs: 1 },
      }),
      createBall({
        bowlerId: 'Charlie',
        runsOffBat: 1,
        extra: { type: 'noball', runs: 1 }, // 2 runs conceded on this ball
      }),
      createBall({ bowlerId: 'Charlie', runsOffBat: 1 }),
    ]
    // Legal balls: ball 1 (legal), ball 2 (wide: not legal), ball 3 (noball: not legal), ball 4 (legal) -> 2 legal balls
    // Total bowler runs: 2 + 1 + 2 + 1 = 6 runs conceded
    const inn = deriveInnings(config, balls)
    const charlie = inn.bowlerStats['Charlie']
    expect(charlie?.ballsBowled).toBe(2)
    expect(charlie?.overs).toBe('0.2')
    expect(charlie?.runsConceded).toBe(6)
    // Economy: 6 / (2 / 6) = 18.00
    expect(charlie?.economy).toBe(18)
  })

  it('awards a maiden over when bowler concedes 0 runs in a 6-ball over', () => {
    const balls = [
      createBall({ bowlerId: 'Charlie', runsOffBat: 0 }),
      createBall({ bowlerId: 'Charlie', runsOffBat: 0 }),
      createBall({ bowlerId: 'Charlie', runsOffBat: 0 }),
      createBall({ bowlerId: 'Charlie', runsOffBat: 0 }),
      createBall({ bowlerId: 'Charlie', runsOffBat: 0 }),
      createBall({ bowlerId: 'Charlie', runsOffBat: 0 }),
    ]
    const inn = deriveInnings(config, balls)
    const charlie = inn.bowlerStats['Charlie']
    expect(charlie?.maidens).toBe(1)
  })

  it('denies maiden over if bowler bowls a wide or concedes runs', () => {
    const balls = [
      createBall({ bowlerId: 'Charlie', runsOffBat: 0 }),
      createBall({
        bowlerId: 'Charlie',
        runsOffBat: 0,
        extra: { type: 'wide', runs: 1 },
      }),
      createBall({ bowlerId: 'Charlie', runsOffBat: 0 }),
      createBall({ bowlerId: 'Charlie', runsOffBat: 0 }),
      createBall({ bowlerId: 'Charlie', runsOffBat: 0 }),
      createBall({ bowlerId: 'Charlie', runsOffBat: 0 }),
      createBall({ bowlerId: 'Charlie', runsOffBat: 0 }),
    ]
    const inn = deriveInnings(config, balls)
    const charlie = inn.bowlerStats['Charlie']
    expect(charlie?.maidens).toBe(0)
    expect(charlie?.runsConceded).toBe(1)
  })
})
