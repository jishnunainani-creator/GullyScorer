import type { BallEvent } from './types'

/**
 * Appends a new BallEvent to the match event log.
 */
export function applyEvent(events: readonly BallEvent[], newEvent: BallEvent): BallEvent[] {
  return [...events, newEvent]
}

/**
 * Undoes the most recent ball scoped strictly to the given inningsNo.
 * If the match has events from multiple innings, only the last event
 * belonging to inningsNo is removed. Events from other innings are untouched.
 */
export function undoLast(events: readonly BallEvent[], inningsNo: number): BallEvent[] {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]
    if (event && event.inningsNo === inningsNo) {
      return [...events.slice(0, i), ...events.slice(i + 1)]
    }
  }
  return [...events]
}
