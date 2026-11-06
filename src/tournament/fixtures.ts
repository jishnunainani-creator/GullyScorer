import type {
  Tournament,
  TournamentTeam,
  Fixture,
  TournamentStage,
  SeedingMode,
} from './types'

// Simple deterministic Mulberry32 PRNG
export function createSeededRng(seed: number): () => number {
  let s = Math.floor(seed) >>> 0
  return function () {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Assigns teams to groups based on seeding mode and deterministic seed value.
 */
export function assignTeamsToGroups(
  teams: TournamentTeam[],
  groupsCount: number,
  mode: SeedingMode = 'snake',
  seedValue = 42,
): TournamentTeam[] {
  if (groupsCount <= 1) {
    return teams.map((t) => ({ ...t, groupId: 'A' }))
  }

  const groupLabels = Array.from({ length: groupsCount }, (_, i) =>
    String.fromCharCode(65 + i),
  )

  let orderedTeams = [...teams]

  if (mode === 'random') {
    const rng = createSeededRng(seedValue)
    // Fisher-Yates shuffle
    for (let i = orderedTeams.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      const temp = orderedTeams[i]!
      orderedTeams[i] = orderedTeams[j]!
      orderedTeams[j] = temp
    }
  } else {
    // Sort by seed if specified
    orderedTeams.sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
  }

  return orderedTeams.map((team, idx) => {
    let groupIndex: number
    if (mode === 'snake') {
      const row = Math.floor(idx / groupsCount)
      const col = idx % groupsCount
      groupIndex = row % 2 === 0 ? col : groupsCount - 1 - col
    } else {
      // Linear / seeded
      groupIndex = idx % groupsCount
    }
    return {
      ...team,
      groupId: groupLabels[groupIndex],
    }
  })
}

/**
 * Generates round-robin pairings for a list of team IDs using the Berger/Circle method.
 * Handles odd numbers of teams with a BYE (null). Bye matchups are omitted.
 */
export function generateRoundRobinPairings(
  teamIds: string[],
  isDouble = false,
  startRound = 1,
): Array<{ round: number; homeTeamId: string; awayTeamId: string }> {
  if (teamIds.length < 2) return []

  const teams: (string | null)[] = [...teamIds]
  if (teams.length % 2 !== 0) {
    teams.push(null) // BYE
  }

  const n = teams.length
  const roundsCount = n - 1
  const matchesPerRound = n / 2
  const fixtures: Array<{ round: number; homeTeamId: string; awayTeamId: string }> = []

  // First leg
  for (let r = 0; r < roundsCount; r++) {
    const roundNumber = startRound + r
    for (let m = 0; m < matchesPerRound; m++) {
      const home = teams[m]
      const away = teams[n - 1 - m]

      if (home && away) {
        // Alternate home/away for the fixed team 0 to maintain balance
        if (m === 0 && r % 2 === 1) {
          fixtures.push({ round: roundNumber, homeTeamId: away, awayTeamId: home })
        } else {
          fixtures.push({ round: roundNumber, homeTeamId: home, awayTeamId: away })
        }
      }
    }

    // Rotate elements: keep index 0 fixed, rotate others clockwise
    const fixed = teams[0]
    const last = teams[teams.length - 1]
    for (let i = teams.length - 1; i > 1; i--) {
      teams[i] = teams[i - 1]!
    }
    teams[1] = last!
    teams[0] = fixed!
  }

  // Second leg (double round-robin) mirrors home/away order
  if (isDouble) {
    const leg1Length = fixtures.length
    for (let i = 0; i < leg1Length; i++) {
      const f = fixtures[i]!
      fixtures.push({
        round: f.round + roundsCount,
        homeTeamId: f.awayTeamId,
        awayTeamId: f.homeTeamId,
      })
    }
  }

  return fixtures
}

/**
 * Generates single-elimination knockout bracket fixtures.
 * Handles non-power-of-2 teams via top-seed byes.
 */
export function generateKnockoutBracket(
  tournamentId: string,
  teamIds: string[],
  hasThirdPlacePlayoff = false,
): Fixture[] {
  if (teamIds.length < 2) return []

  // Next power of 2
  let p = 2
  while (p < teamIds.length) {
    p *= 2
  }

  // Prepare seeded slots (1 to p)
  // Standard tournament bracket seeding:
  // e.g. for p=8: [1, 8, 4, 5, 2, 7, 3, 6]
  const seededOrder = getBracketSeedOrder(p)

  // Map seed number to teamId (1-indexed) or null for Bye
  const slotToTeam: Record<number, string | null> = {}
  for (let s = 1; s <= p; s++) {
    if (s <= teamIds.length) {
      slotToTeam[s] = teamIds[s - 1]!
    } else {
      slotToTeam[s] = null // BYE
    }
  }

  const stagesInOrder: TournamentStage[] = []
  if (p === 16) stagesInOrder.push('round_of_16', 'quarter', 'semi', 'final')
  else if (p === 8) stagesInOrder.push('quarter', 'semi', 'final')
  else if (p === 4) stagesInOrder.push('semi', 'final')
  else stagesInOrder.push('final')

  const fixturesByStage: Record<TournamentStage, Fixture[]> = {
    league: [],
    group: [],
    round_of_16: [],
    quarter: [],
    semi: [],
    final: [],
    third_place: [],
  }

  // 1. Create empty fixtures from final backwards down to Round 1
  let currentRound = stagesInOrder.length
  const reversedStages = [...stagesInOrder].reverse()

  for (let sIdx = 0; sIdx < reversedStages.length; sIdx++) {
    const stage = reversedStages[sIdx]!
    const matchesCount = Math.pow(2, sIdx)
    const stageFixtures: Fixture[] = []

    for (let m = 0; m < matchesCount; m++) {
      const fId = `f-${stage}-${m + 1}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
      stageFixtures.push({
        id: fId,
        tournamentId,
        stage,
        round: currentRound,
        homeTeamId: null,
        awayTeamId: null,
        status: 'scheduled',
        bracketSlot: {
          slotNumber: m + 1,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }
    fixturesByStage[stage] = stageFixtures
    currentRound--
  }

  // 2. Link downstream progression: Round R -> Round R+1
  for (let sIdx = 0; sIdx < stagesInOrder.length - 1; sIdx++) {
    const currentStage = stagesInOrder[sIdx]!
    const nextStage = stagesInOrder[sIdx + 1]!
    const currentList = fixturesByStage[currentStage]!
    const nextList = fixturesByStage[nextStage]!

    for (let i = 0; i < currentList.length; i++) {
      const parentFixture = nextList[Math.floor(i / 2)]!
      const slot: 'home' | 'away' = i % 2 === 0 ? 'home' : 'away'
      currentList[i]!.winnerAdvancesToFixtureId = parentFixture.id
      currentList[i]!.winnerAdvancesToSlot = slot
    }
  }

  // 3. Populate Round 1 teams & handle BYEs
  const round1Stage = stagesInOrder[0]!
  const round1Fixtures = fixturesByStage[round1Stage]!

  for (let m = 0; m < round1Fixtures.length; m++) {
    const f = round1Fixtures[m]!
    const seedHome = seededOrder[2 * m]!
    const seedAway = seededOrder[2 * m + 1]!
    const homeTeam = slotToTeam[seedHome] ?? null
    const awayTeam = slotToTeam[seedAway] ?? null

    f.homeTeamId = homeTeam
    f.awayTeamId = awayTeam
    f.bracketSlot = {
      slotNumber: m + 1,
      homeSource: `Seed ${seedHome}`,
      awaySource: `Seed ${seedAway}`,
    }

    // Auto-advance BYE if one team is null
    if (homeTeam && !awayTeam) {
      f.status = 'completed'
      if (f.winnerAdvancesToFixtureId) {
        const nextFix = findFixture(fixturesByStage, f.winnerAdvancesToFixtureId)
        if (nextFix) {
          if (f.winnerAdvancesToSlot === 'home') nextFix.homeTeamId = homeTeam
          else nextFix.awayTeamId = homeTeam
        }
      }
    } else if (!homeTeam && awayTeam) {
      f.status = 'completed'
      if (f.winnerAdvancesToFixtureId) {
        const nextFix = findFixture(fixturesByStage, f.winnerAdvancesToFixtureId)
        if (nextFix) {
          if (f.winnerAdvancesToSlot === 'home') nextFix.homeTeamId = awayTeam
          else nextFix.awayTeamId = awayTeam
        }
      }
    }
  }

  // 4. Optional Third Place Playoff
  if (hasThirdPlacePlayoff && fixturesByStage.semi.length === 2) {
    const thirdPlaceFixture: Fixture = {
      id: `f-third_place-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      tournamentId,
      stage: 'third_place',
      round: stagesInOrder.length,
      homeTeamId: null,
      awayTeamId: null,
      status: 'scheduled',
      bracketSlot: {
        slotNumber: 1,
        homeSource: 'Loser SF1',
        awaySource: 'Loser SF2',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    fixturesByStage.semi[0]!.loserAdvancesToFixtureId = thirdPlaceFixture.id
    fixturesByStage.semi[0]!.loserAdvancesToSlot = 'home'
    fixturesByStage.semi[1]!.loserAdvancesToFixtureId = thirdPlaceFixture.id
    fixturesByStage.semi[1]!.loserAdvancesToSlot = 'away'

    fixturesByStage.third_place = [thirdPlaceFixture]
  }

  // Flatten all fixtures in chronological round order
  const allKnockoutFixtures: Fixture[] = []
  for (const stg of stagesInOrder) {
    allKnockoutFixtures.push(...fixturesByStage[stg]!)
  }
  if (fixturesByStage.third_place.length > 0) {
    allKnockoutFixtures.push(...fixturesByStage.third_place)
  }

  return allKnockoutFixtures
}

function findFixture(
  fixturesByStage: Record<TournamentStage, Fixture[]>,
  id: string,
): Fixture | undefined {
  for (const list of Object.values(fixturesByStage)) {
    const found = list.find((f) => f.id === id)
    if (found) return found
  }
  return undefined
}

/**
 * Standard tournament bracket seed order generation (e.g. 1vs8, 4vs5, 2vs7, 3vs6).
 */
export function getBracketSeedOrder(size: number): number[] {
  let rounds = [1, 2]
  while (rounds.length < size) {
    const nextSize = rounds.length * 2
    const nextRounds: number[] = []
    for (let i = 0; i < rounds.length; i++) {
      nextRounds.push(rounds[i]!)
      nextRounds.push(nextSize + 1 - rounds[i]!)
    }
    rounds = nextRounds
  }
  return rounds
}

/**
 * Cross-pairing generator from groups to knockout stage.
 * For 2 groups (A & B) with 2 qualifiers:
 * Semi 1: A1 vs B2
 * Semi 2: B1 vs A2
 * For more groups, cross-pairs top-seed of Group i with runner-up of Group i+1.
 */
export function generateGroupToKnockoutCrossPairings(
  groupsCount: number,
  qualifiersPerGroup: number,
): Array<{ homeSource: string; awaySource: string }> {
  const groupLetters = Array.from({ length: groupsCount }, (_, i) =>
    String.fromCharCode(65 + i),
  )
  const pairings: Array<{ homeSource: string; awaySource: string }> = []

  if (groupsCount === 2) {
    if (qualifiersPerGroup === 2) {
      pairings.push({ homeSource: 'A1', awaySource: 'B2' })
      pairings.push({ homeSource: 'B1', awaySource: 'A2' })
    } else if (qualifiersPerGroup === 4) {
      pairings.push({ homeSource: 'A1', awaySource: 'B4' })
      pairings.push({ homeSource: 'A2', awaySource: 'B3' })
      pairings.push({ homeSource: 'B1', awaySource: 'A4' })
      pairings.push({ homeSource: 'B2', awaySource: 'A3' })
    }
  } else {
    // Generic cross pairing: Gi(Rank1) vs G(i+1)(Rank2)
    for (let i = 0; i < groupsCount; i++) {
      const gHome = groupLetters[i]!
      const gAway = groupLetters[(i + 1) % groupsCount]!
      pairings.push({ homeSource: `${gHome}1`, awaySource: `${gAway}2` })
    }
  }

  return pairings
}

/**
 * Main tournament fixture generator supporting League, Double League, Groups+Knockout, and Knockout formats.
 */
export function generateTournamentFixtures(
  tournament: Tournament,
  teams: TournamentTeam[],
): Fixture[] {
  const format = tournament.format
  const tournamentId = tournament.id
  const allFixtures: Fixture[] = []

  if (format === 'league' || format === 'double_league') {
    const isDouble = format === 'double_league'
    const teamIds = teams.map((t) => t.teamId)
    const pairings = generateRoundRobinPairings(teamIds, isDouble)

    pairings.forEach((p, idx) => {
      allFixtures.push({
        id: `f-league-${idx + 1}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        tournamentId,
        stage: 'league',
        round: p.round,
        homeTeamId: p.homeTeamId,
        awayTeamId: p.awayTeamId,
        status: 'scheduled',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    })
  } else if (format === 'groups_knockout') {
    // 1. Group stage round-robin
    const groupedTeams: Record<string, TournamentTeam[]> = {}
    teams.forEach((t) => {
      const g = t.groupId ?? 'A'
      if (!groupedTeams[g]) groupedTeams[g] = []
      groupedTeams[g]!.push(t)
    })

    let maxGroupRound = 1
    Object.entries(groupedTeams).forEach(([groupId, gTeams]) => {
      const pairings = generateRoundRobinPairings(gTeams.map((t) => t.teamId))
      pairings.forEach((p, idx) => {
        if (p.round > maxGroupRound) maxGroupRound = p.round
        allFixtures.push({
          id: `f-group-${groupId}-${idx + 1}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          tournamentId,
          stage: 'group',
          groupId,
          round: p.round,
          homeTeamId: p.homeTeamId,
          awayTeamId: p.awayTeamId,
          status: 'scheduled',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })
    })

    // 2. Knockout placeholder fixtures
    const crossPairings = generateGroupToKnockoutCrossPairings(
      tournament.groupsCount,
      tournament.qualifiersPerGroup,
    )
    const isSemiFinalStart = crossPairings.length === 2
    const startStage: TournamentStage = isSemiFinalStart ? 'semi' : 'quarter'

    const round1Knockout: Fixture[] = crossPairings.map((cp, idx) => ({
      id: `f-${startStage}-${idx + 1}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      tournamentId,
      stage: startStage,
      round: maxGroupRound + 1,
      homeTeamId: null,
      awayTeamId: null,
      status: 'scheduled',
      bracketSlot: {
        slotNumber: idx + 1,
        homeSource: cp.homeSource,
        awaySource: cp.awaySource,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }))

    allFixtures.push(...round1Knockout)

    // Final
    const finalFixture: Fixture = {
      id: `f-final-1-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      tournamentId,
      stage: 'final',
      round: maxGroupRound + (isSemiFinalStart ? 2 : 3),
      homeTeamId: null,
      awayTeamId: null,
      status: 'scheduled',
      bracketSlot: {
        slotNumber: 1,
        homeSource: isSemiFinalStart ? 'Winner of Semi 1' : 'Winner of SF1',
        awaySource: isSemiFinalStart ? 'Winner of Semi 2' : 'Winner of SF2',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    if (isSemiFinalStart) {
      round1Knockout[0]!.winnerAdvancesToFixtureId = finalFixture.id
      round1Knockout[0]!.winnerAdvancesToSlot = 'home'
      round1Knockout[1]!.winnerAdvancesToFixtureId = finalFixture.id
      round1Knockout[1]!.winnerAdvancesToSlot = 'away'
    }

    allFixtures.push(finalFixture)
  } else if (format === 'knockout') {
    const teamIds = teams.map((t) => t.teamId)
    const hasThirdPlace = tournament.knockoutStages.includes('third_place')
    const kFixtures = generateKnockoutBracket(tournamentId, teamIds, hasThirdPlace)
    allFixtures.push(...kFixtures)
  }

  return allFixtures
}

/**
 * Scheduling Helper: sequentially assigns dates/times from a start date,
 * respecting matches per day and spacing teams so no team plays twice in a row when possible.
 */
export function scheduleFixtures(
  fixtures: Fixture[],
  options: {
    startDate: Date
    matchesPerDay: number
    startHour?: number // default 9 (9:00 AM)
    matchIntervalMinutes?: number // default 120 (2 hours)
  },
): Fixture[] {
  const {
    startDate,
    matchesPerDay,
    startHour = 9,
    matchIntervalMinutes = 120,
  } = options

  const scheduled = [...fixtures]
  let currentDay = new Date(startDate)
  currentDay.setHours(startHour, 0, 0, 0)

  let matchesToday = 0

  for (let i = 0; i < scheduled.length; i++) {
    const matchTime = new Date(currentDay)
    matchTime.setMinutes(matchTime.getMinutes() + matchesToday * matchIntervalMinutes)

    scheduled[i] = {
      ...scheduled[i]!,
      scheduledAt: matchTime.getTime(),
      updatedAt: Date.now(),
    }

    matchesToday++
    if (matchesToday >= matchesPerDay) {
      matchesToday = 0
      currentDay = new Date(currentDay.getTime() + 24 * 60 * 60 * 1000)
      currentDay.setHours(startHour, 0, 0, 0)
    }
  }

  return scheduled
}

/**
 * Validates whether regenerating fixtures is permitted.
 * Blocks if any fixture has started or completed.
 */
export function canRegenerateFixtures(existingFixtures: Fixture[]): {
  canRegenerate: boolean
  reason?: string
} {
  const played = existingFixtures.filter(
    (f) => f.status === 'completed' || f.status === 'live',
  )
  if (played.length > 0) {
    return {
      canRegenerate: false,
      reason: `Cannot regenerate tournament fixtures: ${played.length} match(es) have already been played or are currently live.`,
    }
  }
  return { canRegenerate: true }
}
