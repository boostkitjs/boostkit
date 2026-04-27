# Drizzle Adapter

`@rudderjs/orm-drizzle` is the Drizzle-backed adapter for `@rudderjs/orm`. Unlike Prisma, schemas are TypeScript code — `drizzle-kit` reads your schema file directly and generates migrations from it. The model API is identical to the Prisma adapter.

## Install

```bash
pnpm add @rudderjs/orm @rudderjs/orm-drizzle drizzle-orm
pnpm add -D drizzle-kit
```

Plus the driver for your database:

| Driver | Package | Install |
|---|---|---|
| SQLite | `better-sqlite3` | `pnpm add better-sqlite3` and `pnpm add -D @types/better-sqlite3` |
| libSQL / Turso | `@libsql/client` | `pnpm add @libsql/client` |
| PostgreSQL | `postgres` | `pnpm add postgres` |

MySQL is not supported by this adapter.

## Define the schema

```ts
// database/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull(),
  email:     text('email').notNull().unique(),
  role:      text('role').notNull().default('user'),
  createdAt: text('created_at').notNull(),
})
```

For PostgreSQL, import from `drizzle-orm/pg-core` and use `pgTable` instead.

## Configure drizzle-kit

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema:        './database/schema.ts',
  out:           './database/migrations',
  dialect:       'sqlite',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'file:./dev.db' },
})
```

Then sync the schema:

```bash
pnpm rudder db:push     # delegates to drizzle-kit push
```

For tracked migrations:

```bash
pnpm rudder make:migration add_users_table   # delegates to drizzle-kit generate
pnpm rudder migrate                           # delegates to drizzle-kit migrate
```

## Register the provider

```ts
// app/Providers/DatabaseServiceProvider.ts
import { ServiceProvider } from '@rudderjs/core'
import { drizzle } from '@rudderjs/orm-drizzle'
import { ModelRegistry } from '@rudderjs/orm'
import * as schema from '../../database/schema.js'

export class DatabaseServiceProvider extends ServiceProvider {
  async boot(): Promise<void> {
    const adapter = await drizzle({
      driver: 'sqlite',
      url:    process.env.DATABASE_URL ?? 'file:./dev.db',
      tables: {
        user: schema.users,
        post: schema.posts,
      },
    }).create()

    await adapter.connect()
    ModelRegistry.set(adapter)
    this.app.instance('db', adapter)
  }
}
```

```ts
// bootstrap/providers.ts
import { DatabaseServiceProvider } from '../app/Providers/DatabaseServiceProvider.js'

export default [
  DatabaseServiceProvider,    // first
  // ...
]
```

The keys in the `tables: {}` object are the values you'll set on each Model's `static table`.

## The `User` model

```ts
import { Model } from '@rudderjs/orm'

export class User extends Model {
  static table = 'user'   // matches the key in tables: { user: users }

  id!:    string
  name!:  string
  email!: string
  role!:  string
}
```

## Pre-built Drizzle instance

If you already have a configured Drizzle database (e.g. shared across packages), pass it via `client`:

```ts
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { drizzle } from '@rudderjs/orm-drizzle'

const sqlite = new Database('./dev.db')
const db     = drizzleSqlite(sqlite)

const adapter = await drizzle({
  client: db,
  tables: { user: users },
}).create()
```

## Global table registry

For modular apps where different modules register their own tables, use `DrizzleTableRegistry` instead of inline `tables: {}`:

```ts
import { DrizzleTableRegistry } from '@rudderjs/orm-drizzle'
import { users } from '../database/schema.js'

DrizzleTableRegistry.register('user', users)
const table = DrizzleTableRegistry.get('user')
```

## What's supported

The Drizzle adapter implements the same `OrmAdapter` interface as Prisma. The full Model API works — `where`, `orderBy`, `limit`, `paginate`, `create`, `update`, `delete`, `count`, `find`, `first`, `all`. **One feature differs: `with(relation)` is a no-op.**

For relation loading, drop down to raw Drizzle queries — see the [drizzle-orm docs](https://orm.drizzle.team/docs/rqb).

| Method | Notes |
|---|---|
| `with(relation)` | No-op — use raw Drizzle |
| `connect()` | No-op — Drizzle connects lazily |
| `disconnect()` | PostgreSQL only — closes the pool |

## Pitfalls

- **`static table` mismatch.** It must match the key in `tables: {}`, not the SQL table name. `tables: { user: users }` → `static table = 'user'` (even though the SQL table is `users`).
- **`with()` silently doing nothing.** Drizzle relation loading isn't implemented in the adapter — `Post.with('author').get()` returns posts with no author attached. Use raw Drizzle (`db.query.posts.findMany({ with: { author: true } })`) when you need relations.
- **MySQL not supported.** Use Prisma for MySQL apps.
