# @forge/rate-limit

Cache-backed rate limit middleware builder with standard rate-limit headers.

## Installation

```bash
pnpm add @forge/rate-limit
```

## Usage

```ts
import { RateLimit } from '@forge/rate-limit'

const limiter = RateLimit
  .perMinute(60)
  .byIp()
  .message('Too many requests')
  .toHandler()

// use limiter in route/global middleware registration
```

## API Reference

- `RateLimitBuilder`
  - `byIp()`, `byRoute()`, `by(fn)`
  - `message(msg)`, `skipIf(fn)`
  - `toHandler()`
- `RateLimit`
  - `perMinute(max)`, `perHour(max)`, `perDay(max)`, `per(max, windowMs)`

## Configuration

This package has no runtime config object.

## Notes

- Requires a cache adapter registered in `@forge/cache` (`memory` or `redis`).
- Skips static assets and Vite internal paths automatically.
