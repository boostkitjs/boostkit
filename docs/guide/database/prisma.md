# Prisma Adapter

`@rudderjs/orm-prisma` is the Prisma-backed adapter for `@rudderjs/orm`. It wraps a `PrismaClient`, registers itself with `ModelRegistry`, and binds the raw client into the DI container so other packages (`@rudderjs/auth`, `@rudderjs/notification`) can consume it without further wiring.

## Install

```bash
pnpm add @rudderjs/orm @rudderjs/orm-prisma @prisma/client
pnpm add -D prisma
```

For SQLite (local development) also install:

```bash
pnpm add better-sqlite3 @prisma/adapter-better-sqlite3
pnpm add -D @types/better-sqlite3
```

| Driver | Required packages | Notes |
|---|---|---|
| `sqlite` | `better-sqlite3` | Local file-based database; default for development |
| `postgresql` | `pg` or native bindings | Standard PostgreSQL |
| `mysql` | `mysql2` | MySQL / MariaDB |
| `libsql` | `@libsql/client` | Turso / libSQL — SQLite-compatible schema |

The adapter auto-detects the driver from the `DATABASE_URL` scheme (`file:` → sqlite, `postgresql:` → postgresql, `libsql:` → libsql) unless you set `driver` explicitly.

## Multi-file schema

RudderJS uses Prisma's multi-file schema feature: instead of one `prisma/schema.prisma`, schemas live in `prisma/schema/*.prisma`. Each concern gets its own file, and packages can publish their own schema shards.

```
prisma/
├── schema/
│   ├── base.prisma           # generator + datasource
│   ├── user.prisma           # User model
│   ├── auth.prisma           # published by @rudderjs/auth
│   └── notification.prisma   # published by @rudderjs/notification
└── prisma.config.ts          # points to prisma/schema/
```

```ts
// prisma.config.ts
import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema'),
})
```

```prisma
// prisma/schema/base.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["prismaSchemaFolder"]
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

```prisma
// prisma/schema/user.prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  role      String   @default("user")
  createdAt DateTime @default(now())
}
```

After editing the schema:

```bash
pnpm rudder db:push        # sync to database
pnpm rudder db:generate    # regenerate the Prisma client
```

## Register the provider

The `database()` factory handles connection, `ModelRegistry.set()`, and DI binding in one call:

```ts
// bootstrap/providers.ts
import { database } from '@rudderjs/orm-prisma'
import configs from '../config/index.js'

export default [
  database(configs.database),    // first
  // ...other providers
]
```

`database()` binds the raw `PrismaClient` to DI as `'prisma'` so other packages (`@rudderjs/auth`, `@rudderjs/notification`) can auto-discover it. Auto-discovery picks up `database()` automatically when `@rudderjs/orm-prisma` is installed — the explicit import is only needed when you skip auto-discovery.

## The `User` model

```ts
import { Model } from '@rudderjs/orm'

export class User extends Model {
  static table = 'user'   // matches the Prisma accessor — prismaClient.user

  id!: string
  name!: string
  email!: string
  role!: string
  createdAt!: Date
}
```

`static table` is **the Prisma accessor**, not the SQL table name:

| Prisma model | Accessor (`static table`) |
|---|---|
| `model User` | `'user'` |
| `model BlogPost` | `'blogPost'` |
| `model Customer @@map("customers")` | `'customer'` (the model name, not the `@@map` value) |

## Cross-repo client (advanced)

For cross-repo workspaces where `@prisma/client` is generated in a different package, pass a pre-built client via the `PrismaClient` option:

```ts
import { PrismaClient } from '@my-org/database'
import { database } from '@rudderjs/orm-prisma'

database({
  ...configs.database,
  PrismaClient,       // forwarded to the adapter
})
```

This is the path the Pilotiq playgrounds use to consume their own generated client across pnpm-linked workspaces.

## Pitfalls

- **`Prisma has no delegate for table "x"`.** You set `static table` to the SQL table name (e.g. `'oauth_clients'`) instead of the accessor (`'oAuthClient'`). Use the accessor.
- **Stale client after schema edit.** Run `pnpm rudder db:generate`. TypeScript types in your app go stale until the client is regenerated.
- **`db:push` in production.** Push can drop columns silently. Use `pnpm rudder migrate` (which delegates to `prisma migrate deploy`) for tracked migrations.
- **Multi-file schema not detected.** Confirm `previewFeatures = ["prismaSchemaFolder"]` is in your generator block, and that `prisma.config.ts` points to the directory.
