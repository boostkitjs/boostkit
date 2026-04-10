# @rudderjs/telescope

Debug assistant for RudderJS — records requests, queries, jobs, exceptions, logs, mail, notifications, events, cache operations, scheduled tasks, and model changes.

## Installation

```bash
pnpm add @rudderjs/telescope
```

## Setup

```ts
// bootstrap/providers.ts
import { telescope } from '@rudderjs/telescope'
import configs from '../config/index.js'
export default [..., telescope(configs.telescope), ...]
```

## Telescope Facade

```ts
import { Telescope } from '@rudderjs/telescope'

// List entries by type
const requests   = await Telescope.list({ type: 'request', perPage: 25 })
const exceptions = await Telescope.list({ type: 'exception' })
const queries    = await Telescope.list({ type: 'query', search: 'SELECT' })

// Find a single entry
const entry = await Telescope.find('entry-id')

// Count entries
const total       = await Telescope.count()
const jobCount    = await Telescope.count('job')

// Prune entries
await Telescope.prune('log')   // prune by type
await Telescope.prune()        // prune all
```

## `Telescope` Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `list(options?)` | `TelescopeEntry[]` | List entries with type/tag/search/pagination filters |
| `find(id)` | `TelescopeEntry \| null` | Find a single entry by ID |
| `count(type?)` | `number` | Count entries, optionally filtered by type |
| `prune(type?)` | `void` | Delete entries, optionally by type |
| `record(entry)` | `void` | Manually record an entry |

## Entry Types

Telescope records 11 entry types:

| Type | Collector | Description |
|------|-----------|-------------|
| `request` | RequestCollector | HTTP requests and responses |
| `query` | QueryCollector | Database queries (flags slow queries) |
| `job` | JobCollector | Queue job dispatch and execution |
| `exception` | ExceptionCollector | Unhandled exceptions |
| `log` | LogCollector | Log messages |
| `mail` | MailCollector | Sent emails |
| `notification` | NotificationCollector | Dispatched notifications |
| `event` | EventCollector | Dispatched events |
| `cache` | CacheCollector | Cache hits, misses, writes |
| `schedule` | ScheduleCollector | Scheduled task execution |
| `model` | ModelCollector | Model create/update/delete |

## Storage Drivers

- **`memory`** (default) — In-process, bounded by `maxEntries`. Good for development.
- **`sqlite`** — Persistent storage via `better-sqlite3`. Run `pnpm add better-sqlite3` to enable.

## Configuration

```ts
// config/telescope.ts
export default {
  enabled: true,
  path: 'telescope',
  storage: 'memory',
  sqlitePath: '.telescope.db',
  maxEntries: 1000,
  pruneAfterHours: 24,
  recordRequests: true,
  recordQueries: true,
  recordJobs: true,
  recordExceptions: true,
  recordLogs: true,
  recordMail: true,
  recordNotifications: true,
  recordEvents: true,
  recordCache: true,
  recordSchedule: true,
  recordModels: true,
  ignoreRequests: ['/telescope*', '/health'],
  slowQueryThreshold: 100,
  auth: null,
} satisfies TelescopeConfig
```

## Dashboard

Telescope serves a built-in UI at `/{path}` with dedicated pages for each entry type, detail views, and a search interface.

## Notes

- Auto-prune runs on a background interval.
- Optional peers: `@rudderjs/log`, `@rudderjs/orm`, `@rudderjs/cache`, `@rudderjs/queue`, `@rudderjs/mail`, `@rudderjs/notification`, `@rudderjs/schedule`.
- `createEntry()` helper is exported for manually constructing entries.
