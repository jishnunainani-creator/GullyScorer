import type { BatterStats, BowlerStats, WicketType } from './types'

export function createInitialBatterStats(playerId: string): BatterStats {
  return {
    playerId,
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    strikeRate: 0,
    isOut: false,
  }
}

export function createInitialBowlerStats(playerId: string): BowlerStats {
  return {
    playerId,
    ballsBowled: 0,
    overs: '0.0',
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    economy: 0,
    wides: 0,
    noBalls: 0,
  }
}

/**
 * Checks if a dismissal type credits the bowler.
 * Credited: bowled, caught, lbw, stumped, hitwicket.
 * Not credited: runout, retired.
 */
export function isBowlerWicket(wicketType: WicketType): boolean {
  return (
    wicketType === 'bowled' ||
    wicketType === 'caught' ||
    wicketType === 'lbw' ||
    wicketType === 'stumped' ||
    wicketType === 'hitwicket'
  )
}
