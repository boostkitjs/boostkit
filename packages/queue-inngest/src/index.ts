import { Inngest } from 'inngest'
import type {
  Job,
  QueueAdapter,
  QueueAdapterProvider,
  DispatchOptions,
} from '@forge/queue'

// ─── Inngest Adapter ───────────────────────────────────────

class InngestAdapter implements QueueAdapter {
  private client: Inngest

  constructor(config: InngestConfig) {
    this.client = new Inngest({
      id: config.appId ?? 'forge-app',
      ...(config.eventKey ? { eventKey: config.eventKey } : {}),
    })
  }

  async dispatch(job: Job, options: DispatchOptions = {}): Promise<void> {
    const name = job.constructor.name

    await this.client.send({
      name: `forge/job.${name}`,
      data: {
        job:     name,
        payload: JSON.parse(JSON.stringify(job)),
        queue:   options.queue ?? 'default',
      },
      ...(options.delay ? { ts: Date.now() + options.delay } : {}),
    })
  }
}

// ─── Config ────────────────────────────────────────────────

export interface InngestConfig {
  appId?:    string
  eventKey?: string
}

// ─── Factory ───────────────────────────────────────────────

export function inngest(config: InngestConfig = {}): QueueAdapterProvider {
  return {
    create(): QueueAdapter {
      return new InngestAdapter(config)
    },
  }
}