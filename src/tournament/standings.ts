import type {
  Tournament,
  TournamentTeam,
  Fixture,
  TournamentResult,
  TeamStandingsRow,
  TiebreakCriterion,
} from './types'

/**
 * Converts integer balls to fractional decimal overs (base-6).
 * e.g. 111 balls -> 18.5
 */
export function ballsToOversFraction(balls: number): number {
  if (balls <= 0) return 0
  return balls / 6.0
}

/**
 * Formats integer balls to cricket over string notation.
 * e.g. 111 balls -> "18.3"
 */
export function formatBallsToOvers(balls: number): string {
  if (balls <= 0) return '0.0'
  const overs = Math.floor(balls / 6)
  const remBalls = balls % 6
  return `${overs}.${remBalls}`
}

/**
 * Formats signed NRR value to 3 decimal places with explicit '+' or '-' sign.
 */
export function formatNrr(nrr: number): string {
  if (Math.abs(nrr) < 0.00001) return '0.000'
  const prefix = nrr > 0 ? '+' : ''
  return `${prefix}${nrr.toFixed(3)}`
}

/**
 * Computes runs and overs (in integer balls) credited to a team for NRR calculation.
 * Implements the All-Out rule, chasing rule, and revised-target scaling verbatim per docs/NRR_SPEC.md.
 */
export function calculateMatchNrrContribution(
  result: TournamentResult,
  teamId: string,
): {
  runsFor: number
  ballsFor: number
  runsAgainst: number
  ballsAgainst: number
  isCounted: boolean
} {
  // Exclude walkovers, abandoned matches, and no results from NRR
  if (result.isNoResult || result.marginText.includes('walkover')) {
    return { runsFor: 0, ballsFor: 0, runsAgainst: 0, ballsAgainst: 0, isCounted: false }
  }

  const inn1 = result.innings1
  const inn2 = result.innings2

  const isTeam1 = inn1.teamId === teamId
  const isTeam2 = inn2.teamId === teamId

  if (!isTeam1 && !isTeam2) {
    return { runsFor: 0, ballsFor: 0, runsAgainst: 0, ballsAgainst: 0, isCounted: false }
  }

  // Handle Revised Target (Innings 2 revised overs quota)
  const isRevised = result.revisedTarget !== undefined && result.revisedQuotaBalls !== undefined

  // Determine Innings 1 effective runs and overs
  let inn1Runs = inn1.runs
  let inn1Balls = inn1.isAllOut ? inn1.allocatedQuotaBalls : inn1.legalBalls

  // Determine Innings 2 effective runs and overs
  let inn2Runs = inn2.runs
  let inn2Balls = inn2.isAllOut ? inn2.allocatedQuotaBalls : inn2.legalBalls

  if (isRevised && result.revisedQuotaBalls) {
    // Scale Innings 1 to Innings 2 revised quota
    const scaleRatio = result.revisedQuotaBalls / inn1.allocatedQuotaBalls
    inn1Runs = Math.round(inn1.runs * scaleRatio)
    inn1Balls = result.revisedQuotaBalls
  }

  if (isTeam1) {
    return {
      runsFor: inn1Runs,
      ballsFor: inn1Balls,
      runsAgainst: inn2Runs,
      ballsAgainst: inn2Balls,
      isCounted: true,
    }
  } else {
    return {
      runsFor: inn2Runs,
      ballsFor: inn2Balls,
      runsAgainst: inn1Runs,
      ballsAgainst: inn1Balls,
      isCounted: true,
    }
  }
}

/**
 * Derives the standings table for a tournament, grouped by groupId.
 */
export function deriveTournamentStandings(
  tournament: Tournament,
  teams: TournamentTeam[],
  fixtures: Fixture[],
  resultsMap: Record<string, TournamentResult>,
): Record<string, TeamStandingsRow[]> {
  const pointsRules = tournament.pointsRules
  const tiebreakOrder = tournament.tiebreakOrder

  // Group teams by groupId
  const teamsByGroup: Record<string, TournamentTeam[]> = {}
  teams.forEach((t) => {
    const g = t.groupId ?? 'A'
    if (!teamsByGroup[g]) teamsByGroup[g] = []
    teamsByGroup[g]!.push(t)
  })

  // Map of completed fixtures
  const completedFixtures = fixtures.filter(
    (f) =>
      (f.status === 'completed' || f.status === 'walkover' || f.status === 'abandoned') &&
      resultsMap[f.id] !== undefined,
  )

  const standingsByGroup: Record<string, TeamStandingsRow[]> = {}

  for (const [groupId, groupTeams] of Object.entries(teamsByGroup)) {
    const groupFixtures = completedFixtures.filter(
      (f) =>
        f.stage === 'group' || f.stage === 'league'
          ? (f.groupId ? f.groupId === groupId : true)
          : false,
    )

    // Compute raw aggregates for each team
    const rows: TeamStandingsRow[] = groupTeams.map((t) => {
      const teamId = t.teamId
      let played = 0
      let won = 0
      let lost = 0
      let tied = 0
      let noResult = 0
      let points = 0
      let totalRunsFor = 0
      let totalBallsFor = 0
      let totalRunsAgainst = 0
      let totalBallsAgainst = 0
      const formList: ('W' | 'L' | 'T' | 'N')[] = []

      // Chronological sort of completed fixtures for form
      const teamFixtures = groupFixtures
        .filter((f) => f.homeTeamId === teamId || f.awayTeamId === teamId)
        .sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0))

      for (const f of teamFixtures) {
        const res = resultsMap[f.id]
        if (!res) continue

        played++

        if (res.isNoResult) {
          noResult++
          points += pointsRules.noResult
          formList.push('N')
        } else if (res.isTie) {
          tied++
          points += pointsRules.tie
          formList.push('T')
        } else if (res.winnerTeamId === teamId) {
          won++
          points += pointsRules.win
          formList.push('W')
        } else {
          lost++
          points += pointsRules.loss
          formList.push('L')
        }

        // NRR Contribution
        const nrrContrib = calculateMatchNrrContribution(res, teamId)
        if (nrrContrib.isCounted) {
          totalRunsFor += nrrContrib.runsFor
          totalBallsFor += nrrContrib.ballsFor
          totalRunsAgainst += nrrContrib.runsAgainst
          totalBallsAgainst += nrrContrib.ballsAgainst
        }
      }

      // Calculate Net Run Rate
      const oversForFrac = ballsToOversFraction(totalBallsFor)
      const oversAgainstFrac = ballsToOversFraction(totalBallsAgainst)

      const rrFor = oversForFrac > 0 ? totalRunsFor / oversForFrac : 0
      const rrAgainst = oversAgainstFrac > 0 ? totalRunsAgainst / oversAgainstFrac : 0
      const nrr = rrFor - rrAgainst

      return {
        teamId,
        teamName: t.nameSnapshot,
        groupId,
        played,
        won,
        lost,
        tied,
        noResult,
        points,
        nrr,
        nrrText: formatNrr(nrr),
        runsFor: totalRunsFor,
        oversForBalls: totalBallsFor,
        oversForString: formatBallsToOvers(totalBallsFor),
        runsAgainst: totalRunsAgainst,
        oversAgainstBalls: totalBallsAgainst,
        oversAgainstString: formatBallsToOvers(totalBallsAgainst),
        last5Form: formList.slice(-5),
        rank: 1,
      }
    })

    // Sort rows using the tiebreak order
    sortStandingsRows(rows, tiebreakOrder, groupFixtures, resultsMap, tournament.manualStandingsOrder?.[groupId])

    // Assign 1-indexed ranks
    rows.forEach((r, idx) => {
      r.rank = idx + 1
    })

    // Compute qualification status for this group
    const remainingGroupFixtures = fixtures.filter(
      (f) =>
        (f.stage === 'group' || f.stage === 'league') &&
        (f.groupId ? f.groupId === groupId : true) &&
        f.status === 'scheduled',
    )

    computeQualificationScenarios(
      rows,
      remainingGroupFixtures,
      tournament.qualifiersPerGroup,
      pointsRules.win,
    )

    standingsByGroup[groupId] = rows
  }

  return standingsByGroup
}

/**
 * Sorts standing rows according to the tiebreak order hierarchy.
 */
export function sortStandingsRows(
  rows: TeamStandingsRow[],
  tiebreakOrder: TiebreakCriterion[],
  fixtures: Fixture[],
  resultsMap: Record<string, TournamentResult>,
  manualOrder?: string[],
): void {
  rows.sort((a, b) => {
    for (const criterion of tiebreakOrder) {
      if (criterion === 'points') {
        if (b.points !== a.points) return b.points - a.points
      } else if (criterion === 'wins') {
        if (b.won !== a.won) return b.won - a.won
      } else if (criterion === 'nrr') {
        const diff = b.nrr - a.nrr
        if (Math.abs(diff) > 0.00001) return diff
      } else if (criterion === 'fewerLosses') {
        if (a.lost !== b.lost) return a.lost - b.lost
      } else if (criterion === 'headToHead') {
        const h2h = resolveHeadToHead(a.teamId, b.teamId, fixtures, resultsMap)
        if (h2h !== 0) return h2h
      } else if (criterion === 'manual' && manualOrder) {
        const idxA = manualOrder.indexOf(a.teamId)
        const idxB = manualOrder.indexOf(b.teamId)
        if (idxA !== -1 && idxB !== -1 && idxA !== idxB) {
          return idxA - idxB
        }
      }
    }
    // Final fallback: teamName alphabetically
    return a.teamName.localeCompare(b.teamName)
  })
}

/**
 * Resolves 2-way head to head comparison.
 * Returns -1 if team A won, 1 if team B won, 0 if tied/not played.
 */
export function resolveHeadToHead(
  teamAId: string,
  teamBId: string,
  fixtures: Fixture[],
  resultsMap: Record<string, TournamentResult>,
): number {
  let aWins = 0
  let bWins = 0

  for (const f of fixtures) {
    if (
      (f.homeTeamId === teamAId && f.awayTeamId === teamBId) ||
      (f.homeTeamId === teamBId && f.awayTeamId === teamAId)
    ) {
      const res = resultsMap[f.id]
      if (res && !res.isTie && !res.isNoResult) {
        if (res.winnerTeamId === teamAId) aWins++
        else if (res.winnerTeamId === teamBId) bWins++
      }
    }
  }

  if (aWins > bWins) return -1
  if (bWins > aWins) return 1
  return 0
}

/**
 * Determines qualification status ('qualified' | 'eliminated' | 'in_contention')
 * based on remaining points on the table.
 */
export function computeQualificationScenarios(
  rows: TeamStandingsRow[],
  remainingFixtures: Fixture[],
  qualifiersCount: number,
  winPoints = 2,
): void {
  const qCount = Math.min(qualifiersCount, rows.length)

  // Count remaining matches for each team
  const remainingMatches: Record<string, number> = {}
  for (const r of rows) {
    remainingMatches[r.teamId] = 0
  }
  for (const f of remainingFixtures) {
    if (f.homeTeamId) {
      remainingMatches[f.homeTeamId] = (remainingMatches[f.homeTeamId] ?? 0) + 1
    }
    if (f.awayTeamId) {
      remainingMatches[f.awayTeamId] = (remainingMatches[f.awayTeamId] ?? 0) + 1
    }
  }

  const maxPointsMap: Record<string, number> = {}
  for (const r of rows) {
    const rem = remainingMatches[r.teamId] ?? 0
    maxPointsMap[r.teamId] = r.points + rem * winPoints
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    const curPoints = row.points
    const maxPoints = maxPointsMap[row.teamId] ?? curPoints

    // Has this team already qualified?
    // If team's current points > max possible points of the (qCount+1)-th team
    const cutoffRankTeam = rows[qCount] // index qCount is the 1st team outside qualifiers
    if (cutoffRankTeam) {
      const cutoffMax = maxPointsMap[cutoffRankTeam.teamId] ?? cutoffRankTeam.points
      if (curPoints > cutoffMax) {
        row.qualificationStatus = 'qualified'
        continue
      }
    }

    // Has this team been eliminated?
    // If team's max possible points < current points of the qCount-th team (last qualifying spot)
    const lastQualifyingTeam = rows[qCount - 1] // index qCount - 1
    if (lastQualifyingTeam) {
      if (maxPoints < lastQualifyingTeam.points) {
        row.qualificationStatus = 'eliminated'
        continue
      }
    }

    row.qualificationStatus = 'in_contention'
  }
}
