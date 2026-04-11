---
status: draft
created: 2026-04-11
---

# Plan: Controller-Returned Views (`view()` + `component()`)

## Overview

Bring Laravel's `return view(...)` ergonomics to RudderJS router handlers, on top of the existing Vike + Vite integration. Two complementary helpers:

1. **`view(id, props)`** — render an existing Vike page by id (the file-based page already in `pages/`), passing controller props as `pageProps`. This is the Inertia-style contract.
2. **`component(() => import('./Dashboard.tsx'), props)`** — render a colocated view file living *next to the controller* (e.g. `app/Views/Dashboard.tsx`), without needing a `pages/**/+Page.tsx` entry. This is the "killer" feature: Laravel-style view colocation for React/Vue/Solid.

Both return a `Response` that the router/server-hono pipeline can hand back directly. Both flow through Vike's existing SSR renderer, so hydration, layouts, data hooks, and the chosen UI framework (react/vue/solid via `vike-react`/`vike-vue`/`vike-solid`) all keep working unchanged.

---

## Why this matters

Today the playground has two disjoint worlds:

- **Vike pages** (`playground/pages/**`) — filesystem routing, SSR, hydration. Controllers can't target them with props.
- **Router handlers** (`routes/api.ts`) — return JSON or strings. No way to say "render page X with these props".

Laravel devs expect `return view('dashboard', { user })`. Inertia proved the pattern is also the cleanest way to ship SPA-grade React/Vue from a traditional controller mindset. RudderJS is positioned to ship *both* shapes on the same stack.

---

## Package layout

New package: **`@rudderjs/view`**

- Depends on: `@rudderjs/contracts`, `@rudderjs/router` (peer), `vike` (peer)
- Exports:
  - `view(id: string, props?: Record<string, unknown>): ViewResponse`
  - `component(loader: () => Promise<unknown>, props?: Record<string, unknown>): ViewResponse`
  - `ViewResponse` class (extends `Response`, carries a marker so server-hono can detect and resolve it via Vike)
- No runtime dependency on `@rudderjs/core` (same peer pattern as router)

Vite-side work lives in **`@rudderjs/vite`** (existing package): a new sub-plugin that discovers `app/Views/**/*.{tsx,vue,jsx}` and generates virtual Vike pages for them.

---

## Phase 1: `view()` — Vike page by id

### Contract

```ts
// routes/web.ts
import { view } from '@rudderjs/view'
import { User } from '@/app/Models/User.ts'

router.get('/dashboard', async () => {
  const users = await User.all()
  return view('dashboard', { users, title: 'Dashboard' })
})
```

Where `'dashboard'` resolves to `pages/dashboard/+Page.tsx` (the existing Vike page).

### How it works

1. `view(id, props)` returns a `ViewResponse` — a subclass of `Response` with a marker header `x-rudder-view: <id>` and the props serialized on an internal symbol.
2. The server-hono adapter inspects every router response. If it's a `ViewResponse`, it calls Vike's programmatic `renderPage({ urlOriginal: '/__view/' + id, pageContextInit: { pageProps: props, _rudderViewId: id } })` and returns the resulting HTML Response.
3. Vike finds the matching page (by id → URL mapping registered in the Vite plugin) and renders it with `pageProps` injected into `pageContext`.
4. `vike-react`/`vike-vue` already expose `pageContext.pageProps` to components — no UI-framework-specific code needed.

### Id-to-page resolution

Two options, pick the simpler one:

- **(a) Route alias table** — `@rudderjs/vite` scans `pages/**/+Page.*` at build time, derives ids (`pages/dashboard/+Page.tsx` → `'dashboard'`, `pages/users/show/+Page.tsx` → `'users.show'`), and emits a virtual module `virtual:rudder/view-manifest` that `@rudderjs/view` imports. `view(id)` maps `id` → Vike URL and calls `renderPage()`.
- **(b) URL passthrough** — `view('/dashboard', props)` just passes the URL directly. Simpler, no manifest, but loses Laravel's dot-notation feel.

Recommendation: **ship (b) first**, add (a) in a follow-up once real usage shows dot-notation is wanted.

### Middleware + auth

Because `view()` is returned from a router handler, all router middleware (auth, rate limit, form requests) runs *before* rendering — exactly like Laravel. This is the big win over raw Vike file routing, where per-page guards are awkward.

---

## Phase 2: `component()` — colocated view files

### Contract

```ts
// app/Http/Controllers/DashboardController.ts
import { component } from '@rudderjs/view'
import DashboardView from '../../Views/Dashboard.tsx'   // type-only; not imported at runtime

export class DashboardController {
  async index() {
    const users = await User.all()
    return component(() => import('../../Views/Dashboard.tsx'), { users })
  }
}
```

Or the lighter form for inline routes:

```ts
router.get('/dashboard', async () =>
  component(() => import('@/app/Views/Dashboard.tsx'), { users: await User.all() })
)
```

### The SSR hydration problem

You cannot pass a *JSX element* (`<Dashboard users={users} />`) because hydration on the client needs to import the *same module by id* to attach event handlers. A runtime-instantiated element has no id.

Solution: pass a **lazy import reference** (`() => import(...)`). The Vite plugin statically analyzes these call sites at build time, extracts the import path, and registers a virtual Vike page for each.

### Vite plugin work

New sub-plugin inside `@rudderjs/vite`: `controllerViewsPlugin()`.

**Dev mode:**

1. Scan `app/Views/**/*.{tsx,vue,jsx,svelte}` at startup.
2. For each file, generate a virtual Vike page at URL `/__view/<hash-of-path>`:
   - Virtual `+Page.tsx` that re-exports `default` from the real view file.
   - Virtual `+route.ts` with `export default '/__view/<hash>'`.
   - Inherits the root `pages/+config.ts` (so vike-react/vike-vue config applies).
3. Expose the path→hash map as `virtual:rudder/component-manifest`.
4. `component(loader, props)` uses a **Babel/SWC import-expression analyzer** (or a simpler regex fallback on `loader.toString()`) to resolve the import path → hash → URL, then calls `renderPage()` like `view()` does.

**Prod mode:**

- Same scan at build time, virtual pages emitted into the Vike build output.
- Manifest baked in; `component()` resolves via the manifest at request time.

**Alternative** (simpler but less magical): require an explicit id.

```ts
component('dashboard', { users })   // resolves to app/Views/Dashboard.tsx by convention
```

No AST analysis, no `loader.toString()`, no build-time import tracking. Convention over config: `app/Views/Dashboard.tsx` → id `'dashboard'`, `app/Views/Users/Show.tsx` → `'users.show'`.

**Recommendation:** ship the **string-id form first** (trivial, works identically to `view()`), add the lazy-import-reference form in Phase 3 once the plugin is battle-tested. This collapses Phase 1 and Phase 2 into essentially the same implementation with two directories (`pages/` and `app/Views/`).

### UI framework choice

Still a single choice per app, set at the Vike level (`vike-react` / `vike-vue` / `vike-solid`). The plugin generates virtual pages matching that framework's file extension:

- `vike-react` app → scans `*.tsx`, `*.jsx`
- `vike-vue` app → scans `*.vue`
- `vike-solid` app → scans `*.tsx`

Mixing frameworks in one app stays a Vike limitation, unchanged.

---

## Phase 3: Lazy-import form + DX polish

Only after Phase 1+2 ship and get real playground use:

- AST-based `component(() => import('...'), props)` form via `@rollup/pluginutils` + `es-module-lexer`.
- Dot-notation id manifest for `view()`.
- `view().with(key, value)` chainable helper (Laravel parity).
- `view().render()` for rendering to string (testing, email, SSG).
- Shared layout props via a `viewComposer` provider hook (Laravel's view composers).

---

## Playground changes

Add to `rudderjs/playground`:

1. `app/Views/Dashboard.tsx` — colocated view with `{ users }` prop.
2. `routes/api.ts` — new route demonstrating both forms:
   ```ts
   router.get('/dashboard',  () => view('dashboard', { users }))
   router.get('/dashboard2', () => component('dashboard', { users }))
   ```
3. Leave existing `pages/` routes intact so both patterns coexist for comparison.

---

## Open questions

1. **`view()` vs `component()` — do we need both?** If string-id `component()` is what ships, then `view()` is just an alias pointing at `pages/` instead of `app/Views/`. Could unify under one function with a config-level `viewRoots: ['pages', 'app/Views']` option.
2. **Props serialization** — Vike already JSON-serializes `pageProps` for the client. Date/BigInt/Map handling needs a note in docs (same as Inertia).
3. **Streaming SSR** — Vike supports it; `view()` should return a streaming Response when the page opts in. Defer to Phase 3.
4. **Error pages** — if the view id doesn't resolve, should `view()` throw `ViewNotFoundError` (caught by router → 500) or return a 404? Laravel throws.
5. **Type safety** — can we generate a `ViewId` union type from the manifest so `view('dashbard')` (typo) is a compile error? Yes, via codegen into `.rudder/types.d.ts`. Nice-to-have for Phase 3.

---

## Scope cut for v1

- Ship **string-id form only** (`view('id', props)` and/or `component('id', props)`).
- Unify under **one function** if the `viewRoots` config feels clean — else keep two names for Laravel muscle memory.
- No AST analysis, no dot-notation manifest, no codegen.
- One playground route end-to-end.
- Works on React first; Vue/Solid in a follow-up once React path is proven.

Estimated surface: ~300 LOC across `@rudderjs/view` + `@rudderjs/vite` plugin additions.
