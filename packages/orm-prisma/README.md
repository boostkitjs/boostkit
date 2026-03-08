# @boostkit/orm-prisma

Prisma adapter for `@boostkit/orm`.

```bash
pnpm add @boostkit/orm-prisma @prisma/client prisma
```

---

## Setup

```ts
// config/database.ts
import { Env } from '@boostkit/support'

export default {
  default: 'sqlite',
  connections: {
    sqlite: {
      driver: 'sqlite',
      url:    Env.get('DATABASE_URL', 'file:./dev.db'),
    },
  },
}
```

```ts
// bootstrap/providers.ts
import { database } from '@boostkit/orm-prisma'
import configs from '../config/index.js'

export default [database(configs.database)]
```

The `database()` provider connects to the database on boot, registers the adapter with `ModelRegistry`, and binds it to the DI container as `'db'` and `'prisma'`.

---

## Drivers

| Driver | Optional dependency |
|---|---|
| `sqlite` (default) | `better-sqlite3` + `@prisma/adapter-better-sqlite3` |
| `postgresql` | `pg` + `@prisma/adapter-pg` |
| `libsql` | `@libsql/client` + `@prisma/adapter-libsql` |

Install only the driver you need:

```bash
# SQLite
pnpm add better-sqlite3 @prisma/adapter-better-sqlite3

# PostgreSQL
pnpm add pg @prisma/adapter-pg

# LibSQL / Turso
pnpm add @libsql/client @prisma/adapter-libsql
```

---

## Manual Usage

```ts
import { prisma } from '@boostkit/orm-prisma'
import { ModelRegistry } from '@boostkit/orm'

const adapter = await prisma({ driver: 'sqlite', url: 'file:./dev.db' }).create()
await adapter.connect()
ModelRegistry.set(adapter)
```

---

## `PrismaConfig`

| Option | Type | Description |
|---|---|---|
| `client` | `PrismaClient` | Pre-built Prisma client — bypasses all driver logic |
| `driver` | `'sqlite' \| 'postgresql' \| 'libsql'` | Database driver |
| `url` | `string` | Connection URL |

---

## `DatabaseConfig`

| Option | Type | Description |
|---|---|---|
| `default` | `string` | Key of the default connection |
| `connections` | `Record<string, { driver, url? }>` | Named connection configs |

---

## Notes

- Run `pnpm exec prisma generate` after any schema change before building.
- The `client` option takes precedence — driver/url are ignored when a client is provided.
- The adapter is bound in the DI container as `'db'` (OrmAdapter) and `'prisma'` (raw PrismaClient).
