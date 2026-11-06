import { describe, it, expect } from 'vitest'
import { isLegalDelivery, ballsToOvers, oversToBalls } from '../delivery'
import { createBall } from './testHelpers'

describe('Delivery & Overs Calculations', () => {
  it('identifies standard ball as a legal delivery', () => {
    const ball = createBall({ runsOffBat: 0 })
    expect(isLegalDelivery(ball)).toBe(true)
  })

  it('identifies wide as illegal when wideReBowl is true', () => {
    const ball = createBall({
      extra: { type: 'wide', runs: 1 },
    })
    expect(isLegalDelivery(ball, { wideReBowl: true })).toBe(false)
    expect(isLegalDelivery(ball)).toBe(false) // default is true
  })

  it('identifies wide as legal when wideReBowl is false', () => {
    const ball = createBall({
      extra: { type: 'wide', runs: 1 },
    })
    expect(isLegalDelivery(ball, { wideReBowl: false })).toBe(true)
  })

  it('identifies no-ball as illegal delivery regardless of wideReBowl', () => {
    const ball = createBall({
      extra: { type: 'noball', runs: 1 },
    })
    expect(isLegalDelivery(ball, { wideReBowl: true })).toBe(false)
    expect(isLegalDelivery(ball, { wideReBowl: false })).toBe(false)
  })

  it('identifies byes as legal delivery', () => {
    const ball = createBall({
      extra: { type: 'bye', runs: 1 },
    })
    expect(isLegalDelivery(ball)).toBe(true)
  })

  it('identifies leg-byes as legal delivery', () => {
    const ball = createBall({
      extra: { type: 'legbye', runs: 2 },
    })
    expect(isLegalDelivery(ball)).toBe(true)
  })

  it('identifies penalty as legal delivery', () => {
    const ball = createBall({
      extra: { type: 'penalty', runs: 5 },
    })
    expect(isLegalDelivery(ball)).toBe(true)
  })

  it('converts balls to overs correctly', () => {
    expect(ballsToOvers(0)).toBe('0.0')
    expect(ballsToOvers(1)).toBe('0.1')
    expect(ballsToOvers(5)).toBe('0.5')
    expect(ballsToOvers(6)).toBe('1.0')
    expect(ballsToOvers(7)).toBe('1.1')
    expect(ballsToOvers(11)).toBe('1.5')
    expect(ballsToOvers(12)).toBe('2.0')
    expect(ballsToOvers(120)).toBe('20.0')
  })

  it('throws error when ballsToOvers receives negative balls', () => {
    expect(() => ballsToOvers(-1)).toThrow('Balls cannot be negative')
  })

  it('converts overs to balls correctly and throws on invalid formats', () => {
    expect(oversToBalls('0.0')).toBe(0)
    expect(oversToBalls('0.5')).toBe(5)
    expect(oversToBalls('1.0')).toBe(6)
    expect(oversToBalls('1.4')).toBe(10)
    expect(oversToBalls('20.0')).toBe(120)
    expect(() => oversToBalls('1.6')).toThrow()
    expect(() => oversToBalls('abc')).toThrow()
  })
})
