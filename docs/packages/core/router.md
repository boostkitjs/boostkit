# @rudderjs/router

Decorator-based and fluent HTTP router for RudderJS. Supports named routes, URL generation, signed URLs, route-level middleware, and controller registration.

```bash
pnpm add @rudderjs/router
```

All exports are also available from `@rudderjs/core`.

---

## Fluent routing

```ts
import { router } from '@rudderjs/router'

router.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
router.post('/api/users', handler)
router.put('/api/users/:id', handler)
router.delete('/api/users/:id', handler)

// Catch-all
router.all('/api/*', (_req, res) => res.status(404).json({ message: 'Not found' }))
```

`router` is the global singleton. `Route` is an alias for it.

---

## Named routes

Chain `.name()` after any route registration to assign it a name:

```ts
router.get('/users/:id', handler).name('users.show')
router.post('/users', handler).name('users.store')
```

---

## `route()` — URL generation

Generate a URL from a named route. Route parameters are substituted from the `params` object. Unused params are appended as a query string.

```ts
import { route } from '@rudderjs/router'

route('users.show', { id: 42 })             // '/users/42'
route('search', { q: 'hello', page: 2 })    // '/search?q=hello&page=2'
route('users.list')                          // '/users'
```

Optional parameters (`:slug?`) are omitted if not provided:

```ts
// route: '/posts/:category?/:slug'
route('posts.show', { slug: 'hello' })  // '/posts/hello'
```

Throws `Error` if a required parameter is missing or the named route is not defined.

---

## Signed URLs

Signed URLs append an HMAC-SHA256 `signature` query parameter. The key is read from `process.env.APP_KEY` or set explicitly.

### `Url.signedRoute()`

```ts
import { Url } from '@rudderjs/router'

Url.signedRoute('invoice.download', { id: 42 })
// → '/invoice/42?signature=abc123...'
```

### `Url.temporarySignedRoute()`

```ts
// Expires in 1 hour
Url.temporarySignedRoute('invoice.download', 3600, { id: 42 })
// → '/invoice/42?expires=1234567890&signature=abc123...'
```

### `Url.sign()`

Sign an arbitrary path string:

```ts
Url.sign('/any/path?foo=bar')
Url.sign('/any/path', new Date(Date.now() + 60_000))  // expires in 60s
```

### `Url.isValidSignature()`

Validate a request's signature (checks HMAC and expiry):

```ts
Url.isValidSignature(req)  // → boolean
```

### `Url.setKey()`

Override the signing key (useful in tests):

```ts
Url.setKey('my-test-secret')
```

### Other helpers

```ts
Url.current(req)          // → req.url (full URL including query string)
Url.previous(req, '/')    // → Referer header or fallback
```

---

## `ValidateSignature()` middleware

Rejects requests with a missing, invalid, or expired signature with HTTP `403`.

```ts
import { ValidateSignature } from '@rudderjs/router'

router.get('/invoice/:id/download', handler, [ValidateSignature()])
  .name('invoice.download')
```

Usage pattern — generate the URL, share it, then validate on access:

```ts
// Generate (e.g. in a notification)
const url = Url.temporarySignedRoute('invoice.download', 86400, { id: invoice.id })

// Validate (in the route)
router.get('/invoice/:id/download', downloadHandler, [ValidateSignature()])
  .name('invoice.download')
```

---

## Decorator-based routing

```ts
import { Controller, Get, Post, Middleware } from '@rudderjs/router'
import type { AppRequest, AppResponse } from '@rudderjs/contracts'

@Controller('/api/users')
@Middleware([authMiddleware])
class UserController {
  @Get('/')
  index(_req: AppRequest, res: AppResponse) {
    return res.json({ data: [] })
  }

  @Post('/')
  @Middleware([validateRequest])
  async store(req: AppRequest, res: AppResponse) {
    return res.status(201).json({ data: req.body })
  }
}

router.registerController(UserController)
```

Middleware ordering: class-level runs before method-level.

---

## API Reference

### `Router`

| Method | Returns | Description |
|--------|---------|-------------|
| `get(path, handler, mw?)` | `RouteBuilder` | GET route |
| `post(path, handler, mw?)` | `RouteBuilder` | POST route |
| `put(path, handler, mw?)` | `RouteBuilder` | PUT route |
| `patch(path, handler, mw?)` | `RouteBuilder` | PATCH route |
| `delete(path, handler, mw?)` | `RouteBuilder` | DELETE route |
| `all(path, handler, mw?)` | `RouteBuilder` | Any method |
| `add(method, path, handler, mw?)` | `this` | Explicit method |
| `use(middleware)` | `this` | Global middleware |
| `registerController(Class)` | `this` | Register decorator controller |
| `mount(serverAdapter)` | `void` | Apply to server adapter |
| `list()` | `RouteDefinition[]` | All routes |
| `listNamed()` | `Record<string, string>` | All named routes |
| `getNamedRoute(name)` | `string \| undefined` | Path for named route |
| `reset()` | `this` | Clear all state |

### `RouteBuilder`

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
| `@Controller(prefix?)` | class | Route prefix for all methods |
| `@Middleware(handlers[])` | class or method | Attach middleware |
| `@Get(path)` | method | GET |
| `@Post(path)` | method | POST |
| `@Put(path)` | method | PUT |
| `@Patch(path)` | method | PATCH |
| `@Delete(path)` | method | DELETE |
| `@Options(path)` | method | OPTIONS |

---

## Notes

- `router` and `Route` refer to the same global singleton
- Decorator controllers require `import 'reflect-metadata'` at the app entry point
- Double slashes in path composition are normalised automatically
- Signed URL signatures use HMAC-SHA256 with timing-safe comparison
- `APP_KEY` must be configured before using `Url.signedRoute()` or `ValidateSignature()`
