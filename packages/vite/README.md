# @boostkit/vite

Vite plugin for BoostKit. Registers Vike (SSR), sets the `@/` path alias, externalizes server-only packages from the client bundle, and wires up WebSocket upgrade handling for `@boostkit/broadcast` and `@boostkit/live`.

```bash
pnpm add @boostkit/vite
```

---

## Usage

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import boostkit from '@boostkit/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [boostkit(), tailwindcss(), react()],
})
```

That's it. `boostkit()` handles:

- **Vike registration** — auto-detects and registers `vike/plugin` for SSR + file-based routing
- **Path alias** — `@/` resolves to `src/` in the project root
- **SSR externals** — server-only packages (database drivers, Redis, queue adapters) are externalized from the client bundle
- **SSR no-externals** — `@boostkit/server-hono` is forced non-external so Vite processes virtual module imports
- **WebSocket upgrade** — intercepts `http.createServer` to attach the `__boostkit_ws_upgrade__` handler for `@boostkit/broadcast` and `@boostkit/live`
- **Sourcemap warnings** — suppresses noisy "missing source files" warnings for `@boostkit/*` packages
- **Build externals** — server-only packages are excluded from production builds

## What it produces

Three Vite plugins:

| Plugin | Purpose |
|--------|---------|
| `boostkit:ws` | WebSocket upgrade handler via `configureServer` |
| `boostkit:config` | SSR externals, path alias, warning suppression |
| *(vike plugins)* | SSR rendering, file-based routing (auto-registered) |

## SSR Externals

These packages are externalized from the SSR bundle (Node.js-only, not browser-compatible):

- `@boostkit/queue-inngest`, `@boostkit/queue-bullmq`, `@boostkit/orm-drizzle`
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

Add your UI framework plugin separately — `boostkit()` does not include one:

```ts
// React
import react from '@vitejs/plugin-react'
plugins: [boostkit(), react()]

// Vue
import vue from '@vitejs/plugin-vue'
plugins: [boostkit(), vue()]

// Solid
import solid from 'vite-plugin-solid'
plugins: [boostkit(), solid()]
```
