# Directory Structure

A scaffolded RudderJS app puts each concern in a predictable place — bootstrap, config, app code, routes, schema — with a small Vite/Vike layer for the frontend.

```
my-app/
├── bootstrap/
│   ├── app.ts              # Application.configure() — entry point
│   └── providers.ts        # Ordered service providers
├── config/                 # Typed config objects (read .env via Env)
├── app/
│   ├── Models/             # ORM models — extend Model
│   ├── Services/           # Business logic — bound in providers
│   ├── Providers/          # Service provider classes
│   ├── Middleware/         # Custom middleware
│   ├── Jobs/               # Queue jobs — extend Job
│   ├── Notifications/      # Notification classes
│   ├── Views/              # Controller-returned views (`view('id', props)`)
│   └── Http/Requests/      # Form-request validators
├── routes/
│   ├── api.ts              # API routes — router.get/post/all()
│   ├── web.ts              # Web routes — controller views, redirects, guards
│   └── console.ts          # Rudder commands — rudder.command()
├── pages/                  # Vike file-based SSR pages (optional)
├── prisma/schema/          # Multi-file Prisma schema
├── src/index.css           # Stylesheet — only when Tailwind is selected
├── +server.ts              # Wires Vike to bootstrap/app.ts
├── vite.config.ts
├── tsconfig.json
└── .env
```

## Key directories

### `bootstrap/`

The wiring layer. `app.ts` configures the server adapter, lists providers, and declares route loaders. Do not put business logic here.

`providers.ts` exports an ordered array of provider classes. The order matters: providers boot in array order, so anything depending on the database must come after the database provider. See [Service Providers](/guide/service-providers).

### `config/`

Named, typed configuration objects. Each file is a plain object exported by default:

```ts
// config/server.ts
import { Env } from '@rudderjs/support'

export default {
  port: Env.getNumber('PORT', 3000),
  cors: { origin: Env.get('CORS_ORIGIN', '*') },
}
```

`config/index.ts` collects them all into one default export so `bootstrap/app.ts` can pull a single `configs` object.

### `app/`

Your application code, organized by concern.

| Folder | Contains |
|---|---|
| `Models/` | ORM model classes — one per file, extend `Model` |
| `Services/` | Pure business logic — injected via the DI container |
| `Providers/` | Service providers wiring up dependencies |
| `Middleware/` | Custom middleware classes |
| `Jobs/` | Queue jobs extending `Job` |
| `Notifications/` | Notification classes |
| `Views/` | Controller-returned views — see [Frontend](/guide/frontend) |
| `Http/Requests/` | Form-request validation classes |

PascalCase filenames in `Views/` map to kebab-case ids: `AdminUsers.tsx` → `admin-users`. Nested directories use dotted ids: `Auth/Login.tsx` → `auth.login`.

### `routes/`

Side-effect files — they run for their side effects (registering routes or commands) and export nothing.

- **`api.ts`** — API routes via `router.get/post/all()`. Tagged `'api'`, stateless by default.
- **`web.ts`** — Controller-view routes, redirects, server-side guards. Tagged `'web'`, gets session + auth middleware automatically.
- **`console.ts`** — Rudder commands via `rudder.command()`.

These files are loaded lazily by the framework. `web.ts` and `api.ts` are loaded on the first HTTP request; `console.ts` only when you run `pnpm rudder`.

### `pages/`

Vike file-based SSR pages. The file extension matches your primary framework — `.tsx` for React or Solid, `.vue` for Vue. Each page directory has a `+config.ts` that extends the appropriate `vike-*` config.

This directory is **optional**. Pure API apps omit it entirely and remove Vike from `vite.config.ts`. See [Frontend](/guide/frontend) for the full Vike + controller-view model.

### `prisma/schema/`

Multi-file Prisma schema. Each `@rudderjs/*` package that ships models (e.g. `@rudderjs/auth`) publishes its own `<name>.prisma` file via `pnpm rudder vendor:publish`. Your app-specific models live in `app.prisma`. The `datasource` and `generator` blocks live in `base.prisma`.

Run `pnpm exec prisma generate` after any schema change.

## The entry point

`bootstrap/app.ts` is both the bootstrap file and the HTTP entry point. `import 'reflect-metadata'` must be the first line — it enables the entire DI container.

`+server.ts` at the project root wires Vike to the RudderJS instance:

```ts
// +server.ts
import type { Server } from 'vike/types'
import app from './bootstrap/app.js'

export default { fetch: app.fetch } satisfies Server
```

No separate `src/index.ts` is needed — Vike consumes the RudderJS instance directly.

## Modules (optional)

For larger apps, organize features into self-contained modules under `app/Modules/`:

```
app/
└── Modules/
    └── Blog/
        ├── Blog.prisma             # merged by module:publish
        ├── BlogService.ts
        └── BlogServiceProvider.ts
```

Generate one with `pnpm rudder make:module Blog`, then `pnpm rudder module:publish` merges the module's Prisma shard into the main schema. Modules are an organizational convention — the framework treats `app/Modules/Blog/` no differently from `app/Services/`. The benefit is keeping a feature's models, services, providers, and routes co-located.
