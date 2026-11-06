import React, { useState, useEffect } from 'react'
import {
  Trophy,
  Plus,
  ArrowLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react'
import { repository } from '../../db/repository'
import type { Tournament } from '../../tournament/types'
import { TournamentWizardModal } from './TournamentWizardModal'

interface TournamentsListScreenProps {
  onBack: () => void
  onSelectTournament: (tournamentId: string) => void
}

export const TournamentsListScreen: React.FC<TournamentsListScreenProps> = ({
  onBack,
  onSelectTournament,
}) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const loadTournaments = async () => {
    setLoading(true)
    try {
      const list = await repository.listTournaments()
      setTournaments(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTournaments()
  }, [])

  const handleDelete = async (id: string) => {
    await repository.deleteTournament(id)
    setDeleteConfirmId(null)
    void loadTournaments()
  }

  return (
    <div className="min-h-screen bg-[#080C0E] text-white p-4 max-w-2xl mx-auto flex flex-col gap-5">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-[#121A1D] border border-[#233238] text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Tournaments
            </h1>
            <p className="text-xs text-slate-400">Leagues, Knockouts & Group Stages</p>
          </div>
        </div>

        <button
          onClick={() => setShowWizard(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Create
        </button>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-sm">
          Loading tournaments...
        </div>
      ) : tournaments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#121A1D] border border-[#233238] rounded-3xl p-8 text-center gap-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Trophy className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white mb-1">No Tournaments Yet</h2>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Create a tournament, register your teams, auto-generate fixtures, and track standings with real-time Net Run Rate (NRR).
            </p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            Create First Tournament
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tournaments.map((tourn) => {
            const formatLabel = tourn.format.replace('_', ' ').toUpperCase()
            return (
              <div
                key={tourn.id}
                className="bg-[#121A1D] border border-[#233238] hover:border-[#33464F] rounded-2xl p-4 flex flex-col gap-3 transition shadow-md"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 cursor-pointer" onClick={() => onSelectTournament(tourn.id)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/60">
                        {formatLabel}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {tourn.oversPerInnings} ov • {tourn.playersPerSide} aside
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-white hover:text-amber-400 transition">
                      {tourn.name}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDeleteConfirmId(tourn.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
                      title="Delete Tournament"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onSelectTournament(tourn.id)}
                      className="p-2 rounded-xl bg-[#182328] hover:bg-[#233238] text-slate-300 transition"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#233238] pt-2.5 text-xs text-slate-400">
                  <span className="text-[11px]">
                    Created {new Date(tourn.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => onSelectTournament(tourn.id)}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    View Dashboard & Standings
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#121A1D] border border-[#233238] rounded-2xl p-5 shadow-2xl flex flex-col gap-3">
            <h3 className="text-sm font-bold text-white">Delete Tournament?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to delete this tournament? This will archive the fixtures. Local matches will be preserved.
            </p>
            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-lg bg-[#182328] text-xs font-semibold text-slate-300 hover:bg-[#233238]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wizard Modal */}
      {showWizard && (
        <TournamentWizardModal
          onClose={() => setShowWizard(false)}
          onCreated={(newTournId) => {
            setShowWizard(false)
            onSelectTournament(newTournId)
          }}
        />
      )}
    </div>
  )
}
