// `cashier:webhook inspect <event_id>` — show the recorded log entry.
// `cashier:webhook simulate <event_type>` — replay a fixture against the local handler.

import { WebhookLog } from '../models/WebhookLog.js'
import { handlePaddleWebhook } from '../webhooks/handler.js'

export async function runWebhook(args: string[]): Promise<void> {
  const sub = args[0]
  if (!sub) {
    console.log('  Usage:')
    console.log('    rudder cashier:webhook inspect <event_id>')
    console.log('    rudder cashier:webhook simulate <event_type>')
    return
  }

  if (sub === 'inspect') {
    const id = args[1]
    if (!id) { console.log('  Missing <event_id>'); return }
    const log = await WebhookLog.where('eventId', id).first() as { id: string; eventType: string; processedAt: Date } | null
    if (!log) { console.log(`  No log entry for event_id="${id}"`); return }
    console.log(`  event_id:    ${id}`)
    console.log(`  event_type:  ${log.eventType}`)
    console.log(`  processedAt: ${log.processedAt.toISOString()}`)
    return
  }

  if (sub === 'simulate') {
    const type = args[1]
    if (!type) { console.log('  Missing <event_type>'); return }

    const { readFile } = await import('node:fs/promises')
    const { resolve } = await import('node:path')
    const fixturePath = resolve(process.cwd(), `tests/fixtures/paddle/${type}.json`)
    let payload: Record<string, unknown>
    try {
      const buf = await readFile(fixturePath, 'utf8')
      payload = JSON.parse(buf) as Record<string, unknown>
    } catch {
      console.log(`  No fixture at ${fixturePath}`)
      return
    }

    const fakeReq = { raw: { __rjs_paddle_payload: payload } }
    const fakeRes = {
      status: (_c: number) => fakeRes,
      json:   (b: unknown) => { console.log(`  → ${JSON.stringify(b)}`); return b },
      send:   (b?: unknown) => b,
    }
    await handlePaddleWebhook(fakeReq, fakeRes as unknown as Parameters<typeof handlePaddleWebhook>[1])
    console.log(`  Simulated ${type}.`)
    return
  }

  console.log(`  Unknown subcommand "${sub}". Use "inspect" or "simulate".`)
}
