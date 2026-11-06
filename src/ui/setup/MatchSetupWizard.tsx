import React, { useState } from 'react'
import { ArrowLeft, Check, Plus, Trash2, Users, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import type { MatchConfig } from '../../engine/types'
import type { MatchRecord, TeamRecord, PlayerRecord } from '../../db/schema'
import { repository } from '../../db/repository'
import { PickSavedTeamModal } from './PickSavedTeamModal'
import { getPresetRules, listPresets } from '../../rules/presets'
import type { RulePresetType, MatchRules } from '../../rules/types'
import { useTranslation } from '../../i18n'

export interface TournamentSetupContext {
  tournamentId: string
  fixtureId: string
  teamAName: string
  teamBName: string
  overs: number
  playersPerSide: number
}

interface MatchSetupWizardProps {
  onMatchCreated: (matchId: string) => void
  onCancel: () => void
  tournamentContext?: TournamentSetupContext
}

export const MatchSetupWizard: React.FC<MatchSetupWizardProps> = ({
  onMatchCreated,
  onCancel,
  tournamentContext,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: Teams & Players
  const [teamAName, setTeamAName] = useState<string>(
    tournamentContext?.teamAName ?? 'Team A',
  )
  const [teamBName, setTeamBName] = useState<string>(
    tournamentContext?.teamBName ?? 'Team B',
  )
  const defaultPlayerCount = tournamentContext?.playersPerSide ?? 11
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>(() =>
    Array.from({ length: defaultPlayerCount }, (_, i) => `Player ${i + 1}`),
  )
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>(() =>
    Array.from({ length: defaultPlayerCount }, (_, i) => `Opponent ${i + 1}`),
  )
  const [quickAddA, setQuickAddA] = useState<string>('')
  const [quickAddB, setQuickAddB] = useState<string>('')
  const [pickingTeamFor, setPickingTeamFor] = useState<'A' | 'B' | null>(null)
  const [saveToLibraryA, setSaveToLibraryA] = useState<boolean>(false)
  const [saveToLibraryB, setSaveToLibraryB] = useState<boolean>(false)

  // Step 2: Match Config & Rules
  const { t } = useTranslation()
  const [rulesPreset, setRulesPreset] = useState<RulePresetType>('gully_cricket')
  const [matchRules, setMatchRules] = useState<MatchRules>(() =>
    getPresetRules('gully_cricket'),
  )
  const [showCustomRules, setShowCustomRules] = useState<boolean>(false)
  const [overs, setOvers] = useState<number>(
    tournamentContext?.overs ?? matchRules.oversPerInnings,
  )
  const [customOvers, setCustomOvers] = useState<string>('')
  const [wideReBowl, setWideReBowl] = useState<boolean>(matchRules.wideReBowl)
  const [noBallFreeHit, setNoBallFreeHit] = useState<boolean>(
    matchRules.noBallFreeHit,
  )
  const [lastManStands, setLastManStands] = useState<boolean>(
    matchRules.lastManStands,
  )

  const handleSelectPreset = (presetKey: RulePresetType) => {
    setRulesPreset(presetKey)
    const newRules = getPresetRules(presetKey)
    setMatchRules(newRules)
    setOvers(tournamentContext?.overs ?? newRules.oversPerInnings)
    setWideReBowl(newRules.wideReBowl)
    setNoBallFreeHit(newRules.noBallFreeHit)
    setLastManStands(newRules.lastManStands)
  }

  // Step 3: Toss & Openers
  const [tossWinner, setTossWinner] = useState<'A' | 'B'>('A')
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat')
  const [strikerIdx, setStrikerIdx] = useState<number>(0)
  const [nonStrikerIdx, setNonStrikerIdx] = useState<number>(1)
  const [openingBowlerIdx, setOpeningBowlerIdx] = useState<number>(0)

  // Quick add helpers
  const handleQuickAdd = (team: 'A' | 'B', text: string) => {
    if (!text.trim()) return
    const names = text
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    if (names.length === 0) return

    if (team === 'A') {
      setTeamAPlayers((prev) => [...prev, ...names])
      setQuickAddA('')
    } else {
      setTeamBPlayers((prev) => [...prev, ...names])
      setQuickAddB('')
    }
  }

  // Determine batting and bowling team for 1st innings
  const team1IsA =
    (tossWinner === 'A' && tossDecision === 'bat') ||
    (tossWinner === 'B' && tossDecision === 'bowl')

  const team1Name = team1IsA ? teamAName : teamBName
  const team2Name = team1IsA ? teamBName : teamAName
  const team1Players = team1IsA ? teamAPlayers : teamBPlayers
  const team2Players = team1IsA ? teamBPlayers : teamAPlayers

  // Validation
  const playersCount = Math.min(teamAPlayers.length, teamBPlayers.length)
  const canProceedStep1 = teamAPlayers.length >= 2 && teamBPlayers.length >= 2

  const finalOvers = customOvers ? parseInt(customOvers, 10) || overs : overs

  const handleFinish = async () => {
    const matchId = `match-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const teamAId = `team-a-${matchId}`
    const teamBId = `team-b-${matchId}`

    const playersListA: PlayerRecord[] = teamAPlayers.map((name, i) => ({
      id: `p-a-${i + 1}-${matchId}`,
      name,
      teamId: teamAId,
    }))

    const playersListB: PlayerRecord[] = teamBPlayers.map((name, i) => ({
      id: `p-b-${i + 1}-${matchId}`,
      name,
      teamId: teamBId,
    }))

    const teamARecord: TeamRecord = {
      id: teamAId,
      name: teamAName,
      playerIds: playersListA.map((p) => p.id),
    }

    const teamBRecord: TeamRecord = {
      id: teamBId,
      name: teamBName,
      playerIds: playersListB.map((p) => p.id),
    }

    const activeRules: MatchRules = {
      ...matchRules,
      oversPerInnings: finalOvers,
      playersPerSide: playersCount,
      wideReBowl,
      noBallFreeHit,
      lastManStands,
      presetName: rulesPreset,
    }

    const config: MatchConfig = {
      oversPerInnings: finalOvers,
      playersPerSide: playersCount,
      wideReBowl,
      noBallFreeHit,
      lastManStands,
      ballsPerOver: activeRules.ballsPerOver,
      matchRules: activeRules,
    }

    const innings1BattingTeamId = team1IsA ? teamAId : teamBId
    const innings1BowlingTeamId = team1IsA ? teamBId : teamAId
    const innings2BattingTeamId = innings1BowlingTeamId
    const innings2BowlingTeamId = innings1BattingTeamId

    const battingPlayersList = team1IsA ? playersListA : playersListB
    const bowlingPlayersList = team1IsA ? playersListB : playersListA

    const matchRecord: MatchRecord = {
      id: matchId,
      date: new Date().toISOString(),
      config,
      teamAId,
      teamBId,
      tossWinnerId: tossWinner === 'A' ? teamAId : teamBId,
      tossDecision,
      currentInningsNo: 1,
      innings1BattingTeamId,
      innings1BowlingTeamId,
      innings2BattingTeamId,
      innings2BowlingTeamId,
      innings1Openers: {
        strikerId: battingPlayersList[strikerIdx]?.id ?? battingPlayersList[0]!.id,
        nonStrikerId: battingPlayersList[nonStrikerIdx]?.id ?? battingPlayersList[1]!.id,
        bowlerId: bowlingPlayersList[openingBowlerIdx]?.id ?? bowlingPlayersList[0]!.id,
      },
      status: 'in_progress',
      tournamentId: tournamentContext?.tournamentId,
      fixtureId: tournamentContext?.fixtureId,
      rulesConfig: activeRules,
      rulesPreset,
      teamSnapshots: {
        teamA: {
          id: teamAId,
          name: teamAName,
          playerSnapshots: Object.fromEntries(
            playersListA.map((p) => [p.id, { id: p.id, name: p.name }]),
          ),
        },
        teamB: {
          id: teamBId,
          name: teamBName,
          playerSnapshots: Object.fromEntries(
            playersListB.map((p) => [p.id, { id: p.id, name: p.name }]),
          ),
        },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await repository.createMatch(
      matchRecord,
      [teamARecord, teamBRecord],
      [...playersListA, ...playersListB],
    )
    await repository.saveMatchRules(activeRules, matchId)

    if (tournamentContext) {
      await repository.attachMatchToFixture(
        tournamentContext.fixtureId,
        matchId,
        tournamentContext.tournamentId,
      )
    }

    // Save to team library if opted in
    if (saveToLibraryA) {
      await repository.saveTeam(teamARecord)
      for (const p of playersListA) {
        await repository.savePlayer(p)
      }
    }
    if (saveToLibraryB) {
      await repository.saveTeam(teamBRecord)
      for (const p of playersListB) {
        await repository.savePlayer(p)
      }
    }

    onMatchCreated(matchId)
  }

  return (
    <div className="h-screen w-full max-w-md mx-auto flex flex-col justify-between bg-[#080C0E] text-white p-4">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#1A262B] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (step === 1 ? onCancel() : setStep((s) => (s - 1) as 1 | 2))}
            className="p-2 rounded-xl bg-[#121A1D] border border-slate-700 text-slate-300 hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Match Setup (Step {step} of 3)
            </span>
            <h2 className="text-lg font-black text-white leading-tight">
              {step === 1 ? 'Teams & Squads' : step === 2 ? 'Match Rules' : 'Toss & Openers'}
            </h2>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-5">
        {/* STEP 1: TEAMS & PLAYERS */}
        {step === 1 && (
          <>
            {/* Team A */}
            <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={teamAName}
                  onChange={(e) => setTeamAName(e.target.value)}
                  className="bg-transparent text-lg font-black text-emerald-400 border-b border-transparent hover:border-slate-700 focus:border-emerald-500 focus:outline-none"
                  placeholder="Team 1 Name"
                />
                <button
                  type="button"
                  onClick={() => setPickingTeamFor('A')}
                  className="px-2.5 py-1 rounded-lg bg-[#182328] hover:bg-[#202E34] text-emerald-400 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Users size={12} />
                  <span>Pick Saved Team</span>
                </button>
              </div>

              {/* Quick Add Area */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickAddA}
                  onChange={(e) => setQuickAddA(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleQuickAdd('A', quickAddA)
                    }
                  }}
                  placeholder="Paste or type names (comma / enter)..."
                  className="flex-1 h-10 bg-[#0A0F11] border border-slate-800 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleQuickAdd('A', quickAddA)}
                  className="px-3 bg-[#182328] hover:bg-[#202E34] text-emerald-400 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              {/* Player Tag Chips */}
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {teamAPlayers.map((p, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#182328] border border-slate-800 text-xs text-slate-200"
                  >
                    <span>{p}</span>
                    <button
                      type="button"
                      onClick={() => setTeamAPlayers(teamAPlayers.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>

              {/* Save to library checkbox */}
              <label className="flex items-center gap-2 pt-1 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveToLibraryA}
                  onChange={(e) => setSaveToLibraryA(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-black/40 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                />
                <span>Save {teamAName} & squad to team library</span>
              </label>
            </div>

            {/* Team B */}
            <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={teamBName}
                  onChange={(e) => setTeamBName(e.target.value)}
                  className="bg-transparent text-lg font-black text-purple-400 border-b border-transparent hover:border-slate-700 focus:border-purple-500 focus:outline-none"
                  placeholder="Team 2 Name"
                />
                <button
                  type="button"
                  onClick={() => setPickingTeamFor('B')}
                  className="px-2.5 py-1 rounded-lg bg-[#182328] hover:bg-[#202E34] text-purple-400 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Users size={12} />
                  <span>Pick Saved Team</span>
                </button>
              </div>

              {/* Quick Add Area */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickAddB}
                  onChange={(e) => setQuickAddB(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleQuickAdd('B', quickAddB)
                    }
                  }}
                  placeholder="Paste or type names (comma / enter)..."
                  className="flex-1 h-10 bg-[#0A0F11] border border-slate-800 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => handleQuickAdd('B', quickAddB)}
                  className="px-3 bg-[#182328] hover:bg-[#202E34] text-purple-400 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              {/* Player Tag Chips */}
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {teamBPlayers.map((p, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#182328] border border-slate-800 text-xs text-slate-200"
                  >
                    <span>{p}</span>
                    <button
                      type="button"
                      onClick={() => setTeamBPlayers(teamBPlayers.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>

              {/* Save to library checkbox */}
              <label className="flex items-center gap-2 pt-1 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveToLibraryB}
                  onChange={(e) => setSaveToLibraryB(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-black/40 text-purple-500 focus:ring-0 focus:ring-offset-0"
                />
                <span>Save {teamBName} & squad to team library</span>
              </label>
            </div>
          </>
        )}

        {/* STEP 2: MATCH CONFIG & GULLY RULES */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            {/* Rule Presets Selector */}
            <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-400" />
                  <span>{t('rulePreset')}</span>
                </label>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  {matchRules.presetDisplayName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                {listPresets().map((preset) => (
                  <button
                    key={preset.type}
                    type="button"
                    onClick={() => handleSelectPreset(preset.type)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      rulesPreset === preset.type
                        ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-sm'
                        : 'bg-[#182328] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>{preset.name}</span>
                      {rulesPreset === preset.type && (
                        <Check size={14} className="text-emerald-400" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Overs Selector */}
            <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {t('oversPerInnings')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[4, 5, 8, 10].map((ov) => (
                  <button
                    key={ov}
                    type="button"
                    onClick={() => {
                      setOvers(ov)
                      setCustomOvers('')
                    }}
                    className={`h-12 rounded-xl font-mono text-base font-bold border transition-all ${
                      overs === ov && !customOvers
                        ? 'bg-emerald-500 text-black border-emerald-400 font-extrabold shadow-md'
                        : 'bg-[#182328] text-slate-200 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {ov} ov
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-400">Or Custom:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={customOvers}
                  onChange={(e) => setCustomOvers(e.target.value)}
                  placeholder="e.g. 6"
                  className="w-24 h-10 bg-[#0A0F11] border border-slate-700 rounded-xl px-3 text-center text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Configured Gully Rules Summary & Customization Drawer */}
            <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowCustomRules(!showCustomRules)}
              >
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Customise Rules & Hazards
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {matchRules.oneTipOneHand.enabled ? '1-Tip 1-Hand ON' : '1-Tip OFF'} •{' '}
                    {matchRules.wallRules.enabled ? 'Wall Rules ON' : 'Wall Rules OFF'} •{' '}
                    {matchRules.ballsPerOver} balls/over
                  </p>
                </div>
                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-[#182328] border border-slate-700 text-slate-300"
                >
                  {showCustomRules ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {showCustomRules && (
                <div className="mt-2 space-y-3 pt-3 border-t border-[#1C282D]">
                  {/* One Tip One Hand */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{t('oneTipOneHand')}</p>
                      <p className="text-[10px] text-slate-400">
                        1 bounce + 1 hand catch is OUT
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setMatchRules((prev) => ({
                          ...prev,
                          oneTipOneHand: {
                            ...prev.oneTipOneHand,
                            enabled: !prev.oneTipOneHand.enabled,
                          },
                        }))
                      }
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                        matchRules.oneTipOneHand.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-black transition-transform ${
                          matchRules.oneTipOneHand.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Mankad */}
                  <div className="flex items-center justify-between border-t border-[#1C282D] pt-2.5">
                    <div>
                      <p className="text-xs font-bold text-white">{t('mankad')}</p>
                      <p className="text-[10px] text-slate-400">
                        Run out non-striker before release
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setMatchRules((prev) => ({
                          ...prev,
                          mankad: {
                            ...prev.mankad,
                            enabled: !prev.mankad.enabled,
                          },
                        }))
                      }
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                        matchRules.mankad.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-black transition-transform ${
                          matchRules.mankad.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Wall Rules & Broken Glass */}
                  <div className="flex items-center justify-between border-t border-[#1C282D] pt-2.5">
                    <div>
                      <p className="text-xs font-bold text-white">{t('wallRules')}</p>
                      <p className="text-[10px] text-slate-400">
                        Direct hit 4s / tap 1s / car window out
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setMatchRules((prev) => ({
                          ...prev,
                          wallRules: {
                            ...prev.wallRules,
                            enabled: !prev.wallRules.enabled,
                          },
                        }))
                      }
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                        matchRules.wallRules.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-black transition-transform ${
                          matchRules.wallRules.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Balls per over */}
                  <div className="flex items-center justify-between border-t border-[#1C282D] pt-2.5">
                    <div>
                      <p className="text-xs font-bold text-white">{t('ballsPerOver')}</p>
                      <p className="text-[10px] text-slate-400">Balls in each legal over</p>
                    </div>
                    <select
                      value={matchRules.ballsPerOver}
                      onChange={(e) =>
                        setMatchRules((prev) => ({
                          ...prev,
                          ballsPerOver: parseInt(e.target.value, 10),
                        }))
                      }
                      className="px-2 py-1 bg-[#0A0F11] border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value={4}>4 balls</option>
                      <option value={5}>5 balls</option>
                      <option value={6}>6 balls</option>
                      <option value={8}>8 balls</option>
                      <option value={10}>10 balls</option>
                    </select>
                  </div>

                  {/* LBW Allowed */}
                  <div className="flex items-center justify-between border-t border-[#1C282D] pt-2.5">
                    <div>
                      <p className="text-xs font-bold text-white">{t('lbwAllowed')}</p>
                      <p className="text-[10px] text-slate-400">
                        Enable LBW dismissal (disabled in tennis-ball/gully)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setMatchRules((prev) => ({
                          ...prev,
                          lbwEnabled: !prev.lbwEnabled,
                        }))
                      }
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                        matchRules.lbwEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-black transition-transform ${
                          matchRules.lbwEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Re-bowl Wides */}
                  <div className="flex items-center justify-between border-t border-[#1C282D] pt-2.5">
                    <div>
                      <p className="text-xs font-bold text-white">Re-bowl Wides</p>
                      <p className="text-[10px] text-slate-400">Wide ball must be re-bowled</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWideReBowl(!wideReBowl)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                        wideReBowl ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-black transition-transform ${
                          wideReBowl ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Free Hit */}
                  <div className="flex items-center justify-between border-t border-[#1C282D] pt-2.5">
                    <div>
                      <p className="text-xs font-bold text-white">Free Hit on No-Ball</p>
                      <p className="text-[10px] text-slate-400">Next legal ball is Free Hit</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNoBallFreeHit(!noBallFreeHit)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                        noBallFreeHit ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-black transition-transform ${
                          noBallFreeHit ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Last Man Stands */}
                  <div className="flex items-center justify-between border-t border-[#1C282D] pt-2.5">
                    <div>
                      <p className="text-xs font-bold text-white">{t('lastManStands')}</p>
                      <p className="text-[10px] text-slate-400">Solo batter until all out</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLastManStands(!lastManStands)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                        lastManStands ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-black transition-transform ${
                          lastManStands ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: TOSS & OPENERS */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            {/* Toss Winner */}
            <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Toss Winner:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTossWinner('A')}
                  className={`h-12 rounded-xl text-sm font-bold border transition-all ${
                    tossWinner === 'A'
                      ? 'bg-emerald-500 text-black border-emerald-400 font-extrabold shadow'
                      : 'bg-[#182328] text-slate-200 border-slate-700'
                  }`}
                >
                  {teamAName}
                </button>
                <button
                  type="button"
                  onClick={() => setTossWinner('B')}
                  className={`h-12 rounded-xl text-sm font-bold border transition-all ${
                    tossWinner === 'B'
                      ? 'bg-purple-600 text-white border-purple-400 font-extrabold shadow'
                      : 'bg-[#182328] text-slate-200 border-slate-700'
                  }`}
                >
                  {teamBName}
                </button>
              </div>
            </div>

            {/* Toss Decision */}
            <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Elected To:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTossDecision('bat')}
                  className={`h-12 rounded-xl text-sm font-bold border transition-all ${
                    tossDecision === 'bat'
                      ? 'bg-emerald-500 text-black border-emerald-400 font-extrabold shadow'
                      : 'bg-[#182328] text-slate-200 border-slate-700'
                  }`}
                >
                  🏏 Bat First
                </button>
                <button
                  type="button"
                  onClick={() => setTossDecision('bowl')}
                  className={`h-12 rounded-xl text-sm font-bold border transition-all ${
                    tossDecision === 'bowl'
                      ? 'bg-emerald-500 text-black border-emerald-400 font-extrabold shadow'
                      : 'bg-[#182328] text-slate-200 border-slate-700'
                  }`}
                >
                  ⚾ Bowl First
                </button>
              </div>
            </div>

            {/* Openers Selector */}
            <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                1st Innings: {team1Name} Batting
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Striker ({team1Name})
                </label>
                <select
                  value={strikerIdx}
                  onChange={(e) => setStrikerIdx(parseInt(e.target.value, 10))}
                  className="w-full h-11 bg-[#182328] border border-slate-700 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {team1Players.map((name, i) => (
                    <option key={i} value={i} disabled={i === nonStrikerIdx}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Non-Striker ({team1Name})
                </label>
                <select
                  value={nonStrikerIdx}
                  onChange={(e) => setNonStrikerIdx(parseInt(e.target.value, 10))}
                  className="w-full h-11 bg-[#182328] border border-slate-700 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {team1Players.map((name, i) => (
                    <option key={i} value={i} disabled={i === strikerIdx}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Opening Bowler ({team2Name})
                </label>
                <select
                  value={openingBowlerIdx}
                  onChange={(e) => setOpeningBowlerIdx(parseInt(e.target.value, 10))}
                  className="w-full h-11 bg-[#182328] border border-slate-700 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {team2Players.map((name, i) => (
                    <option key={i} value={i}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Button (Thumb Zone) */}
      <div className="pt-3 border-t border-[#1A262B]">
        {step < 3 ? (
          <button
            type="button"
            disabled={step === 1 && !canProceedStep1}
            onClick={() => setStep((s) => (s + 1) as 2 | 3)}
            className="w-full h-14 min-h-[56px] bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-extrabold text-base rounded-xl transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2"
          >
            <span>Continue to Step {step + 1}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            className="w-full h-14 min-h-[56px] bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-base rounded-xl transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2"
          >
            <Check size={20} />
            <span>Start Scoring Match</span>
          </button>
        )}
      </div>

      {/* Pick Saved Team Modal */}
      {pickingTeamFor !== null && (
        <PickSavedTeamModal
          onSelectTeam={(team, playerNames) => {
            if (pickingTeamFor === 'A') {
              setTeamAName(team.name)
              if (playerNames.length > 0) {
                setTeamAPlayers(playerNames)
              }
            } else if (pickingTeamFor === 'B') {
              setTeamBName(team.name)
              if (playerNames.length > 0) {
                setTeamBPlayers(playerNames)
              }
            }
          }}
          onClose={() => setPickingTeamFor(null)}
        />
      )}
    </div>
  )
}
