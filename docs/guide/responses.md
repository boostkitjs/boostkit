# Responses

Every route handler receives an `AppResponse` — a small, fluent surface for setting status codes, headers, and the response body. Returning a value from the handler ends the request; you don't call a `.end()` method.

```ts
router.get('/api/users/:id', async (req, res) => {
  const user = await User.find(req.params.id)
  if (!user) return res.status(404).json({ message: 'Not found' })
  return res.json({ data: user })
})
```

## JSON responses

`res.json(data)` serializes `data` as JSON and sets `Content-Type: application/json`. Combine with `res.status(...)` for non-200 responses:

```ts
return res.status(201).json({ data: user })
return res.status(422).json({ message: 'Validation failed', errors })
return res.status(204).send('')             // no body
```

## Plain text and HTML

`res.send(body)` writes a string body without setting a JSON content type:

```ts
return res.send('OK')
return res.header('Content-Type', 'text/html').send('<h1>Hello</h1>')
```

For server-rendered HTML pages use [view()](/guide/frontend) — it goes through Vike's SSR pipeline with full hydration and SPA navigation.

## Redirects

```ts
return res.redirect('/login')                 // 302 by default
return res.redirect('/dashboard', 303)         // see other (after POST)
return res.redirect('https://example.com', 301) // permanent
```

Use `303 See Other` after a successful POST so refreshing the destination doesn't re-submit.

## Headers and cookies

`res.header(key, value)` is chainable:

```ts
return res
  .status(201)
  .header('Location', `/users/${user.id}`)
  .header('X-Request-Id', requestId)
  .json({ data: user })
```

For session cookies, use the `Session` facade — don't write `Set-Cookie` headers by hand. For one-off cookies (CSRF tokens, signed download links), the server adapter exposes the raw response via `res.raw` if you need to call adapter-specific cookie helpers.

## Returning views

`view()` from `@rudderjs/view` returns a `ViewResponse` — return it from the handler and the framework renders it through Vike:

```ts
import { view } from '@rudderjs/view'

router.get('/dashboard', async () => {
  const stats = await StatsService.summary()
  return view('dashboard', { stats })
})
```

Props are serialized for SSR and client hydration. Plain objects, arrays, strings, numbers, dates — anything JSON-serializable. Functions and Model instances with prototype methods don't survive the boundary; transform Model records to plain objects before returning. See [Frontend](/guide/frontend) for the full view model.

## Status codes

Pick a code based on what happened, not on what feels familiar.

| Range | When |
|---|---|
| `200 OK` | Success with a body |
| `201 Created` | A new resource was created (set a `Location` header) |
| `202 Accepted` | Queued for async processing — return immediately |
| `204 No Content` | Success with no body (DELETEs, hooks) |
| `301` / `308` | Permanent redirect |
| `302` / `303` / `307` | Temporary redirect (303 for after-POST) |
| `400 Bad Request` | Malformed request (parse errors, missing required input) |
| `401 Unauthorized` | Missing or invalid credentials |
| `403 Forbidden` | Authenticated but not allowed |
| `404 Not Found` | Resource doesn't exist (or you don't want to leak existence) |
| `409 Conflict` | Optimistic concurrency, unique-key violation |
| `422 Unprocessable Entity` | Validation failed |
| `429 Too Many Requests` | Rate limit hit |
| `500 Internal Server Error` | Unhandled exception (the framework sets this) |
| `503 Service Unavailable` | Maintenance, dependency down |

For consistent error responses across the app, throw `HttpException` (or use the `abort()` helper) instead of building responses by hand — see [Error Handling](/guide/error-handling).

## Async responses

Returning a promise from a handler is supported — the router awaits it before flushing:

```ts
router.get('/api/posts', async () => {
  return res.json({ posts: await Post.all() })
})
```

For streaming responses (Server-Sent Events, file streams, AI tool calls), reach into `res.raw` and use the underlying server adapter's stream API directly. The `@rudderjs/ai` and `@rudderjs/sync` packages do this internally — most app code doesn't need to.

## Pitfalls

- **Forgetting to `return` the response.** `res.json(...)` writes the body but the framework also looks at the return value to know the request is done. Always `return res.json(...)`, not just `res.json(...)`.
- **Setting headers after the body is sent.** `res.header()` after `res.json()` / `res.send()` is a no-op — set headers first, then call `.json()`.
- **Returning a Model instance directly.** Prototype methods don't survive JSON serialization. Use `.toJSON()` or destructure to a plain object first.
- **Manual `Set-Cookie` headers.** Use `Session` for sessions; for everything else, the server adapter's cookie helpers via `res.raw` give you signing and `SameSite`/`HttpOnly` defaults.
