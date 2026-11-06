import type { BallEvent, WicketType } from '../engine/types'
import type { BattingInningsStats, BattingCareerStats } from './types'

export function deriveInningsBatting(
  events: BallEvent[],
  matchId: string,
  inningsNo: number,
): Record<string, BattingInningsStats> {
  const result: Record<string, BattingInningsStats> = {}

  const innEvents = events.filter((e) => e.inningsNo === inningsNo)

  const getOrCreate = (playerId: string): BattingInningsStats => {
    if (!result[playerId]) {
      result[playerId] = {
        playerId,
        matchId,
        inningsNo,
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        dotBalls: 0,
        strikeRate: 0,
        isOut: false,
        shotZones: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
          7: 0,
          8: 0,
        },
      }
    }
    return result[playerId]!
  }

  for (const e of innEvents) {
    if (e.batterId) getOrCreate(e.batterId)
    if (e.nonStrikerId) getOrCreate(e.nonStrikerId)

    const isWide = e.extra?.type === 'wide'
    const bStats = getOrCreate(e.batterId)

    if (!isWide) {
      bStats.ballsFaced++
      if (e.runsOffBat === 0 && e.extra === null) {
        bStats.dotBalls++
      }
    }

    if (e.runsOffBat > 0) {
      bStats.runs += e.runsOffBat
    }

    if (e.isBoundary4) {
      bStats.fours++
    }
    if (e.isBoundary6) {
      bStats.sixes++
    }

    if (e.shot && e.shot.zone >= 1 && e.shot.zone <= 8) {
      bStats.shotZones[e.shot.zone] =
        (bStats.shotZones[e.shot.zone] ?? 0) + (e.runsOffBat > 0 ? e.runsOffBat : 1)
    }

    if (e.wicket) {
      const outStats = getOrCreate(e.wicket.playerOutId)
      // Only count as out if not retired (or if retired out)
      if (e.wicket.type !== 'retired') {
        outStats.isOut = true
        outStats.dismissalType = e.wicket.type
        outStats.bowlerId = e.bowlerId
        outStats.fielderId = e.wicket.fielderId
      }
    }
  }

  // Calculate strike rates
  for (const id of Object.keys(result)) {
    const s = result[id]!
    s.strikeRate =
      s.ballsFaced > 0 ? Number(((s.runs / s.ballsFaced) * 100).toFixed(2)) : 0
  }

  return result
}

export function deriveCareerBatting(
  inningsList: BattingInningsStats[],
  playerId: string,
): BattingCareerStats {
  const playerInnings = inningsList.filter((i) => i.playerId === playerId)

  const dismissalBreakdown: Record<WicketType, number> = {
    bowled: 0,
    caught: 0,
    lbw: 0,
    runout: 0,
    stumped: 0,
    hitwicket: 0,
    retired: 0,
  }

  let runs = 0
  let ballsFaced = 0
  let fours = 0
  let sixes = 0
  let dotBalls = 0
  let notOuts = 0
  let dismissals = 0
  let highestScore = 0
  let highestScoreNotOut = false
  let thirties = 0
  let fifties = 0
  let centuries = 0
  let ducks = 0
  let goldenDucks = 0

  const uniqueMatches = new Set<string>()

  for (const inn of playerInnings) {
    uniqueMatches.add(inn.matchId)
    runs += inn.runs
    ballsFaced += inn.ballsFaced
    fours += inn.fours
    sixes += inn.sixes
    dotBalls += inn.dotBalls

    if (inn.isOut) {
      dismissals++
      if (inn.dismissalType) {
        dismissalBreakdown[inn.dismissalType]++
      }
      if (inn.runs === 0) {
        ducks++
        if (inn.ballsFaced === 1) {
          goldenDucks++
        }
      }
    } else {
      notOuts++
    }

    // High score calculation
    if (inn.runs > highestScore) {
      highestScore = inn.runs
      highestScoreNotOut = !inn.isOut
    } else if (inn.runs === highestScore && !inn.isOut) {
      highestScoreNotOut = true
    }

    if (inn.runs >= 100) {
      centuries++
    } else if (inn.runs >= 50) {
      fifties++
    } else if (inn.runs >= 30) {
      thirties++
    }
  }

  const average =
    dismissals > 0 ? Number((runs / dismissals).toFixed(2)) : null
  const strikeRate =
    ballsFaced > 0 ? Number(((runs / ballsFaced) * 100).toFixed(2)) : 0
  const dotBallPercentage =
    ballsFaced > 0 ? Number(((dotBalls / ballsFaced) * 100).toFixed(2)) : 0
  const boundaryPercentage =
    runs > 0 ? Number(((((fours * 4) + (sixes * 6)) / runs) * 100).toFixed(2)) : 0

  return {
    playerId,
    matches: uniqueMatches.size,
    innings: playerInnings.length,
    notOuts,
    runs,
    ballsFaced,
    highestScore,
    highestScoreNotOut,
    average,
    strikeRate,
    fours,
    sixes,
    thirties,
    fifties,
    centuries,
    ducks,
    goldenDucks,
    dotBalls,
    dotBallPercentage,
    boundaryPercentage,
    dismissalBreakdown,
  }
}
