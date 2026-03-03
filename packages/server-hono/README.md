# @forge/server-hono

Hono-based server adapter provider implementing Forge server contracts.

## Installation

```bash
pnpm add @forge/server-hono
```

## Usage

```ts
import { hono } from '@forge/server-hono'
import { Application } from '@forge/core'

export default Application.configure({
  server: hono({
    port: 3000,
    cors: { origin: '*', methods: 'GET,POST', headers: 'Content-Type,Authorization' },
  }),
  providers: [],
}).create()
```

## API Reference

- `HonoConfig`
- `hono(config?)` → `ServerAdapterProvider`

## Configuration

- `HonoConfig`
  - `port?`
  - `trustProxy?`
  - `cors?`
    - `origin?`
    - `methods?`
    - `headers?`

## Notes

- The provider exposes `create()`, `createApp()`, and `createFetchHandler()` through the returned adapter provider.
- CORS can be enabled from `HonoConfig.cors` without custom middleware.
