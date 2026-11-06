import React, { useState, useEffect } from 'react'
import {
  X,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Trophy,
  CheckCircle2,
} from 'lucide-react'
import { repository } from '../../db/repository'
import type { TeamRecord } from '../../db/schema'
import type {
  Tournament,
  TournamentFormat,
  TournamentTeam,
  TournamentStage,
  TiebreakCriterion,
  SeedingMode,
  Fixture,
} from '../../tournament/types'
import { generateTournamentFixtures } from '../../tournament/fixtures'

interface TournamentWizardModalProps {
  onClose: () => void
  onCreated: (tournamentId: string) => void
}

export const TournamentWizardModal: React.FC<TournamentWizardModalProps> = ({
  onClose,
  onCreated,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Step 1: Details
  const [name, setName] = useState('')
  const [format, setFormat] = useState<TournamentFormat>('league')
  const [oversPerInnings, setOversPerInnings] = useState(6)
  const [playersPerSide, setPlayersPerSide] = useState(7)
  const [groupsCount, setGroupsCount] = useState(2)
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState(2)
  const [include3rdPlace, setInclude3rdPlace] = useState(false)

  // Step 2: Points & Tiebreaks
  const [winPoints, setWinPoints] = useState(2)
  const [tiePoints, setTiePoints] = useState(1)
  const [nrPoints, setNrPoints] = useState(1)
  const [lossPoints, setLossPoints] = useState(0)
  const [tiebreakOrder] = useState<TiebreakCriterion[]>([
    'points',
    'wins',
    'nrr',
    'headToHead',
  ])

  // Step 3: Teams
  const [availableDbTeams, setAvailableDbTeams] = useState<TeamRecord[]>([])
  const [teamNames, setTeamNames] = useState<
    Array<{ id: string; name: string; teamId?: string; group?: string; seed?: number }>
  >([
    { id: '1', name: 'Team Alpha', seed: 1, group: 'A' },
    { id: '2', name: 'Team Beta', seed: 2, group: 'A' },
    { id: '3', name: 'Team Gamma', seed: 3, group: 'B' },
    { id: '4', name: 'Team Delta', seed: 4, group: 'B' },
  ])
  const [newTeamInput, setNewTeamInput] = useState('')

  // Step 4: Seeding & Scheduling
  const [seedingMode, setSeedingMode] = useState<SeedingMode>('seeded')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    async function loadDbTeams() {
      const teams = await repository.listTeams()
      setAvailableDbTeams(teams)
    }
    void loadDbTeams()
  }, [])

  const handleAddTeamName = () => {
    const trimmed = newTeamInput.trim()
    if (!trimmed) return
    const nextSeed = teamNames.length + 1
    const nextGroup = format === 'groups_knockout' ? (teamNames.length % 2 === 0 ? 'A' : 'B') : undefined
    setTeamNames([
      ...teamNames,
      {
        id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: trimmed,
        seed: nextSeed,
        group: nextGroup,
      },
    ])
    setNewTeamInput('')
  }

  const handleAddFromDb = (dbTeam: TeamRecord) => {
    if (teamNames.some((t) => t.teamId === dbTeam.id)) return
    const nextSeed = teamNames.length + 1
    const nextGroup = format === 'groups_knockout' ? (teamNames.length % 2 === 0 ? 'A' : 'B') : undefined
    setTeamNames([
      ...teamNames,
      {
        id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: dbTeam.name,
        teamId: dbTeam.id,
        seed: nextSeed,
        group: nextGroup,
      },
    ])
  }

  const handleRemoveTeam = (id: string) => {
    setTeamNames(teamNames.filter((t) => t.id !== id))
  }

  // Generate preview fixtures
  const generatePreview = (): Fixture[] => {
    const tournId = 'preview'
    const mappedTeams: TournamentTeam[] = teamNames.map((t, idx) => ({
      id: t.id,
      tournamentId: tournId,
      teamId: t.teamId ?? t.id,
      nameSnapshot: t.name,
      seed: t.seed ?? idx + 1,
      groupId: t.group,
    }))

    const stages: TournamentStage[] =
      format === 'knockout' || format === 'groups_knockout'
        ? teamNames.length > 4
          ? ['quarter', 'semi', 'final']
          : ['semi', 'final']
        : []

    if (include3rdPlace && (format === 'knockout' || format === 'groups_knockout')) {
      stages.push('third_place')
    }

    const previewTourn: Tournament = {
      id: tournId,
      name: name || 'Tournament Preview',
      format,
      oversPerInnings,
      playersPerSide,
      pointsRules: { win: winPoints, tie: tiePoints, noResult: nrPoints, loss: lossPoints },
      tiebreakOrder,
      groupsCount: format === 'groups_knockout' ? groupsCount : 1,
      qualifiersPerGroup: format === 'groups_knockout' ? qualifiersPerGroup : 0,
      knockoutStages: stages,
      seedingMode,
      seedValue: 0,
      isPublic: true,
      shareToken: 'preview-token',
      status: 'in_progress',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    try {
      return generateTournamentFixtures(previewTourn, mappedTeams)
    } catch {
      return []
    }
  }

  const previewFixtures: Fixture[] = generatePreview()

  const handleCreate = async () => {
    if (!name.trim()) {
      setErrorMsg('Please enter a tournament name.')
      setStep(1)
      return
    }
    if (teamNames.length < 2) {
      setErrorMsg('Please add at least 2 teams.')
      setStep(3)
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const tournamentId = `tourn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const shareToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      const stages: TournamentStage[] =
        format === 'knockout' || format === 'groups_knockout'
          ? teamNames.length > 4
            ? ['quarter', 'semi', 'final']
            : ['semi', 'final']
          : []

      if (include3rdPlace && (format === 'knockout' || format === 'groups_knockout')) {
        stages.push('third_place')
      }

      const finalTournament: Tournament = {
        id: tournamentId,
        name: name.trim(),
        format,
        oversPerInnings,
        playersPerSide,
        pointsRules: {
          win: winPoints,
          tie: tiePoints,
          noResult: nrPoints,
          loss: lossPoints,
        },
        tiebreakOrder,
        groupsCount: format === 'groups_knockout' ? groupsCount : 1,
        qualifiersPerGroup: format === 'groups_knockout' ? qualifiersPerGroup : 0,
        knockoutStages: stages,
        seedingMode,
        seedValue: 0,
        isPublic: true,
        shareToken,
        status: 'in_progress',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const finalTeams: TournamentTeam[] = teamNames.map((t, idx) => ({
        id: `tt-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        tournamentId,
        teamId: t.teamId ?? `team-custom-${idx}`,
        nameSnapshot: t.name,
        seed: t.seed ?? idx + 1,
        groupId: t.group,
      }))

      const finalFixtures = generateTournamentFixtures(finalTournament, finalTeams)

      // Save locally to Dexie (which auto-enqueues outbox)
      await repository.saveTournament(finalTournament)
      await repository.saveTournamentTeams(finalTeams)
      await repository.saveFixtures(finalFixtures)

      onCreated(tournamentId)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create tournament.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-xl bg-[#121A1D] border border-[#233238] rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#233238]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Create Tournament</h2>
              <p className="text-xs text-slate-400">Step {step} of 4</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Step Indicator */}
        <div className="grid grid-cols-4 gap-2">
          {(['Details', 'Rules', 'Teams', 'Fixtures'] as const).map((label, idx) => {
            const stepNum = idx + 1
            const isActive = step === stepNum
            const isDone = step > stepNum
            return (
              <button
                key={label}
                onClick={() => setStep(stepNum as any)}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold text-center border transition ${
                  isActive
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                    : isDone
                      ? 'bg-emerald-950/20 border-emerald-800 text-emerald-400'
                      : 'bg-[#182328] border-transparent text-slate-500'
                }`}
              >
                {stepNum}. {label}
              </button>
            )
          })}
        </div>

        {/* STEP 1: Details */}
        {step === 1 && (
          <div className="flex flex-col gap-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Tournament Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Gully Premier League 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#182328] border border-[#28383F] text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Tournament Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'league', label: 'Single Round-Robin', desc: 'Each team plays every team once' },
                  { id: 'double_league', label: 'Double Round-Robin', desc: 'Home & away matches' },
                  { id: 'groups_knockout', label: 'Groups + Knockout', desc: 'Group stage followed by semis/finals' },
                  { id: 'knockout', label: 'Pure Knockout', desc: 'Single elimination bracket' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id as TournamentFormat)}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-0.5 transition ${
                      format === f.id
                        ? 'bg-amber-500/10 border-amber-500 text-white'
                        : 'bg-[#182328] border-[#28383F] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-200">{f.label}</span>
                    <span className="text-[10px] text-slate-500">{f.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Overs per Innings
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={oversPerInnings}
                  onChange={(e) => setOversPerInnings(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#182328] border border-[#28383F] text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Players per Side
                </label>
                <input
                  type="number"
                  min={2}
                  max={11}
                  value={playersPerSide}
                  onChange={(e) => setPlayersPerSide(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#182328] border border-[#28383F] text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {format === 'groups_knockout' && (
              <div className="grid grid-cols-2 gap-3 bg-[#182328] p-3 rounded-xl border border-[#28383F]">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Groups Count
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={4}
                    value={groupsCount}
                    onChange={(e) => setGroupsCount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0D1417] border border-[#233238] text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Qualifiers per Group
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={qualifiersPerGroup}
                    onChange={(e) => setQualifiersPerGroup(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0D1417] border border-[#233238] text-white text-xs"
                  />
                </div>
              </div>
            )}

            {(format === 'knockout' || format === 'groups_knockout') && (
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={include3rdPlace}
                  onChange={(e) => setInclude3rdPlace(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0 bg-[#182328] border-[#28383F]"
                />
                Include 3rd Place Playoff Match (Semi-final losers)
              </label>
            )}
          </div>
        )}

        {/* STEP 2: Points & Rules */}
        {step === 2 && (
          <div className="flex flex-col gap-4 py-2">
            <div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                Points Table Scoring Rules
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Win', val: winPoints, set: setWinPoints },
                  { label: 'Tie', val: tiePoints, set: setTiePoints },
                  { label: 'No Result', val: nrPoints, set: setNrPoints },
                  { label: 'Loss', val: lossPoints, set: setLossPoints },
                ].map((p) => (
                  <div key={p.label} className="bg-[#182328] p-2.5 rounded-xl border border-[#28383F] text-center">
                    <span className="text-[11px] text-slate-400 block mb-1">{p.label}</span>
                    <input
                      type="number"
                      min={0}
                      value={p.val}
                      onChange={(e) => p.set(Number(e.target.value))}
                      className="w-full text-center text-sm font-bold bg-[#0D1417] py-1 rounded text-white border border-[#233238]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Tiebreak Criteria Order
              </span>
              <p className="text-[11px] text-slate-400 mb-2">
                Determines standings rank order when points are tied.
              </p>
              <div className="flex flex-col gap-1.5">
                {tiebreakOrder.map((crit, idx) => (
                  <div
                    key={crit}
                    className="flex justify-between items-center bg-[#182328] px-3 py-2 rounded-xl border border-[#28383F] text-xs text-slate-300"
                  >
                    <span className="font-semibold">
                      {idx + 1}. {crit === 'headToHead' ? 'Head-to-Head' : crit.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-500">Priority #{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Teams */}
        {step === 3 && (
          <div className="flex flex-col gap-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Add Team Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter team name..."
                  value={newTeamInput}
                  onChange={(e) => setNewTeamInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTeamName()}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#182328] border border-[#28383F] text-white text-xs focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleAddTeamName}
                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>

            {availableDbTeams.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Or select from saved library:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {availableDbTeams.map((dt) => {
                    const isAdded = teamNames.some((t) => t.teamId === dt.id)
                    return (
                      <button
                        key={dt.id}
                        type="button"
                        onClick={() => handleAddFromDb(dt)}
                        disabled={isAdded}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                          isAdded
                            ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-[#182328] border-[#28383F] text-slate-300 hover:border-amber-500'
                        }`}
                      >
                        + {dt.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-slate-300">
                  Registered Teams ({teamNames.length})
                </span>
                {teamNames.length < 2 && (
                  <span className="text-[10px] text-amber-400">At least 2 teams required</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {teamNames.map((t, idx) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between bg-[#182328] px-3 py-2 rounded-xl border border-[#28383F]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-400 font-mono w-5">
                        #{t.seed ?? idx + 1}
                      </span>
                      <span className="text-xs text-white font-medium">{t.name}</span>
                      {format === 'groups_knockout' && t.group && (
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                          Group {t.group}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTeam(t.id)}
                      className="text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Schedule & Fixtures Preview */}
        {step === 4 && (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center justify-between bg-[#182328] p-3 rounded-xl border border-[#28383F]">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Seeding Mode</span>
                <span className="text-[10px] text-slate-400">
                  {seedingMode === 'seeded'
                    ? 'Fixtures paired by rank (1 vs N)'
                    : 'Randomly shuffled pairings'}
                </span>
              </div>
              <div className="flex gap-1 bg-[#0D1417] p-1 rounded-lg border border-[#233238]">
                <button
                  type="button"
                  onClick={() => setSeedingMode('seeded')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    seedingMode === 'seeded'
                      ? 'bg-amber-500 text-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Seeded
                </button>
                <button
                  type="button"
                  onClick={() => setSeedingMode('random')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                    seedingMode === 'random'
                      ? 'bg-amber-500 text-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Random
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-slate-300">
                  Fixtures Preview ({previewFixtures.length} matches)
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  Auto-Generated
                </span>
              </div>
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                {previewFixtures.map((fix: Fixture, idx: number) => {
                  const t1 =
                    teamNames.find((t) => t.id === fix.homeTeamId || t.teamId === fix.homeTeamId)
                      ?.name ?? 'TBD'
                  const t2 =
                    teamNames.find((t) => t.id === fix.awayTeamId || t.teamId === fix.awayTeamId)
                      ?.name ?? 'TBD'
                  const roundName =
                    fix.stage === 'league' || fix.stage === 'group'
                      ? `Round ${fix.round}`
                      : fix.stage.replace('_', ' ').toUpperCase()
                  return (
                    <div
                      key={fix.id}
                      className="bg-[#182328] p-2.5 rounded-xl border border-[#28383F] flex justify-between items-center text-xs"
                    >
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block">
                          Match #{idx + 1} • {roundName}
                        </span>
                        <div className="font-bold text-slate-200 mt-0.5">
                          {t1} <span className="text-amber-400 font-normal">vs</span> {t2}
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#0D1417] text-slate-400">
                        {fix.stage}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex justify-between items-center pt-3 border-t border-[#233238] mt-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((step - 1) as any)}
              className="px-4 py-2 rounded-xl bg-[#182328] hover:bg-[#233238] text-slate-300 text-xs font-semibold flex items-center gap-1 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !name.trim()) {
                  setErrorMsg('Please enter a tournament name.')
                  return
                }
                setErrorMsg(null)
                setStep((step + 1) as any)
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold flex items-center gap-1 transition"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={isSubmitting || teamNames.length < 2}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-black text-xs font-bold flex items-center gap-1 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                'Creating...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Generate Tournament
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
