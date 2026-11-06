import type { ExtraType, WicketType } from '../engine/types'

export type VoiceCommand =
  | {
      type: 'runs'
      runs: number
      isBoundary4: boolean
      isBoundary6: boolean
      originalPhrase: string
    }
  | {
      type: 'extra'
      extraType: ExtraType
      runs: number
      originalPhrase: string
    }
  | {
      type: 'wicket'
      wicketType: WicketType
      originalPhrase: string
    }
  | {
      type: 'undo'
      originalPhrase: string
    }
