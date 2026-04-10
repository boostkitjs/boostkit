# @rudderjs/horizon

Queue monitoring dashboard for RudderJS — tracks job lifecycle, queue metrics, and worker status with a built-in UI.

## Installation

```bash
pnpm add @rudderjs/horizon
```

## Setup

```ts
// bootstrap/providers.ts
import { horizon } from '@rudderjs/horizon'
import configs from '../config/index.js'
export default [..., horizon(configs.horizon), ...]
```

## Horizon Facade

```ts
import { Horizon } from '@rudderjs/horizon'

const jobs    = await Horizon.recentJobs({ queue: 'emails', perPage: 25 })
const failed  = await Horizon.failedJobs()
const job     = await Horizon.findJob('job-id')
const metrics = await Horizon.currentMetrics()
const workers = await Horizon.workers()
const count   = await Horizon.jobCount('failed')
```

## `Horizon` Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `recentJobs(options?)` | `HorizonJob[]` | List recent jobs with optional filters |
| `failedJobs(options?)` | `HorizonJob[]` | List failed jobs |
| `findJob(id)` | `HorizonJob \| null` | Find a single job by ID |
| `currentMetrics()` | `QueueMetric[]` | Latest metric snapshot per queue |
| `workers()` | `WorkerInfo[]` | All known workers and their status |
| `jobCount(status?)` | `number` | Count jobs, optionally by status |

## Storage Drivers

- **`memory`** (default) — In-process, bounded by `maxJobs`. Good for development.
- **`sqlite`** — Persistent storage via `better-sqlite3`. Run `pnpm add better-sqlite3` to enable.

## Configuration

```ts
// config/horizon.ts
export default {
  enabled: true,
  path: 'horizon',             // Dashboard route prefix
  storage: 'memory',           // 'memory' | 'sqlite'
  sqlitePath: '.horizon.db',
  maxJobs: 1000,               // Max jobs in memory storage
  pruneAfterHours: 72,         // Auto-prune old records
  metricsIntervalMs: 60_000,   // Metrics polling interval
  auth: null,                  // Optional auth callback for dashboard
} satisfies HorizonConfig
```

## Collectors

Horizon auto-registers three collectors on boot:

- **JobCollector** — Intercepts job dispatch/processing/completion/failure events
- **MetricsCollector** — Periodically polls queue adapter for throughput, wait time, runtime
- **WorkerCollector** — Tracks the current process as a worker (memory, job count)

## Dashboard

Horizon serves a built-in UI at `/{path}` with pages for:

- Dashboard overview
- Recent jobs
- Failed jobs (with retry/delete)
- Queue metrics
- Worker status

## Notes

- Requires `@rudderjs/queue` for job lifecycle hooks.
- Peers: `@rudderjs/router` and `@rudderjs/middleware` for route registration.
- Auto-prune runs on a background interval (does not block the event loop).
