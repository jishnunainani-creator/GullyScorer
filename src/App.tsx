import { useState, useEffect } from 'react'
import { Home } from './ui/Home'
import { MatchSetupWizard } from './ui/setup/MatchSetupWizard'
import { LiveScoringScreen } from './ui/scoring/LiveScoringScreen'
import { ScorecardView } from './ui/scorecard/ScorecardView'
import { ShareScorecardModal } from './ui/scorecard/ShareScorecardModal'
import { LiveViewerScreen } from './ui/live/LiveViewerScreen'
import { TeamsListScreen } from './ui/library/TeamsListScreen'
import { TeamDetailScreen } from './ui/library/TeamDetailScreen'
import { PlayersListScreen } from './ui/library/PlayersListScreen'
import { PlayerProfileScreen } from './ui/profile/PlayerProfileScreen'
import { LeaderboardsScreen } from './ui/leaderboards/LeaderboardsScreen'
import { SettingsScreen } from './ui/settings/SettingsScreen'
import { TournamentsListScreen } from './ui/tournament/TournamentsListScreen'
import { TournamentDashboardScreen } from './ui/tournament/TournamentDashboardScreen'
import { PublicTournamentScreen } from './ui/tournament/PublicTournamentScreen'
import { AuthProvider } from './auth/useAuth'
import { syncWorker } from './sync/syncWorker'
import { useMatch } from './state/useMatch'
import { repository } from './db/repository'
import type { TeamRecord } from './db/schema'
import type { TournamentSetupContext } from './ui/setup/MatchSetupWizard'
import type { Fixture } from './tournament/types'

type AppView =
  | 'home'
  | 'setup'
  | 'scoring'
  | 'scorecard'
  | 'settings'
  | 'teams'
  | 'team_detail'
  | 'players'
  | 'player_profile'
  | 'leaderboards'
  | 'live_viewer'
  | 'tournaments'
  | 'tournament_dashboard'
  | 'public_tournament'

function AppContent() {
  const [liveToken, setLiveToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/live/')) {
      const token = window.location.pathname.replace('/live/', '').trim()
      return token.length > 0 ? token : null
    }
    return null
  })

  const [tournamentToken, setTournamentToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/t/')) {
      const token = window.location.pathname.replace('/t/', '').trim()
      return token.length > 0 ? token : null
    }
    return null
  })

  const [view, setView] = useState<AppView>(() => {
    if (liveToken) return 'live_viewer'
    if (tournamentToken) return 'public_tournament'
    return 'home'
  })
  const [previousView, setPreviousView] = useState<AppView>('home')
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null)
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null)
  const [tournamentSetupContext, setTournamentSetupContext] =
    useState<TournamentSetupContext | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<TeamRecord | null>(null)
  const [showShareModal, setShowShareModal] = useState<boolean>(false)

  // Start background sync worker
  useEffect(() => {
    syncWorker.start()
    return () => {
      syncWorker.stop()
    }
  }, [])

  // Listen to popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.startsWith('/live/')) {
        const token = window.location.pathname.replace('/live/', '').trim()
        if (token) {
          setLiveToken(token)
          setView('live_viewer')
          return
        }
      }
      if (window.location.pathname.startsWith('/t/')) {
        const token = window.location.pathname.replace('/t/', '').trim()
        if (token) {
          setTournamentToken(token)
          setView('public_tournament')
          return
        }
      }
      setLiveToken(null)
      setTournamentToken(null)
      setView('home')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Load match hook for active match
  const matchState = useMatch(activeMatchId ?? '')

  // Navigation handlers
  const handleStartNewMatch = () => {
    setTournamentSetupContext(null)
    setView('setup')
  }

  const handleMatchCreated = (newMatchId: string) => {
    setActiveMatchId(newMatchId)
    setTournamentSetupContext(null)
    setView('scoring')
  }

  const handleResumeMatch = (matchId: string) => {
    setActiveMatchId(matchId)
    setView('scoring')
  }

  const handleViewScorecard = (matchId: string) => {
    setActiveMatchId(matchId)
    setView('scorecard')
  }

  const handleSelectTournament = (tournamentId: string) => {
    setActiveTournamentId(tournamentId)
    setView('tournament_dashboard')
  }

  const handleScoreTournamentFixture = async (
    fixture: Fixture,
    team1Name: string,
    team2Name: string,
  ) => {
    if (fixture.matchId) {
      handleResumeMatch(fixture.matchId)
    } else {
      const tourn = await repository.getTournament(fixture.tournamentId)
      setTournamentSetupContext({
        tournamentId: fixture.tournamentId,
        fixtureId: fixture.id,
        teamAName: team1Name,
        teamBName: team2Name,
        overs: tourn?.oversPerInnings ?? 6,
        playersPerSide: tourn?.playersPerSide ?? 7,
      })
      setView('setup')
    }
  }

  return (
    <div className="min-h-screen bg-[#080C0E] text-white">
      {view === 'public_tournament' && tournamentToken && (
        <PublicTournamentScreen
          token={tournamentToken}
          onBackToApp={() => {
            window.history.pushState({}, '', '/')
            setTournamentToken(null)
            setView('home')
          }}
        />
      )}

      {view === 'live_viewer' && liveToken && (
        <LiveViewerScreen
          token={liveToken}
          onBackToApp={() => {
            window.history.pushState({}, '', '/')
            setLiveToken(null)
            setView('home')
          }}
        />
      )}

      {view === 'home' && (
        <Home
          onNewMatch={handleStartNewMatch}
          onResumeMatch={handleResumeMatch}
          onViewScorecard={handleViewScorecard}
          onOpenSettings={() => setView('settings')}
          onOpenTeams={() => setView('teams')}
          onOpenPlayers={() => setView('players')}
          onOpenLeaderboards={() => setView('leaderboards')}
          onOpenTournaments={() => setView('tournaments')}
        />
      )}

      {view === 'setup' && (
        <MatchSetupWizard
          onMatchCreated={handleMatchCreated}
          onCancel={() => {
            const returnView = tournamentSetupContext ? 'tournament_dashboard' : 'home'
            setTournamentSetupContext(null)
            setView(returnView)
          }}
          tournamentContext={tournamentSetupContext ?? undefined}
        />
      )}

      {view === 'tournaments' && (
        <TournamentsListScreen
          onBack={() => setView('home')}
          onSelectTournament={handleSelectTournament}
        />
      )}

      {view === 'tournament_dashboard' && activeTournamentId && (
        <TournamentDashboardScreen
          tournamentId={activeTournamentId}
          onBack={() => setView('tournaments')}
          onScoreFixture={handleScoreTournamentFixture}
          onViewMatchScorecard={(mId) => {
            setActiveMatchId(mId)
            setView('scorecard')
          }}
        />
      )}

      {view === 'scoring' && activeMatchId && (
        <>
          <LiveScoringScreen
            matchState={matchState}
            onOpenScorecard={() => setView('scorecard')}
            onShareScorecard={() => setShowShareModal(true)}
            onNewMatch={() => setView('home')}
          />
          {showShareModal && (
            <ShareScorecardModal
              matchState={matchState}
              onClose={() => setShowShareModal(false)}
            />
          )}
        </>
      )}

      {view === 'scorecard' && activeMatchId && (
        <>
          <ScorecardView
            matchState={matchState}
            onBack={() => setView('scoring')}
            onShare={() => setShowShareModal(true)}
          />
          {showShareModal && (
            <ShareScorecardModal
              matchState={matchState}
              onClose={() => setShowShareModal(false)}
            />
          )}
        </>
      )}

      {view === 'teams' && (
        <TeamsListScreen
          onBack={() => setView('home')}
          onSelectTeam={(team) => {
            setSelectedTeam(team)
            setView('team_detail')
          }}
        />
      )}

      {view === 'team_detail' && selectedTeam && (
        <TeamDetailScreen
          team={selectedTeam}
          onBack={() => setView('teams')}
        />
      )}

      {view === 'players' && (
        <PlayersListScreen
          onBack={() => setView('home')}
          onSelectPlayer={(id) => {
            setSelectedPlayerId(id)
            setPreviousView('players')
            setView('player_profile')
          }}
        />
      )}

      {view === 'player_profile' && selectedPlayerId && (
        <PlayerProfileScreen
          playerId={selectedPlayerId}
          onBack={() => setView(previousView)}
        />
      )}

      {view === 'leaderboards' && (
        <LeaderboardsScreen
          onBack={() => setView('home')}
          onSelectPlayer={(id) => {
            setSelectedPlayerId(id)
            setPreviousView('leaderboards')
            setView('player_profile')
          }}
        />
      )}

      {view === 'settings' && (
        <SettingsScreen
          onBack={() => setView('home')}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
