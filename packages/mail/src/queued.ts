import type { Mailable } from './mailable.js'
import type { SendOptions } from './index.js'
import { MailRegistry } from './index.js'

// ─── Queued Mail ────────────────────────────────────────────

interface QueueLike {
  get(): { dispatch(job: unknown, opts?: unknown): Promise<void> } | null
}

/**
 * @internal — dispatches a mailable through the queue system.
 * Dynamically requires @rudderjs/queue to avoid hard dependency.
 */
export async function dispatchMailJob(
  mailable: Mailable,
  options: SendOptions,
  queueOptions?: { queue?: string; delay?: number },
): Promise<void> {
  let QueueRegistry: QueueLike

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@rudderjs/queue') as { QueueRegistry: QueueLike }
    QueueRegistry = mod.QueueRegistry
  } catch {
    throw new Error(
      '[RudderJS Mail] Queued mail requires @rudderjs/queue. Install it with: pnpm add @rudderjs/queue'
    )
  }

  const adapter = QueueRegistry.get()
  if (!adapter) {
    throw new Error('[RudderJS Mail] No queue adapter registered. Add queue() to providers.')
  }

  const job = {
    handle: async () => {
      const mailAdapter = MailRegistry.get()
      if (!mailAdapter) {
        throw new Error('[RudderJS Mail] No mail adapter registered. Add mail() to providers.')
      }
      await mailAdapter.send(mailable, options)
    },
  }

  const opts: Record<string, unknown> = {}
  if (queueOptions?.queue) opts['queue'] = queueOptions.queue
  if (queueOptions?.delay) opts['delay'] = queueOptions.delay

  await adapter.dispatch(job, opts)
}
