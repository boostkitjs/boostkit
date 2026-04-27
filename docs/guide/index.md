# What is RudderJS?

RudderJS is a framework-agnostic Node.js full-stack framework built on [Vike](https://vike.dev) and [Vite](https://vitejs.dev). It gives you service providers, dependency injection, an expressive ORM, a CLI generator, queues, scheduling, auth, validation — everything a typical web application needs — in strict TypeScript, while staying modular and UI-agnostic.

## Philosophy

RudderJS favors expressive APIs, convention over configuration, and clear lifecycle hooks. The framework should fade into the background while your app's code stays readable.

Three principles shape every package:

**Modular.** Every feature lives in its own `@rudderjs/*` package. There is no monolithic install. Add `@rudderjs/queue` when you need queues, `@rudderjs/cache` when you need caching. Unused packages are not in your `node_modules`.

**UI-agnostic.** Vike handles SSR and page routing. Pair RudderJS with React, Vue, Solid, multiple at once, or no frontend at all. Pure API mode is first-class.

**Deploy anywhere.** RudderJS exposes a standard [WinterCG Fetch handler](https://wintercg.org/). The same `bootstrap/app.ts` runs on Node, Bun, Deno, and Cloudflare Workers without code changes.

## What ships in the box

RudderJS provides everything a typical web application needs:

- **HTTP server** with routing, middleware groups, validation, and form requests
- **DI container** with constructor injection, service providers, and auto-discovery
- **ORM** with Prisma or Drizzle adapters and an Eloquent-style query API
- **Auth** with guards, gates, policies, password reset, and email verification
- **Sessions** backed by HMAC-signed cookies or Redis
- **Queues** with BullMQ or Inngest, plus a built-in scheduler
- **Cache** and **storage** with pluggable drivers (Redis, S3, R2, MinIO)
- **Mail** and **notifications** with multi-channel delivery
- **AI agents** and **MCP servers** as first-class primitives
- **Real-time** broadcasting and Y.js-based collaborative sync
- **Telescope** — request-by-request observability with timeline, query, and event collectors

Optional packages — `@rudderjs/passport`, `@rudderjs/sanctum`, `@rudderjs/socialite`, `@rudderjs/boost`, `@rudderjs/telescope` — opt in per project.

## Status

RudderJS is in **early development**. All packages are functional, the playground is a working full-stack app, and the API is settling. Breaking changes may still occur before v1.0.

## Where to next

- [Installation](/guide/installation) — scaffold your first project
- [Directory Structure](/guide/directory-structure) — get oriented
- [Request Lifecycle](/guide/lifecycle) — how a request flows through the framework
