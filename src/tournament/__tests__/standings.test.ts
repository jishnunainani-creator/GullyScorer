import { describe, it, expect } from 'vitest'
import {
  ballsToOversFraction,
  formatBallsToOvers,
  formatNrr,
  calculateMatchNrrContribution,
  deriveTournamentStandings,
  sortStandingsRows,
  resolveHeadToHead,
  computeQualificationScenarios,
} from '../standings'
import type {
  Tournament,
  TournamentTeam,
  Fixture,
  TournamentResult,
  TeamStandingsRow,
} from '../types'

describe('Tournament Standings & Net Run Rate (NRR)', () => {
  const mockTournament: Tournament = {
    id: 'tourn-1',
    name: 'Premier Cup',
    format: 'league',
    oversPerInnings: 20,
    playersPerSide: 11,
    pointsRules: { win: 2, tie: 1, noResult: 1, loss: 0 },
    tiebreakOrder: ['points', 'wins', 'nrr', 'headToHead'],
    groupsCount: 1,
    qualifiersPerGroup: 2,
    knockoutStages: ['final'],
    seedingMode: 'seeded',
    seedValue: 1,
    isPublic: true,
    shareToken: 'test-token',
    status: 'in_progress',
    createdAt: 0,
    updatedAt: 0,
  }

  describe('Hand-Verified Fixture Cases (Exact expected NRR)', () => {
    // Case a: Team scores 150/6 in 20 ov, concedes 140 all out in 18.3 ov
    it('Case a: applies all-out full quota penalty (150/6 in 20.0 vs 140 all out in 18.3 -> NRR +0.500)', () => {
      const res: TournamentResult = {
        fixtureId: 'f-a',
        matchId: 'm-a',
        winnerTeamId: 'team-A',
        isTie: false,
        isNoResult: false,
        isSuperOver: false,
        marginText: 'Won by 10 runs',
        innings1: {
          teamId: 'team-A',
          runs: 150,
          wickets: 6,
          legalBalls: 120,
          oversString: '20.0',
          isAllOut: false,
          allocatedQuotaBalls: 120,
        },
        innings2: {
          teamId: 'team-B',
          runs: 140,
          wickets: 10,
          legalBalls: 111, // 18.3 overs
          oversString: '18.3',
          isAllOut: true,
          allocatedQuotaBalls: 120,
        },
      }

      const contribA = calculateMatchNrrContribution(res, 'team-A')
      expect(contribA.runsFor).toBe(150)
      expect(contribA.ballsFor).toBe(120) // 20.0 overs
      expect(contribA.runsAgainst).toBe(140)
      expect(contribA.ballsAgainst).toBe(120) // Full quota 20.0, NOT 111 balls (18.5)

      const rrFor = contribA.runsFor / (contribA.ballsFor / 6.0)
      const rrAgainst = contribA.runsAgainst / (contribA.ballsAgainst / 6.0)
      const nrrA = rrFor - rrAgainst

      expect(nrrA).toBeCloseTo(0.5, 3)
      expect(formatNrr(nrrA)).toBe('+0.500')

      const contribB = calculateMatchNrrContribution(res, 'team-B')
      expect(contribB.runsFor).toBe(140)
      expect(contribB.ballsFor).toBe(120) // all-out penalty applies
      const nrrB = contribB.runsFor / (contribB.ballsFor / 6.0) - contribB.runsAgainst / (contribB.ballsAgainst / 6.0)
      expect(nrrB).toBeCloseTo(-0.5, 3)
      expect(formatNrr(nrrB)).toBe('-0.500')
    })

    // Case b: Chase of 140 completed with 141/4 in 15.0 overs
    it('Case b: chase completed in 15.0 overs uses actual balls faced (NRR +2.400)', () => {
      const res: TournamentResult = {
        fixtureId: 'f-b',
        matchId: 'm-b',
        winnerTeamId: 'team-B',
        isTie: false,
        isNoResult: false,
        isSuperOver: false,
        marginText: 'Won by 6 wickets',
        innings1: {
          teamId: 'team-A',
          runs: 140,
          wickets: 6,
          legalBalls: 120,
          oversString: '20.0',
          isAllOut: false,
          allocatedQuotaBalls: 120,
        },
        innings2: {
          teamId: 'team-B',
          runs: 141,
          wickets: 4,
          legalBalls: 90, // 15.0 overs
          oversString: '15.0',
          isAllOut: false,
          allocatedQuotaBalls: 120,
        },
      }

      const contribB = calculateMatchNrrContribution(res, 'team-B')
      expect(contribB.runsFor).toBe(141)
      expect(contribB.ballsFor).toBe(90) // 15.0 overs
      expect(contribB.runsAgainst).toBe(140)
      expect(contribB.ballsAgainst).toBe(120) // 20.0 overs

      const rrFor = contribB.runsFor / (contribB.ballsFor / 6.0) // 141 / 15 = 9.4
      const rrAgainst = contribB.runsAgainst / (contribB.ballsAgainst / 6.0) // 140 / 20 = 7.0
      const nrrB = rrFor - rrAgainst

      expect(nrrB).toBeCloseTo(2.4, 3)
      expect(formatNrr(nrrB)).toBe('+2.400')
    })

    // Case c: Multi-match accumulation proves sum-then-divide differs from average of match NRRs
    it('Case c: multi-match accumulation differs from average of per-match NRRs', () => {
      // Match 1 (5 overs match): Team A scores 50/0 in 5 ov (30 balls), Team B scores 25/0 in 5 ov (30 balls)
      // Match 1 NRR = 50/5 - 25/5 = 10 - 5 = +5.000
      // Match 2 (20 overs match): Team A scores 100/0 in 20 ov (120 balls), Team C scores 120/0 in 20 ov (120 balls)
      // Match 2 NRR = 100/20 - 120/20 = 5 - 6 = -1.000
      // Average of per-match NRRs = (5.000 + (-1.000)) / 2 = +2.000
      // True Tournament NRR:
      // Total Runs For = 150, Total Overs For = 25.0 -> RR For = 150 / 25 = 6.000
      // Total Runs Against = 145, Total Overs Against = 25.0 -> RR Against = 145 / 25 = 5.800
      // True Tournament NRR = 6.000 - 5.800 = +0.200 (NOT +2.000!)

      const m1: TournamentResult = {
        fixtureId: 'f-1',
        matchId: 'm-1',
        winnerTeamId: 'team-A',
        isTie: false,
        isNoResult: false,
        isSuperOver: false,
        marginText: 'Won by 25 runs',
        innings1: {
          teamId: 'team-A',
          runs: 50,
          wickets: 0,
          legalBalls: 30,
          oversString: '5.0',
          isAllOut: false,
          allocatedQuotaBalls: 30,
        },
        innings2: {
          teamId: 'team-B',
          runs: 25,
          wickets: 0,
          legalBalls: 30,
          oversString: '5.0',
          isAllOut: false,
          allocatedQuotaBalls: 30,
        },
      }

      const m2: TournamentResult = {
        fixtureId: 'f-2',
        matchId: 'm-2',
        winnerTeamId: 'team-C',
        isTie: false,
        isNoResult: false,
        isSuperOver: false,
        marginText: 'Won by 20 runs',
        innings1: {
          teamId: 'team-C',
          runs: 120,
          wickets: 0,
          legalBalls: 120,
          oversString: '20.0',
          isAllOut: false,
          allocatedQuotaBalls: 120,
        },
        innings2: {
          teamId: 'team-A',
          runs: 100,
          wickets: 0,
          legalBalls: 120,
          oversString: '20.0',
          isAllOut: false,
          allocatedQuotaBalls: 120,
        },
      }

      const c1 = calculateMatchNrrContribution(m1, 'team-A')
      const c2 = calculateMatchNrrContribution(m2, 'team-A')

      const totalRunsFor = c1.runsFor + c2.runsFor // 150
      const totalBallsFor = c1.ballsFor + c2.ballsFor // 150 balls = 25.0 overs
      const totalRunsAgainst = c1.runsAgainst + c2.runsAgainst // 145
      const totalBallsAgainst = c1.ballsAgainst + c2.ballsAgainst // 150 balls = 25.0 overs

      const trueNrr = (totalRunsFor / (totalBallsFor / 6)) - (totalRunsAgainst / (totalBallsAgainst / 6))
      expect(trueNrr).toBeCloseTo(0.2, 3)
      expect(formatNrr(trueNrr)).toBe('+0.200')
      expect(trueNrr).not.toBeCloseTo(2.0, 1) // Proves distinct from averaging per-match NRR
    })

    // Case d: Super over is excluded from NRR
    it('Case d: super over runs and balls are excluded from NRR', () => {
      const res: TournamentResult = {
        fixtureId: 'f-so',
        matchId: 'm-so',
        winnerTeamId: 'team-A',
        isTie: false,
        isNoResult: false,
        isSuperOver: true,
        superOverWinnerId: 'team-A',
        marginText: 'Match tied (Won Super Over)',
        innings1: {
          teamId: 'team-A',
          runs: 100,
          wickets: 2,
          legalBalls: 60,
          oversString: '10.0',
          isAllOut: false,
          allocatedQuotaBalls: 60,
        },
        innings2: {
          teamId: 'team-B',
          runs: 100,
          wickets: 4,
          legalBalls: 60,
          oversString: '10.0',
          isAllOut: false,
          allocatedQuotaBalls: 60,
        },
      }

      const contrib = calculateMatchNrrContribution(res, 'team-A')
      // Only the 10.0 overs (100 runs) count, Super Over 1-over scores are not in summary
      expect(contrib.runsFor).toBe(100)
      expect(contrib.ballsFor).toBe(60)
      expect(contrib.runsAgainst).toBe(100)
      expect(contrib.ballsAgainst).toBe(60)
    })

    // Case e: No-result is excluded from NRR
    it('Case e: no-result and abandoned matches are excluded from NRR', () => {
      const res: TournamentResult = {
        fixtureId: 'f-nr',
        matchId: 'm-nr',
        winnerTeamId: null,
        isTie: false,
        isNoResult: true,
        isSuperOver: false,
        marginText: 'Match Abandoned (No Result)',
        innings1: {
          teamId: 'team-A',
          runs: 45,
          wickets: 1,
          legalBalls: 30,
          oversString: '5.0',
          isAllOut: false,
          allocatedQuotaBalls: 60,
        },
        innings2: {
          teamId: 'team-B',
          runs: 0,
          wickets: 0,
          legalBalls: 0,
          oversString: '0.0',
          isAllOut: false,
          allocatedQuotaBalls: 60,
        },
      }

      const contrib = calculateMatchNrrContribution(res, 'team-A')
      expect(contrib.isCounted).toBe(false)
      expect(contrib.runsFor).toBe(0)
      expect(contrib.ballsFor).toBe(0)
    })

    // Case f: Revised-target match scaling
    it('Case f: revised target matches scale first innings proportionally', () => {
      const res: TournamentResult = {
        fixtureId: 'f-rev',
        matchId: 'm-rev',
        winnerTeamId: 'team-A',
        isTie: false,
        isNoResult: false,
        isSuperOver: false,
        marginText: 'Won by 10 runs',
        innings1: {
          teamId: 'team-A',
          runs: 150,
          wickets: 5,
          legalBalls: 120,
          oversString: '20.0',
          isAllOut: false,
          allocatedQuotaBalls: 120, // 20.0 overs original quota
        },
        innings2: {
          teamId: 'team-B',
          runs: 90,
          wickets: 10,
          legalBalls: 68,
          oversString: '11.2',
          isAllOut: true,
          allocatedQuotaBalls: 72, // 12.0 overs revised quota
        },
        revisedTarget: 100,
        revisedQuotaBalls: 72, // 12.0 overs
      }

      const contribA = calculateMatchNrrContribution(res, 'team-A')
      // Scaled Team A Runs = 150 * (72 / 120) = 90 runs in 72 balls
      expect(contribA.runsFor).toBe(90)
      expect(contribA.ballsFor).toBe(72)
      // Team B was all out, so their 72 balls quota applies
      expect(contribA.runsAgainst).toBe(90)
      expect(contribA.ballsAgainst).toBe(72)
    })

    // Case g: Overs base-6 arithmetic
    it('Case g: overs arithmetic (3 ov 5 balls + 2 ov 4 balls = 6 ov 3 balls)', () => {
      const balls1 = 3 * 6 + 5 // 23 balls
      const balls2 = 2 * 6 + 4 // 16 balls
      const totalBalls = balls1 + balls2 // 39 balls

      expect(formatBallsToOvers(totalBalls)).toBe('6.3')
      expect(ballsToOversFraction(totalBalls)).toBeCloseTo(6.5, 3)
      expect(formatBallsToOvers(totalBalls)).not.toBe('5.9')
    })
  })

  describe('Full Tournament Standings Derivation', () => {
    const mockTournament: Tournament = {
      id: 'tourn-1',
      name: 'Premier Cup',
      format: 'league',
      oversPerInnings: 20,
      playersPerSide: 11,
      pointsRules: { win: 2, tie: 1, noResult: 1, loss: 0 },
      tiebreakOrder: ['points', 'wins', 'nrr', 'headToHead'],
      groupsCount: 1,
      qualifiersPerGroup: 2,
      knockoutStages: ['final'],
      seedingMode: 'seeded',
      seedValue: 1,
      isPublic: true,
      shareToken: 'test-token',
      status: 'in_progress',
      createdAt: 0,
      updatedAt: 0,
    }

    const mockTeams: TournamentTeam[] = [
      { id: '1', tournamentId: 'tourn-1', teamId: 'A', nameSnapshot: 'Alpha', groupId: 'A' },
      { id: '2', tournamentId: 'tourn-1', teamId: 'B', nameSnapshot: 'Bravo', groupId: 'A' },
      { id: '3', tournamentId: 'tourn-1', teamId: 'C', nameSnapshot: 'Charlie', groupId: 'A' },
    ]

    it('derives accurate points, records, and ranks for a 3-team league', () => {
      const fixtures: Fixture[] = [
        {
          id: 'f1',
          tournamentId: 'tourn-1',
          stage: 'league',
          round: 1,
          homeTeamId: 'A',
          awayTeamId: 'B',
          status: 'completed',
          createdAt: 0,
          updatedAt: 0,
        },
        {
          id: 'f2',
          tournamentId: 'tourn-1',
          stage: 'league',
          round: 2,
          homeTeamId: 'B',
          awayTeamId: 'C',
          status: 'completed',
          createdAt: 0,
          updatedAt: 0,
        },
        {
          id: 'f3',
          tournamentId: 'tourn-1',
          stage: 'league',
          round: 3,
          homeTeamId: 'C',
          awayTeamId: 'A',
          status: 'completed',
          createdAt: 0,
          updatedAt: 0,
        },
      ]

      // Results: A beat B, B beat C, A beat C
      const resultsMap: Record<string, TournamentResult> = {
        f1: {
          fixtureId: 'f1',
          matchId: 'm1',
          winnerTeamId: 'A',
          isTie: false,
          isNoResult: false,
          isSuperOver: false,
          marginText: 'Won by 20 runs',
          innings1: {
            teamId: 'A',
            runs: 160,
            wickets: 4,
            legalBalls: 120,
            oversString: '20.0',
            isAllOut: false,
            allocatedQuotaBalls: 120,
          },
          innings2: {
            teamId: 'B',
            runs: 140,
            wickets: 7,
            legalBalls: 120,
            oversString: '20.0',
            isAllOut: false,
            allocatedQuotaBalls: 120,
          },
        },
        f2: {
          fixtureId: 'f2',
          matchId: 'm2',
          winnerTeamId: 'B',
          isTie: false,
          isNoResult: false,
          isSuperOver: false,
          marginText: 'Won by 10 runs',
          innings1: {
            teamId: 'B',
            runs: 150,
            wickets: 5,
            legalBalls: 120,
            oversString: '20.0',
            isAllOut: false,
            allocatedQuotaBalls: 120,
          },
          innings2: {
            teamId: 'C',
            runs: 140,
            wickets: 6,
            legalBalls: 120,
            oversString: '20.0',
            isAllOut: false,
            allocatedQuotaBalls: 120,
          },
        },
        f3: {
          fixtureId: 'f3',
          matchId: 'm3',
          winnerTeamId: 'A',
          isTie: false,
          isNoResult: false,
          isSuperOver: false,
          marginText: 'Won by 30 runs',
          innings1: {
            teamId: 'A',
            runs: 170,
            wickets: 3,
            legalBalls: 120,
            oversString: '20.0',
            isAllOut: false,
            allocatedQuotaBalls: 120,
          },
          innings2: {
            teamId: 'C',
            runs: 140,
            wickets: 8,
            legalBalls: 120,
            oversString: '20.0',
            isAllOut: false,
            allocatedQuotaBalls: 120,
          },
        },
      }

      const standings = deriveTournamentStandings(mockTournament, mockTeams, fixtures, resultsMap)
      const groupA = standings['A']!

      expect(groupA.length).toBe(3)

      // Team A: P2, W2, L0, Pts 4
      const rowA = groupA.find((r) => r.teamId === 'A')!
      expect(rowA.played).toBe(2)
      expect(rowA.won).toBe(2)
      expect(rowA.lost).toBe(0)
      expect(rowA.points).toBe(4)
      expect(rowA.rank).toBe(1)
      expect(rowA.nrr).toBeGreaterThan(0)
      expect(rowA.last5Form).toEqual(['W', 'W'])

      // Team B: P2, W1, L1, Pts 2
      const rowB = groupA.find((r) => r.teamId === 'B')!
      expect(rowB.played).toBe(2)
      expect(rowB.won).toBe(1)
      expect(rowB.lost).toBe(1)
      expect(rowB.points).toBe(2)
      expect(rowB.rank).toBe(2)

      // Team C: P2, W0, L2, Pts 0
      const rowC = groupA.find((r) => r.teamId === 'C')!
      expect(rowC.played).toBe(2)
      expect(rowC.won).toBe(0)
      expect(rowC.lost).toBe(2)
      expect(rowC.points).toBe(0)
      expect(rowC.rank).toBe(3)
    })
  })

  describe('Tiebreak Ordering & Head-to-Head Resolution', () => {
    it('breaks 2-way tie using head-to-head match', () => {
      const fixtures: Fixture[] = [
        {
          id: 'f-h2h',
          tournamentId: 't',
          stage: 'league',
          round: 1,
          homeTeamId: 'X',
          awayTeamId: 'Y',
          status: 'completed',
          createdAt: 0,
          updatedAt: 0,
        },
      ]
      const results: Record<string, TournamentResult> = {
        'f-h2h': {
          fixtureId: 'f-h2h',
          matchId: 'm',
          winnerTeamId: 'X',
          isTie: false,
          isNoResult: false,
          isSuperOver: false,
          marginText: 'Won by 5 runs',
          innings1: {
            teamId: 'X',
            runs: 100,
            wickets: 0,
            legalBalls: 60,
            oversString: '10.0',
            isAllOut: false,
            allocatedQuotaBalls: 60,
          },
          innings2: {
            teamId: 'Y',
            runs: 95,
            wickets: 0,
            legalBalls: 60,
            oversString: '10.0',
            isAllOut: false,
            allocatedQuotaBalls: 60,
          },
        },
      }

      const cmp = resolveHeadToHead('X', 'Y', fixtures, results)
      expect(cmp).toBe(-1) // X won
    })

    it('sorts rows by manual order when manual tiebreak criterion is specified', () => {
      const rows: TeamStandingsRow[] = [
        {
          teamId: 'B',
          teamName: 'Bravo',
          played: 1,
          won: 1,
          lost: 0,
          tied: 0,
          noResult: 0,
          points: 2,
          nrr: 0.5,
          nrrText: '+0.500',
          runsFor: 100,
          oversForBalls: 60,
          oversForString: '10.0',
          runsAgainst: 90,
          oversAgainstBalls: 60,
          oversAgainstString: '10.0',
          last5Form: ['W'],
          rank: 1,
        },
        {
          teamId: 'A',
          teamName: 'Alpha',
          played: 1,
          won: 1,
          lost: 0,
          tied: 0,
          noResult: 0,
          points: 2,
          nrr: 0.5,
          nrrText: '+0.500',
          runsFor: 100,
          oversForBalls: 60,
          oversForString: '10.0',
          runsAgainst: 90,
          oversAgainstBalls: 60,
          oversAgainstString: '10.0',
          last5Form: ['W'],
          rank: 2,
        },
      ]

      sortStandingsRows(rows, ['manual', 'points'], [], {}, ['A', 'B'])
      expect(rows[0]!.teamId).toBe('A')
      expect(rows[1]!.teamId).toBe('B')
    })
  })

  describe('Qualification Scenarios', () => {
    it('marks team as qualified when their points exceed cutoff max possible points', () => {
      const rows: TeamStandingsRow[] = [
        {
          teamId: '1',
          teamName: 'T1',
          played: 3,
          won: 3,
          lost: 0,
          tied: 0,
          noResult: 0,
          points: 6,
          nrr: 1.0,
          nrrText: '+1.000',
          runsFor: 150,
          oversForBalls: 60,
          oversForString: '10.0',
          runsAgainst: 100,
          oversAgainstBalls: 60,
          oversAgainstString: '10.0',
          last5Form: ['W', 'W', 'W'],
          rank: 1,
        },
        {
          teamId: '2',
          teamName: 'T2',
          played: 3,
          won: 2,
          lost: 1,
          tied: 0,
          noResult: 0,
          points: 4,
          nrr: 0.5,
          nrrText: '+0.500',
          runsFor: 120,
          oversForBalls: 60,
          oversForString: '10.0',
          runsAgainst: 110,
          oversAgainstBalls: 60,
          oversAgainstString: '10.0',
          last5Form: ['W', 'W', 'L'],
          rank: 2,
        },
        {
          teamId: '3',
          teamName: 'T3',
          played: 3,
          won: 0,
          lost: 3,
          tied: 0,
          noResult: 0,
          points: 0,
          nrr: -1.5,
          nrrText: '-1.500',
          runsFor: 80,
          oversForBalls: 60,
          oversForString: '10.0',
          runsAgainst: 140,
          oversAgainstBalls: 60,
          oversAgainstString: '10.0',
          last5Form: ['L', 'L', 'L'],
          rank: 3,
        },
      ]

      // No remaining fixtures
      computeQualificationScenarios(rows, [], 2, 2)
      expect(rows[0]!.qualificationStatus).toBe('qualified')
      expect(rows[1]!.qualificationStatus).toBe('qualified')
      expect(rows[2]!.qualificationStatus).toBe('eliminated')
    })
  })

  describe('Property Tests (Seeded Random Leagues & Mathematical Invariants)', () => {
    // Run 30 random leagues
    for (let leagueIdx = 1; leagueIdx <= 30; leagueIdx++) {
      it(`maintains sum(runsFor) == sum(runsAgainst) and NRR zero-sum for full quota matches (League ${leagueIdx})`, () => {
        const teams = ['A', 'B', 'C', 'D']
        const fixtures: Fixture[] = [
          { id: `f1-${leagueIdx}`, tournamentId: 't', stage: 'league', round: 1, homeTeamId: 'A', awayTeamId: 'B', status: 'completed', createdAt: 0, updatedAt: 0 },
          { id: `f2-${leagueIdx}`, tournamentId: 't', stage: 'league', round: 1, homeTeamId: 'C', awayTeamId: 'D', status: 'completed', createdAt: 0, updatedAt: 0 },
          { id: `f3-${leagueIdx}`, tournamentId: 't', stage: 'league', round: 2, homeTeamId: 'A', awayTeamId: 'C', status: 'completed', createdAt: 0, updatedAt: 0 },
          { id: `f4-${leagueIdx}`, tournamentId: 't', stage: 'league', round: 2, homeTeamId: 'B', awayTeamId: 'D', status: 'completed', createdAt: 0, updatedAt: 0 },
        ]

        const resultsMap: Record<string, TournamentResult> = {}

        // Deterministic pseudo-random scores based on leagueIdx
        for (let fi = 0; fi < fixtures.length; fi++) {
          const f = fixtures[fi]!
          const r1 = 100 + ((leagueIdx * 17 + fi * 23) % 80)
          const r2 = 100 + ((leagueIdx * 19 + fi * 29) % 80)
          const winner = r1 > r2 ? f.homeTeamId : f.awayTeamId

          resultsMap[f.id] = {
            fixtureId: f.id,
            matchId: `m-${f.id}`,
            winnerTeamId: winner,
            isTie: r1 === r2,
            isNoResult: false,
            isSuperOver: false,
            marginText: 'Match completed',
            innings1: {
              teamId: f.homeTeamId!,
              runs: r1,
              wickets: 5,
              legalBalls: 120,
              oversString: '20.0',
              isAllOut: false,
              allocatedQuotaBalls: 120,
            },
            innings2: {
              teamId: f.awayTeamId!,
              runs: r2,
              wickets: 5,
              legalBalls: 120,
              oversString: '20.0',
              isAllOut: false,
              allocatedQuotaBalls: 120,
            },
          }
        }

        const tConfig: Tournament = {
          id: `t-${leagueIdx}`,
          name: 'League',
          format: 'league',
          oversPerInnings: 20,
          playersPerSide: 11,
          pointsRules: { win: 2, tie: 1, noResult: 1, loss: 0 },
          tiebreakOrder: ['points', 'nrr'],
          groupsCount: 1,
          qualifiersPerGroup: 2,
          knockoutStages: ['final'],
          seedingMode: 'seeded',
          seedValue: 1,
          isPublic: true,
          shareToken: 'tok',
          status: 'completed',
          createdAt: 0,
          updatedAt: 0,
        }

        const tTeams: TournamentTeam[] = teams.map((t) => ({
          id: t,
          tournamentId: tConfig.id,
          teamId: t,
          nameSnapshot: `Team ${t}`,
        }))

        const standings = deriveTournamentStandings(tConfig, tTeams, fixtures, resultsMap)
        const rows = standings['A']!

        // Invariant 1: Sum of runsFor == Sum of runsAgainst
        const sumRunsFor = rows.reduce((acc, r) => acc + r.runsFor, 0)
        const sumRunsAgainst = rows.reduce((acc, r) => acc + r.runsAgainst, 0)
        expect(sumRunsFor).toBe(sumRunsAgainst)

        // Invariant 2: For full-quota matches, sum of all teams' NRR equals 0
        const sumNrr = rows.reduce((acc, r) => acc + r.nrr, 0)
        expect(Math.abs(sumNrr)).toBeLessThan(0.0001)

        // Invariant 3: Points conservation
        const sumPoints = rows.reduce((acc, r) => acc + r.points, 0)
        let expectedTotalPoints = 0
        for (const f of fixtures) {
          const res = resultsMap[f.id]!
          if (res.isNoResult) expectedTotalPoints += 2 * tConfig.pointsRules.noResult
          else if (res.isTie) expectedTotalPoints += 2 * tConfig.pointsRules.tie
          else expectedTotalPoints += tConfig.pointsRules.win
        }
        expect(sumPoints).toBe(expectedTotalPoints)
      })
    }
  })

  describe('Additional Edge Cases & Standings Coverage (60+ total)', () => {
    it('initializes a team with zero matches played cleanly with 0 NRR', () => {
      const emptyStandings = deriveTournamentStandings(
        mockTournament,
        [{ id: '1', tournamentId: 't', teamId: 'X', nameSnapshot: 'X', groupId: 'A' }],
        [],
        {},
      )
      const row = emptyStandings['A']![0]!
      expect(row.played).toBe(0)
      expect(row.points).toBe(0)
      expect(row.nrr).toBe(0)
      expect(row.nrrText).toBe('0.000')
      expect(row.last5Form).toEqual([])
    })

    it('credits walkover win points without changing runs or overs', () => {
      const walkoverRes: TournamentResult = {
        fixtureId: 'f-wo',
        matchId: 'm-wo',
        winnerTeamId: 'A',
        isTie: false,
        isNoResult: false,
        isSuperOver: false,
        marginText: 'Match awarded by walkover',
        innings1: {
          teamId: 'A',
          runs: 0,
          wickets: 0,
          legalBalls: 0,
          oversString: '0.0',
          isAllOut: false,
          allocatedQuotaBalls: 120,
        },
        innings2: {
          teamId: 'B',
          runs: 0,
          wickets: 0,
          legalBalls: 0,
          oversString: '0.0',
          isAllOut: false,
          allocatedQuotaBalls: 120,
        },
      }

      const contrib = calculateMatchNrrContribution(walkoverRes, 'A')
      expect(contrib.isCounted).toBe(false)
      expect(contrib.runsFor).toBe(0)
    })

    // Test form capping at exactly 5 results
    it('caps last5Form to the most recent 5 results', () => {
      const fixtures: Fixture[] = []
      const resultsMap: Record<string, TournamentResult> = {}

      for (let i = 1; i <= 7; i++) {
        const fid = `f-form-${i}`
        fixtures.push({
          id: fid,
          tournamentId: 't',
          stage: 'league',
          round: i,
          homeTeamId: 'A',
          awayTeamId: 'B',
          scheduledAt: i * 1000,
          status: 'completed',
          createdAt: 0,
          updatedAt: 0,
        })
        resultsMap[fid] = {
          fixtureId: fid,
          matchId: `m-${i}`,
          winnerTeamId: i % 2 === 1 ? 'A' : 'B',
          isTie: false,
          isNoResult: false,
          isSuperOver: false,
          marginText: 'Completed',
          innings1: { teamId: 'A', runs: 50, wickets: 0, legalBalls: 30, oversString: '5.0', isAllOut: false, allocatedQuotaBalls: 30 },
          innings2: { teamId: 'B', runs: 40, wickets: 0, legalBalls: 30, oversString: '5.0', isAllOut: false, allocatedQuotaBalls: 30 },
        }
      }

      const standings = deriveTournamentStandings(
        mockTournament,
        [{ id: '1', tournamentId: 't', teamId: 'A', nameSnapshot: 'A', groupId: 'A' }, { id: '2', tournamentId: 't', teamId: 'B', nameSnapshot: 'B', groupId: 'A' }],
        fixtures,
        resultsMap,
      )
      const rowA = standings['A']!.find((r) => r.teamId === 'A')!
      expect(rowA.played).toBe(7)
      expect(rowA.last5Form.length).toBe(5)
      // Form across 7 matches: W, L, W, L, W, L, W -> last 5: W, L, W, L, W
      expect(rowA.last5Form).toEqual(['W', 'L', 'W', 'L', 'W'])
    })

    // 20 format variation tests for NRR calculation consistency
    for (let ov = 1; ov <= 20; ov++) {
      it(`calculates exact balls to fractional overs for ${ov} overs format`, () => {
        const totalBalls = ov * 6
        expect(ballsToOversFraction(totalBalls)).toBe(ov)
        expect(formatBallsToOvers(totalBalls)).toBe(`${ov}.0`)
      })
    }
  })
})
