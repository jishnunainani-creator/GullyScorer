import { describe, it, expect, beforeEach } from 'vitest'
import { deriveInnings } from '../innings'
import { createBall, createDefaultConfig, resetEventCounter } from './testHelpers'

describe('Strike Rotation & Crease Mechanics', () => {
  const config = createDefaultConfig()

  beforeEach(() => {
    resetEventCounter()
  })

  it('swaps strike on 1 run off bat mid-over', () => {
    const ball1 = createBall({
      batterId: 'Alice',
      nonStrikerId: 'Bob',
      runsOffBat: 1,
    })
    const inn = deriveInnings(config, [ball1])
    expect(inn.currentStrikerId).toBe('Bob')
    expect(inn.currentNonStrikerId).toBe('Alice')
  })

  it('does not swap strike on 2 runs off bat mid-over', () => {
    const ball1 = createBall({
      batterId: 'Alice',
      nonStrikerId: 'Bob',
      runsOffBat: 2,
    })
    const inn = deriveInnings(config, [ball1])
    expect(inn.currentStrikerId).toBe('Alice')
    expect(inn.currentNonStrikerId).toBe('Bob')
  })

  it('swaps strike on 3 runs off bat mid-over', () => {
    const ball1 = createBall({
      batterId: 'Alice',
      nonStrikerId: 'Bob',
      runsOffBat: 3,
    })
    const inn = deriveInnings(config, [ball1])
    expect(inn.currentStrikerId).toBe('Bob')
    expect(inn.currentNonStrikerId).toBe('Alice')
  })

  it('does not swap strike on boundary four', () => {
    const ball1 = createBall({
      batterId: 'Alice',
      nonStrikerId: 'Bob',
      runsOffBat: 4,
      isBoundary4: true,
    })
    const inn = deriveInnings(config, [ball1])
    expect(inn.currentStrikerId).toBe('Alice')
    expect(inn.currentNonStrikerId).toBe('Bob')
  })

  it('does not swap strike on boundary six', () => {
    const ball1 = createBall({
      batterId: 'Alice',
      nonStrikerId: 'Bob',
      runsOffBat: 6,
      isBoundary6: true,
    })
    const inn = deriveInnings(config, [ball1])
    expect(inn.currentStrikerId).toBe('Alice')
    expect(inn.currentNonStrikerId).toBe('Bob')
  })

  it('swaps strike on 1 bye', () => {
    const ball1 = createBall({
      batterId: 'Alice',
      nonStrikerId: 'Bob',
      runsOffBat: 0,
      extra: { type: 'bye', runs: 1 },
    })
    const inn = deriveInnings(config, [ball1])
    expect(inn.currentStrikerId).toBe('Bob')
    expect(inn.currentNonStrikerId).toBe('Alice')
  })

  it('swaps strike on 1 leg-bye', () => {
    const ball1 = createBall({
      batterId: 'Alice',
      nonStrikerId: 'Bob',
      runsOffBat: 0,
      extra: { type: 'legbye', runs: 1 },
    })
    const inn = deriveInnings(config, [ball1])
    expect(inn.currentStrikerId).toBe('Bob')
    expect(inn.currentNonStrikerId).toBe('Alice')
  })

  it('swaps ends at the end of an over on a dot ball', () => {
    // 6 dot balls faced by Alice
    const balls = [
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
    ]
    const inn = deriveInnings(config, balls)
    expect(inn.overs).toBe('1.0')
    // After 6 dot balls, Bob faces over 2!
    expect(inn.currentStrikerId).toBe('Bob')
    expect(inn.currentNonStrikerId).toBe('Alice')
  })

  it('keeps striker on strike when odd run is scored on the 6th ball of an over', () => {
    // 5 dots, then Alice takes 1 run on ball 6.
    // Run swap: Alice -> non-striker, Bob -> striker.
    // End of over swap: Alice -> striker, Bob -> non-striker.
    // Net result: Alice faces first ball of next over.
    const balls = [
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 1 }),
    ]
    const inn = deriveInnings(config, balls)
    expect(inn.overs).toBe('1.0')
    expect(inn.currentStrikerId).toBe('Alice')
    expect(inn.currentNonStrikerId).toBe('Bob')
  })

  it('swaps ends when boundary is scored on the 6th ball of an over', () => {
    // 5 dots, then Alice hits boundary 4 on ball 6.
    // Run: 0 runs run (boundary).
    // End of over: ends swap! Bob faces first ball of over 2.
    const balls = [
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 4, isBoundary4: true }),
    ]
    const inn = deriveInnings(config, balls)
    expect(inn.overs).toBe('1.0')
    expect(inn.currentStrikerId).toBe('Bob')
    expect(inn.currentNonStrikerId).toBe('Alice')
  })

  it('handles striker dismissed bowled on the last ball of an over', () => {
    // 5 dots by Alice, then Alice bowled on ball 6.
    // Alice is out. Bob (non-striker) moves to striker end for next over.
    // The incoming new batter will enter at the non-striker end.
    const balls = [
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({
        batterId: 'Alice',
        nonStrikerId: 'Bob',
        runsOffBat: 0,
        wicket: { type: 'bowled', playerOutId: 'Alice' },
      }),
    ]
    const inn = deriveInnings(config, balls)
    expect(inn.wickets).toBe(1)
    expect(inn.currentStrikerId).toBe('Bob')
    expect(inn.currentNonStrikerId).toBeNull() // awaiting new batter at non-striker end
  })

  it('handles non-striker dismissed run out on the last ball of an over', () => {
    // Alice on strike, Bob at non-striker. On ball 6, 0 runs, Bob run out.
    // Bob is dismissed. Over ends -> Alice moves from striker to non-striker end.
    // The incoming batter will face the next over at striker end.
    const balls = [
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({ batterId: 'Alice', nonStrikerId: 'Bob', runsOffBat: 0 }),
      createBall({
        batterId: 'Alice',
        nonStrikerId: 'Bob',
        runsOffBat: 0,
        wicket: { type: 'runout', playerOutId: 'Bob' },
      }),
    ]
    const inn = deriveInnings(config, balls)
    expect(inn.wickets).toBe(1)
    expect(inn.currentStrikerId).toBeNull() // awaiting new batter at striker end
    expect(inn.currentNonStrikerId).toBe('Alice')
  })

  it('handles run-out with 1 run completed mid-over', () => {
    // Alice on strike, Bob at non-striker.
    // Alice hits, they complete 1 run, but Bob is run out attempting the 2nd run.
    // Completed runs: 1 (odd). They cross: Alice -> non-striker end, Bob -> striker end.
    // Bob is out at striker end.
    // New batter comes in at striker end.
    const ball1 = createBall({
      batterId: 'Alice',
      nonStrikerId: 'Bob',
      runsOffBat: 1,
      wicket: { type: 'runout', playerOutId: 'Bob' },
    })
    const inn = deriveInnings(config, [ball1])
    expect(inn.totalRuns).toBe(1)
    expect(inn.wickets).toBe(1)
    expect(inn.currentStrikerId).toBeNull() // Bob was at striker end and is out; awaiting new batter
    expect(inn.currentNonStrikerId).toBe('Alice')
  })

  it('handles retired batter vacating the crease', () => {
    const ball1 = createBall({
      batterId: 'Alice',
      nonStrikerId: 'Bob',
      runsOffBat: 0,
      wicket: { type: 'retired', playerOutId: 'Alice' },
    })
    const inn = deriveInnings(config, [ball1])
    expect(inn.wickets).toBe(1)
    expect(inn.batterStats['Alice']?.isOut).toBe(true)
    expect(inn.currentStrikerId).toBeNull()
    expect(inn.currentNonStrikerId).toBe('Bob')
  })
})
