# Models

A model represents one row in a database table. Every model extends `Model` from `@rudderjs/orm` — that gives you a fluent query API, mass assignment, attribute casting, lifecycle hooks, and serialization controls in one class.

```ts
import { Model } from '@rudderjs/orm'

export class User extends Model {
  static table       = 'user'
  static primaryKey  = 'id'
  static fillable    = ['name', 'email', 'role']
  static hidden      = ['password']

  id!:        string
  name!:      string
  email!:     string
  role!:      string
  password!:  string
  createdAt!: Date
}
```

Generate stubs with `pnpm rudder make:model User`.

## `static table`

`static table` tells the adapter which delegate or table key to query. The value is **adapter-specific**:

- **Prisma:** the camelCase Prisma client delegate (`user`, `blogPost`) — never the SQL table name.
- **Drizzle:** the key in the `tables: {}` object passed to `drizzle()`.

Setting `static table` is effectively required — the default (lowercase class name + `s`) does not match either adapter's convention.

## Querying

`where()` returns a chainable `QueryBuilder`. `first()`, `count()`, and `paginate()` are static shortcuts for the no-conditions case.

```ts
await User.all()
await User.find('clx1234...')
await User.first()
await User.count()

await User.where('role', 'admin').get()
await User.where('createdAt', '>', new Date('2024-01-01')).get()

const recent = await User
  .where('role', 'admin')
  .where('name', 'LIKE', 'A%')
  .orderBy('createdAt', 'DESC')
  .limit(10)
  .get()

const page = await User.where('role', 'user').paginate(1, 20)
// { data, total, currentPage, perPage, lastPage, from, to }
```

| QueryBuilder method | Description |
|---|---|
| `where(col, value)` / `where(col, op, value)` | Filter (operators: `=`, `!=`, `>`, `>=`, `<`, `<=`, `LIKE`, `IN`, `NOT IN`) |
| `orWhere(col, value)` | OR equality |
| `orderBy(col, dir?)` | Sort |
| `limit(n)` / `offset(n)` | Paging primitives |
| `with(...rels)` | Eager-load relations (Prisma) |
| `first()` / `find(id)` / `get()` | Read |
| `create(data)` / `update(id, data)` / `delete(id)` | Write |
| `paginate(page, perPage?)` | Paginated result (default `perPage`: 15) |

## Records vs. instances

Query results are **plain data objects**, not Model instances. Prototype methods don't survive — `(await User.find(id)).hasGrantType('foo')` throws "is not a function".

The convention is to put behavior in standalone helpers:

```ts
// app/Models/helpers/userHelpers.ts
export const userHelpers = {
  hasRole(user: User, role: string) { return user.role === role },
  isAdmin(user: User)               { return user.role === 'admin' },
}
```

```ts
const user = await User.find(id)
if (userHelpers.isAdmin(user)) { /* ... */ }
```

For mutations, call the static method: `await User.update(id, { role: 'admin' })`.

## Mass assignment

`static fillable` is the allowlist of fields users may set via `Model.create()` / `Model.update()` from request data. Anything outside the list is silently dropped:

```ts
class User extends Model {
  static fillable = ['name', 'email', 'role']
}

// Only name/email/role are persisted; isAdmin is dropped.
await User.create({ name: 'Alice', email: 'a@b.com', role: 'user', isAdmin: true })
```

Use `fillable` whenever the data comes from user input. Skip it for fields you set in your own code.

## Casts

`static casts` transforms attribute values when reading from and writing to the database:

```ts
class Post extends Model {
  static casts = {
    isPublished: 'boolean',
    publishedAt: 'date',
    metadata:    'json',
    viewCount:   'integer',
    tags:        'array',
  } as const
}
```

Built-in casts: `'string'`, `'integer'`, `'float'`, `'boolean'`, `'date'`, `'datetime'`, `'json'`, `'array'`, `'collection'`, `'encrypted'`, `'encrypted:array'`, `'encrypted:object'`. Encrypted casts require `@rudderjs/crypt`.

For custom transforms, implement `CastUsing` — see the [@rudderjs/orm README](https://github.com/rudderjs/rudder/tree/main/packages/orm) for examples.

## Accessors and mutators

Use `Attribute.make()` for computed reads and write transforms:

```ts
import { Model, Attribute } from '@rudderjs/orm'

class User extends Model {
  static attributes = {
    fullName: Attribute.make({
      get: (_, attrs) => `${attrs.firstName} ${attrs.lastName}`,
    }),
    password: Attribute.make({
      set: (value) => hashSync(String(value)),
    }),
  }
}
```

Accessors run in `toJSON()`. Mutators run inside `Model.create()` / `Model.update()` before data hits the adapter. Add computed accessors to JSON output with `static appends = ['fullName']`.

## Scopes

Pull common query fragments into named scopes:

```ts
class Article extends Model {
  static globalScopes = {
    ordered: (q) => q.orderBy('createdAt', 'DESC'),
    active:  (q) => q.where('active', true),
  }

  static scopes = {
    published: (q) => q.where('status', 'published'),
    byAuthor:  (q, id: string) => q.where('authorId', id),
  }
}

await Article.query().get()                          // both global scopes apply
await Article.query().withoutGlobalScope('active').get()
await Article.query().scope('published').scope('byAuthor', userId).get()
```

Calling `.scope('name')` with an unknown name throws — typos surface immediately.

## Hidden and visible fields

Control what appears in `toJSON()`:

```ts
class User extends Model {
  static hidden  = ['password', 'rememberToken']  // denylist
}

class PublicUser extends Model {
  static visible = ['id', 'name', 'avatar']       // allowlist (takes precedence)
}
```

Per-instance overrides: `user.makeVisible(['email']).makeHidden(['phone'])`. Decorators (`@Hidden`, `@Visible`, `@Appends`) work too if you prefer property-level annotations.

## Observers

Hook into model lifecycle events to enforce invariants, transform data, or cancel operations:

```ts
class ArticleObserver {
  creating(data) {
    data.slug = slugify(data.title)
    return data    // transformed data replaces input
  }

  deleting(id) {
    if (id === protectedId) return false   // false cancels
  }
}

Article.observe(ArticleObserver)
```

Events: `creating` / `created`, `updating` / `updated`, `deleting` / `deleted`, `restoring` / `restored`. The `*ing` events can return a new value to transform, or `false` to cancel. Post-events fire after the operation succeeds.

> Events fire only for the static methods (`Model.create()`, `Model.update()`, `Model.delete()`). `Model.query().create()` bypasses observers — it goes straight to the adapter.

For inline hooks use `Model.on('creating', fn)`.

## Pitfalls

- **Bracket access on records.** `record['column']` on a query result is fine (it's a plain object). `record.column` works too. But calling `.method()` on a record fails — there's no prototype.
- **Mass assignment without `fillable`.** When `fillable` is unset, every key is accepted. Forgetting to set it on a model that takes user input is a vulnerability.
- **Forgetting to register the adapter.** `Model.*` static methods throw `[RudderJS ORM] No adapter registered`. The database provider must boot before any model query runs — see [Database](/guide/database).
- **`Model.query().create()` skipping observers.** Use `Model.create()` (and the other static methods) when you need observer hooks.
