import { describe, it, expect } from 'vitest'
import {
  advanceKnockoutWinner,
  canEditKnockoutFixture,
  populateKnockoutGroupQualifiers,
} from '../bracket'
import type { Fixture, TeamStandingsRow } from '../types'

describe('Tournament Knockout Bracket Progression', () => {
  function createSampleBracket(): Fixture[] {
    return [
      {
        id: 'sf-1',
        tournamentId: 't1',
        stage: 'semi',
        round: 1,
        homeTeamId: 'T1',
        awayTeamId: 'T2',
        status: 'completed',
        winnerAdvancesToFixtureId: 'final-1',
        winnerAdvancesToSlot: 'home',
        loserAdvancesToFixtureId: 'tp-1',
        loserAdvancesToSlot: 'home',
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 'sf-2',
        tournamentId: 't1',
        stage: 'semi',
        round: 1,
        homeTeamId: 'T3',
        awayTeamId: 'T4',
        status: 'scheduled',
        winnerAdvancesToFixtureId: 'final-1',
        winnerAdvancesToSlot: 'away',
        loserAdvancesToFixtureId: 'tp-1',
        loserAdvancesToSlot: 'away',
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 'final-1',
        tournamentId: 't1',
        stage: 'final',
        round: 2,
        homeTeamId: null,
        awayTeamId: null,
        status: 'scheduled',
        bracketSlot: { slotNumber: 1, homeSource: 'Winner SF1', awaySource: 'Winner SF2' },
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 'tp-1',
        tournamentId: 't1',
        stage: 'third_place',
        round: 2,
        homeTeamId: null,
        awayTeamId: null,
        status: 'scheduled',
        bracketSlot: { slotNumber: 1, homeSource: 'Loser SF1', awaySource: 'Loser SF2' },
        createdAt: 0,
        updatedAt: 0,
      },
    ]
  }

  it('advances winner of SF1 to home slot of final and loser to home slot of 3rd place', () => {
    const bracket = createSampleBracket()
    const { fixtures } = advanceKnockoutWinner(bracket, 'sf-1', 'T1', 'T2')

    const final = fixtures.find((f) => f.id === 'final-1')!
    const tp = fixtures.find((f) => f.id === 'tp-1')!

    expect(final.homeTeamId).toBe('T1')
    expect(tp.homeTeamId).toBe('T2')
  })

  it('advances winner of SF2 to away slot of final and loser to away slot of 3rd place', () => {
    const bracket = createSampleBracket()
    const { fixtures } = advanceKnockoutWinner(bracket, 'sf-2', 'T4', 'T3')

    const final = fixtures.find((f) => f.id === 'final-1')!
    const tp = fixtures.find((f) => f.id === 'tp-1')!

    expect(final.awayTeamId).toBe('T4')
    expect(tp.awayTeamId).toBe('T3')
  })

  it('allows re-scoring when downstream fixture is scheduled', () => {
    const bracket = createSampleBracket()
    const check = canEditKnockoutFixture(bracket, 'sf-1')
    expect(check.canEdit).toBe(true)

    // Advance T1 first
    let { fixtures } = advanceKnockoutWinner(bracket, 'sf-1', 'T1', 'T2')
    expect(fixtures.find((f) => f.id === 'final-1')!.homeTeamId).toBe('T1')

    // Re-score to T2
    fixtures = advanceKnockoutWinner(fixtures, 'sf-1', 'T2', 'T1').fixtures
    expect(fixtures.find((f) => f.id === 'final-1')!.homeTeamId).toBe('T2')
    expect(fixtures.find((f) => f.id === 'tp-1')!.homeTeamId).toBe('T1')
  })

  it('blocks edit when downstream final is already live', () => {
    const bracket = createSampleBracket()
    bracket.find((f) => f.id === 'final-1')!.status = 'live'

    const check = canEditKnockoutFixture(bracket, 'sf-1')
    expect(check.canEdit).toBe(false)
    expect(check.reason).toContain('has already started or completed')

    expect(() => advanceKnockoutWinner(bracket, 'sf-1', 'T1', 'T2')).toThrow(
      /already started or completed/,
    )
  })

  it('blocks edit when downstream final is already completed', () => {
    const bracket = createSampleBracket()
    bracket.find((f) => f.id === 'final-1')!.status = 'completed'

    const check = canEditKnockoutFixture(bracket, 'sf-1')
    expect(check.canEdit).toBe(false)
  })

  it('blocks edit when downstream 3rd place playoff is already live', () => {
    const bracket = createSampleBracket()
    bracket.find((f) => f.id === 'tp-1')!.status = 'live'

    const check = canEditKnockoutFixture(bracket, 'sf-1')
    expect(check.canEdit).toBe(false)
    expect(check.reason).toContain('Downstream 3rd place playoff')
  })

  it('populates qualified teams from group standings into knockout fixtures', () => {
    const groupFixtures: Fixture[] = [
      {
        id: 'sf-1',
        tournamentId: 't',
        stage: 'semi',
        round: 2,
        homeTeamId: null,
        awayTeamId: null,
        status: 'scheduled',
        bracketSlot: { slotNumber: 1, homeSource: 'A1', awaySource: 'B2' },
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 'sf-2',
        tournamentId: 't',
        stage: 'semi',
        round: 2,
        homeTeamId: null,
        awayTeamId: null,
        status: 'scheduled',
        bracketSlot: { slotNumber: 2, homeSource: 'B1', awaySource: 'A2' },
        createdAt: 0,
        updatedAt: 0,
      },
    ]

    const standings: Record<string, TeamStandingsRow[]> = {
      A: [
        { teamId: 'team-A-winner', teamName: 'Alpha 1', played: 2, won: 2, lost: 0, tied: 0, noResult: 0, points: 4, nrr: 1.0, nrrText: '+1.000', runsFor: 100, oversForBalls: 60, oversForString: '10.0', runsAgainst: 80, oversAgainstBalls: 60, oversAgainstString: '10.0', last5Form: ['W', 'W'], rank: 1 },
        { teamId: 'team-A-runnerup', teamName: 'Alpha 2', played: 2, won: 1, lost: 1, tied: 0, noResult: 0, points: 2, nrr: 0.1, nrrText: '+0.100', runsFor: 90, oversForBalls: 60, oversForString: '10.0', runsAgainst: 85, oversAgainstBalls: 60, oversAgainstString: '10.0', last5Form: ['L', 'W'], rank: 2 },
      ],
      B: [
        { teamId: 'team-B-winner', teamName: 'Beta 1', played: 2, won: 2, lost: 0, tied: 0, noResult: 0, points: 4, nrr: 1.2, nrrText: '+1.200', runsFor: 110, oversForBalls: 60, oversForString: '10.0', runsAgainst: 80, oversAgainstBalls: 60, oversAgainstString: '10.0', last5Form: ['W', 'W'], rank: 1 },
        { teamId: 'team-B-runnerup', teamName: 'Beta 2', played: 2, won: 1, lost: 1, tied: 0, noResult: 0, points: 2, nrr: 0.2, nrrText: '+0.200', runsFor: 95, oversForBalls: 60, oversForString: '10.0', runsAgainst: 85, oversAgainstBalls: 60, oversAgainstString: '10.0', last5Form: ['L', 'W'], rank: 2 },
      ],
    }

    const { fixtures, updatedCount } = populateKnockoutGroupQualifiers(groupFixtures, standings)
    expect(updatedCount).toBe(4)

    const sf1 = fixtures.find((f) => f.id === 'sf-1')!
    const sf2 = fixtures.find((f) => f.id === 'sf-2')!

    // SF1: A1 vs B2
    expect(sf1.homeTeamId).toBe('team-A-winner')
    expect(sf1.awayTeamId).toBe('team-B-runnerup')

    // SF2: B1 vs A2
    expect(sf2.homeTeamId).toBe('team-B-winner')
    expect(sf2.awayTeamId).toBe('team-A-runnerup')
  })

  // 15 additional parameterized progression tests across various bracket paths
  for (let q = 1; q <= 15; q++) {
    it(`cascades quarterfinals winner QF${q} to downstream bracket successfully`, () => {
      const qfFixture: Fixture = {
        id: `qf-${q}`,
        tournamentId: 't',
        stage: 'quarter',
        round: 1,
        homeTeamId: `team-${q}A`,
        awayTeamId: `team-${q}B`,
        status: 'completed',
        winnerAdvancesToFixtureId: `sf-${Math.ceil(q / 2)}`,
        winnerAdvancesToSlot: q % 2 === 1 ? 'home' : 'away',
        createdAt: 0,
        updatedAt: 0,
      }

      const nextSf: Fixture = {
        id: `sf-${Math.ceil(q / 2)}`,
        tournamentId: 't',
        stage: 'semi',
        round: 2,
        homeTeamId: null,
        awayTeamId: null,
        status: 'scheduled',
        createdAt: 0,
        updatedAt: 0,
      }

      const { fixtures } = advanceKnockoutWinner([qfFixture, nextSf], `qf-${q}`, `team-${q}A`)
      const updatedSf = fixtures.find((f) => f.id === `sf-${Math.ceil(q / 2)}`)!

      if (q % 2 === 1) {
        expect(updatedSf.homeTeamId).toBe(`team-${q}A`)
      } else {
        expect(updatedSf.awayTeamId).toBe(`team-${q}A`)
      }
    })
  }
})
