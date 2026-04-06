# @rudderjs/concurrency

Parallel execution for RudderJS — run tasks in worker threads, defer fire-and-forget work, and switch to a sync driver for testing.

## Installation

```bash
pnpm add @rudderjs/concurrency
```

## Usage

### Parallel Execution

```ts
import { Concurrency } from '@rudderjs/concurrency'

const [users, products, orders] = await Concurrency.run([
  () => fetchUsers(),
  () => fetchProducts(),
  () => fetchOrders(),
])
```

Tasks run in a pool of worker threads (defaults to `os.cpus().length`). Results are returned in the same order as the input tasks.

### Deferred Tasks

Fire-and-forget — runs in a worker thread, errors are logged but not thrown:

```ts
Concurrency.defer(() => {
  // Post-response cleanup, analytics, etc.
  sendAnalyticsEvent('page_view', { path: '/dashboard' })
})
```

### Task Constraints

Tasks are serialized via `.toString()` and evaluated in worker threads. This means:

- Tasks must be **self-contained** — closures over external variables will not work
- Use **dynamic imports** inside the task for dependencies
- Serializable return values only (no functions, classes, or circular refs)

```ts
// Works — self-contained
await Concurrency.run([
  () => 2 + 2,
  async () => {
    const { readFile } = await import('node:fs/promises')
    return readFile('/tmp/data.txt', 'utf-8')
  },
])

// Does NOT work — closes over external variable
const multiplier = 3
await Concurrency.run([
  () => 2 * multiplier,  // ReferenceError: multiplier is not defined
])
```

## Testing

Switch to a synchronous driver that runs everything in the main thread:

```ts
import { Concurrency } from '@rudderjs/concurrency'

Concurrency.fake()

// Tasks now run sequentially in the main thread
const results = await Concurrency.run([
  () => 'a',
  () => 'b',
])
// ['a', 'b']

// Restore worker driver
await Concurrency.restore()
```

## API Reference

| Method | Description |
|---|---|
| `Concurrency.run(tasks)` | Run tasks in parallel via worker threads, return results in order |
| `Concurrency.defer(task)` | Fire-and-forget a task in a worker thread |
| `Concurrency.fake()` | Switch to sync driver (sequential, main thread) |
| `Concurrency.restore()` | Restore the default worker driver |
