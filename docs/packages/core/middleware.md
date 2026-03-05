# @boostkit/middleware

HTTP middleware base class, pipeline runner, built-in implementations, and rate limiting.

```bash
pnpm add @boostkit/middleware
```

---

## Writing Middleware

The simplest middleware is a plain async function matching `MiddlewareHandler`:

```ts
import type { MiddlewareHandler } from '@boostkit/contracts'

export const requestIdMiddleware: MiddlewareHandler = async (req, res, next) => {
  const id = req.headers['x-request-id'] ?? crypto.randomUUID()
  await next()
  res.header('X-Request-Id', id)
}
```

Register globally in `bootstrap/app.ts`:

```ts
.withMiddleware((m) => {
  m.use(requestIdMiddleware)
})
```

Or per-route in `routes/api.ts`:

```ts
Route.get('/api/me', handler, [requestIdMiddleware])
```

### Class-Based Middleware

For more complex middleware, extend the `Middleware` base class:

```ts
import { Middleware } from '@boostkit/middleware'
import type { AppRequest, AppResponse } from '@boostkit/contracts'

export class LoggingMiddleware extends Middleware {
  async handle(req: AppRequest, res: AppResponse, next: () => Promise<void>) {
    console.log(`→ ${req.method} ${req.path}`)
    await next()
    console.log(`← done`)
  }
}
```

Use `fromClass()` to convert to a `MiddlewareHandler`:

```ts
import { fromClass } from '@boostkit/middleware'

Route.get('/api/users', handler, [fromClass(LoggingMiddleware)])
```

---

## Built-in Middleware

All built-in middleware are **callable factory functions** — no `new`, no `.toHandler()`:

### `CsrfMiddleware()`

Validates the `X-CSRF-Token` header on mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`). Token is stored in the session. Apply to web routes only — not API routes.

```ts
import { CsrfMiddleware } from '@boostkit/middleware'

const webMw = [SessionMiddleware(), CsrfMiddleware()]
Route.get('/dashboard', handler, webMw)
```

### `RateLimit`

Cache-backed rate limiter. Returns a callable `MiddlewareHandler` with fluent configuration methods.

```ts
import { RateLimit } from '@boostkit/middleware'

// Global — 60 requests/minute per IP
m.use(RateLimit.perMinute(60))

// Per-route — 10 requests/minute keyed by IP + path
const authLimit = RateLimit.perMinute(10)
  .by(req => `${req.headers['x-forwarded-for']}:${req.path}`)
  .message('Too many auth attempts. Try again later.')

Route.post('/api/auth/sign-in', handler, [authLimit])
```

Sets `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` response headers. Returns `429` when the limit is exceeded.

**`RateLimit` fluent methods:**

| Method | Description |
|---|---|
| `RateLimit.perMinute(n)` | Limit to `n` requests per 60 seconds |
| `RateLimit.perHour(n)` | Limit to `n` requests per 3600 seconds |
| `RateLimit.perDay(n)` | Limit to `n` requests per 86400 seconds |
| `RateLimit.per(n, seconds)` | Custom window |
| `.byIp()` | Key by client IP (default) |
| `.byRoute()` | Key by request path |
| `.by(fn)` | Key by custom function `(req) => string` |
| `.message(text)` | Custom 429 response message |
| `.skipIf(fn)` | Skip rate limiting when `(req) => boolean` returns `true` |

**Stacking:** Global and per-route limits are independent — each has its own counter. A request that passes the global 60/min limit still counts against a per-route 10/min limit.

**Requires** `@boostkit/cache` to be registered. Fails open (allows request) if no cache adapter is configured.

---

## Pipeline

`Pipeline` runs a sequence of `MiddlewareHandler` functions in order. Use it to compose middleware outside of the router:

```ts
import { Pipeline } from '@boostkit/middleware'

const pipeline = new Pipeline([
  requestIdMiddleware,
  RateLimit.perMinute(100),
])

const response = await pipeline.run(req, res, async (req, res) => {
  return res.json({ message: 'Hello' })
})
```

---

## MiddlewareHandler Type

`MiddlewareHandler` is the canonical function signature for all middleware in BoostKit. It is exported from `@boostkit/contracts` and re-exported here for convenience.

```ts
type MiddlewareHandler = (
  req: AppRequest,
  res: AppResponse,
  next: () => Promise<void>,
) => unknown | Promise<unknown>
```

---

## Notes

- Prefer plain `MiddlewareHandler` functions over class-based middleware — simpler, no instantiation needed.
- `CsrfMiddleware()` and `SessionMiddleware()` belong on **web routes** (forms, pages), not API routes. API clients handle auth via tokens, not CSRF cookies.
- `RateLimit` uses the configured cache driver under the hood. The `memory` driver (default) does not share state across processes — use `redis` for distributed deployments.
- `@boostkit/middleware` depends on `@boostkit/contracts` only. It does not depend on `@boostkit/core`, so it can be used in adapters and edge middleware without pulling in the full framework.
- `sideEffects: false` — fully tree-shakable.
