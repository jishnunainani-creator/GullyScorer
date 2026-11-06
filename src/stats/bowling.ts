import type { BallEvent, MatchConfig, WicketType } from '../engine/types'
import { isLegalDelivery, ballsToOvers } from '../engine/delivery'
import type { BowlingInningsStats, BowlingCareerStats } from './types'

export function deriveInningsBowling(
  events: BallEvent[],
  matchId: string,
  inningsNo: number,
  config: MatchConfig,
): Record<string, BowlingInningsStats> {
  const result: Record<string, BowlingInningsStats> = {}
  const innEvents = events.filter((e) => e.inningsNo === inningsNo)

  const getOrCreate = (bowlerId: string): BowlingInningsStats => {
    if (!result[bowlerId]) {
      result[bowlerId] = {
        playerId: bowlerId,
        matchId,
        inningsNo,
        ballsBowled: 0,
        overs: '0.0',
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        economy: 0,
        strikeRate: null,
        average: null,
        dotBalls: 0,
        widesConceded: 0,
        noBallsConceded: 0,
        wicketTypes: {
          bowled: 0,
          caught: 0,
          lbw: 0,
          runout: 0,
          stumped: 0,
          hitwicket: 0,
          retired: 0,
        },
        hatTricks: 0,
      }
    }
    return result[bowlerId]!
  }

  // Track bowler consecutive wickets for hat-tricks
  const bowlerConsecutiveWickets: Record<string, number> = {}

  // Deliveries grouped by over to compute maidens accurately
  // An over is 6 legal balls.
  let currentOverIndex = 0
  let legalBallsInCurrentOver = 0
  const overBowlerMap: Record<number, string> = {}
  const overRunsMap: Record<number, number> = {}
  const overLegalBallsMap: Record<number, number> = {}

  for (const e of innEvents) {
    if (!e.bowlerId) continue
    const bStats = getOrCreate(e.bowlerId)

    const isLegal = isLegalDelivery(e, config)
    let bowlerRuns = e.runsOffBat

    if (e.extra) {
      if (e.extra.type === 'wide') {
        bStats.widesConceded += e.extra.runs
        bowlerRuns += e.extra.runs
      } else if (e.extra.type === 'noball') {
        bStats.noBallsConceded += e.extra.runs
        bowlerRuns += e.extra.runs
      }
      // Byes, leg-byes, and penalty runs are fielding/match extras; not charged to bowler.
    }

    bStats.runsConceded += bowlerRuns

    // Track over maiden data
    overBowlerMap[currentOverIndex] = e.bowlerId
    overRunsMap[currentOverIndex] = (overRunsMap[currentOverIndex] ?? 0) + bowlerRuns

    if (isLegal) {
      bStats.ballsBowled++
      legalBallsInCurrentOver++
      overLegalBallsMap[currentOverIndex] = legalBallsInCurrentOver

      if (bowlerRuns === 0) {
        bStats.dotBalls++
      }
    }

    // Wickets
    const isBowlerWicket =
      e.wicket &&
      e.wicket.type !== 'runout' &&
      e.wicket.type !== 'retired'

    if (isBowlerWicket && e.wicket) {
      bStats.wickets++
      bStats.wicketTypes[e.wicket.type] = (bStats.wicketTypes[e.wicket.type] ?? 0) + 1

      // Hat-trick tracking
      const currentStreak = (bowlerConsecutiveWickets[e.bowlerId] ?? 0) + 1
      bowlerConsecutiveWickets[e.bowlerId] = currentStreak
      if (currentStreak === 3) {
        bStats.hatTricks++
      }
    } else {
      // Non-wicket ball resets hat-trick streak for this bowler
      bowlerConsecutiveWickets[e.bowlerId] = 0
    }

    // Over boundary advance
    if (legalBallsInCurrentOver === 6) {
      currentOverIndex++
      legalBallsInCurrentOver = 0
    }
  }

  // Count maidens
  for (let ov = 0; ov <= currentOverIndex; ov++) {
    const bowlerId = overBowlerMap[ov]
    const legalCount = overLegalBallsMap[ov] ?? 0
    const runsInOver = overRunsMap[ov] ?? 0
    if (bowlerId && legalCount === 6 && runsInOver === 0) {
      const bStats = result[bowlerId]
      if (bStats) {
        bStats.maidens++
      }
    }
  }

  // Calculate rates
  for (const id of Object.keys(result)) {
    const s = result[id]!
    s.overs = ballsToOvers(s.ballsBowled)
    s.economy =
      s.ballsBowled > 0
        ? Number(((s.runsConceded / s.ballsBowled) * 6).toFixed(2))
        : 0
    s.average =
      s.wickets > 0
        ? Number((s.runsConceded / s.wickets).toFixed(2))
        : null
    s.strikeRate =
      s.wickets > 0
        ? Number((s.ballsBowled / s.wickets).toFixed(2))
        : null
  }

  return result
}

export function deriveCareerBowling(
  inningsList: BowlingInningsStats[],
  playerId: string,
): BowlingCareerStats {
  const playerInnings = inningsList.filter((i) => i.playerId === playerId)

  const wicketTypes: Record<WicketType, number> = {
    bowled: 0,
    caught: 0,
    lbw: 0,
    runout: 0,
    stumped: 0,
    hitwicket: 0,
    retired: 0,
  }

  let ballsBowled = 0
  let maidens = 0
  let runsConceded = 0
  let wickets = 0
  let dotBalls = 0
  let widesConceded = 0
  let noBallsConceded = 0
  let hatTricks = 0
  let threeWickets = 0
  let fiveWickets = 0

  let bestFiguresWickets = 0
  let bestFiguresRuns = Infinity
  const uniqueMatches = new Set<string>()

  for (const inn of playerInnings) {
    uniqueMatches.add(inn.matchId)
    ballsBowled += inn.ballsBowled
    maidens += inn.maidens
    runsConceded += inn.runsConceded
    wickets += inn.wickets
    dotBalls += inn.dotBalls
    widesConceded += inn.widesConceded
    noBallsConceded += inn.noBallsConceded
    hatTricks += inn.hatTricks

    for (const [wType, count] of Object.entries(inn.wicketTypes)) {
      wicketTypes[wType as WicketType] += count
    }

    if (inn.wickets >= 5) {
      fiveWickets++
      threeWickets++
    } else if (inn.wickets >= 3) {
      threeWickets++
    }

    // Best figures: most wickets; if equal, fewest runs conceded
    if (
      inn.wickets > bestFiguresWickets ||
      (inn.wickets === bestFiguresWickets && inn.runsConceded < bestFiguresRuns && inn.wickets > 0)
    ) {
      bestFiguresWickets = inn.wickets
      bestFiguresRuns = inn.runsConceded
    }
  }

  const bestFiguresDisplay =
    bestFiguresWickets > 0
      ? `${bestFiguresWickets}/${bestFiguresRuns === Infinity ? 0 : bestFiguresRuns}`
      : '0/0'

  const average =
    wickets > 0 ? Number((runsConceded / wickets).toFixed(2)) : null
  const economy =
    ballsBowled > 0 ? Number(((runsConceded / ballsBowled) * 6).toFixed(2)) : 0
  const strikeRate =
    wickets > 0 ? Number((ballsBowled / wickets).toFixed(2)) : null
  const dotBallPercentage =
    ballsBowled > 0 ? Number(((dotBalls / ballsBowled) * 100).toFixed(2)) : 0

  return {
    playerId,
    matches: uniqueMatches.size,
    innings: playerInnings.length,
    ballsBowled,
    overs: ballsToOvers(ballsBowled),
    maidens,
    runsConceded,
    wickets,
    average,
    economy,
    strikeRate,
    bestFiguresWickets,
    bestFiguresRuns: bestFiguresRuns === Infinity ? 0 : bestFiguresRuns,
    bestFiguresDisplay,
    threeWickets,
    fiveWickets,
    dotBalls,
    dotBallPercentage,
    widesConceded,
    noBallsConceded,
    hatTricks,
    wicketTypes,
  }
}
