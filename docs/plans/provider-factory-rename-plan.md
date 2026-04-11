---
status: draft
created: 2026-04-11
---

# Plan: Rename provider factories to `*Provider`, free lowercase for helpers

## Overview

Generalise the `auth` → `authProvider` rename (shipped 2026-04-11) to every sibling package that exposes a lowercase provider factory. The lowercase namespaces become reserved for Laravel-style per-request helpers, to be added package-by-package as demand arises.

Example shape after rename:

```ts
// bootstrap/providers.ts
import { cacheProvider } from '@rudderjs/cache'
import { sessionProvider } from '@rudderjs/session'
import { queueProvider } from '@rudderjs/queue'

export default [
  cacheProvider(configs.cache),
  sessionProvider(configs.session),
  queueProvider(configs.queue),
]

// Later, in any route handler:
import { cache } from '@rudderjs/cache'
const value = await cache().get('foo')         // Laravel: cache()->get('foo')
```

---

## Why

Laravel's helper ergonomics — `cache()->get()`, `session()->put()`, `queue()->push()`, `mail()->to()`, `log()->info()` — are what makes day-to-day code short. RudderJS already ships the **static facade** equivalents (`Cache.get()`, `Session.put()`, `Queue.push()`, `Mail.to()`, `Log.info()`) for most packages, but the lowercase namespaces are currently taken by the provider factories. That blocks us from ever shipping the lowercase helper form.

The `auth` → `authProvider` rename set the precedent and proved the DX win:

```ts
// Before
const manager = app().make<AuthManager>('auth.manager')
await runWithAuth(manager, async () => {
  const user = await Auth.user()
  // ...
})

// After
const user = await auth().user()
```

Applying the same rename across the rest of the providers unblocks the same shape for `cache()`, `session()`, `queue()`, `mail()`, etc. Without freeing the namespace first, each helper would need a different name (`cacheHelper()`, `getCache()`) and lose the Laravel parity.

---

## Scope — what gets renamed

### Renamed (23 provider factories)

| Current name | New name | Package | Facade exists? |
|---|---|---|---|
| `auth` | `authProvider` | `@rudderjs/auth` | `Auth` ✅ (done 2026-04-11) |
| `boost` | `boostProvider` | `@rudderjs/boost` | — |
| `cache` | `cacheProvider` | `@rudderjs/cache` | `Cache` ✅ |
| `context` | `contextProvider` | `@rudderjs/context` | `Context` ✅ |
| `crypt` | `cryptProvider` | `@rudderjs/crypt` | `Crypt` ✅ |
| `hash` | `hashProvider` | `@rudderjs/hash` | `Hash` ✅ |
| `horizon` | `horizonProvider` | `@rudderjs/horizon` | `Horizon` ✅ |
| `live` | `liveProvider` | `@rudderjs/live` | `Live` ✅ |
| `localization` | `localizationProvider` | `@rudderjs/localization` | — (has `trans`, `setLocale` functions) |
| `log` | `logProvider` | `@rudderjs/log` | `Log` ✅ |
| `mail` | `mailProvider` | `@rudderjs/mail` | `Mail` ✅ |
| `notifications` | `notificationsProvider` | `@rudderjs/notification` | `Notification` ✅ |
| `database` | `databaseProvider` | `@rudderjs/orm-prisma` | — |
| `pennant` | `pennantProvider` | `@rudderjs/pennant` | — |
| `pulse` | `pulseProvider` | `@rudderjs/pulse` | `Pulse` ✅ |
| `queue` | `queueProvider` | `@rudderjs/queue` | `Queue` ✅ |
| `scheduler` | `schedulerProvider` | `@rudderjs/schedule` | `Schedule` ✅ |
| `session` | `sessionProvider` | `@rudderjs/session` | `Session` ✅ |
| `socialite` | `socialiteProvider` | `@rudderjs/socialite` | `Socialite` ✅ |
| `storage` | `storageProvider` | `@rudderjs/storage` | `Storage` ✅ |
| `telescope` | `telescopeProvider` | `@rudderjs/telescope` | `Telescope` ✅ |
| `ai` | `aiProvider` | `@rudderjs/ai` | — (has `AI` uppercase helper) |
| `broadcasting` | `broadcastingProvider` | `@rudderjs/broadcast` | — (has `broadcast()` function) |
| `events` | `eventsProvider` | `@rudderjs/core` | — (has `dispatch`, `listen` functions) |

18 / 23 packages already ship an uppercase facade class — their future lowercase helper is a one-liner, which makes Phase 2 cheap to start. The remaining 5 (`localization`, `boost`, `pennant`, `ai`, `broadcasting`, `events`, `database`, `orm-prisma`) already expose function-based APIs and don't clearly need a Laravel-style helper; they get renamed for consistency and we revisit the helper question per package.

### Not renamed

These are **adapter factories** or **middleware factories**, not service-provider factories. They're passed *inside* other provider configs, not added to the `providers` array. Renaming them adds noise without paying for it.

| Stays | Package | Why |
|---|---|---|
| `hono(config)` | `@rudderjs/server-hono` | Server adapter — passed to `Application.configure({ server: hono(...) })` |
| `prisma(config)` | `@rudderjs/orm-prisma` | ORM adapter — passed into `database()` config |
| `drizzle(config)` | `@rudderjs/orm-drizzle` | ORM adapter |
| `bullmq(config)` | `@rudderjs/queue-bullmq` | Queue adapter |
| `inngest(config)` | `@rudderjs/queue-inngest` | Queue adapter |
| `livePrisma`, `liveRedis` | `@rudderjs/live` | Live-persistence adapters |
| `sessionMiddleware(config)` | `@rudderjs/session` | Middleware factory, not a provider |
| `view(id, props)` | `@rudderjs/view` | Handler return helper, not a provider |

### Open question: `database` in `@rudderjs/orm-prisma`

`database()` is a bit of an odd name — it already diverges from its package name (`orm-prisma`) because it's conceptually the "database" service for the app (the prisma ORM happens to back it). The rename becomes `databaseProvider()`, which reads fine. Note that the package also exports a separate `prisma()` adapter factory, which stays untouched (see "not renamed" table above).

---

## Non-goals

- **Do not add lowercase helpers in this plan.** This plan is rename-only. Helpers are a Phase 2 follow-up, sequenced per package as demand appears. Trying to do both at once balloons scope and blocks the mechanical rename.
- **Do not change adapter factory names** (hono, prisma, drizzle, bullmq, inngest, livePrisma, liveRedis). They're passed inside provider configs, not registered as providers. Renaming them muddies the vocabulary distinction between "provider" and "adapter".
- **Do not touch core's `events` export**. Wait — this one is scoped in; see the table. Re-read: `events` is a provider factory from `@rudderjs/core/events.ts`, so it is in scope. It becomes `eventsProvider`. The helpers in core (`dispatch`, `listen`, `subscribe`) stay lowercase because they're already doing what Laravel's `Event::dispatch()` does.
- **Do not introduce a deprecation shim.** RudderJS is still early dev, no external consumers, no semver commitment. A deprecation period would only slow us down. All consumers are in this repo or the sibling `pilotiq` / `pilotiq-pro` repos.

---

## Changes per package

Mechanical pattern for each package in scope:

1. **`packages/<name>/src/index.ts`** (or `provider.ts`) — rename the exported function. Keep the body unchanged.
2. **`packages/<name>/src/index.test.ts`** — update import + any assertion strings mentioning the old name.
3. **`packages/<name>/README.md`** — rewrite the setup example. If the README already has a "Usage" section showing the facade, leave it alone.
4. **`packages/<name>/boost/guidelines.md`** (if present) — update import example.

Additionally:

5. **`create-rudder-app/src/templates.ts`** — update the generator's import and provider-array emission for every package.
6. **`playground/bootstrap/providers.ts`** (rudderjs repo) — update imports + array entries.
7. **`pilotiq/playground/bootstrap/providers.ts`** — same, if it imports any of these. (Check first; pilotiq may only import a subset.)
8. **`pilotiq-pro/playground/bootstrap/providers.ts`** — same.
9. **`packages/auth/boost/guidelines.md`** and similar — grep for `auth(configs` / `cache(configs` / etc. across all `boost/guidelines.md` files and update.
10. **`docs/` MD files** — grep for the factory names in setup snippets and update.

---

## Phases

### Phase 1 — Rename (this plan)

Mechanical refactor only. One PR / commit per ~5 packages to keep the diff reviewable, OR one big commit if CI stays green the whole way — either is fine because the blast radius is contained to this monorepo.

Steps:

1. **Grep inventory** — run `rg "^export function \w+\(config" packages/*/src/` to confirm the 23-item list is current; cross-check against the table above.
2. **Package rename** — for each of the 23 packages, do steps 1–4 of "Changes per package". Build + run package tests after each batch of 5.
3. **Consumer updates** — update `create-rudder-app/src/templates.ts`, `playground/bootstrap/providers.ts`, `pilotiq/playground/bootstrap/providers.ts`, `pilotiq-pro/playground/bootstrap/providers.ts`. `pnpm typecheck` each.
4. **Docs sweep** — `rg -l "import \{ (auth|cache|queue|mail|session|hash|log|storage|scheduler|notifications|live|ai|boost|telescope|pulse|horizon|broadcasting|context|localization|database|crypt|pennant|socialite|events) \}" packages/` and update every match.
5. **Guidelines sweep** — same rg against `**/boost/guidelines.md` and update.
6. **Full build + typecheck** — `pnpm build` from root, `pnpm --filter '*' test` to run each package's test file.
7. **Smoke test** — boot rudderjs playground, hit `/`, `/api/me`, `/api/auth/sign-in/email`, `/api/health`, `/home`, `/about`. Boot pilotiq playground, hit its panels demo route. Boot pilotiq-pro, hit its AI chat demo.
8. **Scaffolder test** — run `pnpm create rudder-app test-rename` in a scratch directory, install, boot, confirm welcome page renders.

Total touched files estimate: ~80–100 (23 source files, 23 tests, 23 READMEs, 3 playground bootstraps, scaffolder template, ~20 guidelines + docs).

### Phase 2 — Lowercase helpers (separate plan, per-package on demand)

Not in this plan. When a package wants a lowercase helper, the pattern from `@rudderjs/auth` becomes the template:

```ts
// packages/cache/src/index.ts
export function cache(): CacheManager {
  return app().make<CacheManager>('cache')
}
// then in index.ts re-exports: export { cache } from './cache-manager.js'
```

Ship the helper alongside any existing uppercase facade — they coexist the same way `Auth` and `auth()` coexist today.

Not every package needs a helper. `pulse()`, `horizon()`, `telescope()`, `boost()` are monitoring / dev-tool providers whose lowercase namespaces will probably never be asked for; the rename is pure consistency for them.

---

## Risks

- **Missed call site** — something still imports the old name and builds fail. Mitigation: after the grep sweep, `pnpm build` from root surfaces every missed import as a TS2305 (no exported member).
- **Cross-repo drift** — pilotiq and pilotiq-pro playgrounds live in sibling clones; if only rudderjs is updated, they break on next boot. Mitigation: include them in the same worktree of commits, or commit each repo right after the other and note the coupling in the commit message.
- **Scaffolder tests for generated projects** — `create-rudder-app` tests that boot a generated project will fail if the scaffolder emits old names or new names against the wrong package version. Mitigation: update the scaffolder template in the same commit as the package rename and rerun the e2e scaffolder test.
- **Agent guideline drift** — `boost/guidelines.md` files are read by the AI coding agents (boost package). If they show old names, future Claude sessions will emit wrong code. Mitigation: explicit grep pass over `**/boost/guidelines.md`.
- **Naming inconsistency** — `scheduler` is already a verb-noun; `schedulerProvider` reads slightly awkward ("scheduler provider"). Alternative: rename to `scheduleProvider` to match `@rudderjs/schedule`. The rename then doubles as a package-name alignment. Flag for review during phase 1.
- **`notifications` is plural** — `notificationsProvider` reads oddly. Alternative: rename to `notificationProvider` to match `@rudderjs/notification` (singular package name). Flag for review during phase 1.

---

## Out-of-scope follow-ups (captured for later)

- **Lowercase helpers per package** — see phase 2 note above. Create a sibling plan when the first two or three packages ask for it.
- **Consolidate adapter vs. provider vocabulary in docs** — this rename makes the distinction obvious at the call site (`cacheProvider` vs `prisma`), but the README / guidelines don't currently explain the difference. Worth a docs pass later.
- **Retire `database()` factory alias** — `database()` vs `prisma()` coexisting in one package is confusing. Possibly collapse into one and name the survivor `ormProvider()` or similar. Separate cleanup.
