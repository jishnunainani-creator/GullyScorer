import { describe, it, expect } from 'vitest'
import {
  generateRoundRobinPairings,
  assignTeamsToGroups,
  generateKnockoutBracket,
  generateGroupToKnockoutCrossPairings,
  generateTournamentFixtures,
  scheduleFixtures,
  canRegenerateFixtures,
} from '../fixtures'
import type { Tournament, TournamentTeam, Fixture } from '../types'

describe('Tournament Fixture Generation', () => {
  describe('Round-Robin Circle Method (Pairings & Counts for n=2..16)', () => {
    // Generate tests for n = 2 to 16
    for (let n = 2; n <= 16; n++) {
      it(`generates correct fixture count and round structure for ${n} teams (single round-robin)`, () => {
        const teamIds = Array.from({ length: n }, (_, i) => `team-${i + 1}`)
        const pairings = generateRoundRobinPairings(teamIds, false)

        const expectedMatchCount = (n * (n - 1)) / 2
        const expectedRounds = n % 2 === 0 ? n - 1 : n

        expect(pairings.length).toBe(expectedMatchCount)

        // Check every pair meets exactly once
        const seenPairs = new Set<string>()
        for (const p of pairings) {
          expect(p.homeTeamId).not.toBe(p.awayTeamId)
          const pairKey = [p.homeTeamId, p.awayTeamId].sort().join(' vs ')
          expect(seenPairs.has(pairKey)).toBe(false)
          seenPairs.add(pairKey)
        }
        expect(seenPairs.size).toBe(expectedMatchCount)

        // Check no team plays twice in the same round
        const teamsByRound: Record<number, Set<string>> = {}
        for (const p of pairings) {
          if (!teamsByRound[p.round]) teamsByRound[p.round] = new Set()
          expect(teamsByRound[p.round]!.has(p.homeTeamId)).toBe(false)
          expect(teamsByRound[p.round]!.has(p.awayTeamId)).toBe(false)
          teamsByRound[p.round]!.add(p.homeTeamId)
          teamsByRound[p.round]!.add(p.awayTeamId)
        }
        expect(Object.keys(teamsByRound).length).toBe(expectedRounds)
      })
    }

    // Double round-robin for n = 3, 4, 5, 6
    for (let n = 3; n <= 6; n++) {
      it(`generates double round-robin with mirrored home/away for ${n} teams`, () => {
        const teamIds = Array.from({ length: n }, (_, i) => `team-${i + 1}`)
        const pairings = generateRoundRobinPairings(teamIds, true)

        const singleCount = (n * (n - 1)) / 2
        expect(pairings.length).toBe(singleCount * 2)

        const singleRounds = n % 2 === 0 ? n - 1 : n

        for (let i = 0; i < singleCount; i++) {
          const leg1 = pairings[i]!
          const leg2 = pairings[i + singleCount]!
          expect(leg2.homeTeamId).toBe(leg1.awayTeamId)
          expect(leg2.awayTeamId).toBe(leg1.homeTeamId)
          expect(leg2.round).toBe(leg1.round + singleRounds)
        }
      })
    }
  })

  describe('Odd Team Bye Handling', () => {
    it('never emits null or bye fixtures for 3 teams', () => {
      const pairings = generateRoundRobinPairings(['A', 'B', 'C'])
      expect(pairings.length).toBe(3)
      for (const p of pairings) {
        expect(p.homeTeamId).toBeTruthy()
        expect(p.awayTeamId).toBeTruthy()
      }
    })

    it('never emits null or bye fixtures for 5 teams', () => {
      const pairings = generateRoundRobinPairings(['A', 'B', 'C', 'D', 'E'])
      expect(pairings.length).toBe(10)
      for (const p of pairings) {
        expect(p.homeTeamId).toBeTruthy()
        expect(p.awayTeamId).toBeTruthy()
      }
    })

    it('gives each team exactly one bye round across 5 rounds for 5 teams', () => {
      const teams = ['A', 'B', 'C', 'D', 'E']
      const pairings = generateRoundRobinPairings(teams)

      const appearances: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 }
      for (const p of pairings) {
        appearances[p.homeTeamId] = (appearances[p.homeTeamId] ?? 0) + 1
        appearances[p.awayTeamId] = (appearances[p.awayTeamId] ?? 0) + 1
      }
      // Each team plays 4 matches across 5 rounds (1 bye)
      for (const t of teams) {
        expect(appearances[t]).toBe(4)
      }
    })
  })

  describe('Group Assignment & Seeding', () => {
    const teams: TournamentTeam[] = [
      { id: '1', tournamentId: 't1', teamId: 'A', nameSnapshot: 'Team A', seed: 1 },
      { id: '2', tournamentId: 't1', teamId: 'B', nameSnapshot: 'Team B', seed: 2 },
      { id: '3', tournamentId: 't1', teamId: 'C', nameSnapshot: 'Team C', seed: 3 },
      { id: '4', tournamentId: 't1', teamId: 'D', nameSnapshot: 'Team D', seed: 4 },
      { id: '5', tournamentId: 't1', teamId: 'E', nameSnapshot: 'Team E', seed: 5 },
      { id: '6', tournamentId: 't1', teamId: 'F', nameSnapshot: 'Team F', seed: 6 },
    ]

    it('distributes teams into 2 groups using snake draft', () => {
      const grouped = assignTeamsToGroups(teams, 2, 'snake')
      // Snake for 2 groups:
      // Seed 1 -> A, Seed 2 -> B
      // Seed 3 -> B, Seed 4 -> A
      // Seed 5 -> A, Seed 6 -> B
      const groupA = grouped.filter((t) => t.groupId === 'A').map((t) => t.teamId)
      const groupB = grouped.filter((t) => t.groupId === 'B').map((t) => t.teamId)

      expect(groupA).toEqual(['A', 'D', 'E'])
      expect(groupB).toEqual(['B', 'C', 'F'])
    })

    it('distributes teams into 2 groups linearly when seedingMode is seeded', () => {
      const grouped = assignTeamsToGroups(teams, 2, 'seeded')
      const groupA = grouped.filter((t) => t.groupId === 'A').map((t) => t.teamId)
      const groupB = grouped.filter((t) => t.groupId === 'B').map((t) => t.teamId)

      expect(groupA).toEqual(['A', 'C', 'E'])
      expect(groupB).toEqual(['B', 'D', 'F'])
    })

    it('is completely deterministic for random mode with the same seed value', () => {
      const g1 = assignTeamsToGroups(teams, 2, 'random', 12345)
      const g2 = assignTeamsToGroups(teams, 2, 'random', 12345)
      expect(g1.map((t) => t.groupId)).toEqual(g2.map((t) => t.groupId))
    })

    it('produces different assignments for different seeds', () => {
      const g1 = assignTeamsToGroups(teams, 2, 'random', 111)
      const g2 = assignTeamsToGroups(teams, 2, 'random', 999)
      expect(g1.map((t) => t.teamId + t.groupId)).not.toEqual(g2.map((t) => t.teamId + t.groupId))
    })

    it('handles single group by placing all in group A', () => {
      const g = assignTeamsToGroups(teams, 1)
      expect(g.every((t) => t.groupId === 'A')).toBe(true)
    })
  })

  describe('Knockout Bracket Generation (Sizes 3..16)', () => {
    for (let k = 3; k <= 16; k++) {
      it(`generates valid knockout bracket for ${k} teams with byes handled`, () => {
        const teamIds = Array.from({ length: k }, (_, i) => `team-${i + 1}`)
        const fixtures = generateKnockoutBracket('tourn-1', teamIds)

        // Must have at least 1 final
        const finalMatches = fixtures.filter((f) => f.stage === 'final')
        expect(finalMatches.length).toBe(1)

        // No fixture has same team as both home and away
        for (const f of fixtures) {
          if (f.homeTeamId && f.awayTeamId) {
            expect(f.homeTeamId).not.toBe(f.awayTeamId)
          }
        }
      })
    }

    it('correctly creates 4-team bracket with 2 semifinals and 1 final', () => {
      const fixtures = generateKnockoutBracket('t1', ['T1', 'T2', 'T3', 'T4'])
      const semis = fixtures.filter((f) => f.stage === 'semi')
      const final = fixtures.filter((f) => f.stage === 'final')

      expect(semis.length).toBe(2)
      expect(final.length).toBe(1)

      // Semis lead to final
      expect(semis[0]!.winnerAdvancesToFixtureId).toBe(final[0]!.id)
      expect(semis[1]!.winnerAdvancesToFixtureId).toBe(final[0]!.id)
      expect(semis[0]!.winnerAdvancesToSlot).toBe('home')
      expect(semis[1]!.winnerAdvancesToSlot).toBe('away')
    })

    it('creates third place playoff fixture when requested', () => {
      const fixtures = generateKnockoutBracket('t1', ['T1', 'T2', 'T3', 'T4'], true)
      const thirdPlace = fixtures.filter((f) => f.stage === 'third_place')
      expect(thirdPlace.length).toBe(1)
      const semis = fixtures.filter((f) => f.stage === 'semi')
      expect(semis[0]!.loserAdvancesToFixtureId).toBe(thirdPlace[0]!.id)
      expect(semis[1]!.loserAdvancesToFixtureId).toBe(thirdPlace[0]!.id)
    })

    it('advances top seed on 3-team bracket bye', () => {
      const fixtures = generateKnockoutBracket('t1', ['T1', 'T2', 'T3'])
      const semis = fixtures.filter((f) => f.stage === 'semi')
      const final = fixtures.filter((f) => f.stage === 'final')

      // One semi should be marked completed due to bye
      const byeSemi = semis.find((s) => s.status === 'completed')
      expect(byeSemi).toBeDefined()

      // The advancing team should be placed in final
      expect(final[0]!.homeTeamId === 'T1' || final[0]!.awayTeamId === 'T1').toBe(true)
    })
  })

  describe('Group to Knockout Cross-Pairing', () => {
    it('produces A1 vs B2 and B1 vs A2 for 2 groups with 2 qualifiers', () => {
      const pairings = generateGroupToKnockoutCrossPairings(2, 2)
      expect(pairings).toEqual([
        { homeSource: 'A1', awaySource: 'B2' },
        { homeSource: 'B1', awaySource: 'A2' },
      ])
    })

    it('produces 4 quarterfinals for 2 groups with 4 qualifiers', () => {
      const pairings = generateGroupToKnockoutCrossPairings(2, 4)
      expect(pairings.length).toBe(4)
      expect(pairings[0]).toEqual({ homeSource: 'A1', awaySource: 'B4' })
    })
  })

  describe('Full Tournament Fixture Generator', () => {
    const mockTournament: Tournament = {
      id: 'tourn-full',
      name: 'Gully Premier League',
      format: 'groups_knockout',
      oversPerInnings: 5,
      playersPerSide: 6,
      pointsRules: { win: 2, tie: 1, noResult: 1, loss: 0 },
      tiebreakOrder: ['points', 'nrr', 'headToHead'],
      groupsCount: 2,
      qualifiersPerGroup: 2,
      knockoutStages: ['semi', 'final'],
      seedingMode: 'snake',
      seedValue: 100,
      isPublic: true,
      shareToken: 'gpl-2026',
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const mockTeams: TournamentTeam[] = [
      { id: '1', tournamentId: 'tourn-full', teamId: 'A1', nameSnapshot: 'Team A1', groupId: 'A' },
      { id: '2', tournamentId: 'tourn-full', teamId: 'A2', nameSnapshot: 'Team A2', groupId: 'A' },
      { id: '3', tournamentId: 'tourn-full', teamId: 'A3', nameSnapshot: 'Team A3', groupId: 'A' },
      { id: '4', tournamentId: 'tourn-full', teamId: 'B1', nameSnapshot: 'Team B1', groupId: 'B' },
      { id: '5', tournamentId: 'tourn-full', teamId: 'B2', nameSnapshot: 'Team B2', groupId: 'B' },
      { id: '6', tournamentId: 'tourn-full', teamId: 'B3', nameSnapshot: 'Team B3', groupId: 'B' },
    ]

    it('generates group fixtures plus knockout semifinals and final', () => {
      const fixtures = generateTournamentFixtures(mockTournament, mockTeams)
      const groupA = fixtures.filter((f) => f.groupId === 'A')
      const groupB = fixtures.filter((f) => f.groupId === 'B')
      const semis = fixtures.filter((f) => f.stage === 'semi')
      const finals = fixtures.filter((f) => f.stage === 'final')

      expect(groupA.length).toBe(3) // 3 teams in A -> 3 matches
      expect(groupB.length).toBe(3) // 3 teams in B -> 3 matches
      expect(semis.length).toBe(2)
      expect(finals.length).toBe(1)
      expect(fixtures.length).toBe(9)
    })
  })

  describe('Scheduling Helper & Regeneration Guard', () => {
    it('schedules matches with sequential timestamps and respects matchesPerDay', () => {
      const fixtures: Fixture[] = Array.from({ length: 4 }, (_, i) => ({
        id: `f-${i}`,
        tournamentId: 't',
        stage: 'league',
        round: 1,
        homeTeamId: 'h',
        awayTeamId: 'a',
        status: 'scheduled',
        createdAt: 0,
        updatedAt: 0,
      }))

      const start = new Date(2026, 4, 1, 9, 0, 0)
      const scheduled = scheduleFixtures(fixtures, {
        startDate: start,
        matchesPerDay: 2,
        matchIntervalMinutes: 120,
      })

      // Match 0 & 1 on Day 1
      expect(new Date(scheduled[0]!.scheduledAt!).getDate()).toBe(1)
      expect(new Date(scheduled[1]!.scheduledAt!).getDate()).toBe(1)
      // Match 2 & 3 on Day 2
      expect(new Date(scheduled[2]!.scheduledAt!).getDate()).toBe(2)
      expect(new Date(scheduled[3]!.scheduledAt!).getDate()).toBe(2)
    })

    it('blocks regeneration when any fixture is completed or live', () => {
      const fixtures: Fixture[] = [
        {
          id: 'f-1',
          tournamentId: 't',
          stage: 'league',
          round: 1,
          homeTeamId: 'h',
          awayTeamId: 'a',
          status: 'completed',
          createdAt: 0,
          updatedAt: 0,
        },
      ]

      const check = canRegenerateFixtures(fixtures)
      expect(check.canRegenerate).toBe(false)
      expect(check.reason).toContain('have already been played')
    })

    it('allows regeneration when all fixtures are scheduled', () => {
      const fixtures: Fixture[] = [
        {
          id: 'f-1',
          tournamentId: 't',
          stage: 'league',
          round: 1,
          homeTeamId: 'h',
          awayTeamId: 'a',
          status: 'scheduled',
          createdAt: 0,
          updatedAt: 0,
        },
      ]

      const check = canRegenerateFixtures(fixtures)
      expect(check.canRegenerate).toBe(true)
    })
  })
})
