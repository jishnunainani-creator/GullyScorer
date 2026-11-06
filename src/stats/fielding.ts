import type { BallEvent } from '../engine/types'
import type { FieldingCareerStats } from './types'

export function deriveFieldingStats(
  events: BallEvent[],
  playerId: string,
): FieldingCareerStats {
  let catches = 0
  let runOuts = 0
  let stumpings = 0

  for (const e of events) {
    if (e.wicket && e.wicket.fielderId === playerId) {
      if (e.wicket.type === 'caught') {
        catches++
      } else if (e.wicket.type === 'runout') {
        runOuts++
      } else if (e.wicket.type === 'stumped') {
        stumpings++
      }
    }
  }

  return {
    playerId,
    catches,
    runOuts,
    stumpings,
    totalDismissals: catches + runOuts + stumpings,
  }
}
