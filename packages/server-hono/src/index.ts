import { Hono, type Context } from 'hono'
import { serve } from '@hono/node-server'
import type {
  ServerAdapter,
  ServerAdapterProvider,
  RouteDefinition,
  MiddlewareHandler,
  ForgeRequest,
  ForgeResponse,
} from '@forge/server'

// ─── Request Normalizer ────────────────────────────────────

function normalizeRequest(c: any): ForgeRequest {
  const url = new URL(c.req.url)
  return {
    method:  c.req.method,
    url:     c.req.url,
    path:    url.pathname,
    query:   Object.fromEntries(url.searchParams.entries()),
    params:  c.req.param() ?? {},
    headers: Object.fromEntries(
      Object.entries(c.req.header() ?? {}).map(([k, v]) => [k, String(v)])
    ),
    body:    null, // populated lazily per route
    raw:     c,
  }
}

// ─── Response Normalizer ───────────────────────────────────

function normalizeResponse(c: any): ForgeResponse {
  let statusCode = 200
  const headers: Record<string, string> = {}

  return {
    raw: c,
    status(code) {
      statusCode = code
      return this
    },
    header(key, value) {
      headers[key] = value
      return this
    },
    json(data) {
      c.header('Content-Type', 'application/json')
      Object.entries(headers).forEach(([k, v]) => c.header(k, v))
      c.status(statusCode)
      return c.json(data)
    },
    send(data) {
      Object.entries(headers).forEach(([k, v]) => c.header(k, v))
      c.status(statusCode)
      return c.text(data)
    },
    redirect(url, code = 302) {
      return c.redirect(url, code)
    },
  }
}

// ─── Hono Adapter ─────────────────────────────────────────

class HonoAdapter implements ServerAdapter {
  private app = new Hono()

  registerRoute(route: RouteDefinition): void {
    const method = route.method.toLowerCase() as
      'get' | 'post' | 'put' | 'patch' | 'delete' | 'options'

    this.app[method](route.path, async (c: Context) => {
      const req = normalizeRequest(c)
      const res = normalizeResponse(c)

      // Parse body for mutating methods
      if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
        try { req.body = await c.req.json() } catch { req.body = {} }
      }

      // Run middleware chain
      const middleware = [...route.middleware]
      let idx = 0
      const next = async (): Promise<void> => {
        const fn = middleware[idx++]
        if (fn) await fn(req, res, next)
      }
      await next()

      // Run handler — auto JSON serialize if data is returned
      const result = await route.handler(req, res)
      if (result !== undefined && result !== null) {
        return c.json(result)
      }
      return c.res
    })
  }

  applyMiddleware(middleware: MiddlewareHandler): void {
    this.app.use('*', async (c, honoNext) => {
      const req = normalizeRequest(c)
      const res = normalizeResponse(c)
      await middleware(req, res, honoNext)
    })
  }

  listen(port: number, callback?: () => void): void {
    serve({ fetch: this.app.fetch, port }, () => {
      callback?.()
      console.log(`[Forge] Server running on http://localhost:${port}`)
    })
  }

  getNativeServer(): Hono {
    return this.app
  }
}

// ─── Factory ───────────────────────────────────────────────

export function hono(): ServerAdapterProvider {
  return {
    create(): ServerAdapter {
      return new HonoAdapter()
    },
  }
}