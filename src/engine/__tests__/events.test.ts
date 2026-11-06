import { describe, it, expect } from 'vitest'
import { applyEvent, undoLast } from '../events'
import { createBall } from './testHelpers'

describe('Event Sourcing & Undo Logic', () => {
  it('applies new event immutably', () => {
    const e1 = createBall({ id: 'b1', inningsNo: 1, runsOffBat: 1 })
    const list1 = [e1]
    const e2 = createBall({ id: 'b2', inningsNo: 1, runsOffBat: 2 })
    const list2 = applyEvent(list1, e2)

    expect(list2).toHaveLength(2)
    expect(list1).toHaveLength(1) // immutable
    expect(list2[1]?.id).toBe('b2')
  })

  it('undoLast removes only the most recent event of the given innings', () => {
    const e1 = createBall({ id: 'b1', inningsNo: 1 })
    const e2 = createBall({ id: 'b2', inningsNo: 1 })
    const e3 = createBall({ id: 'b3', inningsNo: 1 })
    const events = [e1, e2, e3]

    const undone = undoLast(events, 1)
    expect(undone).toHaveLength(2)
    expect(undone.map((e) => e.id)).toEqual(['b1', 'b2'])
  })

  it('undoLast NEVER deletes events from another innings', () => {
    const e1 = createBall({ id: 'inn1-b1', inningsNo: 1, runsOffBat: 4 })
    const e2 = createBall({ id: 'inn1-b2', inningsNo: 1, runsOffBat: 6 })
    const e3 = createBall({ id: 'inn2-b1', inningsNo: 2, runsOffBat: 1 })
    const e4 = createBall({ id: 'inn2-b2', inningsNo: 2, runsOffBat: 2 })
    const matchEvents = [e1, e2, e3, e4]

    // Undoing Innings 1 must remove inn1-b2, leaving Innings 2 events completely intact
    const undoneInn1 = undoLast(matchEvents, 1)
    expect(undoneInn1.map((e) => e.id)).toEqual(['inn1-b1', 'inn2-b1', 'inn2-b2'])

    // Undoing Innings 2 must remove inn2-b2, leaving Innings 1 events completely intact
    const undoneInn2 = undoLast(matchEvents, 2)
    expect(undoneInn2.map((e) => e.id)).toEqual(['inn1-b1', 'inn1-b2', 'inn2-b1'])
  })

  it('undoLast returns copy unchanged if target innings has no events', () => {
    const e1 = createBall({ id: 'inn1-b1', inningsNo: 1 })
    const events = [e1]

    const undone = undoLast(events, 2)
    expect(undone).toHaveLength(1)
    expect(undone[0]?.id).toBe('inn1-b1')
  })

  it('undoLast handles empty event array', () => {
    const undone = undoLast([], 1)
    expect(undone).toEqual([])
  })
})
