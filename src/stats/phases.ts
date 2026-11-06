import type { BallEvent, MatchConfig } from '../engine/types'
import { isLegalDelivery } from '../engine/delivery'
import type { MatchPhase, PhaseStats } from './types'

export function getMatchPhase(
  overIndex: number,
  oversPerInnings: number,
): MatchPhase {
  const ppLimit = Math.max(1, Math.round(oversPerInnings * 0.25))
  const deathStart = Math.max(ppLimit + 1, oversPerInnings - ppLimit)

  if (overIndex < ppLimit) {
    return 'powerplay'
  }
  if (overIndex >= deathStart) {
    return 'death'
  }
  return 'middle'
}

export function deriveInningsPhaseStats(
  events: BallEvent[],
  inningsNo: number,
  config: MatchConfig,
): Record<MatchPhase, PhaseStats> {
  const innEvents = events.filter((e) => e.inningsNo === inningsNo)

  const phases: Record<MatchPhase, PhaseStats> = {
    powerplay: { phase: 'powerplay', runs: 0, balls: 0, wickets: 0, runRate: 0 },
    middle: { phase: 'middle', runs: 0, balls: 0, wickets: 0, runRate: 0 },
    death: { phase: 'death', runs: 0, balls: 0, wickets: 0, runRate: 0 },
  }

  let legalBallsInOver = 0
  let overIndex = 0

  for (const e of innEvents) {
    const isLegal = isLegalDelivery(e, config)
    const phaseName = getMatchPhase(overIndex, config.oversPerInnings)
    const phase = phases[phaseName]

    const ballRuns = e.runsOffBat + (e.extra ? e.extra.runs : 0)
    phase.runs += ballRuns

    if (isLegal) {
      phase.balls++
      legalBallsInOver++
      if (legalBallsInOver === 6) {
        overIndex++
        legalBallsInOver = 0
      }
    }

    if (e.wicket && e.wicket.type !== 'retired') {
      phase.wickets++
    }
  }

  for (const p of Object.values(phases)) {
    p.runRate = p.balls > 0 ? Number(((p.runs / p.balls) * 6).toFixed(2)) : 0
  }

  return phases
}
