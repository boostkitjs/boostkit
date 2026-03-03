# @forge/queue

Queue job abstractions, queue registry, and provider factory with sync and pluggable drivers.

## Installation

```bash
pnpm add @forge/queue
```

## Usage

```ts
// bootstrap/providers.ts
import { queue } from '@forge/queue'
import configs from '../config/index.js'

export default [
  queue(configs.queue),
]

import { Job } from '@forge/queue'
class SendEmailJob extends Job { async handle() {} }
await SendEmailJob.dispatch().onQueue('default').send()
```

## API Reference

- `Job`
- `DispatchBuilder<T extends Job>`
- `DispatchOptions`
- `QueueAdapter`, `QueueAdapterProvider`, `QueueAdapterFactory`
- `QueueRegistry`
- `QueueConnectionConfig`, `QueueConfig`
- `queue(config)`

## Configuration

- `QueueConfig`
  - `default`
  - `connections`
- `QueueConnectionConfig`
  - `driver`
  - additional driver-specific keys

## Notes

- Built-in driver: `sync`.
- Plugin drivers supported by factory: `inngest` and `bullmq`.
