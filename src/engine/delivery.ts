import type { BallEvent, MatchConfig } from './types'

/**
 * Determines whether a ball delivery is legal.
 * - By default in cricket, no-balls are illegal and must be re-bowled.
 * - Wides are illegal if config.wideReBowl is true (default). If false, wide is considered legal.
 * - Byes, leg-byes, and penalties without wide/noball are legal deliveries.
 */
export function isLegalDelivery(
  event: BallEvent,
  config?: Pick<MatchConfig, 'wideReBowl'>,
): boolean {
  if (event.extra) {
    if (event.extra.type === 'noball') {
      return false
    }
    if (event.extra.type === 'wide') {
      const wideReBowl = config ? config.wideReBowl : true
      return !wideReBowl
    }
  }
  return true
}

/**
 * Converts a total number of legal balls to overs notation string (e.g. 5 -> "0.5", 6 -> "1.0", 8 -> "1.2").
 */
export function ballsToOvers(balls: number): string {
  if (balls < 0) {
    throw new Error('Balls cannot be negative')
  }
  const overs = Math.floor(balls / 6)
  const remainder = balls % 6
  return `${overs}.${remainder}`
}

/**
 * Converts an overs string like "1.2" back to ball count (e.g. "1.2" -> 8).
 */
export function oversToBalls(oversStr: string): number {
  const parts = oversStr.split('.')
  const overs = parseInt(parts[0] ?? '0', 10)
  const balls = parseInt(parts[1] ?? '0', 10)
  if (isNaN(overs) || isNaN(balls) || balls >= 6 || balls < 0 || overs < 0) {
    throw new Error(`Invalid overs format: "${oversStr}"`)
  }
  return overs * 6 + balls
}
