import type { ChaseInfo } from './types'

/**
 * Calculates chase requirements for the batting team.
 *
 * @param target The target score to achieve (1 run more than 1st innings total).
 * @param currentRuns Current total runs of the chasing team.
 * @param legalBallsBowled Total legal balls bowled so far in this innings.
 * @param oversPerInnings Overs allocated for the innings.
 */
export function calculateChase(
  target: number,
  currentRuns: number,
  legalBallsBowled: number,
  oversPerInnings: number,
): ChaseInfo {
  const totalBalls = oversPerInnings * 6
  const runsNeeded = Math.max(0, target - currentRuns)
  const ballsRemaining = Math.max(0, totalBalls - legalBallsBowled)

  let requiredRunRate = 0
  if (runsNeeded === 0) {
    requiredRunRate = 0
  } else if (ballsRemaining === 0) {
    requiredRunRate = Infinity
  } else {
    requiredRunRate = Number(((runsNeeded / ballsRemaining) * 6).toFixed(2))
  }

  let formattedText: string
  if (runsNeeded === 0) {
    formattedText = 'Target reached'
  } else if (ballsRemaining === 0) {
    formattedText = `${runsNeeded} needed, overs completed`
  } else {
    formattedText = `${runsNeeded} off ${ballsRemaining}`
  }

  return {
    target,
    runsNeeded,
    ballsRemaining,
    requiredRunRate,
    formattedText,
  }
}
