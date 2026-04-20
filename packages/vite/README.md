# @rudderjs/vite

Vite plugin for RudderJS. Registers Vike (SSR), sets the `@/` path alias, externalizes server-only packages from the client bundle, and wires up WebSocket upgrade handling for `@rudderjs/broadcast` and `@rudderjs/live`.

```bash
pnpm add @rudderjs/vite
```

---

## Usage

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import rudderjs from '@rudderjs/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [rudderjs(), tailwindcss(), react()],
})
```

That's it. `rudderjs()` handles:

- **Vike registration** — auto-detects and registers `vike/plugin` for SSR + file-based routing
- **View scanner** — scans `app/Views/**` and generates virtual Vike pages under `pages/__view/` for `@rudderjs/view`
- **HMR route reload** — watches `routes/`, `bootstrap/`, and `app/` so edits there invalidate the SSR module graph without restarting the dev server
- **Path alias** — `@/` and `App/` resolve to the app directory
- **SSR externals** — server-only packages (database drivers, Redis, queue adapters) are externalized from the client bundle
- **SSR no-externals** — `@rudderjs/server-hono` is forced non-external so Vite processes virtual module imports
- **WebSocket upgrade** — intercepts `http.createServer` to attach the `__rudderjs_ws_upgrade__` handler for `@rudderjs/broadcast` and `@rudderjs/live`
- **`x-real-ip` injection** — dev-only, populates the header from the Node socket so `req.ip` works through Vike's universal middleware
- **Sourcemap warnings** — suppresses noisy "missing source files" warnings for `@rudderjs/*` packages
- **Build externals** — server-only packages are excluded from production builds

## What it produces

Five Vite plugins:

| Plugin | Purpose |
|--------|---------|
| `rudderjs:config` | SSR externals, path alias, warning suppression |
| `rudderjs:ws` | WebSocket upgrade handler via `configureServer` |
| `rudderjs:ip` | Dev-only `x-real-ip` injection from Node socket |
| `rudderjs:routes` | HMR watcher for `routes/` + `bootstrap/` + `app/`; invalidates SSR modules + clears `__rudderjs_instance__` and `__rudderjs_app__` globals so the next request re-bootstraps cleanly |
| `rudderjs:views` | View scanner — generates virtual Vike pages from `app/Views/**` |
| *(vike plugins)* | SSR rendering, file-based routing (auto-registered) |

### HMR notes

- `rudderjs:routes` never calls `server.restart()` — doing so closes Vite's module runner and breaks in-flight SSR requests. Module invalidation + globalThis cleanup is enough to force a full re-bootstrap on the next request.
- Changes under `app/` require the full cleanup (not just invalidation) because models, controllers, and resources are captured in provider closures during boot.

## SSR Externals

These packages are externalized from the SSR bundle (Node.js-only, not browser-compatible):

- `@rudderjs/queue-inngest`, `@rudderjs/queue-bullmq`, `@rudderjs/orm-drizzle`
- Database drivers: `pg`, `mysql2`, `better-sqlite3`, `@prisma/adapter-*`, `@libsql/client`
- Redis: `ioredis`
- CLI prompts: `@clack/core`, `@clack/prompts`

## Peer Dependencies

| Package | Required | Notes |
|---------|----------|-------|
| `vite` | Yes | Build tool |
| `vike` | Yes | SSR framework |
| `@vitejs/plugin-react` | Optional | For React projects |
| `@vitejs/plugin-vue` | Optional | For Vue projects |
| `vike-solid` | Optional | For Solid projects |

## Framework Plugins

Add your UI framework plugin separately — `rudderjs()` does not include one:

```ts
// React
import react from '@vitejs/plugin-react'
plugins: [rudderjs(), react()]

// Vue
import vue from '@vitejs/plugin-vue'
plugins: [rudderjs(), vue()]

// Solid
import solid from 'vite-plugin-solid'
plugins: [rudderjs(), solid()]
```
