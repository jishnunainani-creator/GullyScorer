import { describe, it, expect } from 'vitest'
import { calculateChase } from '../chase'

describe('Chase Calculator', () => {
  it('calculates chase correctly when runs needed and balls remain', () => {
    // Target 50, currently 46, 109 balls bowled out of 20 overs (120 balls) -> 11 balls remaining
    const chase = calculateChase(50, 46, 109, 20)
    expect(chase.target).toBe(50)
    expect(chase.runsNeeded).toBe(4)
    expect(chase.ballsRemaining).toBe(11)
    expect(chase.requiredRunRate).toBe(2.18) // (4 / 11) * 6 = 2.1818... -> 2.18
    expect(chase.formattedText).toBe('4 off 11')
  })

  it('handles target reached exactly', () => {
    const chase = calculateChase(100, 100, 60, 20)
    expect(chase.runsNeeded).toBe(0)
    expect(chase.requiredRunRate).toBe(0)
    expect(chase.formattedText).toBe('Target reached')
  })

  it('handles target exceeded', () => {
    const chase = calculateChase(100, 104, 60, 20)
    expect(chase.runsNeeded).toBe(0)
    expect(chase.requiredRunRate).toBe(0)
    expect(chase.formattedText).toBe('Target reached')
  })

  it('handles balls exhausted with runs still needed', () => {
    // 20 overs complete = 120 balls, 10 runs needed
    const chase = calculateChase(120, 110, 120, 20)
    expect(chase.runsNeeded).toBe(10)
    expect(chase.ballsRemaining).toBe(0)
    expect(chase.requiredRunRate).toBe(Infinity)
    expect(chase.formattedText).toBe('10 needed, overs completed')
  })

  it('handles chase calculation on first ball of innings', () => {
    const chase = calculateChase(150, 0, 0, 20)
    expect(chase.runsNeeded).toBe(150)
    expect(chase.ballsRemaining).toBe(120)
    expect(chase.requiredRunRate).toBe(7.5) // (150 / 120) * 6 = 7.5
    expect(chase.formattedText).toBe('150 off 120')
  })
})
