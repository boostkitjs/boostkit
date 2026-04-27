# Cache

`@rudderjs/cache` is the framework's cache abstraction. It ships with an in-memory driver out of the box and a Redis driver for shared, persistent caching across processes. The `Cache` facade exposes the same API regardless of the driver underneath.

## Setup

```bash
pnpm add @rudderjs/cache
```

```ts
// config/cache.ts
import { Env } from '@rudderjs/support'
import type { CacheConfig } from '@rudderjs/cache'

export default {
  default: Env.get('CACHE_DRIVER', 'memory'),
  stores: {
    memory: { driver: 'memory' },
    redis:  { driver: 'redis', host: Env.get('REDIS_HOST', 'localhost'), port: Env.getNumber('REDIS_PORT', 6379) },
  },
} satisfies CacheConfig
```

The provider is auto-discovered. For Redis, also install `ioredis`:

```bash
pnpm add ioredis
```

## The Cache facade

```ts
import { Cache } from '@rudderjs/cache'

await Cache.set('user:1', user, 300)            // TTL in seconds
const user = await Cache.get<User>('user:1')
const ok   = await Cache.has('user:1')
await Cache.forget('user:1')

// Compute-and-cache pattern
const recent = await Cache.remember('posts:recent', 60, async () => {
  return Post.where('publishedAt', '>', new Date(Date.now() - 86400_000)).get()
})

// One-time token
const token = await Cache.pull<string>('one-time-token')

await Cache.flush()                              // clear the entire default store
```

| Method | Description |
|---|---|
| `Cache.get<T>(key)` | Retrieve or `null` |
| `Cache.set(key, value, ttl?)` | Store; omit `ttl` to store indefinitely |
| `Cache.has(key)` | Existence check |
| `Cache.forget(key)` | Remove one key |
| `Cache.remember<T>(key, ttl, fn)` | Cache-or-compute |
| `Cache.rememberForever<T>(key, fn)` | Cache-or-compute, no TTL |
| `Cache.pull<T>(key)` | Get and remove |
| `Cache.flush()` | Clear everything in the default store |

TTL values are always in **seconds**.

## Multiple stores

Configure additional stores under `stores: {}` and switch between them at the call site:

```ts
import { Cache } from '@rudderjs/cache'

await Cache.store('redis').set('key', value, 60)
```

This is useful when you want one store for short-lived response caching (memory) and another for cross-process state (Redis).

## Drivers

### Memory

In-process `Map`. Data does not persist across restarts and isn't shared across multiple server instances. Default for development; not for production with more than one process.

```ts
{ driver: 'memory' }
```

### Redis

Backed by `ioredis`. Persistent, multi-process, supports clustering.

```ts
{
  driver: 'redis',
  host:   'localhost',
  port:   6379,
  // Optional:
  password: 'secret',
  db:       0,
  keyPrefix: 'app:',
}
```

For TLS, point `tls: true` (Redis Cloud, ElastiCache with TLS). For Cluster mode, use `redis://` URLs and the standard ioredis cluster config.

## Custom drivers

Implement `CacheAdapter` to plug in DynamoDB, Memcached, or a tiered store:

```ts
import type { CacheAdapter } from '@rudderjs/cache'
import { CacheRegistry } from '@rudderjs/cache'

class MyAdapter implements CacheAdapter {
  async get<T>(key: string): Promise<T | null> { /* ... */ }
  async set(key: string, value: unknown, ttl?: number): Promise<void> { /* ... */ }
  async has(key: string): Promise<boolean> { /* ... */ }
  async forget(key: string): Promise<void> { /* ... */ }
  async flush(): Promise<void> { /* ... */ }
}

CacheRegistry.set('my-driver', new MyAdapter())
```

## Use with rate limiting

`RateLimit` from `@rudderjs/middleware` is cache-backed. Multi-process deployments need a shared store — register the Redis cache before any middleware runs:

```ts
{
  default: 'redis',
  stores:  { redis: { driver: 'redis', host: '...', port: 6379 } },
}
```

If no cache adapter is registered when `RateLimit` runs, it fails open (allows everything). See [Middleware](/guide/middleware).

## Testing

```ts
import { Cache } from '@rudderjs/cache'

Cache.fake()
await someCodeThatCaches()
Cache.assertPut('user:1')
Cache.assertMissing('user:42')
```

`Cache.fake()` swaps the default store with an in-memory fake for the duration of the test. Reset between tests with `Cache.fake().clear()`.

## Pitfalls

- **Memory driver in production with multiple processes.** Each process has its own `Map`. Cache hits become inconsistent. Use Redis (or another shared store) for any deployment with more than one Node process.
- **Forgetting to install `ioredis`.** The provider throws at boot — `ioredis` is an optional peer dependency, not bundled with `@rudderjs/cache`.
- **TTL in milliseconds.** It's not — TTL is in **seconds**. `Cache.set('k', v, 60)` lasts one minute, not 60 ms.
