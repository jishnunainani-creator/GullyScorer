import React, { useEffect, useState } from 'react'
import { X, Users, Check } from 'lucide-react'
import { repository } from '../../db/repository'
import type { TeamRecord } from '../../db/schema'

interface PickSavedTeamModalProps {
  onSelectTeam: (team: TeamRecord, playerNames: string[]) => void
  onClose: () => void
}

export const PickSavedTeamModal: React.FC<PickSavedTeamModalProps> = ({
  onSelectTeam,
  onClose,
}) => {
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTeams() {
      try {
        const list = await repository.listTeams()
        setTeams(list)
      } finally {
        setLoading(false)
      }
    }
    void fetchTeams()
  }, [])

  const handlePick = async (team: TeamRecord) => {
    let playerNames: string[] = []
    if (team.playerIds && team.playerIds.length > 0) {
      const playerRecords = await repository.getPlayers(team.playerIds)
      playerNames = playerRecords.filter((p) => !p.deletedAt).map((p) => p.name)
    }
    onSelectTeam(team, playerNames)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-[#121A1D] border border-[#233238] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#233238] pb-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-emerald-400" />
            <h3 className="text-base font-bold text-white">Select Saved Team</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
          {loading ? (
            <div className="text-xs text-slate-500 font-mono py-8 text-center">
              Loading teams...
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs flex flex-col items-center gap-2">
              <Users size={28} className="text-slate-600 mb-1" />
              <p className="font-semibold text-slate-400">No saved teams found</p>
              <p>Type team names and check "Save to team library" during match setup.</p>
            </div>
          ) : (
            teams.map((t) => (
              <div
                key={t.id}
                onClick={() => handlePick(t)}
                className="p-3 bg-[#182328] hover:bg-[#202E34] border border-slate-800 hover:border-emerald-500/50 rounded-xl cursor-pointer transition-all flex items-center justify-between group active:scale-98"
              >
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {t.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {t.playerIds?.length ?? 0} squad players
                  </p>
                </div>
                <div className="text-slate-500 group-hover:text-emerald-400">
                  <Check size={16} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
