import { describe, it, expect } from 'vitest'
import {
  calculateBackoff,
  batchOutboxItems,
  resolveConflict,
  deduplicateById,
  isReadyForRetry,
} from '../pure'
import type { OutboxRecord } from '../../db/schema'

describe('Sync Engine Pure Logic', () => {
  describe('calculateBackoff', () => {
    it('returns 0 for 0 attempts', () => {
      expect(calculateBackoff(0)).toBe(0)
    })

    it('returns base delay for 1st attempt', () => {
      const delay = calculateBackoff(1, 1000, 30000, 0.5)
      expect(delay).toBe(1000)
    })

    it('doubles delay for 2nd attempt', () => {
      const delay = calculateBackoff(2, 1000, 30000, 0.5)
      expect(delay).toBe(2000)
    })

    it('quadruples delay for 3rd attempt', () => {
      const delay = calculateBackoff(3, 1000, 30000, 0.5)
      expect(delay).toBe(4000)
    })

    it('caps delay at maxMs', () => {
      const delay = calculateBackoff(10, 1000, 15000, 0.5)
      expect(delay).toBe(15000)
    })

    it('applies positive jitter correctly', () => {
      const delay = calculateBackoff(2, 1000, 30000, 1.0) // max positive jitter (+12.5%)
      expect(delay).toBe(2250)
    })

    it('applies negative jitter correctly', () => {
      const delay = calculateBackoff(2, 1000, 30000, 0.0) // max negative jitter (-12.5%)
      expect(delay).toBe(1750)
    })
  })

  describe('batchOutboxItems', () => {
    const makeItem = (
      id: string,
      type: OutboxRecord['type'],
      matchId?: string,
    ): OutboxRecord => ({
      id,
      type,
      entityId: id,
      matchId,
      payload: {},
      attempts: 0,
      createdAt: 1000,
    })

    it('returns empty array when items list is empty', () => {
      expect(batchOutboxItems([])).toEqual([])
    })

    it('batches consecutive ball inserts for the same match', () => {
      const items = [
        makeItem('b1', 'insert_ball', 'm1'),
        makeItem('b2', 'insert_ball', 'm1'),
        makeItem('b3', 'insert_ball', 'm1'),
      ]
      const batches = batchOutboxItems(items, 50)
      expect(batches).toHaveLength(1)
      expect(batches[0]?.type).toBe('insert_ball')
      expect(batches[0]?.items).toHaveLength(3)
    })

    it('splits ball batches when maxBatchSize is reached', () => {
      const items = [
        makeItem('b1', 'insert_ball', 'm1'),
        makeItem('b2', 'insert_ball', 'm1'),
        makeItem('b3', 'insert_ball', 'm1'),
        makeItem('b4', 'insert_ball', 'm1'),
      ]
      const batches = batchOutboxItems(items, 2)
      expect(batches).toHaveLength(2)
      expect(batches[0]?.items).toHaveLength(2)
      expect(batches[1]?.items).toHaveLength(2)
    })

    it('splits ball batches when matchId changes', () => {
      const items = [
        makeItem('b1', 'insert_ball', 'm1'),
        makeItem('b2', 'insert_ball', 'm1'),
        makeItem('b3', 'insert_ball', 'm2'),
      ]
      const batches = batchOutboxItems(items, 50)
      expect(batches).toHaveLength(2)
      expect(batches[0]?.matchId).toBe('m1')
      expect(batches[0]?.items).toHaveLength(2)
      expect(batches[1]?.matchId).toBe('m2')
      expect(batches[1]?.items).toHaveLength(1)
    })

    it('preserves dependency order: match upsert flushed before ball inserts', () => {
      const items = [
        makeItem('t1', 'upsert_team'),
        makeItem('m1', 'upsert_match', 'm1'),
        makeItem('b1', 'insert_ball', 'm1'),
        makeItem('b2', 'insert_ball', 'm1'),
      ]
      const batches = batchOutboxItems(items, 50)
      expect(batches).toHaveLength(3)
      expect(batches[0]?.type).toBe('upsert_team')
      expect(batches[1]?.type).toBe('upsert_match')
      expect(batches[2]?.type).toBe('insert_ball')
      expect(batches[2]?.items).toHaveLength(2)
    })

    it('separates tombstone_ball from insert_ball batches', () => {
      const items = [
        makeItem('b1', 'insert_ball', 'm1'),
        makeItem('b2', 'insert_ball', 'm1'),
        makeItem('b2-del', 'tombstone_ball', 'm1'),
        makeItem('b3', 'insert_ball', 'm1'),
      ]
      const batches = batchOutboxItems(items, 50)
      expect(batches).toHaveLength(3)
      expect(batches[0]?.type).toBe('insert_ball')
      expect(batches[0]?.items).toHaveLength(2)
      expect(batches[1]?.type).toBe('tombstone_ball')
      expect(batches[2]?.type).toBe('insert_ball')
      expect(batches[2]?.items).toHaveLength(1)
    })
  })

  describe('resolveConflict (Last-Write-Wins)', () => {
    it('prefers remote when remote timestamp is newer', () => {
      const local = { id: 'team-1', name: 'Warriors Local', updatedAt: 1000 }
      const remote = { id: 'team-1', name: 'Warriors Remote', updatedAt: 2000 }
      const resolved = resolveConflict(local, remote)
      expect(resolved.name).toBe('Warriors Remote')
    })

    it('prefers local when local timestamp is newer', () => {
      const local = { id: 'team-1', name: 'Warriors Local', updatedAt: 3000 }
      const remote = { id: 'team-1', name: 'Warriors Remote', updatedAt: 2000 }
      const resolved = resolveConflict(local, remote)
      expect(resolved.name).toBe('Warriors Local')
    })

    it('handles ISO string updated_at timestamps', () => {
      const local = { id: 'p1', name: 'A', updated_at: '2026-01-01T00:00:00Z' }
      const remote = { id: 'p1', name: 'B', updated_at: '2026-01-02T00:00:00Z' }
      const resolved = resolveConflict(local, remote)
      expect(resolved.name).toBe('B')
    })

    it('returns local if timestamps are identical', () => {
      const local = { id: 'p1', name: 'Local', updatedAt: 1000 }
      const remote = { id: 'p1', name: 'Remote', updatedAt: 1000 }
      const resolved = resolveConflict(local, remote)
      expect(resolved.name).toBe('Local')
    })
  })

  describe('deduplicateById (Idempotency)', () => {
    it('returns distinct array unchanged', () => {
      const items = [{ id: '1' }, { id: '2' }, { id: '3' }]
      expect(deduplicateById(items)).toHaveLength(3)
    })

    it('deduplicates duplicate IDs retaining the latest entry', () => {
      const items = [
        { id: '1', version: 1 },
        { id: '2', version: 1 },
        { id: '1', version: 2 },
      ]
      const deduped = deduplicateById(items)
      expect(deduped).toHaveLength(2)
      expect(deduped.find((i) => i.id === '1')?.version).toBe(2)
    })
  })

  describe('isReadyForRetry', () => {
    it('returns true when attempts are 0', () => {
      const item: OutboxRecord = {
        id: '1',
        type: 'insert_ball',
        entityId: '1',
        payload: {},
        attempts: 0,
        createdAt: 1000,
      }
      expect(isReadyForRetry(item, 1000)).toBe(true)
    })

    it('returns false when backoff window has not elapsed', () => {
      const item: OutboxRecord = {
        id: '1',
        type: 'insert_ball',
        entityId: '1',
        payload: {},
        attempts: 1, // 1000ms backoff
        createdAt: 1000,
      }
      // At time 1500, only 500ms elapsed -> not ready
      expect(isReadyForRetry(item, 1500, 1000)).toBe(false)
    })

    it('returns true when backoff window has elapsed', () => {
      const item: OutboxRecord = {
        id: '1',
        type: 'insert_ball',
        entityId: '1',
        payload: {},
        attempts: 1,
        createdAt: 1000,
      }
      // At time 2500, 1500ms elapsed (> 1000ms) -> ready
      expect(isReadyForRetry(item, 2500, 1000)).toBe(true)
    })
  })
})
