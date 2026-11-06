import type { BallEvent } from '../engine/types'
import type { HeadToHeadStats } from './types'

export function deriveHeadToHead(
  events: BallEvent[],
  batterId: string,
  bowlerId: string,
): HeadToHeadStats {
  let ballsFaced = 0
  let runs = 0
  let dismissals = 0
  let dotBalls = 0
  let fours = 0
  let sixes = 0

  for (const e of events) {
    if (e.batterId === batterId && e.bowlerId === bowlerId) {
      const isWide = e.extra?.type === 'wide'
      if (!isWide) {
        ballsFaced++
        if (e.runsOffBat === 0 && e.extra === null) {
          dotBalls++
        }
      }

      if (e.runsOffBat > 0) {
        runs += e.runsOffBat
      }

      if (e.isBoundary4) fours++
      if (e.isBoundary6) sixes++

      if (
        e.wicket &&
        e.wicket.playerOutId === batterId &&
        e.wicket.type !== 'runout' &&
        e.wicket.type !== 'retired'
      ) {
        dismissals++
      }
    }
  }

  const strikeRate =
    ballsFaced > 0 ? Number(((runs / ballsFaced) * 100).toFixed(2)) : 0

  return {
    batterId,
    bowlerId,
    ballsFaced,
    runs,
    dismissals,
    dotBalls,
    fours,
    sixes,
    strikeRate,
  }
}
