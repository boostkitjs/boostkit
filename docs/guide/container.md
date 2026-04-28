# Service Container

The service container is the heart of RudderJS. It is a powerful dependency-injection container that resolves classes and their dependencies for you, supports constructor injection via TypeScript decorators, and is the same instance used by every part of the framework.

```ts
import 'reflect-metadata'
import { Injectable, app } from '@rudderjs/core'

@Injectable()
class Logger {
  log(message: string) { console.log(message) }
}

@Injectable()
class UserService {
  constructor(private readonly logger: Logger) {}
  greet(name: string) { this.logger.log(`Hello, ${name}!`) }
}

const service = app().make(UserService)
service.greet('Alice')
```

`reflect-metadata` must be imported once at your entry point (`bootstrap/app.ts`), and `experimentalDecorators: true` + `emitDecoratorMetadata: true` must be set in `tsconfig.json`. Both are present in scaffolded apps.

## Binding

Three ways to register something with the container:

```ts
// Transient — new instance on every make()
app().bind(MyService, (c) => new MyService(c.make(Logger)))

// Singleton — same instance every time
app().singleton(DatabaseService, (c) => new DatabaseService())

// Pre-built instance
app().instance('config.app', { name: 'MyApp', debug: true })
```

`app()` returns the global container. Inside a service provider, prefer `this.app` — it points at the same container.

### Aliases

Multiple keys can resolve to the same binding:

```ts
app().alias('log', Logger)
const logger = app().make<Logger>('log')
```

### Existence checks

```ts
if (app().has(UserService)) {
  // …
}
```

## Resolving

`make()` resolves a binding. For `@Injectable` classes without an explicit binding, the container auto-constructs them by reading TypeScript's metadata to discover constructor parameter types:

```ts
const service = app().make(UserService)
const name    = app().make<string>('app.name')
```

When a constructor parameter has no runtime type — primitives, interfaces, string tokens — use `@Inject(token)`:

```ts
import { Injectable, Inject } from '@rudderjs/core'

@Injectable()
class GreetingService {
  constructor(
    @Inject('app.name') private readonly appName: string,
  ) {}
}

app().instance('app.name', 'MyApp')
const svc = app().make(GreetingService)
```

## Container lifecycle

The container is created once when `Application.configure(...).create()` runs and lives for the entire process. Service providers populate it during boot; route handlers and services resolve from it on demand.

The container is **synchronous**. If you need async setup (open a connection, run a migration), do it in a service provider's `boot()` hook — `boot()` can be `async`, `register()` cannot.

For per-request state, do **not** mutate the container or store request data on a singleton. Use AsyncLocalStorage instead — see [Request Lifecycle](/guide/lifecycle).

## Using the container in providers

`ServiceProvider.register()` and `boot()` both receive `this.app` — the container:

```ts
import { ServiceProvider } from '@rudderjs/core'
import { UserService } from '../Services/UserService.js'

export class AppServiceProvider extends ServiceProvider {
  register(): void {
    this.app.singleton(UserService, () => new UserService())
  }

  async boot(): Promise<void> {
    const service = this.app.make(UserService)
    await service.warmUp()
  }
}
```

Resolve other bindings only inside `boot()` — during `register()` other providers may not have run yet, and the binding you want may not exist.

## Using the container in controllers

Decorator-based controllers receive their dependencies via constructor injection. The container resolves them automatically:

```ts
import { Controller, Get } from '@rudderjs/router'
import { Injectable } from '@rudderjs/core'
import { UserService } from '../Services/UserService.js'

@Controller('/users')
@Injectable()
class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/')
  async index() {
    return { data: await this.userService.all() }
  }
}

router.registerController(UserController)
```

## Container API reference

All mutating methods return `this` for fluent chaining. Tokens can be a `string`, `symbol`, or class constructor (keyed by class name).

| Method | Description |
|---|---|
| `bind(token, factory)` | Factory binding — new instance on every `make()`. Factory receives the container as its argument. |
| `singleton(token, factory)` | Singleton — factory runs once; result cached for subsequent calls. |
| `instance(token, value)` | Registers a pre-built value. Always returns the same object reference. |
| `alias(from, to)` | Maps the string `from` to `to`. `make(from)` resolves `to`. |
| `make<T>(token)` | Resolves the token. If the token is an `@Injectable` class with no explicit binding, auto-resolves via constructor metadata. Throws if no binding is found. |
| `has(token)` | `true` if the token (or its alias target) has a binding or instance registered. |
| `forget(token)` | Removes the binding and any cached singleton instance. |
| `reset()` | Clears all bindings, instances, and aliases. |

## Tips

- Always import `reflect-metadata` once at the entry point. Install it as a regular dependency, not a devDependency.
- `@Injectable()` is required for auto-resolution. Classes without it must be explicitly bound.
- Method-level decorators **do not** preserve metadata under Vite/esbuild. Method-level DI must take explicit tokens — never rely on reflection at the method level.
