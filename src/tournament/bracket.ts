import type { Fixture, TeamStandingsRow } from './types'

/**
 * Checks if a fixture's result can be edited or re-scored.
 * Blocks if any downstream fixture that depends on this match has already started or completed.
 */
export function canEditKnockoutFixture(
  fixtures: Fixture[],
  fixtureId: string,
): { canEdit: boolean; reason?: string } {
  const current = fixtures.find((f) => f.id === fixtureId)
  if (!current) {
    return { canEdit: false, reason: 'Fixture not found' }
  }

  // Check downstream winner fixture
  if (current.winnerAdvancesToFixtureId) {
    const nextFixture = fixtures.find((f) => f.id === current.winnerAdvancesToFixtureId)
    if (nextFixture) {
      if (nextFixture.status === 'live' || nextFixture.status === 'completed') {
        return {
          canEdit: false,
          reason: `Cannot change result: Downstream fixture (${nextFixture.stage.toUpperCase()}) has already started or completed.`,
        }
      }
    }
  }

  // Check downstream loser fixture (e.g. third place playoff)
  if (current.loserAdvancesToFixtureId) {
    const loserFixture = fixtures.find((f) => f.id === current.loserAdvancesToFixtureId)
    if (loserFixture) {
      if (loserFixture.status === 'live' || loserFixture.status === 'completed') {
        return {
          canEdit: false,
          reason: `Cannot change result: Downstream 3rd place playoff has already started or completed.`,
        }
      }
    }
  }

  return { canEdit: true }
}

/**
 * Advances the winner (and optionally loser to 3rd place playoff)
 * of a completed knockout fixture into downstream bracket slots.
 */
export function advanceKnockoutWinner(
  fixtures: Fixture[],
  fixtureId: string,
  winnerTeamId: string | null,
  loserTeamId?: string | null,
): { fixtures: Fixture[]; updatedCount: number } {
  const check = canEditKnockoutFixture(fixtures, fixtureId)
  if (!check.canEdit) {
    throw new Error(check.reason)
  }

  const updatedFixtures = fixtures.map((f) => ({ ...f }))
  const current = updatedFixtures.find((f) => f.id === fixtureId)
  if (!current) return { fixtures, updatedCount: 0 }

  let updatedCount = 0

  // Advance winner
  if (current.winnerAdvancesToFixtureId) {
    const nextFixture = updatedFixtures.find(
      (f) => f.id === current.winnerAdvancesToFixtureId,
    )
    if (nextFixture) {
      if (current.winnerAdvancesToSlot === 'home') {
        if (nextFixture.homeTeamId !== winnerTeamId) {
          nextFixture.homeTeamId = winnerTeamId
          nextFixture.updatedAt = Date.now()
          updatedCount++
        }
      } else {
        if (nextFixture.awayTeamId !== winnerTeamId) {
          nextFixture.awayTeamId = winnerTeamId
          nextFixture.updatedAt = Date.now()
          updatedCount++
        }
      }
    }
  }

  // Advance loser to 3rd place playoff if applicable
  if (current.loserAdvancesToFixtureId && loserTeamId !== undefined) {
    const loserFixture = updatedFixtures.find(
      (f) => f.id === current.loserAdvancesToFixtureId,
    )
    if (loserFixture) {
      if (current.loserAdvancesToSlot === 'home') {
        if (loserFixture.homeTeamId !== loserTeamId) {
          loserFixture.homeTeamId = loserTeamId
          loserFixture.updatedAt = Date.now()
          updatedCount++
        }
      } else {
        if (loserFixture.awayTeamId !== loserTeamId) {
          loserFixture.awayTeamId = loserTeamId
          loserFixture.updatedAt = Date.now()
          updatedCount++
        }
      }
    }
  }

  return { fixtures: updatedFixtures, updatedCount }
}

/**
 * Populates qualified teams from the group stage standings into
 * the first round of the knockout stage (e.g. A1, B2 -> Team IDs).
 */
export function populateKnockoutGroupQualifiers(
  fixtures: Fixture[],
  standingsByGroup: Record<string, TeamStandingsRow[]>,
): { fixtures: Fixture[]; updatedCount: number } {
  const updatedFixtures = fixtures.map((f) => ({ ...f }))
  let updatedCount = 0

  // Build lookup for qualifiers: "A1" -> teamId, "B2" -> teamId
  const qualifierLookup: Record<string, string> = {}
  for (const [groupId, rows] of Object.entries(standingsByGroup)) {
    rows.forEach((r, idx) => {
      const code = `${groupId}${idx + 1}`
      qualifierLookup[code] = r.teamId
    })
  }

  for (const f of updatedFixtures) {
    if (f.stage === 'semi' || f.stage === 'quarter' || f.stage === 'round_of_16') {
      const slot = f.bracketSlot
      if (slot) {
        if (slot.homeSource && qualifierLookup[slot.homeSource]) {
          const qualifiedTeamId = qualifierLookup[slot.homeSource]!
          if (f.homeTeamId !== qualifiedTeamId) {
            f.homeTeamId = qualifiedTeamId
            f.updatedAt = Date.now()
            updatedCount++
          }
        }
        if (slot.awaySource && qualifierLookup[slot.awaySource]) {
          const qualifiedTeamId = qualifierLookup[slot.awaySource]!
          if (f.awayTeamId !== qualifiedTeamId) {
            f.awayTeamId = qualifiedTeamId
            f.updatedAt = Date.now()
            updatedCount++
          }
        }
      }
    }
  }

  return { fixtures: updatedFixtures, updatedCount }
}
