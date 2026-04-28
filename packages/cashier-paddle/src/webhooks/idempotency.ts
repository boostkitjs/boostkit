// Webhook idempotency — Paddle retries every webhook. Without dedup we'd
// double-process subscription updates and (worse) double-charge if anyone
// uses webhook handlers to fire side effects.
//
// We log every processed event_id in `paddle_webhook_logs`. The unique index
// on `eventId` makes the dedup race-safe (insert-or-fail).

import { WebhookLog } from '../models/WebhookLog.js'

/**
 * Try to record an event as processed. Returns `true` if this is the first
 * time we've seen the event_id; `false` if it was already processed (caller
 * should skip).
 */
export async function markProcessed(eventId: string, eventType: string): Promise<boolean> {
  // Existence check first — cheaper than catching a unique-constraint failure
  // and works across adapters.
  const existing = await WebhookLog.where('eventId', eventId).first() as { id: string } | null
  if (existing) return false

  try {
    await WebhookLog.create({
      eventId,
      eventType,
      processedAt: new Date(),
    } as Record<string, unknown>)
    return true
  } catch {
    // Race: another worker inserted the same event_id between our check and
    // our create. Treat as "already processed".
    return false
  }
}
