import React from 'react'
import type { BallEvent } from '../../engine/types'

interface BallChipProps {
  ball: BallEvent
}

export const BallChip: React.FC<BallChipProps> = ({ ball }) => {
  let label = `${ball.runsOffBat}`
  let colorClass = 'bg-[#182328] text-slate-200 border-slate-700'

  if (ball.wicket) {
    label = 'W'
    colorClass = 'bg-rose-600 text-white font-bold border-rose-500 shadow-sm shadow-rose-900/50'
  } else if (ball.extra) {
    if (ball.extra.type === 'wide') {
      label = ball.extra.runs > 1 ? `Wd+${ball.extra.runs - 1}` : 'Wd'
      colorClass = 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-semibold'
    } else if (ball.extra.type === 'noball') {
      const extraRuns = ball.runsOffBat > 0 ? `+${ball.runsOffBat}` : ''
      label = `Nb${extraRuns}`
      colorClass = 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-semibold'
    } else if (ball.extra.type === 'bye') {
      label = `B${ball.extra.runs}`
      colorClass = 'bg-slate-700 text-slate-300 border-slate-600'
    } else if (ball.extra.type === 'legbye') {
      label = `Lb${ball.extra.runs}`
      colorClass = 'bg-slate-700 text-slate-300 border-slate-600'
    }
  } else if (ball.isBoundary6) {
    label = '6'
    colorClass = 'bg-purple-600 text-white font-extrabold border-purple-400 shadow-sm shadow-purple-900/50'
  } else if (ball.isBoundary4) {
    label = '4'
    colorClass = 'bg-emerald-600 text-white font-bold border-emerald-400 shadow-sm shadow-emerald-900/50'
  } else if (ball.runsOffBat === 0) {
    label = '•'
    colorClass = 'bg-[#121A1D] text-slate-400 border-slate-800'
  }

  return (
    <div
      className={`inline-flex items-center justify-center min-w-[34px] h-[34px] px-2 rounded-full border text-xs font-mono font-bold tracking-tight transition-transform active:scale-95 ${colorClass}`}
    >
      {label}
    </div>
  )
}
