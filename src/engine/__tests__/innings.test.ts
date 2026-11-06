import { describe, it, expect, beforeEach } from 'vitest'
import { deriveInnings } from '../innings'
import { undoLast } from '../events'
import { createBall, createDefaultConfig, resetEventCounter } from './testHelpers'

describe('Innings Derivation & Rules', () => {
  const config = createDefaultConfig()

  beforeEach(() => {
    resetEventCounter()
  })

  it('handles completely empty innings', () => {
    const inn = deriveInnings(config, [])
    expect(inn.inningsNo).toBe(1)
    expect(inn.totalRuns).toBe(0)
    expect(inn.wickets).toBe(0)
    expect(inn.legalBalls).toBe(0)
    expect(inn.overs).toBe('0.0')
    expect(inn.isComplete).toBe(false)
    expect(inn.endReason).toBeNull()
    expect(inn.currentStrikerId).toBeNull()
    expect(inn.currentNonStrikerId).toBeNull()
  })

  it('handles wide with re-bowl: score increases but legal balls do not advance', () => {
    const ball1 = createBall({
      runsOffBat: 0,
      extra: { type: 'wide', runs: 1 },
    })
    const inn = deriveInnings(config, [ball1])
    expect(inn.totalRuns).toBe(1)
    expect(inn.legalBalls).toBe(0)
    expect(inn.overs).toBe('0.0')
    expect(inn.extras.wides).toBe(1)
    expect(inn.extras.total).toBe(1)
  })

  it('handles wide when wideReBowl is false: legal balls advance', () => {
    const customConfig = createDefaultConfig({ wideReBowl: false })
    const ball1 = createBall({
      runsOffBat: 0,
      extra: { type: 'wide', runs: 1 },
    })
    const inn = deriveInnings(customConfig, [ball1])
    expect(inn.totalRuns).toBe(1)
    expect(inn.legalBalls).toBe(1)
    expect(inn.overs).toBe('0.1')
  })

  it('handles bat runs plus extras on a no-ball', () => {
    // Batter hits 2 runs on a no-ball
    const ball1 = createBall({
      batterId: 'Alice',
      runsOffBat: 2,
      extra: { type: 'noball', runs: 1 },
    })
    const inn = deriveInnings(config, [ball1])
    expect(inn.totalRuns).toBe(3)
    expect(inn.legalBalls).toBe(0) // no-ball does not advance legal balls
    expect(inn.overs).toBe('0.0')
    expect(inn.extras.noBalls).toBe(1)
    expect(inn.batterStats['Alice']?.runs).toBe(2)
    expect(inn.batterStats['Alice']?.ballsFaced).toBe(1)
    expect(inn.isFreeHit).toBe(true)
  })

  it('activates Free Hit after no-ball and consumes it on next legal delivery', () => {
    const ball1 = createBall({
      runsOffBat: 0,
      extra: { type: 'noball', runs: 1 },
    })
    const ball2 = createBall({
      runsOffBat: 1,
      extra: null,
    })
    const inn1 = deriveInnings(config, [ball1])
    expect(inn1.isFreeHit).toBe(true)

    const inn2 = deriveInnings(config, [ball1, ball2])
    expect(inn2.isFreeHit).toBe(false)
    expect(inn2.legalBalls).toBe(1)
  })

  it('carries Free Hit over if next ball is a wide or another no-ball', () => {
    const ball1 = createBall({
      runsOffBat: 0,
      extra: { type: 'noball', runs: 1 },
    })
    const ball2 = createBall({
      runsOffBat: 0,
      extra: { type: 'wide', runs: 1 },
    })
    const ball3 = createBall({
      runsOffBat: 0,
      extra: { type: 'noball', runs: 1 },
    })
    const inn = deriveInnings(config, [ball1, ball2, ball3])
    expect(inn.isFreeHit).toBe(true)
    expect(inn.legalBalls).toBe(0)
  })

  it('disallows bowled dismissal on a Free Hit', () => {
    const ball1 = createBall({
      runsOffBat: 0,
      extra: { type: 'noball', runs: 1 },
    })
    const ball2 = createBall({
      batterId: 'Alice',
      runsOffBat: 0,
      wicket: { type: 'bowled', playerOutId: 'Alice' },
    })
    const inn = deriveInnings(config, [ball1, ball2])
    // The bowled wicket must be rejected because it occurred on a Free Hit!
    expect(inn.wickets).toBe(0)
    expect(inn.batterStats['Alice']?.isOut).toBe(false)
    expect(inn.fallOfWickets).toHaveLength(0)
  })

  it('disallows caught dismissal on a Free Hit', () => {
    const ball1 = createBall({
      runsOffBat: 0,
      extra: { type: 'noball', runs: 1 },
    })
    const ball2 = createBall({
      batterId: 'Alice',
      runsOffBat: 0,
      wicket: { type: 'caught', playerOutId: 'Alice' },
    })
    const inn = deriveInnings(config, [ball1, ball2])
    expect(inn.wickets).toBe(0)
    expect(inn.batterStats['Alice']?.isOut).toBe(false)
  })

  it('allows run-out dismissal on a Free Hit', () => {
    const ball1 = createBall({
      runsOffBat: 0,
      extra: { type: 'noball', runs: 1 },
    })
    const ball2 = createBall({
      batterId: 'Alice',
      nonStrikerId: 'Bob',
      runsOffBat: 1,
      wicket: { type: 'runout', playerOutId: 'Alice' },
    })
    const inn = deriveInnings(config, [ball1, ball2])
    expect(inn.wickets).toBe(1)
    expect(inn.batterStats['Alice']?.isOut).toBe(true)
    expect(inn.fallOfWickets).toHaveLength(1)
  })

  it('ends innings mid-over when target is chased and ignores subsequent events', () => {
    // Target is 10.
    const balls = [
      createBall({ runsOffBat: 4 }), // 4
      createBall({ runsOffBat: 4 }), // 8
      createBall({ runsOffBat: 4 }), // 12 -> target 10 reached!
      createBall({ runsOffBat: 6 }), // this ball should NOT be processed
    ]
    const inn = deriveInnings(config, balls, { target: 10 })
    expect(inn.isComplete).toBe(true)
    expect(inn.endReason).toBe('target_chased')
    expect(inn.totalRuns).toBe(12)
    expect(inn.legalBalls).toBe(3)
    expect(inn.overs).toBe('0.3')
  })

  it('ends innings when allocated overs are complete', () => {
    const shortConfig = createDefaultConfig({ oversPerInnings: 1 }) // 1 over = 6 balls
    const balls = [
      createBall({ runsOffBat: 1 }),
      createBall({ runsOffBat: 1 }),
      createBall({ runsOffBat: 1 }),
      createBall({ runsOffBat: 1 }),
      createBall({ runsOffBat: 1 }),
      createBall({ runsOffBat: 1 }),
    ]
    const inn = deriveInnings(shortConfig, balls)
    expect(inn.isComplete).toBe(true)
    expect(inn.endReason).toBe('overs_complete')
    expect(inn.overs).toBe('1.0')
  })

  it('ends innings with all_out when 10 wickets fall in 11-player team without LMS', () => {
    const configNoLMS = createDefaultConfig({ playersPerSide: 11, lastManStands: false })
    const balls = []
    for (let i = 1; i <= 10; i++) {
      balls.push(
        createBall({
          batterId: `player-${i}`,
          runsOffBat: 0,
          wicket: { type: 'bowled', playerOutId: `player-${i}` },
        }),
      )
    }
    const inn = deriveInnings(configNoLMS, balls)
    expect(inn.wickets).toBe(10)
    expect(inn.isComplete).toBe(true)
    expect(inn.endReason).toBe('all_out')
  })

  it('allows lone batter to bat alone when lastManStands is true at 10 wickets', () => {
    const configLMS = createDefaultConfig({ playersPerSide: 11, lastManStands: true })
    const balls = []
    for (let i = 1; i <= 10; i++) {
      balls.push(
        createBall({
          batterId: `player-${i}`,
          nonStrikerId: 'player-11',
          runsOffBat: 0,
          wicket: { type: 'bowled', playerOutId: `player-${i}` },
        }),
      )
    }
    const inn = deriveInnings(configLMS, balls)
    expect(inn.wickets).toBe(10)
    // In LMS, at 10 wickets the innings is NOT all out!
    expect(inn.isComplete).toBe(false)
    expect(inn.endReason).toBeNull()
    // Lone batter player-11 is at striker and nonStriker is null
    expect(inn.currentStrikerId).toBe('player-11')
    expect(inn.currentNonStrikerId).toBeNull()

    // 11th wicket dismisses the lone batter -> all out!
    const ball11 = createBall({
      batterId: 'player-11',
      nonStrikerId: '',
      runsOffBat: 0,
      wicket: { type: 'bowled', playerOutId: 'player-11' },
    })
    const innComplete = deriveInnings(configLMS, [...balls, ball11])
    expect(innComplete.wickets).toBe(11)
    expect(innComplete.isComplete).toBe(true)
    expect(innComplete.endReason).toBe('all_out')
  })

  it('supports undo across over boundary', () => {
    // 6 legal balls: over 1.0 complete
    const balls = [
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 1 }), // 0.1
      createBall({ batterId: 'Bob', nonStrikerId: 'Alice', runsOffBat: 1 }),   // 0.2
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 1 }), // 0.3
      createBall({ batterId: 'Bob', nonStrikerId: 'Alice', runsOffBat: 1 }),   // 0.4
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 1 }), // 0.5
      createBall({ batterId: 'Bob', nonStrikerId: 'Alice', runsOffBat: 0 }),   // 1.0 (dot ball, ends swap)
    ]
    const stateBeforeUndo = deriveInnings(config, balls)
    expect(stateBeforeUndo.overs).toBe('1.0')
    expect(stateBeforeUndo.legalBalls).toBe(6)

    // Undo the 6th ball
    const undoneEvents = undoLast(balls, 1)
    const stateAfterUndo = deriveInnings(config, undoneEvents)
    expect(stateAfterUndo.overs).toBe('0.5')
    expect(stateAfterUndo.legalBalls).toBe(5)
    expect(stateAfterUndo.totalRuns).toBe(5)
    expect(stateAfterUndo.currentStrikerId).toBe('Bob')
    expect(stateAfterUndo.currentNonStrikerId).toBe('Alice')
  })

  it('supports undo after wicket', () => {
    const balls = [
      createBall({ batterId: 'Alice', runsOffBat: 4, isBoundary4: true }),
      createBall({
        batterId: 'Alice',
        runsOffBat: 0,
        wicket: { type: 'bowled', playerOutId: 'Alice' },
      }),
    ]
    const stateWithWicket = deriveInnings(config, balls)
    expect(stateWithWicket.wickets).toBe(1)
    expect(stateWithWicket.batterStats['Alice']?.isOut).toBe(true)

    // Undo wicket ball
    const undoneEvents = undoLast(balls, 1)
    const stateUndone = deriveInnings(config, undoneEvents)
    expect(stateUndone.wickets).toBe(0)
    expect(stateUndone.batterStats['Alice']?.isOut).toBe(false)
    expect(stateUndone.totalRuns).toBe(4)
  })

  it('tracks partnerships across fall of wickets', () => {
    const balls = [
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 4 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 6 }),
      createBall({
        batterId: 'Alice',
        nonStrikerId: 'Bob',
        runsOffBat: 0,
        wicket: { type: 'bowled', playerOutId: 'Alice' },
      }),
      // New batter Charlie enters
      createBall({ batterId: 'Charlie', nonStrikerId: 'Bob', runsOffBat: 2 }),
    ]
    const inn = deriveInnings(config, balls)
    expect(inn.fallOfWickets).toHaveLength(1)
    expect(inn.fallOfWickets[0]?.score).toBe(10)
    expect(inn.fallOfWickets[0]?.partnershipRuns).toBe(10)
    expect(inn.partnerships).toHaveLength(1)
    expect(inn.partnerships[0]?.runs).toBe(10)
    expect(inn.currentPartnership?.runs).toBe(2)
  })
})
