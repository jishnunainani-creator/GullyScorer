import { describe, it, expect, beforeEach } from 'vitest'
import {
  createSuperOverConfig,
  isMatchTied,
  deriveSuperOver,
} from '../superOver'
import { deriveInnings } from '../innings'
import { createBall, createDefaultConfig, resetEventCounter } from './testHelpers'

describe('Super Over Support', () => {
  const baseConfig = createDefaultConfig({
    oversPerInnings: 20,
    playersPerSide: 11,
  })

  beforeEach(() => {
    resetEventCounter()
  })

  it('creates super over configuration with 1 over and 3 players (2 wickets max)', () => {
    const soConfig = createSuperOverConfig(baseConfig)
    expect(soConfig.oversPerInnings).toBe(1)
    expect(soConfig.playersPerSide).toBe(3)
    expect(soConfig.lastManStands).toBe(false)
  })

  it('correctly identifies when regulation match is tied', () => {
    const inn1 = deriveInnings(
      createDefaultConfig({ oversPerInnings: 1 }),
      [
        createBall({ runsOffBat: 2 }),
        createBall({ runsOffBat: 2 }),
        createBall({ runsOffBat: 2 }),
        createBall({ runsOffBat: 2 }),
        createBall({ runsOffBat: 2 }),
        createBall({ runsOffBat: 2 }),
      ], // 12 runs in 1 over
    )

    const inn2 = deriveInnings(
      createDefaultConfig({ oversPerInnings: 1 }),
      [
        createBall({ runsOffBat: 2 }),
        createBall({ runsOffBat: 2 }),
        createBall({ runsOffBat: 2 }),
        createBall({ runsOffBat: 2 }),
        createBall({ runsOffBat: 2 }),
        createBall({ runsOffBat: 2 }),
      ], // 12 runs in 1 over
      { target: 13 },
    )

    expect(isMatchTied(inn1, inn2)).toBe(true)
  })

  it('identifies match is not tied when runs differ', () => {
    const inn1 = deriveInnings(createDefaultConfig({ oversPerInnings: 1 }), [
      createBall({ runsOffBat: 6 }),
      createBall({ runsOffBat: 6 }),
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0 }),
    ]) // 12 runs
    const inn2 = deriveInnings(createDefaultConfig({ oversPerInnings: 1 }), [
      createBall({ runsOffBat: 6 }),
      createBall({ runsOffBat: 4 }),
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0 }),
      createBall({ runsOffBat: 0 }),
    ]) // 10 runs
    expect(isMatchTied(inn1, inn2)).toBe(false)
  })

  it('handles super over batting innings and all-out on 2 wickets', () => {
    // In super over, 3 players per side means 2 wickets is all out!
    const soBalls = [
      createBall({
        inningsNo: 3,
        batterId: 'SO-1',
        runsOffBat: 4,
        isBoundary4: true,
      }),
      createBall({
        inningsNo: 3,
        batterId: 'SO-1',
        runsOffBat: 0,
        wicket: { type: 'bowled', playerOutId: 'SO-1' },
      }),
      createBall({
        inningsNo: 3,
        batterId: 'SO-2',
        runsOffBat: 0,
        wicket: { type: 'caught', playerOutId: 'SO-2' },
      }),
    ]
    const soInnings = deriveSuperOver(baseConfig, soBalls)
    expect(soInnings.inningsNo).toBe(3)
    expect(soInnings.totalRuns).toBe(4)
    expect(soInnings.wickets).toBe(2)
    expect(soInnings.isComplete).toBe(true)
    expect(soInnings.endReason).toBe('all_out')
  })

  it('handles super over target chased mid-over', () => {
    // Chasing team needs target 11 in super over
    const soBalls = [
      createBall({ inningsNo: 4, runsOffBat: 4, isBoundary4: true }), // 4
      createBall({ inningsNo: 4, runsOffBat: 6, isBoundary6: true }), // 10
      createBall({ inningsNo: 4, runsOffBat: 2 }),                     // 12 -> target 11 chased!
    ]
    const soChase = deriveSuperOver(baseConfig, soBalls, { target: 11 })
    expect(soChase.inningsNo).toBe(4)
    expect(soChase.totalRuns).toBe(12)
    expect(soChase.isComplete).toBe(true)
    expect(soChase.endReason).toBe('target_chased')
    expect(soChase.overs).toBe('0.3')
  })
})
