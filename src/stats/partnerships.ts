import type { BallEvent, MatchConfig } from '../engine/types'
import { isLegalDelivery, ballsToOvers } from '../engine/delivery'
import type { Partnership, FallOfWicket } from './types'

export function deriveInningsPartnerships(
  events: BallEvent[],
  inningsNo: number,
  config: MatchConfig,
): {
  partnerships: Partnership[]
  bestPartnership: Partnership | null
  fallOfWickets: FallOfWicket[]
} {
  const innEvents = events.filter((e) => e.inningsNo === inningsNo)
  const partnerships: Partnership[] = []
  const fallOfWickets: FallOfWicket[] = []

  if (innEvents.length === 0) {
    return { partnerships: [], bestPartnership: null, fallOfWickets: [] }
  }

  let currentP: Partnership = {
    batter1Id: innEvents[0]?.batterId ?? '',
    batter2Id: innEvents[0]?.nonStrikerId ?? '',
    runs: 0,
    balls: 0,
    batter1Runs: 0,
    batter2Runs: 0,
  }

  let totalRuns = 0
  let legalBalls = 0
  let wicketCount = 0

  for (const e of innEvents) {
    const isLegal = isLegalDelivery(e, config)
    const ballRuns = e.runsOffBat + (e.extra ? e.extra.runs : 0)

    totalRuns += ballRuns
    currentP.runs += ballRuns

    if (e.batterId === currentP.batter1Id) {
      currentP.batter1Runs += e.runsOffBat
    } else if (e.batterId === currentP.batter2Id) {
      currentP.batter2Runs += e.runsOffBat
    } else {
      // One of the batters changed (e.g. initial placeholder)
      currentP.batter1Id = e.batterId
      currentP.batter2Id = e.nonStrikerId
      currentP.batter1Runs += e.runsOffBat
    }

    if (isLegal) {
      legalBalls++
      currentP.balls++
    }

    if (e.wicket && e.wicket.type !== 'retired') {
      wicketCount++
      fallOfWickets.push({
        wicketNo: wicketCount,
        score: totalRuns,
        balls: legalBalls,
        overs: ballsToOvers(legalBalls),
        playerOutId: e.wicket.playerOutId,
      })

      partnerships.push({ ...currentP })

      // Start new partnership with the surviving batter and next batter
      const survivingBatterId =
        e.wicket.playerOutId === currentP.batter1Id
          ? currentP.batter2Id
          : currentP.batter1Id

      currentP = {
        batter1Id: survivingBatterId,
        batter2Id: '', // Will be assigned on next ball
        runs: 0,
        balls: 0,
        batter1Runs: 0,
        batter2Runs: 0,
      }
    }
  }

  // If match or innings ended without wicket, push final ongoing partnership
  if (currentP.runs > 0 || currentP.balls > 0 || partnerships.length === 0) {
    partnerships.push(currentP)
  }

  let bestPartnership: Partnership | null = null
  for (const p of partnerships) {
    if (!bestPartnership || p.runs > bestPartnership.runs) {
      bestPartnership = p
    }
  }

  return { partnerships, bestPartnership, fallOfWickets }
}
