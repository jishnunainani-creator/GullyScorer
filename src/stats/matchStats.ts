import type { BallEvent } from '../engine/types'
import { isLegalDelivery } from '../engine/delivery'
import type { MatchRecord } from '../db/schema'
import { deriveInningsPartnerships } from './partnerships'
import { deriveMatchMvp } from './mvp'
import type { MatchAnalysis, Partnership, FallOfWicket } from './types'

export function deriveMatchAnalysis(
  events: BallEvent[],
  match: MatchRecord,
  allPlayerIds: string[],
): MatchAnalysis {
  const partnerships: Record<number, Partnership[]> = {}
  const bestPartnerships: Record<number, Partnership | null> = {}
  const fallOfWickets: Record<number, FallOfWicket[]> = {}
  const runsPerOver: Record<number, number[]> = {}
  const cumulativeRunsPerOver: Record<number, number[]> = {}
  const wicketsPerOver: Record<number, number[]> = {}

  for (const innNo of [1, 2]) {
    const pData = deriveInningsPartnerships(events, innNo, match.config)
    partnerships[innNo] = pData.partnerships
    bestPartnerships[innNo] = pData.bestPartnership
    fallOfWickets[innNo] = pData.fallOfWickets

    // Calculate over runs, cumulative runs, and wickets per over
    const innEvents = events.filter((e) => e.inningsNo === innNo)
    const runsOver: number[] = []
    const cumRunsOver: number[] = []
    const wktsOver: number[] = []

    let currentOverRuns = 0
    let currentOverWkts = 0
    let legalInOver = 0
    let cumTotal = 0

    for (const e of innEvents) {
      const isLegal = isLegalDelivery(e, match.config)
      const ballRuns = e.runsOffBat + (e.extra ? e.extra.runs : 0)

      currentOverRuns += ballRuns
      cumTotal += ballRuns

      if (e.wicket && e.wicket.type !== 'retired') {
        currentOverWkts++
      }

      if (isLegal) {
        legalInOver++
        if (legalInOver === 6) {
          runsOver.push(currentOverRuns)
          cumRunsOver.push(cumTotal)
          wktsOver.push(currentOverWkts)
          currentOverRuns = 0
          currentOverWkts = 0
          legalInOver = 0
        }
      }
    }

    // Push partial ongoing over if any balls bowled
    if (legalInOver > 0 || currentOverRuns > 0) {
      runsOver.push(currentOverRuns)
      cumRunsOver.push(cumTotal)
      wktsOver.push(currentOverWkts)
    }

    runsPerOver[innNo] = runsOver
    cumulativeRunsPerOver[innNo] = cumRunsOver
    wicketsPerOver[innNo] = wktsOver
  }

  // MVP
  const mvpData = deriveMatchMvp(events, match.config, match.id, allPlayerIds)

  return {
    matchId: match.id,
    partnerships,
    bestPartnerships,
    fallOfWickets,
    runsPerOver,
    cumulativeRunsPerOver,
    wicketsPerOver,
    mvpRanking: mvpData.rankings,
    playerOfTheMatch: mvpData.playerOfTheMatch,
    bestBatter: mvpData.bestBatter,
    bestBowler: mvpData.bestBowler,
    bestFielder: mvpData.bestFielder,
  }
}
