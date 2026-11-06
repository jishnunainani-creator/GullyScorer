import type {
  BallEvent,
  FallOfWicket,
  Innings,
  InningsEndReason,
  MatchConfig,
  Partnership,
} from './types'
import { isLegalDelivery, ballsToOvers } from './delivery'
import { calculateChase } from './chase'
import {
  createInitialBatterStats,
  createInitialBowlerStats,
  isBowlerWicket,
} from './stats'

export interface DeriveInningsOptions {
  battingTeamId?: string
  bowlingTeamId?: string
  target?: number | null
}

export function getInningsEndReason(
  config: MatchConfig,
  wickets: number,
  legalBalls: number,
  totalRuns: number,
  target: number | null,
): InningsEndReason | null {
  if (target !== null && totalRuns >= target) {
    return 'target_chased'
  }

  const maxWickets = config.lastManStands
    ? config.playersPerSide
    : Math.max(1, config.playersPerSide - 1)

  if (wickets >= maxWickets) {
    return 'all_out'
  }

  if (legalBalls >= config.oversPerInnings * 6) {
    return 'overs_complete'
  }

  return null
}

/**
 * Pure function to derive the complete innings state from match config and BallEvent log.
 */
export function deriveInnings(
  config: MatchConfig,
  events: readonly BallEvent[],
  options?: DeriveInningsOptions,
): Innings {
  const target = options?.target ?? null
  const inningsNo = events[0]?.inningsNo ?? 1

  let totalRuns = 0
  let wickets = 0
  let legalBalls = 0
  let currentStrikerId: string | null = null
  let currentNonStrikerId: string | null = null
  let currentBowlerId: string | null = null
  let isFreeHit = false
  let isComplete = false
  let endReason: InningsEndReason | null = null

  const batterStats: Innings['batterStats'] = {}
  const bowlerStats: Innings['bowlerStats'] = {}
  const fallOfWickets: FallOfWicket[] = []
  const partnerships: Partnership[] = []
  let currentPartnership: Partnership | null = null

  const extras: Innings['extras'] = {
    wides: 0,
    noBalls: 0,
    byes: 0,
    legByes: 0,
    penalties: 0,
    total: 0,
  }

  // Track over runs conceded by bowler to detect maidens
  interface OverRecord {
    bowlerId: string
    legalBallsCount: number
    runsConceded: number
  }
  let currentOverRecord: OverRecord | null = null

  for (let idx = 0; idx < events.length; idx++) {
    const event = events[idx]
    if (!event) continue

    // If already complete, do not process subsequent balls
    if (isComplete) {
      break
    }

    currentBowlerId = event.bowlerId

    // Set initial or update active striker/non-striker from the event
    if (currentStrikerId === null) {
      currentStrikerId = event.batterId
    }
    if (currentNonStrikerId === null) {
      currentNonStrikerId = event.nonStrikerId
    }

    // Initialize or continue partnership
    if (!currentPartnership) {
      currentPartnership = {
        batter1Id: event.batterId,
        batter2Id: event.nonStrikerId,
        runs: 0,
        balls: 0,
      }
    }

    // 1. Delivery legality
    const isLegal = isLegalDelivery(event, config)
    const activeFreeHit = isFreeHit

    // 2. Runs & Extras
    const batRuns = event.runsOffBat
    const extraRuns = event.extra ? event.extra.runs : 0
    const ballTotalRuns = batRuns + extraRuns
    totalRuns += ballTotalRuns

    if (event.extra) {
      switch (event.extra.type) {
        case 'wide':
          extras.wides += event.extra.runs
          break
        case 'noball':
          extras.noBalls += event.extra.runs
          break
        case 'bye':
          extras.byes += event.extra.runs
          break
        case 'legbye':
          extras.legByes += event.extra.runs
          break
        case 'penalty':
          extras.penalties += event.extra.runs
          break
      }
      extras.total += event.extra.runs
    }

    // 3. Batter stats
    const bStats = batterStats[event.batterId] ?? createInitialBatterStats(event.batterId)
    bStats.runs += batRuns
    // Batter faces the ball if it is NOT a wide
    if (!event.extra || event.extra.type !== 'wide') {
      bStats.ballsFaced += 1
    }
    if (event.isBoundary4) {
      bStats.fours += 1
    }
    if (event.isBoundary6) {
      bStats.sixes += 1
    }
    bStats.strikeRate =
      bStats.ballsFaced > 0
        ? Number(((bStats.runs / bStats.ballsFaced) * 100).toFixed(2))
        : 0
    batterStats[event.batterId] = bStats

    // Ensure non-striker has an entry in stats
    if (event.nonStrikerId && !batterStats[event.nonStrikerId]) {
      batterStats[event.nonStrikerId] = createInitialBatterStats(event.nonStrikerId)
    }

    // 4. Bowler stats
    const bwStats = bowlerStats[event.bowlerId] ?? createInitialBowlerStats(event.bowlerId)
    if (isLegal) {
      bwStats.ballsBowled += 1
      bwStats.overs = ballsToOvers(bwStats.ballsBowled)
    }
    if (event.extra?.type === 'wide') {
      bwStats.wides += 1
    }
    if (event.extra?.type === 'noball') {
      bwStats.noBalls += 1
    }

    // Runs charged to bowler: bat runs + wide runs + noball runs (byes, legbyes, penalties excluded)
    const bowlerRunsThisBall =
      batRuns +
      (event.extra?.type === 'wide' || event.extra?.type === 'noball'
        ? event.extra.runs
        : 0)
    bwStats.runsConceded += bowlerRunsThisBall
    bwStats.economy =
      bwStats.ballsBowled > 0
        ? Number(((bwStats.runsConceded / (bwStats.ballsBowled / 6))).toFixed(2))
        : 0
    bowlerStats[event.bowlerId] = bwStats

    // 5. Over record for maidens
    if (!currentOverRecord) {
      currentOverRecord = {
        bowlerId: event.bowlerId,
        legalBallsCount: 0,
        runsConceded: 0,
      }
    }
    currentOverRecord.runsConceded += bowlerRunsThisBall

    if (isLegal) {
      legalBalls += 1
      currentOverRecord.legalBallsCount += 1
    }

    // 6. Partnership
    currentPartnership.runs += ballTotalRuns
    if (isLegal) {
      currentPartnership.balls += 1
    }

    // 7. Wicket handling
    let dismissalValid = false
    if (event.wicket) {
      // Check if dismissal is allowed during Free Hit
      if (activeFreeHit) {
        if (event.wicket.type === 'runout' || event.wicket.type === 'retired') {
          dismissalValid = true
        } else {
          // Invalid dismissal on free hit
          dismissalValid = false
        }
      } else {
        dismissalValid = true
      }

      if (dismissalValid) {
        wickets += 1

        const playerOutId = event.wicket.playerOutId
        const outBatterStats =
          batterStats[playerOutId] ?? createInitialBatterStats(playerOutId)
        outBatterStats.isOut = true
        outBatterStats.dismissal = {
          type: event.wicket.type,
          bowlerId: isBowlerWicket(event.wicket.type) ? event.bowlerId : undefined,
          fielderId: event.wicket.fielderId,
        }
        batterStats[playerOutId] = outBatterStats

        if (isBowlerWicket(event.wicket.type)) {
          bwStats.wickets += 1
        }

        fallOfWickets.push({
          wicketNumber: wickets,
          score: totalRuns,
          playerOutId,
          over: ballsToOvers(legalBalls),
          partnershipRuns: currentPartnership.runs,
        })

        partnerships.push({ ...currentPartnership })
        currentPartnership = null
      }
    }

    // 8. Free Hit state update for next ball
    if (config.noBallFreeHit) {
      if (event.extra?.type === 'noball') {
        isFreeHit = true
      } else if (isLegal) {
        isFreeHit = false
      }
      // If wide, free hit carries over unchanged
    } else {
      isFreeHit = false
    }

    // 9. Strike rotation & crease positions
    let s = event.batterId
    let ns: string | null = event.nonStrikerId

    // Physical runs completed by running:
    // Non-boundaries: bat runs + byes + legbyes
    const physicalRuns =
      !event.isBoundary4 && !event.isBoundary6
        ? batRuns +
          (event.extra?.type === 'bye' || event.extra?.type === 'legbye'
            ? event.extra.runs
            : 0)
        : 0

    if (physicalRuns % 2 === 1) {
      // Odd runs: batters swap ends
      const temp = s
      s = ns ?? s
      ns = temp
    }

    // If wicket fell, vacate the out player's end
    if (dismissalValid && event.wicket) {
      const outId = event.wicket.playerOutId
      if (outId === s) {
        s = ''
      } else if (outId === ns) {
        ns = null
      }

      // Check Last Man Stands rule
      if (config.lastManStands && wickets === config.playersPerSide - 1) {
        // Only 1 batter remains. They bat alone.
        const loneBatter = s || ns
        s = loneBatter ?? ''
        ns = null
      }
    }

    // 10. End of over check
    const overCompleted = isLegal && legalBalls % 6 === 0
    if (overCompleted) {
      // Check maiden
      if (currentOverRecord && currentOverRecord.legalBallsCount === 6) {
        if (currentOverRecord.runsConceded === 0) {
          const overBowler = bowlerStats[currentOverRecord.bowlerId]
          if (overBowler) {
            overBowler.maidens += 1
          }
        }
      }
      currentOverRecord = null

      // Over boundary: batters swap ends
      if (ns !== null && s !== '') {
        const temp = s
        s = ns
        ns = temp
      } else if (s === '' && ns !== null) {
        // Striker was dismissed on the 6th ball.
        // Non-striker was at non-striker end, now faces bowling at striker end.
        s = ns
        ns = null
      } else if (s !== '' && ns === null && !config.lastManStands) {
        // Non-striker was dismissed on the 6th ball.
        // Striker was at striker end, now moves to non-striker end.
        ns = s
        s = ''
      }
    }

    currentStrikerId = s === '' ? null : s
    currentNonStrikerId = ns

    // 11. Check if innings reached completion
    const possibleEnd = getInningsEndReason(
      config,
      wickets,
      legalBalls,
      totalRuns,
      target,
    )
    if (possibleEnd !== null) {
      isComplete = true
      endReason = possibleEnd
    }
  }

  // If innings not complete yet, check end condition at the end of processed events
  if (!isComplete) {
    const finalEnd = getInningsEndReason(
      config,
      wickets,
      legalBalls,
      totalRuns,
      target,
    )
    if (finalEnd !== null) {
      isComplete = true
      endReason = finalEnd
    }
  }

  const chaseInfo =
    target !== null
      ? calculateChase(target, totalRuns, legalBalls, config.oversPerInnings)
      : null

  return {
    inningsNo,
    battingTeamId: options?.battingTeamId,
    bowlingTeamId: options?.bowlingTeamId,
    totalRuns,
    wickets,
    legalBalls,
    overs: ballsToOvers(legalBalls),
    currentStrikerId,
    currentNonStrikerId,
    currentBowlerId,
    isFreeHit,
    isComplete,
    endReason,
    target,
    batterStats,
    bowlerStats,
    partnerships,
    currentPartnership,
    fallOfWickets,
    extras,
    events: [...events],
    chaseInfo,
  }
}
