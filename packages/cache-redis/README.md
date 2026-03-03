# @forge/cache-redis

Redis cache adapter provider for `@forge/cache`.

## Installation

```bash
pnpm add @forge/cache-redis
```

## Usage

```ts
import { redis } from '@forge/cache-redis'

const provider = redis({
  driver: 'redis',
  host: '127.0.0.1',
  port: 6379,
  prefix: 'forge:',
})

const adapter = provider.create()
```

## API Reference

- `RedisCacheConfig`
- `redis(config)` → `CacheAdapterProvider`

## Configuration

- `RedisCacheConfig`
  - `driver`
  - `host?`, `port?`, `password?`, `db?`
  - `url?`
  - `prefix?`

## Notes

- Uses `ioredis`.
- The exported function name is `redis` (used by `@forge/cache` dynamic loading).
