---
"create-rudder-app": minor
---

Two scaffolder cleanups:

**1. `app/Http/{Controllers,Middleware,Requests}/` namespace.** Move HTTP-layer scaffolded files under `app/Http/` to match the existing `make:` CLI command target paths and Laravel's directory shape. Previously the scaffolder put files at `app/Controllers/` and `app/Middleware/` while `make:controller` and `make:middleware` wrote to `app/Http/Controllers/` and `app/Http/Middleware/` — the two paths now agree.

**2. Drop `RequestIdMiddleware` from the scaffold.** It was example code that didn't actually do anything — it set `X-Request-Id` on responses but never propagated the id into the logger context, telescope's `batchId`, or any other downstream system. Telescope generates its own `batchId` and ignores incoming headers. Users who want a request-id middleware can copy the example from [the middleware guide](/docs/guide/middleware), where it's already documented as the canonical "writing middleware" example.

**Migration for existing apps:** This is a convention move, not a forced rename. The framework has no path-bound discovery for controllers/middleware/requests — all routing is explicit (`router.get(path, handler)`, `Route.registerController(...)`), so existing files in `app/Controllers/`, `app/Middleware/`, `app/Requests/` keep working from wherever they live. Going forward, `make:*` and the scaffolder agree on `app/Http/`. To align an existing app, move the files manually (`git mv app/Controllers app/Http/Controllers` etc.) and update relative imports — no framework code change required. `RequestIdMiddleware` was decorative — leaving it in place changes nothing; deleting it changes nothing.
