import type { BallEvent } from '../engine/types'

export function remapPlayerIdInEvents(
  events: BallEvent[],
  sourcePlayerId: string,
  targetPlayerId: string,
): { remappedEvents: BallEvent[]; changedCount: number } {
  let changedCount = 0

  const remappedEvents = events.map((e) => {
    let changed = false
    let batterId = e.batterId
    let nonStrikerId = e.nonStrikerId
    let bowlerId = e.bowlerId
    let wicket = e.wicket

    if (e.batterId === sourcePlayerId) {
      batterId = targetPlayerId
      changed = true
    }
    if (e.nonStrikerId === sourcePlayerId) {
      nonStrikerId = targetPlayerId
      changed = true
    }
    if (e.bowlerId === sourcePlayerId) {
      bowlerId = targetPlayerId
      changed = true
    }
    if (e.wicket) {
      let wChanged = false
      let playerOutId = e.wicket.playerOutId
      let fielderId = e.wicket.fielderId

      if (e.wicket.playerOutId === sourcePlayerId) {
        playerOutId = targetPlayerId
        wChanged = true
      }
      if (e.wicket.fielderId === sourcePlayerId) {
        fielderId = targetPlayerId
        wChanged = true
      }

      if (wChanged) {
        wicket = {
          ...e.wicket,
          playerOutId,
          fielderId,
        }
        changed = true
      }
    }

    if (changed) {
      changedCount++
      return {
        ...e,
        batterId,
        nonStrikerId,
        bowlerId,
        wicket,
      }
    }

    return e
  })

  return { remappedEvents, changedCount }
}
