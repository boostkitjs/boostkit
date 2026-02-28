import type { MiddlewareHandler, ForgeRequest, ForgeResponse } from '@forge/server'

// ─── Base Middleware Class ─────────────────────────────────

export abstract class Middleware {
  abstract handle(
    req: ForgeRequest,
    res: ForgeResponse,
    next: () => Promise<void>
  ): void | Promise<void>

  /** Convert class instance to a handler function */
  toHandler(): MiddlewareHandler {
    return (req, res, next) => this.handle(req, res, next)
  }
}

// ─── Pipeline ─────────────────────────────────────────────

export class Pipeline {
  private middleware: MiddlewareHandler[] = []

  static make(): Pipeline {
    return new Pipeline()
  }

  through(middleware: MiddlewareHandler[]): this {
    this.middleware = middleware
    return this
  }

  async run(
    req: ForgeRequest,
    res: ForgeResponse,
    destination: () => Promise<void>
  ): Promise<void> {
    let idx = 0
    const stack = [...this.middleware]

    const next = async (): Promise<void> => {
      const fn = stack[idx++]
      if (fn) {
        await fn(req, res, next)
      } else {
        await destination()
      }
    }

    await next()
  }
}

// ─── Built-in Middleware ───────────────────────────────────

/** CORS middleware */
export class CorsMiddleware extends Middleware {
  constructor(
    private options: {
      origin?: string | string[]
      methods?: string[]
      headers?: string[]
    } = {}
  ) {
    super()
  }

  handle(req: ForgeRequest, res: ForgeResponse, next: () => Promise<void>): Promise<void> {
    const origin  = Array.isArray(this.options.origin)
      ? this.options.origin.join(', ')
      : (this.options.origin ?? '*')
    const methods = (this.options.methods ?? ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']).join(', ')
    const headers = (this.options.headers ?? ['Content-Type', 'Authorization']).join(', ')

    res.header('Access-Control-Allow-Origin',  origin)
    res.header('Access-Control-Allow-Methods', methods)
    res.header('Access-Control-Allow-Headers', headers)

    return next()
  }
}

/** Request logger middleware */
export class LoggerMiddleware extends Middleware {
  async handle(req: ForgeRequest, res: ForgeResponse, next: () => Promise<void>): Promise<void> {
    const start = Date.now()
    await next()
    const ms = Date.now() - start
    console.log(`[Forge] ${req.method} ${req.path} — ${ms}ms`)
  }
}

/** Simple rate limiter middleware (in-memory) */
export class ThrottleMiddleware extends Middleware {
  private hits = new Map<string, { count: number; reset: number }>()

  constructor(
    private max: number = 60,
    private windowMs: number = 60_000
  ) {
    super()
  }

  handle(req: ForgeRequest, res: ForgeResponse, next: () => Promise<void>): Promise<void> {
    const ip  = req.headers['x-forwarded-for'] ?? req.headers['host'] ?? 'unknown'
    const now = Date.now()
    const rec = this.hits.get(ip)

    if (!rec || now > rec.reset) {
      this.hits.set(ip, { count: 1, reset: now + this.windowMs })
      return next()
    }

    if (rec.count >= this.max) {
      res.status(429).json({ message: 'Too many requests' })
      return Promise.resolve()
    }

    rec.count++
    return next()
  }
}

// ─── Helper to convert class-based middleware to handler ───

export function fromClass(MiddlewareClass: new () => Middleware): MiddlewareHandler {
  return new MiddlewareClass().toHandler()
}