// ─── Job Contract ──────────────────────────────────────────

export abstract class Job {
  /** The queue this job should be dispatched to */
  static queue = 'default'

  /** Number of times to retry on failure */
  static retries = 3

  /** Delay before job runs (ms) */
  static delay = 0

  /** The job's main logic */
  abstract handle(): void | Promise<void>

  /** Called when all retries are exhausted */
  failed?(error: unknown): void | Promise<void>

  /** Dispatch this job via the global dispatcher */
  static dispatch<T extends Job>(
    this: new (...args: unknown[]) => T,
    ...args: ConstructorParameters<typeof this>
  ): DispatchBuilder<T> {
    const instance = new this(...args)
    return new DispatchBuilder(instance)
  }
}

// ─── Dispatch Builder ──────────────────────────────────────

export class DispatchBuilder<T extends Job> {
  private _delay  = 0
  private _queue  = 'default'

  constructor(private job: T) {
    this._delay = (job.constructor as typeof Job).delay
    this._queue = (job.constructor as typeof Job).queue
  }

  delay(ms: number): this {
    this._delay = ms
    return this
  }

  onQueue(name: string): this {
    this._queue = name
    return this
  }

  async send(): Promise<void> {
    const adapter = QueueRegistry.get()
    if (!adapter) throw new Error('[Forge Queue] No queue adapter registered')
    await adapter.dispatch(this.job, { delay: this._delay, queue: this._queue })
  }

  then(resolve: () => void): Promise<void> {
    return this.send().then(resolve)
  }
}

// ─── Queue Adapter Contract ────────────────────────────────

export interface DispatchOptions {
  delay?: number
  queue?: string
}

export interface QueueAdapter {
  /** Dispatch a job */
  dispatch(job: Job, options?: DispatchOptions): Promise<void>

  /** Start processing jobs (for self-hosted adapters like BullMQ) */
  work?(queue?: string): Promise<void>
}

// ─── Queue Adapter Factory ─────────────────────────────────

export interface QueueAdapterProvider {
  create(): QueueAdapter
}

export interface QueueAdapterFactory<TConfig = unknown> {
  (config?: TConfig): QueueAdapterProvider
}

// ─── Global Queue Registry ─────────────────────────────────

export class QueueRegistry {
  private static adapter: QueueAdapter | null = null

  static set(adapter: QueueAdapter): void {
    this.adapter = adapter
  }

  static get(): QueueAdapter | null {
    return this.adapter
  }
}