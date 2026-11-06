import React, { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Trash2, Check, Crown, Medal, Palette } from 'lucide-react'
import { repository } from '../../db/repository'
import type { TeamRecord, PlayerRecord } from '../../db/schema'
import type { TeamAvatarConfig } from '../../teams/types'
import { TeamAvatarRenderer } from '../../teams/TeamAvatarRenderer'
import { TeamAvatarPickerModal } from './TeamAvatarPickerModal'
import { useTranslation } from '../../i18n'

interface TeamDetailScreenProps {
  team: TeamRecord
  onBack: () => void
}

export const TeamDetailScreen: React.FC<TeamDetailScreenProps> = ({
  team,
  onBack,
}) => {
  const { t } = useTranslation()
  const [currentTeam, setCurrentTeam] = useState<TeamRecord>(team)
  const [players, setPlayers] = useState<PlayerRecord[]>([])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [teamName, setTeamName] = useState(team.name)
  const [isSaved, setIsSaved] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  const loadPlayers = async () => {
    if (currentTeam.playerIds.length === 0) {
      setPlayers([])
      return
    }
    const loaded = await repository.getPlayers(currentTeam.playerIds)
    setPlayers(loaded.filter((p) => !p.deletedAt))
  }

  useEffect(() => {
    void loadPlayers()
  }, [currentTeam.playerIds])

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return
    const names = newPlayerName
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    const newPlayers: PlayerRecord[] = []
    const newPlayerIds: string[] = []

    for (const name of names) {
      const pId = `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const playerRecord: PlayerRecord = {
        id: pId,
        name,
        teamId: currentTeam.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await repository.savePlayer(playerRecord)
      newPlayers.push(playerRecord)
      newPlayerIds.push(pId)
    }

    const updatedTeam: TeamRecord = {
      ...currentTeam,
      name: teamName,
      playerIds: [...currentTeam.playerIds, ...newPlayerIds],
      updatedAt: Date.now(),
    }
    await repository.saveTeam(updatedTeam)
    setCurrentTeam(updatedTeam)
    setNewPlayerName('')
  }

  const handleRemovePlayer = async (playerId: string) => {
    const updatedIds = currentTeam.playerIds.filter((id) => id !== playerId)
    const updatedTeam: TeamRecord = {
      ...currentTeam,
      playerIds: updatedIds,
      captainPlayerId:
        currentTeam.captainPlayerId === playerId
          ? undefined
          : currentTeam.captainPlayerId,
      viceCaptainPlayerId:
        currentTeam.viceCaptainPlayerId === playerId
          ? undefined
          : currentTeam.viceCaptainPlayerId,
      updatedAt: Date.now(),
    }
    await repository.saveTeam(updatedTeam)
    setCurrentTeam(updatedTeam)
  }

  const handleSaveTeamName = async () => {
    if (!teamName.trim()) return
    const updatedTeam: TeamRecord = {
      ...currentTeam,
      name: teamName.trim(),
      updatedAt: Date.now(),
    }
    await repository.saveTeam(updatedTeam)
    setCurrentTeam(updatedTeam)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleSetCaptain = async (playerId: string) => {
    const newCaptain = currentTeam.captainPlayerId === playerId ? undefined : playerId
    const newVC = currentTeam.viceCaptainPlayerId === playerId ? undefined : currentTeam.viceCaptainPlayerId
    const updated: TeamRecord = {
      ...currentTeam,
      captainPlayerId: newCaptain,
      viceCaptainPlayerId: newVC,
      updatedAt: Date.now(),
    }
    await repository.updateTeamIdentity(currentTeam.id, {
      captainPlayerId: newCaptain,
      viceCaptainPlayerId: newVC,
    })
    setCurrentTeam(updated)
  }

  const handleSetViceCaptain = async (playerId: string) => {
    const newVC = currentTeam.viceCaptainPlayerId === playerId ? undefined : playerId
    const newCaptain = currentTeam.captainPlayerId === playerId ? undefined : currentTeam.captainPlayerId
    const updated: TeamRecord = {
      ...currentTeam,
      viceCaptainPlayerId: newVC,
      captainPlayerId: newCaptain,
      updatedAt: Date.now(),
    }
    await repository.updateTeamIdentity(currentTeam.id, {
      viceCaptainPlayerId: newVC,
      captainPlayerId: newCaptain,
    })
    setCurrentTeam(updated)
  }

  const handleSelectAvatar = async (avatar: TeamAvatarConfig) => {
    const updated: TeamRecord = {
      ...currentTeam,
      avatar,
      updatedAt: Date.now(),
    }
    await repository.updateTeamIdentity(currentTeam.id, { avatar })
    setCurrentTeam(updated)
  }

  return (
    <div className="min-h-screen w-full max-w-md mx-auto flex flex-col justify-between bg-[#080C0E] text-white p-4">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1A262B] pb-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-[#121A1D] border border-slate-700 text-slate-300 hover:text-white"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-lg font-black text-white">{t('editTeam')}</h2>
          </div>

          <button
            type="button"
            onClick={handleSaveTeamName}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl flex items-center gap-1 shadow"
          >
            {isSaved ? <Check size={14} /> : null}
            <span>{isSaved ? t('done') : t('save')}</span>
          </button>
        </div>

        {/* Team Identity Banner */}
        <div className="p-3 bg-[#121A1D] border border-slate-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TeamAvatarRenderer
              avatar={currentTeam.avatar}
              teamName={currentTeam.name}
              size="lg"
            />
            <div>
              <div className="text-sm font-bold text-white">{currentTeam.name}</div>
              <div className="text-[11px] text-slate-400">
                {currentTeam.avatar
                  ? `Theme: ${currentTeam.avatar.category}`
                  : 'Default initials'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAvatarPicker(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Palette size={14} className="text-emerald-400" />
            <span>{t('chooseAvatar')}</span>
          </button>
        </div>

        {/* Team Name Input */}
        <div>
          <label className="text-xs text-slate-400 font-semibold mb-1 block">
            Team Name:
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full h-12 bg-[#121A1D] border border-slate-700 rounded-xl px-3 text-base font-bold text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Add Player Input */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-400 font-semibold">
            Add Players (type name or paste comma list):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleAddPlayer()
                }
              }}
              placeholder="e.g. Dhoni, Raina, Jadeja"
              className="flex-1 h-11 bg-[#121A1D] border border-slate-700 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleAddPlayer}
              className="px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl flex items-center gap-1 shadow"
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Player Roster List with Captain / Vice-Captain Selector */}
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Squad Players ({players.length})
            </span>
            <span className="text-[10px] text-slate-400">
              Assign (C) Captain & (VC) Vice-Captain
            </span>
          </div>

          {players.length === 0 ? (
            <div className="p-6 text-center bg-[#121A1D] border border-[#233238] rounded-xl text-slate-500 text-xs">
              No players added yet. Add squad members above.
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[46vh] overflow-y-auto pr-1">
              {players.map((p, idx) => {
                const isCaptain = currentTeam.captainPlayerId === p.id
                const isVC = currentTeam.viceCaptainPlayerId === p.id

                return (
                  <div
                    key={p.id}
                    className="p-3 bg-[#121A1D] border border-[#233238] rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono text-slate-500 w-5">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {isCaptain && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px] font-black border border-amber-500/40">
                              C
                            </span>
                          )}
                          {isVC && (
                            <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 text-[10px] font-black border border-cyan-500/40">
                              VC
                            </span>
                          )}
                        </div>
                        {p.battingStyle && (
                          <div className="text-[10px] text-slate-400">
                            {p.battingStyle === 'LEFT_HAND' ? 'Left-Hand Bat' : 'Right-Hand Bat'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Captain Toggle */}
                      <button
                        type="button"
                        onClick={() => handleSetCaptain(p.id)}
                        title={isCaptain ? 'Remove Captain' : 'Make Captain'}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-0.5 ${
                          isCaptain
                            ? 'bg-amber-500 text-black border-amber-500 font-extrabold'
                            : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-amber-400'
                        }`}
                      >
                        <Crown size={11} />
                        <span>C</span>
                      </button>

                      {/* Vice-Captain Toggle */}
                      <button
                        type="button"
                        onClick={() => handleSetViceCaptain(p.id)}
                        title={isVC ? 'Remove Vice-Captain' : 'Make Vice-Captain'}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-0.5 ${
                          isVC
                            ? 'bg-cyan-500 text-black border-cyan-500 font-extrabold'
                            : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-cyan-400'
                        }`}
                      >
                        <Medal size={11} />
                        <span>VC</span>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleRemovePlayer(p.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 ml-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Avatar Picker Modal */}
      <TeamAvatarPickerModal
        teamName={currentTeam.name}
        currentAvatar={currentTeam.avatar}
        isOpen={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        onSelect={handleSelectAvatar}
      />
    </div>
  )
}
