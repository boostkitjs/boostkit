# @forge/core

Application bootstrap, service provider lifecycle, and framework-level runtime orchestration.

## Installation

```bash
pnpm add @forge/core
```

## Usage

```ts
import { Application } from '@forge/core'
import { hono } from '@forge/server-hono'

export default Application.configure({
  server: hono({ port: 3000 }),
  providers: [],
})
  .withRouting({ api: () => import('../routes/api.js') })
  .withMiddleware(() => {})
  .withExceptions(() => {})
  .create()
```

## API Reference

- `ServiceProvider`
- `Application`, `AppConfig`
- `ConfigureOptions`, `RoutingOptions`
- `MiddlewareConfigurator`, `ExceptionConfigurator`
- `AppBuilder`, `Forge`
- `app()`, `resolve()`
- `defineConfig()`
- Re-exports from `@forge/artisan`, `@forge/di`, `@forge/support`, and `@forge/contracts` types

## Configuration

- `AppConfig`
  - `name?`, `env?`, `debug?`
  - `providers?`
  - `config?` (config object bound into the container)
- `ConfigureOptions`
  - `server`, `config?`, `providers?`

## Notes

- `Application.create()` is singleton-based and can recreate in development/local mode when config is passed.
- `Forge.boot()` boots providers; `Forge.handleRequest()` lazily creates the HTTP handler.
