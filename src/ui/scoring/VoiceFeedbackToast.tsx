import React from 'react'
import { Mic, AlertTriangle, RotateCcw, X } from 'lucide-react'
import type { VoiceCommand } from '../../voice/types'

interface VoiceFeedbackToastProps {
  isListening: boolean
  lastTranscript: string
  pendingCommand: VoiceCommand | null
  countdown: number
  onCancelPending: () => void
  onUndoLast: () => void
}

export const VoiceFeedbackToast: React.FC<VoiceFeedbackToastProps> = ({
  isListening,
  lastTranscript,
  pendingCommand,
  countdown,
  onCancelPending,
  onUndoLast,
}) => {
  if (!isListening && !pendingCommand && !lastTranscript) {
    return null
  }

  return (
    <div className="absolute top-16 left-3 right-3 z-40 flex flex-col gap-2 pointer-events-auto animate-slideDown">
      {/* Pending Confirmation Banner for Wicket or Undo */}
      {pendingCommand && (
        <div className="p-3.5 bg-rose-950/90 border border-rose-500 rounded-xl shadow-2xl backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={20} className="text-rose-400 animate-pulse" />
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">
                Confirming {pendingCommand.type === 'wicket' ? 'Wicket' : 'Undo'} in {countdown}s
              </p>
              <p className="text-[11px] text-rose-300">
                "{pendingCommand.originalPhrase}"
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelPending}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow"
          >
            <X size={14} />
            <span>Cancel</span>
          </button>
        </div>
      )}

      {/* Live Voice Status Indicator */}
      {isListening && !pendingCommand && (
        <div className="p-2.5 bg-[#121A1D]/90 border border-emerald-500/50 rounded-xl shadow-lg backdrop-blur-md flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <Mic size={14} />
            <span className="font-semibold text-slate-200">
              {lastTranscript ? `"${lastTranscript}"` : 'Listening... Speak ball, e.g. "four", "single", "wide"'}
            </span>
          </div>

          {lastTranscript && (
            <button
              type="button"
              onClick={onUndoLast}
              className="text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800"
            >
              <RotateCcw size={12} />
              <span>Undo</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
