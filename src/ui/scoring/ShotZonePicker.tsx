import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { ShotZone } from '../../engine/types'

interface ShotZonePickerProps {
  runs: number
  isLeftHanded?: boolean
  onSelectZone: (zone: ShotZone) => void
  onDismiss: () => void
}

// 8 Zones with standard labels
const ZONES: Array<{
  zone: ShotZone
  rhbLabel: string
  lhbLabel: string
  angleDeg: number
}> = [
  { zone: 1, rhbLabel: 'Straight', lhbLabel: 'Straight', angleDeg: 0 },
  { zone: 2, rhbLabel: 'Cover', lhbLabel: 'Mid-Wkt', angleDeg: 45 },
  { zone: 3, rhbLabel: 'Point', lhbLabel: 'Sq Leg', angleDeg: 90 },
  { zone: 4, rhbLabel: '3rd Man', lhbLabel: 'Fine Leg', angleDeg: 135 },
  { zone: 5, rhbLabel: 'Fine Leg', lhbLabel: '3rd Man', angleDeg: 180 },
  { zone: 6, rhbLabel: 'Sq Leg', lhbLabel: 'Point', angleDeg: 225 },
  { zone: 7, rhbLabel: 'Mid-Wkt', lhbLabel: 'Cover', angleDeg: 270 },
  { zone: 8, rhbLabel: 'Long On', lhbLabel: 'Long On', angleDeg: 315 },
]

export const ShotZonePicker: React.FC<ShotZonePickerProps> = ({
  runs,
  isLeftHanded = false,
  onSelectZone,
  onDismiss,
}) => {
  const [timeLeft, setTimeLeft] = useState(3000)

  useEffect(() => {
    const startTime = Date.now()
    const timer = setInterval(() => {
      const remaining = Math.max(0, 3000 - (Date.now() - startTime))
      setTimeLeft(remaining)
      if (remaining <= 0) {
        clearInterval(timer)
        onDismiss()
      }
    }, 100)

    return () => clearInterval(timer)
  }, [onDismiss])

  return (
    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 bg-[#121A1D]/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl p-3 shadow-2xl flex flex-col items-center gap-2 w-72 animate-fadeIn select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between w-full px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          Shot Direction ({runs} {runs === 1 ? 'Run' : 'Runs'})
        </span>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-0.5 rounded-full"
        >
          <X size={14} />
        </button>
      </div>

      {/* 8-Segment Compass Picker */}
      <div className="relative w-48 h-48 my-1 flex items-center justify-center">
        {/* Pitch line representation in center */}
        <div className="absolute w-2 h-16 bg-slate-700/60 rounded-full" />
        <div className="absolute w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center z-10">
          <span className="text-xs font-mono font-bold text-white">+{runs}</span>
        </div>

        {ZONES.map((z) => {
          // Place buttons circularly around (radius ~ 66px)
          const rad = (z.angleDeg - 90) * (Math.PI / 180)
          const r = 68
          const x = Math.round(96 + r * Math.cos(rad) - 22)
          const y = Math.round(96 + r * Math.sin(rad) - 14)
          const label = isLeftHanded ? z.lhbLabel : z.rhbLabel

          return (
            <button
              key={z.zone}
              type="button"
              onClick={() => {
                onSelectZone(z.zone)
                onDismiss()
              }}
              style={{ left: `${x}px`, top: `${y}px` }}
              className="absolute w-11 h-7 bg-[#1A262B] hover:bg-emerald-500 hover:text-black border border-slate-700 hover:border-emerald-400 text-slate-200 text-[9px] font-bold rounded-lg flex items-center justify-center transition-all active:scale-95 shadow"
            >
              <span>{label}</span>
            </button>
          )
        })}
      </div>

      {/* 3-second auto-dismiss progress bar */}
      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
        <div
          className="bg-emerald-400 h-full transition-all ease-linear"
          style={{ width: `${(timeLeft / 3000) * 100}%` }}
        />
      </div>
    </div>
  )
}
