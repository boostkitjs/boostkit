# @rudderjs/router

Decorator-based and fluent HTTP router for RudderJS. Supports named routes, URL generation, signed URLs, route-level middleware, and controller registration.

## Installation

```bash
pnpm add @rudderjs/router
```

---

## Fluent routing

```ts
import { router } from '@rudderjs/router'

router.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
router.post('/api/users', async (req, res) => { /* ... */ })
router.delete('/api/users/:id', async (req, res) => { /* ... */ })

// Catch-all (matches any HTTP method)
router.all('/api/*', (_req, res) => res.status(404).json({ message: 'Not found' }))
```

`router` is the global singleton. `Route` is an alias for it.

---

## Named routes

Chain `.name()` on any fluent route registration to assign a name:

```ts
router.get('/users/:id', handler).name('users.show')
router.post('/users', handler).name('users.store')
router.get('/invoices/:id/download', handler, [ValidateSignature()]).name('invoice.download')
```

---

## `route()` — URL generation

Generate a URL from a named route. Route parameters are substituted; unused params are appended as a query string.

```ts
import { route } from '@rudderjs/router'

route('users.show', { id: 42 })             // '/users/42'
route('search', { q: 'hello', page: 2 })    // '/search?q=hello&page=2'
route('users.list')                          // '/users'
```

Optional parameters (`:id?`) are omitted when not provided:

```ts
// route defined as '/posts/:category?/:slug'
route('posts.show', { slug: 'hello' })  // '/posts/hello'
```

Throws if a required parameter is missing or the named route is not defined.

---

## `Url` — signed URLs

Signed URLs include an HMAC-SHA256 `signature` parameter. The signing key is read from `APP_KEY` in your environment, or set explicitly with `Url.setKey()`.

```ts
import { Url } from '@rudderjs/router'

// Sign a named route
Url.signedRoute('invoice.download', { id: 42 })
// → '/invoice/42?signature=abc123...'

// Sign with an expiry (seconds from now)
Url.temporarySignedRoute('invoice.download', 3600, { id: 42 })
// → '/invoice/42?expires=1234567890&signature=abc123...'

// Sign an arbitrary path
Url.sign('/some/path?foo=bar')

// Validate a request's signature
Url.isValidSignature(req)   // → boolean

// Current URL and referer helpers
Url.current(req)            // → req.url
Url.previous(req, '/')      // → Referer header or fallback

// Override the signing key (e.g. in tests)
Url.setKey('my-secret-key')
```

---

## `ValidateSignature()` middleware

Rejects requests with a missing, invalid, or expired URL signature with `403`.

```ts
import { ValidateSignature } from '@rudderjs/router'

router.get('/invoice/:id/download', handler, [ValidateSignature()])
  .name('invoice.download')
```

---

## Decorator-based routing

```ts
import { Controller, Get, Post, Delete, Middleware, router } from '@rudderjs/router'
import type { AppRequest, AppResponse } from '@rudderjs/contracts'

@Controller('/api/users')
@Middleware([authMiddleware])       // applies to all routes in this controller
class UserController {
  @Get('/')
  index(_req: AppRequest, res: AppResponse) {
    return res.json({ data: [] })
  }

  @Post('/')
  async create(req: AppRequest, res: AppResponse) {
    return res.status(201).json({ data: req.body })
  }

  @Delete('/:id')
  @Middleware([adminMiddleware])    // additional middleware for this route only
  async destroy(req: AppRequest, res: AppResponse) {
    return res.status(204).send('')
  }
}

router.registerController(UserController)
```

---

## Route-level middleware (fluent)

```ts
router.get('/protected', handler, [authMiddleware])
router.post('/admin', handler, [authMiddleware, adminMiddleware])
```

---

## Mounting onto a server adapter

```ts
// bootstrap/app.ts — called automatically by Application.configure()
router.mount(serverAdapter)
```

---

## API Reference

### `Router`

| Method | Returns | Description |
|--------|---------|-------------|
| `get(path, handler, mw?)` | `RouteBuilder` | Register GET route |
| `post(path, handler, mw?)` | `RouteBuilder` | Register POST route |
| `put(path, handler, mw?)` | `RouteBuilder` | Register PUT route |
| `patch(path, handler, mw?)` | `RouteBuilder` | Register PATCH route |
| `delete(path, handler, mw?)` | `RouteBuilder` | Register DELETE route |
| `all(path, handler, mw?)` | `RouteBuilder` | Register route matching any method |
| `add(method, path, handler, mw?)` | `this` | Register route with explicit method |
| `use(middleware)` | `this` | Register global middleware |
| `registerController(Class)` | `this` | Register decorator-based controller |
| `mount(serverAdapter)` | `void` | Apply middleware + routes to adapter |
| `list()` | `RouteDefinition[]` | All registered routes |
| `listNamed()` | `Record<string, string>` | All named routes |
| `getNamedRoute(name)` | `string \| undefined` | Path for a named route |
| `reset()` | `this` | Clear routes, middleware, and named routes |

### `RouteBuilder`

Returned by the shorthand route methods. Allows naming the registered route.

| Method | Description |
|--------|-------------|
| `.name(n)` | Assign a name to the route |

### `Url`

| Method | Description |
|--------|-------------|
| `Url.setKey(key)` | Override the HMAC signing key |
| `Url.current(req)` | Full URL of the request |
| `Url.previous(req, fallback?)` | Referer header or fallback |
| `Url.signedRoute(name, params?, expiresAt?)` | Signed URL for a named route |
| `Url.temporarySignedRoute(name, seconds, params?)` | Expiring signed URL |
| `Url.sign(path, expiresAt?)` | Sign an arbitrary path |
| `Url.isValidSignature(req)` | Validate request signature |

### Decorators

| Decorator | Target | Description |
|-----------|--------|-------------|
| `@Controller(prefix?)` | class | Marks class as a controller with a route prefix |
| `@Middleware([...handlers])` | class or method | Applies middleware handlers |
| `@Get(path)` | method | GET route |
| `@Post(path)` | method | POST route |
| `@Put(path)` | method | PUT route |
| `@Patch(path)` | method | PATCH route |
| `@Delete(path)` | method | DELETE route |
| `@Options(path)` | method | OPTIONS route |

---

## Notes

- `router` and `Route` are the same global singleton
- Decorator controllers require `reflect-metadata` at the app entry point
- Double slashes in composed paths are normalised automatically
- Signed URLs use HMAC-SHA256 with timing-safe comparison to prevent timing attacks
- `APP_KEY` must be set (or `Url.setKey()` called) before using signed URLs
