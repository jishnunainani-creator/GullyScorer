import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { BallEvent } from '../engine/types'

export async function broadcastLiveBall(
  shareToken: string,
  event: BallEvent,
): Promise<void> {
  if (!shareToken || !isSupabaseConfigured()) return
  try {
    const channel = supabase.channel(`live-match:${shareToken}`)
    await channel.send({
      type: 'broadcast',
      event: 'ball_added',
      payload: event,
    })
  } catch {
    // Non-blocking broadcast
  }
}

export async function broadcastLiveUndo(
  shareToken: string,
  inningsNo: number,
): Promise<void> {
  if (!shareToken || !isSupabaseConfigured()) return
  try {
    const channel = supabase.channel(`live-match:${shareToken}`)
    await channel.send({
      type: 'broadcast',
      event: 'ball_undone',
      payload: { inningsNo },
    })
  } catch {
    // Non-blocking broadcast
  }
}
