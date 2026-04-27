# Controllers

Controllers group related routes into a class — useful for resource-heavy endpoints (`UserController`, `PostController`) where every method shares the same prefix and middleware. Controllers are decorator-based and resolve dependencies through the DI container.

```ts
import { Controller, Get, Post, Put, Delete, Middleware, router } from '@rudderjs/router'
import { Injectable } from '@rudderjs/core'
import { RequireAuth } from '@rudderjs/auth'
import { UserService } from '../Services/UserService.js'

@Controller('/api/users')
@Injectable()
class UserController {
  constructor(private readonly users: UserService) {}

  @Get('/')
  async index(_req, res) {
    return res.json({ data: await this.users.all() })
  }

  @Get('/:id')
  async show(req, res) {
    const user = await this.users.find(req.params.id)
    if (!user) return res.status(404).json({ message: 'Not found' })
    return res.json({ data: user })
  }

  @Post('/')
  @Middleware([RequireAuth()])
  async store(req, res) {
    const user = await this.users.create(req.body as any)
    return res.status(201).json({ data: user })
  }

  @Put('/:id')
  async update(req, res) {
    return res.json({ data: await this.users.update(req.params.id, req.body as any) })
  }

  @Delete('/:id')
  async destroy(req, res) {
    await this.users.delete(req.params.id)
    return res.status(204).send('')
  }
}

router.registerController(UserController)
```

The controller is registered via `router.registerController(UserController)` — typically in `routes/api.ts` or `routes/web.ts`. Generate stubs with `pnpm rudder make:controller User`.

## Decorators

| Decorator | Target | Description |
|---|---|---|
| `@Controller(prefix?)` | class | Route prefix for every method |
| `@Get(path)` | method | GET |
| `@Post(path)` | method | POST |
| `@Put(path)` | method | PUT |
| `@Patch(path)` | method | PATCH |
| `@Delete(path)` | method | DELETE |
| `@Options(path)` | method | OPTIONS |
| `@Middleware(handlers[])` | class or method | Apply middleware |

`@Controller` and method decorators compose: `@Controller('/api/users')` + `@Get('/:id')` registers `GET /api/users/:id`.

## Constructor injection

Controllers must be `@Injectable()` to participate in DI. Constructor parameters are resolved from the container — services, repositories, anything bound in a service provider:

```ts
@Controller('/api/posts')
@Injectable()
class PostController {
  constructor(
    private readonly posts:    PostService,
    private readonly cache:    CacheStore,
    private readonly notifier: NotificationManager,
  ) {}
}
```

`reflect-metadata` must be imported once at the entry point (`bootstrap/app.ts`) for parameter types to survive compilation. Scaffolded apps already include it.

> Method-level parameter decorators are not supported — esbuild and Vite drop method-level metadata. If you need to inject something into a single method, take it as a constructor dependency or use `app().make(Token)` inline.

## Middleware

Use `@Middleware([...])` on the class, the method, or both. Class middleware runs first:

```ts
@Controller('/api')
@Middleware([logRequest])           // runs first for every method
class Ctrl {
  @Get('/private')
  @Middleware([RequireAuth()])      // runs second, only this method
  private(req, res) { /* ... */ }
}
```

For middleware that runs on every web or every api route, register it on the group instead — see [Middleware](/guide/middleware).

## Controllers and views

A controller can return a [view](/guide/frontend) directly, the same as a fluent route:

```ts
import { view } from '@rudderjs/view'

@Controller('/dashboard')
@Injectable()
class DashboardController {
  constructor(private readonly stats: StatsService) {}

  @Get('/')
  async index() {
    return view('dashboard', { stats: await this.stats.summary() })
  }
}
```

Returning a view from a controller is the canonical pattern for full-page web routes — middleware, data fetching, and rendering live in the same method.

## Controllers vs. fluent routes

Both approaches use the same router. Pick whichever reads better:

| | Fluent | Controller |
|---|---|---|
| Lightweight handlers, one-off endpoints | ✓ | |
| Resource with shared prefix + middleware | | ✓ |
| Constructor-injected dependencies | (use `resolve()` inline) | ✓ |
| File organization | One `routes/api.ts` | One file per controller |

You can mix both in the same app. The framework treats them identically once registered.

## Pitfalls

- **`reflect-metadata` missing.** Decorator metadata silently disappears. Add `import 'reflect-metadata'` to `bootstrap/app.ts`.
- **Forgetting `@Injectable()`.** The container can't auto-construct a class without it. The error is a clear `Cannot resolve UserService` at boot.
- **Forgetting `router.registerController(...)`.** The class compiles but no routes show up. Run `pnpm rudder route:list` to confirm.
- **Method-level decorators relying on `design:paramtypes`.** Vite/esbuild strip method-level metadata. Use constructor injection instead.
