import type { BallEvent, MatchConfig } from '../types'

export function createDefaultConfig(overrides?: Partial<MatchConfig>): MatchConfig {
  return {
    oversPerInnings: 20,
    playersPerSide: 11,
    wideReBowl: true,
    noBallFreeHit: true,
    lastManStands: false,
    ...overrides,
  }
}

let eventCounter = 1

export function resetEventCounter(): void {
  eventCounter = 1
}

export function createBall(overrides?: Partial<BallEvent>): BallEvent {
  const id = `ball-${eventCounter++}`
  return {
    id,
    inningsNo: 1,
    batterId: 'batter-1',
    nonStrikerId: 'batter-2',
    bowlerId: 'bowler-1',
    runsOffBat: 0,
    extra: null,
    wicket: null,
    isBoundary4: false,
    isBoundary6: false,
    timestamp: Date.now(),
    ...overrides,
  }
}
