import type { BallEvent, Innings, MatchConfig } from './types'
import { deriveInnings } from './innings'

/**
 * Creates a MatchConfig tailored for a Super Over.
 * By standard cricket rules:
 * - 1 over (6 legal balls)
 * - 3 players per side (meaning 2 wickets constitutes all out)
 * - No-ball free hit and wide re-bowl inherit from base configuration.
 */
export function createSuperOverConfig(baseConfig: MatchConfig): MatchConfig {
  return {
    ...baseConfig,
    oversPerInnings: baseConfig.superOverOvers ?? 1,
    playersPerSide: 3,
    lastManStands: false,
  }
}

/**
 * Checks if the regulation match is tied (both teams have equal runs after completed innings).
 */
export function isMatchTied(innings1: Innings, innings2: Innings): boolean {
  return (
    innings1.isComplete &&
    innings2.isComplete &&
    innings1.totalRuns === innings2.totalRuns
  )
}

/**
 * Derives the state of a Super Over innings.
 */
export function deriveSuperOver(
  baseConfig: MatchConfig,
  events: readonly BallEvent[],
  options?: {
    battingTeamId?: string
    bowlingTeamId?: string
    target?: number | null
  },
): Innings {
  const superOverConfig = createSuperOverConfig(baseConfig)
  return deriveInnings(superOverConfig, events, options)
}
