import type { OutboxRecord, OutboxOperationType } from '../db/schema'

export interface OutboxBatch {
  type: OutboxOperationType
  matchId?: string
  items: OutboxRecord[]
}

/**
 * Calculates exponential backoff duration in milliseconds with jitter.
 * @param attempts Number of previously failed attempts.
 * @param baseMs Base delay in milliseconds (default 1000ms).
 * @param maxMs Maximum delay cap (default 30000ms).
 * @param jitter Random multiplier between 0 and 1 (default Math.random()).
 */
export function calculateBackoff(
  attempts: number,
  baseMs = 1000,
  maxMs = 30000,
  jitter = Math.random(),
): number {
  if (attempts <= 0) return 0
  const exponential = Math.min(maxMs, baseMs * Math.pow(2, attempts - 1))
  // Apply 25% jitter: +/- 12.5%
  const jitterRange = exponential * 0.25
  const jitterOffset = (jitter - 0.5) * jitterRange
  return Math.round(Math.max(baseMs, Math.min(maxMs, exponential + jitterOffset)))
}

/**
 * Batches outbox operations respecting dependencies:
 * - Sequential ball inserts for the same match are batched up to maxBatchSize (default 50).
 * - Matches, teams, and player updates are flushed before dependent balls.
 * - Order is strictly preserved.
 */
export function batchOutboxItems(
  items: readonly OutboxRecord[],
  maxBatchSize = 50,
): OutboxBatch[] {
  if (!items || items.length === 0) return []

  const batches: OutboxBatch[] = []
  let currentBallBatch: OutboxBatch | null = null

  for (const item of items) {
    if (item.type === 'insert_ball') {
      // Check if we can append to the existing ball batch
      if (
        currentBallBatch &&
        currentBallBatch.matchId === item.matchId &&
        currentBallBatch.items.length < maxBatchSize
      ) {
        currentBallBatch.items.push(item)
      } else {
        // Flush previous ball batch
        if (currentBallBatch) {
          batches.push(currentBallBatch)
        }
        currentBallBatch = {
          type: 'insert_ball',
          matchId: item.matchId,
          items: [item],
        }
      }
    } else {
      // If we encounter a non-ball operation, flush any accumulated ball batch
      if (currentBallBatch) {
        batches.push(currentBallBatch)
        currentBallBatch = null
      }
      batches.push({
        type: item.type,
        matchId: item.matchId,
        items: [item],
      })
    }
  }

  if (currentBallBatch) {
    batches.push(currentBallBatch)
  }

  return batches
}

/**
 * Resolves conflicts between local and remote records using Last-Write-Wins (LWW) by updated_at timestamp.
 */
export function resolveConflict<T extends { updatedAt?: number; updated_at?: string | number }>(
  local: T,
  remote: T,
): T {
  const localTime =
    typeof local.updatedAt === 'number'
      ? local.updatedAt
      : typeof local.updated_at === 'number'
      ? local.updated_at
      : local.updated_at
      ? new Date(local.updated_at).getTime()
      : 0

  const remoteTime =
    typeof remote.updatedAt === 'number'
      ? remote.updatedAt
      : typeof remote.updated_at === 'number'
      ? remote.updated_at
      : remote.updated_at
      ? new Date(remote.updated_at).getTime()
      : 0

  return remoteTime > localTime ? remote : local
}

/**
 * Deduplicates an array of items by ID, preserving the latest item sequence for idempotency.
 */
export function deduplicateById<T extends { id: string }>(items: readonly T[]): T[] {
  const map = new Map<string, T>()
  for (const item of items) {
    map.set(item.id, item)
  }
  return Array.from(map.values())
}

/**
 * Validates whether an outbox record is ready for retry based on its last attempt and creation time.
 */
export function isReadyForRetry(
  item: OutboxRecord,
  currentTime: number,
  baseMs = 1000,
  maxMs = 30000,
): boolean {
  if (item.attempts === 0) return true
  const backoff = calculateBackoff(item.attempts, baseMs, maxMs, 0.5)
  return currentTime >= item.createdAt + backoff
}
