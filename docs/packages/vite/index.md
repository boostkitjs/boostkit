# @boostkit/vite

Vite plugin that wires up [Vike](https://vike.dev), the `@/` path alias, and SSR externals — all from a single call.

## Installation

```bash
pnpm add @boostkit/vite
```

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

`boostkit()` is placed first so Vike initialises before the UI framework plugins run.

## What it does

| Feature | Details |
|---|---|
| **Vike** | Registers `vike/plugin` from the app's own `node_modules` — guaranteed single instance, no double-registration |
| **`@/` alias** | Resolves `@/` to `<root>/src` in both client and SSR builds |
| **SSR externals** | Keeps optional BoostKit peers and Node-only drivers out of the SSR bundle — see list below |

## UI frameworks

`boostkit()` does **not** include a UI framework plugin — add the one you need alongside it:

```ts
// React
import react from '@vitejs/plugin-react'
plugins: [boostkit(), react()]

// Vue
import vue from '@vitejs/plugin-vue'
plugins: [boostkit(), vue()]

// Solid
import solid from 'vike-solid/vite'
plugins: [boostkit(), solid()]

// Multiple frameworks (scope with include / exclude)
plugins: [
  boostkit(),
  react({ exclude: ['**/pages/solid*/**'] }),
  solid({ include: ['**/pages/solid*/**'] }),
  vue(),
]
```

## SSR externals list

The following packages are automatically excluded from the SSR bundle (Node.js-only, must not be shipped to the browser):

| Category | Packages |
|---|---|
| BoostKit queue adapters | `@boostkit/queue-inngest`, `@boostkit/queue-bullmq` |
| BoostKit ORM | `@boostkit/orm-drizzle` |
| BoostKit storage | `@boostkit/storage` |
| BoostKit CLI | `@clack/core`, `@clack/prompts` |
| Database drivers | `pg`, `mysql2`, `better-sqlite3` |
| Prisma adapters | `@prisma/adapter-pg`, `@prisma/adapter-mysql2`, `@prisma/adapter-better-sqlite3`, `@prisma/adapter-libsql`, `@libsql/client` |
| Redis | `ioredis` |

`@boostkit/server-hono` is kept **non-external** (`ssr.noExternal`) so Vite processes its virtual module imports correctly.

## Notes

- `boostkit()` returns a `Promise` — Vite handles it natively. No `await` or spread (`...`) needed.
- The plugin loads Vike via a dynamic `import()` resolved from `process.cwd()`, ensuring only one Vike instance is ever registered even in monorepos where multiple `node_modules/vike` copies exist.
- SSR externals are applied to both `ssr.external` (dev) and `build.rollupOptions.external` (production).
