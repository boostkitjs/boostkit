---
status: draft
created: 2026-04-11
supersedes: docs/plans/auto-provider-discovery.md
---

# Plan: Class-based providers + auto-discovery

Combines two previously-separate concerns:

1. **Convert factory functions to PascalCase classes** so the providers array is consistent (`CacheProvider`, `AuthProvider`, `AppServiceProvider` — all classes).
2. **Auto-discover framework providers** from `package.json` metadata so `bootstrap/providers.ts` shrinks to just the user's own providers.

These are deliberately bundled because doing them separately means doing the same surgery on ~25 packages twice and migrating the auto-discovery manifest schema mid-flight. Done together they ship one coherent shape.

This plan **supersedes** `docs/plans/auto-provider-discovery.md`. That plan was solid in its core ideas (manifest at build time, built-in registry fallback, stage + topo sort) but assumed the factory shape we just renamed today and pushed the closure-config foot-gun forward instead of fixing it.

---

## Status

- **2026-04-11 (this session)**: shipped the rename `cache` → `cacheProvider`, `auth` → `authProvider`, etc., across 23 packages. The lowercase namespace is now free for future helpers (`cache()`, `mail()`, `log()`); the providers array is camelCase factories. See `commit history` for details.
- **2026-04-11 (this session)**: shipped `auth()` helper + global `AuthMiddleware` install in `AuthServiceProvider.boot()`. Verified working in playground.
- **Open**: the rename created an inconsistency between `cacheProvider(config)` (function call) and `AppServiceProvider` (class reference) in the same array. This plan resolves it by killing the factory pattern entirely.

---

## Why combine

The factory rename + auto-discovery + class refactor are three cuts through the same surface (`packages/*/src/index.ts`, package metadata, playground bootstrap, scaffolder). Doing them as one cut:

- **Touches each package once**, not three times.
- **Auto-discovery only has to know one shape** (a class to instantiate), not "function to call which returns a class to instantiate."
- **Closure-config foot-gun dies before it has a chance to bake into auto-discovery's manifest schema.** If we ship auto-discovery on top of the current factory pattern, the manifest has to thread `config: "cache"` through every entry, the loader has to look up the config object and pass it to the factory, and the closure leaks process-wide state. None of that is needed with class-based providers.
- **Consistency complaint resolved.** Every entry in the providers array is a PascalCase class reference, including auto-discovered ones.

---

## The new provider shape

Each package's `index.ts` exports a real, named PascalCase class:

```ts
// packages/cache/src/index.ts
import { ServiceProvider, config } from '@rudderjs/core'
import { CacheRegistry, MemoryAdapter } from './cache-registry.js'
import type { CacheConfig } from './types.js'

export { Cache } from './cache.js'  // facade — unchanged

export class CacheProvider extends ServiceProvider {
  register(): void {
    // No-op or container bindings that don't need config
  }

  async boot(): Promise<void> {
    const cfg = config<CacheConfig>('cache')
    const registry = new CacheRegistry()
    if (cfg.stores.memory) registry.register('memory', new MemoryAdapter())
    // ... rest of the current factory body
    this.app.instance('cache', registry)
  }
}
```

Key differences from today's factory:

| Today (`cacheProvider(configs.cache)`) | New (`CacheProvider`) |
|---|---|
| Factory function captures config in closure | `boot()` reads config via `config('cache')` |
| Returns an anonymous subclass | The exported class IS the provider |
| Each call returns a *different* class | Same class every time |
| Test instantiates: `new (cacheProvider(c))(app)` | Test instantiates: `new CacheProvider(app)` |
| `package.json` metadata: `"provider": "cacheProvider"` | `"provider": "CacheProvider"` |

The `config()` helper is already in `@rudderjs/core/config.ts`, already augmentable for typed access (`config<CacheConfig>('cache')`), and already used by user code. Providers using it is just internal code joining the same path as user code.

### Consumer view

`bootstrap/providers.ts` after this plan ships:

```ts
import { defaultProviders } from '@rudderjs/core'
import { AppServiceProvider } from '../app/Providers/AppServiceProvider.js'

export default [
  ...defaultProviders(),
  AppServiceProvider,
]
```

Or with overrides:

```ts
export default [
  ...defaultProviders({ skip: ['@rudderjs/horizon'] }),
  AppServiceProvider,
  CustomProvider,
  events({ [UserRegistered.name]: [SendWelcomeEmailListener] }),
]
```

Everything is a PascalCase class reference. `events(...)` stays as a function because it's a parameterised one-off (event-listener map), not a config-driven service. (See "Edge cases" below.)

---

## Auto-discovery infrastructure

### `package.json` metadata

```json
{
  "name": "@rudderjs/cache",
  "rudderjs": {
    "provider": "CacheProvider",
    "stage": "infrastructure",
    "depends": ["@rudderjs/log"]
  }
}
```

Fields:

| Field | Required | Type | Purpose |
|---|---|---|---|
| `provider` | Yes | string | Named PascalCase class export from the package's main entry |
| `stage` | Yes | enum | Boot stage (foundation / infrastructure / feature / monitoring) |
| `depends` | No | string[] | Package names that must boot first |
| `optional` | No | boolean | Skip without error if peer is missing (default: false) |

**No `config` field** — providers read their own config via `config('key')` in `boot()`. The framework doesn't need to thread it through. Big simplification vs. the previous plan.

### Manifest

Generated by `pnpm rudder providers:discover`, written to `bootstrap/cache/providers.json` (gitignored). Already sorted in boot order:

```json
{
  "version": 2,
  "generated": "2026-04-11T...",
  "providers": [
    { "package": "@rudderjs/log",         "provider": "LogProvider",         "stage": "foundation",     "depends": [] },
    { "package": "@rudderjs/orm-prisma",  "provider": "DatabaseProvider",    "stage": "infrastructure", "depends": [] },
    { "package": "@rudderjs/session",     "provider": "SessionProvider",     "stage": "infrastructure", "depends": [] },
    { "package": "@rudderjs/hash",        "provider": "HashProvider",        "stage": "infrastructure", "depends": [] },
    { "package": "@rudderjs/cache",       "provider": "CacheProvider",       "stage": "infrastructure", "depends": ["@rudderjs/log"] },
    { "package": "@rudderjs/auth",        "provider": "AuthProvider",        "stage": "infrastructure", "depends": ["@rudderjs/session", "@rudderjs/hash"] }
  ]
}
```

Manifest version is **2** to make it obvious this is the post-rename, post-class-refactor format. Version 1 (the old plan) would not have been compatible.

### Built-in registry — minimal, not exhaustive

`@rudderjs/core` ships a small fallback registry covering only the foundation + infrastructure providers that are *almost certainly* installed in any RudderJS app (`log`, `database`, `session`, `hash`, `cache`, `auth`). Everything else flows through the `package.json` discover path.

```ts
// packages/core/src/provider-registry.ts
export const BUILTIN_REGISTRY: ProviderEntry[] = [
  { package: '@rudderjs/log',        provider: 'LogProvider',      stage: 'foundation' },
  { package: '@rudderjs/orm-prisma', provider: 'DatabaseProvider', stage: 'infrastructure', optional: true },
  { package: '@rudderjs/session',    provider: 'SessionProvider',  stage: 'infrastructure', optional: true },
  { package: '@rudderjs/hash',       provider: 'HashProvider',     stage: 'infrastructure', optional: true },
  { package: '@rudderjs/cache',      provider: 'CacheProvider',    stage: 'infrastructure', optional: true },
  { package: '@rudderjs/auth',       provider: 'AuthProvider',     stage: 'infrastructure',
    depends: ['@rudderjs/session', '@rudderjs/hash'], optional: true },
]
```

Why minimal: an exhaustive registry duplicates `package.json` metadata, gets stale when packages are added, and forces every framework-package change to also touch core. The minimal version exists only so the framework can boot in a *fresh dev clone* before the user has run `providers:discover` once. Real apps run discover at install time and use the manifest.

### Runtime loader — synchronous, not async

```ts
// packages/core/src/default-providers.ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { BUILTIN_REGISTRY } from './provider-registry.js'
import { sortByStageAndDepends } from './provider-sort.js'
import { resolveOptionalPeer } from '@rudderjs/support'

export interface DefaultProvidersOptions {
  skip?: string[]
}

export function defaultProviders(options: DefaultProvidersOptions = {}): ProviderClass[] {
  const skip = new Set(options.skip ?? [])
  let entries: ProviderEntry[]

  // 1. Try the build-time manifest first
  try {
    const manifestPath = path.join(process.cwd(), 'bootstrap/cache/providers.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    entries = manifest.providers
  } catch {
    // 2. Fall back to the built-in minimal registry, sort it ourselves
    entries = sortByStageAndDepends(BUILTIN_REGISTRY)
  }

  // 3. Filter installed + skipped, then resolve each class
  const providers: ProviderClass[] = []
  for (const entry of entries) {
    if (skip.has(entry.package)) continue
    let mod: Record<string, unknown>
    try {
      mod = resolveOptionalPeer(entry.package)
    } catch {
      if (!entry.optional) {
        console.warn(`[RudderJS] ${entry.package} listed in manifest but not installed. Run \`rudder providers:discover\`.`)
      }
      continue
    }
    const ProviderClass = mod[entry.provider]
    if (typeof ProviderClass !== 'function') {
      throw new Error(`[RudderJS] ${entry.package} declared provider "${entry.provider}" but no such class is exported.`)
    }
    providers.push(ProviderClass as ProviderClass)
  }

  return providers
}
```

**Why sync**: `bootstrap/providers.ts` is a sync default export today. Forcing it to async (top-level await) breaks every existing app and adds per-cold-start latency in Vike SSR workers. `readFileSync` runs once at process boot, on a small JSON file — that's fine. The previous plan's `await defaultProviders(...)` was a foot-gun.

**Why no `add` field**: the user controls the order at the call site by spreading `defaultProviders()` and adding their own entries directly:

```ts
export default [
  ...defaultProviders(),
  AppServiceProvider,        // user provider
]
```

vs. the old plan's `defaultProviders(configs, { add: [AppServiceProvider] })`. The spread form is shorter, more idiomatic, and lets users add at any position (before/after/middle).

### Multi-driver resolution (config-driven from day one)

Two packages (`@rudderjs/orm-prisma`, `@rudderjs/orm-drizzle`) both export a `DatabaseProvider`. If both are installed, the framework reads `config('database.driver')` to pick the active one. Falls back to "first installed wins" only when the config key is unset.

```ts
// Inside defaultProviders()
const drivers = entries.filter(e => e.package.startsWith('@rudderjs/orm-'))
if (drivers.length > 1) {
  const chosen = config<string>('database.driver')
  const winner = chosen
    ? drivers.find(d => d.package.includes(chosen))
    : drivers[0]
  if (!winner) throw new Error(`[RudderJS] Multiple ORM drivers installed; set config('database.driver').`)
  // Filter out the losers
  entries = entries.filter(e => !drivers.includes(e) || e === winner)
}
```

Same pattern reusable for queue adapters (`bullmq` vs `inngest`) and broadcast drivers when those need it.

### Discover command

```ts
// packages/cli/src/commands/providers-discover.ts
import { Command } from '@rudderjs/rudder'
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'

export class ProvidersDiscoverCommand extends Command {
  static signature = 'providers:discover'
  static description = 'Scan node_modules for RudderJS packages and write the provider manifest'

  async handle(): Promise<void> {
    const cwd = process.cwd()
    const nodeModules = path.join(cwd, 'node_modules')
    const entries: ProviderEntry[] = []

    for (const scope of readdirSync(nodeModules)) {
      if (!scope.startsWith('@')) continue
      for (const pkg of readdirSync(path.join(nodeModules, scope))) {
        const pkgJsonPath = path.join(nodeModules, scope, pkg, 'package.json')
        try {
          const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
          if (pkgJson.rudderjs) {
            entries.push({ package: pkgJson.name, ...pkgJson.rudderjs })
          }
        } catch { /* skip unreadable */ }
      }
    }

    const sorted = sortByStageAndDepends(entries)
    const manifest = { version: 2, generated: new Date().toISOString(), providers: sorted }
    const cacheDir = path.join(cwd, 'bootstrap/cache')
    mkdirSync(cacheDir, { recursive: true })
    writeFileSync(path.join(cacheDir, 'providers.json'), JSON.stringify(manifest, null, 2))

    this.info(`✓ Discovered ${sorted.length} provider(s)`)
    for (const e of sorted) this.line(`  ${e.package} → ${e.provider} (${e.stage})`)
  }
}
```

### Topological sort (unchanged from previous plan)

The stage + topo-sort design is good. Carry it forward as-is, just point at PascalCase entries instead of camelCase.

---

## Edge cases

### Providers with no config (`notifications()`, `boost()`, `scheduler()`, `context()`)

After the class refactor, these have nothing to read. `boot()` is a plain method body. They become *easier*, not harder — no factory call site at all.

### `events()` — parameterised one-off

`events({ [UserRegistered.name]: [SendWelcomeEmailListener] })` takes a listener-map, not a config key. It's not really a service provider in the traditional sense; it's a per-app event subscription registration.

**Two options**:

1. **Keep it as a function** that returns a class. Lives outside auto-discovery. User adds it manually after `defaultProviders()`. Same as today minus the rename.
2. **Convert to a class with a static `subscribe()` method.** `EventsProvider.subscribe({ [UserRegistered.name]: [...] })` returns a configured subclass. Auto-discoverable as the base class with no listeners; user code subscribes by replacing it.

Recommendation: **option 1**. `events()` is conceptually different from infrastructure providers — it's user code wiring listeners to user events. Keep it as a function; don't pretend it fits the same shape as `CacheProvider`.

### `Application.configure({ providers })`

Currently takes `(new (app: Application) => ServiceProvider)[]`. After the class refactor, it accepts the same shape — the spread of `defaultProviders()` returns an array of class references, exactly what the configure chain wants. **No change to the configure API.**

### Vendoring / publishes (`this.publishes(...)` in current providers)

Several providers register publishable assets in `register()` — auth views, schema files, etc. Those calls are unchanged; they're class methods now instead of factory body. No migration cost.

---

## Phases

### Phase A — Class refactor (~1.5 days)

For each of the 23 packages renamed earlier today:

1. Replace `export function <name>Provider(config) { return class extends ServiceProvider { ... } }` with `export class <PascalName>Provider extends ServiceProvider { ... }`.
2. Move config reads from the closure into `boot()` via `config<TConfig>('key')`.
3. Update tests: replace `new (cacheProvider(c))(app)` with `new CacheProvider(app)` after registering config.
4. Update package's docstring example.

After Phase A, the providers array still works manually:

```ts
import { CacheProvider } from '@rudderjs/cache'
import { AuthProvider } from '@rudderjs/auth'

export default [LogProvider, DatabaseProvider, CacheProvider, AuthProvider, ..., AppServiceProvider]
```

This is already the consistency win. Auto-discovery is a Phase B optimization on top.

**Verify**: `pnpm build` clean, `playground` boots, `/`, `/api/me`, `/api/auth/sign-in/email`, `/api/health` all return 200.

### Phase B — Auto-discovery infrastructure (~1 day)

1. `packages/core/src/provider-registry.ts` — minimal `BUILTIN_REGISTRY` (6 entries).
2. `packages/core/src/provider-sort.ts` — stage order + topo sort. Carry over from previous plan.
3. `packages/core/src/default-providers.ts` — sync loader (manifest first, registry fallback).
4. `packages/core/src/index.ts` — re-export `defaultProviders` and `BUILTIN_REGISTRY`.
5. `packages/cli/src/commands/providers-discover.ts` — the discover command.
6. Tests: `provider-sort.test.ts`, `default-providers.test.ts` (manifest load, registry fallback, multi-driver resolution, skip option).

**Verify**: in playground, manually delete `bootstrap/cache/providers.json` (if it exists), run `pnpm rudder providers:discover`, inspect the manifest, then boot.

### Phase C — Add `rudderjs` field to every package (~2 hours)

For each of the ~25 packages with a `*Provider` class, add the `rudderjs` field to `package.json`:

```json
{
  "rudderjs": {
    "provider": "CacheProvider",
    "stage": "infrastructure",
    "depends": ["@rudderjs/log"]
  }
}
```

Pure mechanical edit. Use the table from the old plan (Phase 3) for stage assignments, validated against the topo-sort output.

### Phase D — Update playground + scaffolder + sibling repos

1. `playground/bootstrap/providers.ts` — switch to `[...defaultProviders(), AppServiceProvider]`.
2. `playground-multi/bootstrap/providers.ts` — same.
3. `pilotiq/playground` and `pilotiq-pro/playground` — same. **Cross-repo coupling — flag clearly in the commit message.**
4. `playground/.gitignore` — add `bootstrap/cache/providers.json`.
5. `playground/bootstrap/cache/.gitignore` — `*` to ignore everything in the cache dir.
6. `create-rudder-app/src/templates.ts` — generated `bootstrap/providers.ts` uses `defaultProviders()`. Add `bootstrap/cache/.gitignore` to scaffold output. Add a one-liner to the post-install instructions: "Run `pnpm rudder providers:discover` after install."
7. Run `pnpm rudder providers:discover` in the playground, commit the (gitignored) result for verification only.

**Verify**: boot the rudderjs playground end-to-end. Same smoke tests as Phase A.

### Phase E — Documentation

1. `CLAUDE.md` — common pitfalls section: "After installing a new framework package, run `pnpm rudder providers:discover`." Update the auth-helper section with the new `CacheProvider` etc. example.
2. `docs/claude/packages.md` — note the `rudderjs` field requirement for new packages.
3. `README.md` — Quick Start example uses `defaultProviders()`.
4. `docs/guide/auto-discovery.md` — third-party-author guide. ~80 lines: how to add the field, how stages work, how depends are sorted, what error messages mean.
5. Per-package README updates — already use the new factory names from today's session; switch to class names.

---

## Migration story

### For existing apps

**Phase A is breaking** for code that imports the factory function — `cacheProvider(configs.cache)` no longer exists. The fix is two lines per provider in `bootstrap/providers.ts`:

```ts
// Before
import { cacheProvider } from '@rudderjs/cache'
providers: [cacheProvider(configs.cache), ...]

// After
import { CacheProvider } from '@rudderjs/cache'
providers: [CacheProvider, ...]
```

The cache config reaches the provider via `config('cache')` which already reads from `bootstrap/app.ts`'s `Application.configure({ config: configs })` call. **No config wiring changes required** — the keys in `configs/index.ts` already match what providers expect.

After migrating to class references, users can optionally simplify further with `defaultProviders()`:

```ts
export default [...defaultProviders(), AppServiceProvider]
```

### For third-party package authors

1. Convert their factory function to a `*Provider` class.
2. Add the `rudderjs` field to their `package.json`.
3. Ship.

Users install the package, run `pnpm rudder providers:discover`, and the new provider auto-registers.

---

## Risks

| Risk | Mitigation |
|---|---|
| **Closure-config behaviour change** — current factories build a fresh class per call, capturing config; classes are singletons keyed by import. | Singletons are fine because `config()` is read at boot time inside `boot()`, not at class definition time. The class instance is per-app, the class itself is per-process. No state sharing. |
| **Tests instantiate via `new (cacheProvider(c))(app)` today** | Phase A includes test updates to `new CacheProvider(app)` after registering config in a test fixture. Non-trivial: ~10 test files, each needs a small refactor to set up `Application.configure({ config: testConfigs })` before instantiating. |
| **Multi-driver collision** | Config-driven resolution from day one (see "Multi-driver resolution" above). |
| **Missing manifest in fresh dev clones** | Built-in minimal registry covers the must-haves so the playground boots without ever running discover. |
| **Stale manifest after package install** | Discover command is idempotent and fast. CLAUDE.md gets a note. Optional: postinstall hook in scaffolder template. |
| **Cross-repo drift** (pilotiq, pilotiq-pro) | Phase D updates them in the same sitting. Commit message explicitly notes the coupling. |
| **Config not yet bound when provider boots** | `Application.configure({ config: configs })` runs before any provider's `boot()`. Already ordered correctly today; this plan doesn't change the bootstrap sequence. |
| **`AuthServiceProvider.boot()` global middleware install** (shipped this session) | Verify in Phase A that `router.use(AuthMiddleware())` still fires when the provider is loaded as a class. Should work — `boot()` body is unchanged. |

---

## Effort estimate

| Phase | Effort | Complexity |
|---|---|---|
| A. Class refactor (23 packages + tests) | ~1.5 days | Medium (tests have config-fixture refactor) |
| B. Auto-discovery infra (loader, registry, sort, command) | ~1 day | Medium |
| C. Add `rudderjs` field to ~25 `package.json` files | ~2 hours | Low (mechanical) |
| D. Update playground, scaffolder, sibling repos | ~3 hours | Low |
| E. Documentation | ~3 hours | Low |

**Total**: ~3 days of focused work. ~25% bigger than the previous auto-discovery plan's 1–2 days, in exchange for permanently killing the closure-config foot-gun and resolving the consistency complaint.

---

## Required helpers (must ship with the refactor, not deferred)

These two are **mitigations for the behavior changes** noted in the "Risks" section. They are not nice-to-haves — they ship as part of Phase A/B or the refactor introduces friction the user will feel daily.

### 1. `withTestConfig()` — test fixture helper

Today's provider tests are self-contained because the factory takes config directly:

```ts
const Provider = cacheProvider({ default: 'memory', stores: { memory: { driver: 'memory' } } })
const instance = new Provider(testApp)
```

After the class refactor, `CacheProvider.boot()` reads from the global config map via `config('cache')`. Tests must populate that map before instantiating, AND clean it up after, or state leaks across tests.

**Without a helper**, every test file repeats:

```ts
import { setConfig, clearConfig } from '@rudderjs/support'
setConfig({ cache: { ... } })
try {
  const instance = new CacheProvider(testApp)
  await instance.boot()
  // assertions
} finally {
  clearConfig()
}
```

**With the helper**, tests are one block with automatic cleanup:

```ts
import { withTestConfig } from '@rudderjs/testing'

await withTestConfig({ cache: { default: 'memory', stores: { memory: { driver: 'memory' } } } }, async () => {
  const instance = new CacheProvider(testApp)
  await instance.boot()
  // assertions
})
// Config map is restored on return, even if the callback throws
```

**Implementation** (~20 LOC in `@rudderjs/testing`):

```ts
import { config as readConfig, setConfigMap } from '@rudderjs/support'

export async function withTestConfig<T>(
  testConfig: Record<string, unknown>,
  fn: () => Promise<T> | T,
): Promise<T> {
  const snapshot = snapshotConfig()  // capture current map
  try {
    setConfigMap(testConfig)
    return await fn()
  } finally {
    setConfigMap(snapshot)
  }
}
```

May need a small assist from `@rudderjs/support` to expose `snapshotConfig()` / `setConfigMap()` if they don't exist yet — both are tiny additions to the existing config module.

### 2. Dev-mode boot log

When auto-discovery silently skips a missing package, the user has no visible signal until something tries to use the missing service. The dev-mode boot log mitigates this by printing the loaded providers right after boot:

```
[RudderJS] booted 18 providers:
  foundation     → @rudderjs/log
  infrastructure → @rudderjs/orm-prisma, @rudderjs/session, @rudderjs/hash, @rudderjs/cache, @rudderjs/auth
  feature        → @rudderjs/queue, @rudderjs/mail, @rudderjs/storage, @rudderjs/schedule, @rudderjs/notification, @rudderjs/broadcast, @rudderjs/live, @rudderjs/ai, @rudderjs/boost, @rudderjs/localization
  monitoring     → @rudderjs/telescope, @rudderjs/pulse, @rudderjs/horizon
[RudderJS] ready
```

If `@rudderjs/cache` is missing from the manifest (e.g. someone forgot to re-run `providers:discover` after install), it's visible at every boot instead of silently failing later.

**Implementation** (~20 LOC inside `defaultProviders()`):

- Group loaded entries by stage.
- For each stage with at least one entry, print one line: `  <stage> → <comma-separated package names>`.
- Wrap in `if (app.isDevelopment())` so it never fires in production.
- Print right before the existing `[RudderJS] ready` line.

**Production**: stays silent. Same as today.

---

## Acceptance criteria

### Class refactor (Phase A)

- [ ] All 23 renamed packages now export a `*Provider` PascalCase class (no factory function).
- [ ] `pnpm build` clean from root after Phase A.
- [ ] All existing package tests pass after Phase A.
- [ ] `withTestConfig()` helper shipped in `@rudderjs/testing`, used by every provider test that previously called the factory directly.
- [ ] No test file leaks config state across tests (verified by running test files in random order).
- [ ] `AuthServiceProvider.boot()` global middleware install still works (smoke test `/api/me` returns `{user: null}` with no session, valid user with a session).
- [ ] Provider subclassing works: write a `CustomCacheProvider extends CacheProvider` that overrides `boot()` and confirm both `super.boot()` and the override run.

### Auto-discovery infra (Phase B)

- [ ] `defaultProviders()` is exported from `@rudderjs/core` and returns a sorted array.
- [ ] `pnpm rudder providers:discover` writes a valid manifest in playground.
- [ ] Boot without manifest (delete it, restart) — falls back to built-in registry, playground still boots.
- [ ] `defaultProviders({ skip: ['@rudderjs/horizon'] })` skips correctly.
- [ ] Multi-driver ORM scenario picks the right driver from `config('database.driver')`.
- [ ] Topo sort throws on circular deps with a clear message.
- [ ] **Dev-mode boot log prints the loaded provider list grouped by stage**, only when `app.isDevelopment()` is true.
- [ ] Production boot log is unchanged (no provider list printed).
- [ ] Stale manifest scenario: package in manifest but uninstalled → loader logs a warning, skips gracefully, framework still boots, and the missing package is visibly absent from the dev boot log.

### Consumers (Phases C/D/E)

- [ ] All ~25 packages with a provider have a `rudderjs` field in their `package.json`.
- [ ] Manifest is gitignored.
- [ ] `playground/bootstrap/providers.ts` is < 15 lines.
- [ ] `events({...})` still works as a function (kept outside auto-discovery).
- [ ] Scaffolder generates a working app with `defaultProviders()`.
- [ ] `pilotiq/playground` and `pilotiq-pro/playground` updated and boot.
- [ ] CLAUDE.md, README, and `docs/guide/auto-discovery.md` all updated.

---

## Out of scope (separate plans)

- **Lowercase helpers** (`cache()`, `mail()`, `log()`) — separate plan, ship per-package as demand appears. The lowercase namespace is already free thanks to today's rename.
- **Provider deferral** — the existing `provides()` mechanism in core handles this. Auto-discovery doesn't change it.
- **Vite plugin for postinstall discover** — open question 1 from the previous plan. Defer until we see whether manual + scaffolder docs are enough friction.
- **Vendor publishing automation** — `this.publishes(...)` already works in providers. Auto-publishing on install is its own initiative.
- **`pnpm rudder providers:list` health check** — nice-to-have for debugging, not required for the main feature.

---

## Decisions captured

In case future-me re-litigates these:

- **Sync loader, not async.** `readFileSync` on a small JSON file at boot is fine. Top-level await breaks backward compatibility and adds Vike SSR latency.
- **Minimal registry, not exhaustive.** Six foundation/infrastructure entries. Real apps get the full picture from `package.json` discover; the registry exists only for cold dev clones.
- **No `add` field on `defaultProviders()`.** Users spread the result and add their own entries directly. Shorter, more idiomatic.
- **No `config` field in the manifest.** Providers read their own config via `config('key')`. Removes a layer of indirection from the previous plan.
- **Multi-driver via config from day one**, not "detect-and-error." Config-driven matches Laravel's behaviour and doesn't require users to uninstall things to make boot work.
- **`events()` stays as a function.** Conceptually a per-app subscription registration, not an infrastructure provider. Doesn't fit the class shape and shouldn't be forced into it.
- **`AppServiceProvider` stays exactly as it is.** It was the original PascalCase class; everything else now matches it.
