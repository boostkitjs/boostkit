# create-rudder-app

**Spin up a production-ready [RudderJS](https://github.com/rudderjs/rudder) app in under 60 seconds** — with auth that works, a database wired, SSR views rendering, and optional AI / OAuth / real-time / cache / queue, all bootstrapped through Vite + Vike.

```bash
pnpm create rudder-app my-app
cd my-app
pnpm exec prisma generate && pnpm exec prisma db push
pnpm dev
# → http://localhost:3000 — welcome page + register/login working end-to-end
```

---

## Install

All four major package managers work. The installer detects which one you used and adapts every generated file, install command, and post-scaffold hint.

```bash
pnpm create rudder-app [name]
npm create rudder-app@latest [name]
yarn create rudder-app [name]
bunx create-rudder-app [name]
```

Skip `[name]` to be prompted for one.

---

## What you get out of the box

With the **default choices** (Prisma + SQLite + Auth + Cache + React + Tailwind + shadcn/ui), you get a working fullstack app you can register into, log into, and sign out of — without writing any code:

- **Welcome page at `/`** — controller-returned view, Tailwind + shadcn styled, with Log in / Register links or a signed-in user + Sign out button.
- **Auth flow that works** — `/login`, `/register`, `/forgot-password`, `/reset-password` pages vendored into `app/Views/Auth/` (so you can customize them freely) and wired to `POST /api/auth/sign-in/email` / `sign-up/email` / `sign-out` / `request-password-reset` / `reset-password` endpoints.
- **Database ready** — Prisma schema with a `User` + `PasswordResetToken` model, SQLite by default, a `User` ORM model.
- **Session-based auth** — cookie sessions via `@rudderjs/session`, `AuthMiddleware` applied globally, ghost-user-safe (see the [Request Lifecycle guide](https://github.com/rudderjs/rudder/blob/main/docs/guide/lifecycle.md)).
- **Rate limiting** — 10 req/min on auth endpoints out of the box.
- **Bootstrap you can read** — `bootstrap/app.ts` in 25 lines, `bootstrap/providers.ts` shows auto-discovery, `config/` has one file per concern.
- **Rudder CLI** — `pnpm rudder --help` lists framework commands; `routes/console.ts` shows you how to add your own.

If you tick **AI** you get a `/ai-chat` demo. If you tick **MCP**, `POST /mcp/echo`. If you tick **Passport**, a full OAuth 2 server at `/oauth/authorize` / `/oauth/token`. Everything is opt-in and pay-as-you-go.

---

## Prompts

The installer walks you through up to 9 prompts (several are conditional):

| # | Prompt | Options | Default | Condition |
|---|--------|---------|---------|-----------|
| 1 | Project name | any string | — | always (skipped if passed as argv) |
| 2 | Database ORM | Prisma · Drizzle · None | Prisma | always |
| 3 | Database driver | SQLite · PostgreSQL · MySQL | SQLite | only if ORM selected |
| 4 | Package checklist | multiselect (see below) | Auth + Cache | always |
| 5 | Frontend frameworks | React · Vue · Solid (multiselect) | React | always |
| 6 | Primary framework | single select from chosen frameworks | — | only if >1 framework selected |
| 7 | Add Tailwind CSS? | yes / no | yes | always |
| 8 | Add shadcn/ui? | yes / no | yes | only if React + Tailwind |
| 9 | Install dependencies? | yes / no | yes | always |

> **Not sure what to pick?** Accept every default — it produces the most-used stack (Prisma + SQLite + Auth + Cache + React + Tailwind + shadcn/ui) and is the best-tested path. You can always add packages later.

### Package checklist (prompt 4)

| Choice | Description | Package |
|--------|-------------|---------|
| Authentication | Login, register, sessions | `@rudderjs/auth` |
| Cache | Memory + Redis drivers | `@rudderjs/cache` |
| Queue | Background jobs | `@rudderjs/queue` |
| Storage | File uploads (local + S3) | `@rudderjs/storage` |
| Mail | SMTP + log driver | `@rudderjs/mail` |
| Notifications | Multi-channel notifications | `@rudderjs/notification` |
| Scheduler | Cron-like task scheduling | `@rudderjs/schedule` |
| WebSocket | Real-time channels | `@rudderjs/broadcast` |
| Sync (Yjs CRDT) | Real-time collaborative document sync | `@rudderjs/sync` |
| AI | LLM providers (Anthropic, OpenAI, Google, Ollama, Groq, DeepSeek, xAI, Mistral, Azure) | `@rudderjs/ai` |
| MCP | Model Context Protocol servers — expose tools/resources to LLMs | `@rudderjs/mcp` |
| Passport (OAuth2) | OAuth 2 server with JWT — **requires Auth + Prisma** | `@rudderjs/passport` |
| Localization | i18n — `trans()`, `setLocale()` | `@rudderjs/localization` |
| Telescope | Debug dashboard | `@rudderjs/telescope` |
| Boost (AI coding DX) | Expose project internals to Claude Code / Cursor / Copilot via MCP | `@rudderjs/boost` (devDep) |
| Demos | Sample views (contact, ws, live) under `/demos` — **react primary only** | — |

Package-specific behavior:

- **AI** — generates `config/ai.ts`, AI chat demo at `/ai-chat`, `POST /api/ai/chat`.
- **MCP** — generates `app/Mcp/EchoServer.ts` and wires `POST /mcp/echo`.
- **Passport** — generates `config/passport.ts`, OAuth 2 routes (`/oauth/authorize`, `/oauth/token`, etc.), and `OAuthClient` + `OAuthAccessToken` Prisma models. Fails fast if Auth or Prisma isn't also selected.
- **Demos** — generates `app/Views/Demos/{Index,Contact}.tsx` plus `Ws.tsx` (when Broadcast is selected) and `Live.tsx` (when Sync is selected). Index page lives at `/demos`. Skipped silently when the primary framework isn't React.

Only selected packages get their dependencies, providers, config files, and schema files. Always-included base packages: `core`, `router`, `server-hono`, `middleware`, `vite`, `rudder`, `cli`, `log`. `session` + `hash` are pulled in automatically with Authentication.

---

## Generated structure

```
my-app/
├── bootstrap/
│   ├── app.ts          # Application.configure()...create()
│   └── providers.ts    # [...(await defaultProviders()), ...app providers]
├── config/             # app, server, log + per-package configs (auth, cache, session, …)
├── app/
│   ├── Models/User.ts              # (if Auth)
│   ├── Views/                      # (if Auth) Welcome + Auth/{Login,Register,...} vendored
│   ├── Mcp/EchoServer.ts           # (if MCP)
│   ├── Providers/AppServiceProvider.ts
│   └── Middleware/RequestIdMiddleware.ts
├── routes/
│   ├── api.ts          # JSON API routes (+ auth endpoints if Auth, + OAuth2 if Passport)
│   ├── web.ts          # Vike page routes + registerAuthRoutes() (if Auth)
│   ├── console.ts      # Rudder commands
│   └── channels.ts     # (if WebSocket) channel auth
├── pages/
│   ├── +config.ts              # Root config — includes renderer when single framework
│   ├── index/+config.ts        # (multi-framework only) per-page renderer config
│   ├── index/+Page.tsx|.vue    # Home page (primary framework)
│   ├── _error/+Page.tsx|.vue   # Error page
│   └── {fw}-demo/+Page.*       # Demo pages for secondary frameworks
├── prisma/schema/              # (if Prisma) multi-file schema directory
│   ├── base.prisma             #   datasource + generator
│   ├── auth.prisma             #   (if Auth) User + PasswordResetToken
│   ├── passport.prisma         #   (if Passport) OAuthClient + OAuthAccessToken
│   ├── notification.prisma     #   (if Notifications)
│   └── modules.prisma          #   placeholder for per-feature modules
├── drizzle/                    # (if Drizzle) schema directory
├── src/index.css               # (if Tailwind)
├── vite.config.ts
├── tsconfig.json
├── .env + .env.example
└── package.json
```

---

## Reference — framework combinations, CSS, PM differences

<details>
<summary>Framework selection → page extension + tsconfig</summary>

| Selection | Page extension | tsconfig jsx |
|-----------|---------------|--------------|
| React only | `.tsx` | `react-jsx` |
| Vue only | `.vue` | *(omitted)* |
| Solid only | `.tsx` | `preserve` + `jsxImportSource: solid-js` |
| React + Vue | `.tsx` (React primary) | `react-jsx` |
| React + Solid | `.tsx` — Vite plugins use include/exclude to disambiguate | `react-jsx` |
| All three | `.tsx` or `.vue` depending on primary | `react-jsx` |

**Single framework:** the renderer (`vike-react`, `vike-vue`, or `vike-solid`) is included directly in the root `+config.ts`.

**Multiple frameworks:** the root `+config.ts` has no renderer. Each page folder declares its own `+config.ts` extending the appropriate renderer. Secondary frameworks get a minimal demo page at `pages/{fw}-demo/`.
</details>

<details>
<summary>CSS variants based on Tailwind / shadcn selection</summary>

| Selection | `src/index.css` content |
|-----------|------------------------|
| Tailwind + shadcn | Full shadcn CSS variables + `@import "shadcn/tailwind.css"` |
| Tailwind only | `@import "tailwindcss"; @import "tw-animate-css";` |
| No Tailwind | File not generated |
</details>

<details>
<summary>Package-manager differences in generated files</summary>

| File | pnpm | npm / yarn | bun |
|------|------|-----------|-----|
| `pnpm-workspace.yaml` | generated | not generated | not generated |
| `package.json` native-build field | `pnpm.onlyBuiltDependencies` | *(not needed)* | `trustedDependencies` |
</details>

---

## After scaffolding

The installer prints the exact commands for your package manager. For reference:

| Step | pnpm | npm | yarn | bun |
|------|------|-----|------|-----|
| Install (if skipped) | `pnpm install` | `npm install` | `yarn install` | `bun install` |
| Discover providers (if install skipped) | `pnpm rudder providers:discover` | `npm run rudder providers:discover` | `yarn rudder providers:discover` | `bun rudder providers:discover` |
| Prisma generate (if Prisma) | `pnpm exec prisma generate` | `npx prisma generate` | `yarn dlx prisma generate` | `bunx prisma generate` |
| Prisma db push (if Prisma) | `pnpm exec prisma db push` | `npx prisma db push` | `yarn dlx prisma db push` | `bunx prisma db push` |
| Drizzle push (if Drizzle) | `pnpm exec drizzle-kit push` | `npx drizzle-kit push` | `yarn dlx drizzle-kit push` | `bunx drizzle-kit push` |
| Passport keys (if Passport) | `pnpm rudder passport:keys` | `npm run rudder passport:keys` | `yarn rudder passport:keys` | `bun rudder passport:keys` |
| Start dev server | `pnpm dev` | `npm run dev` | `yarn dev` | `bun dev` |

When you let the installer run **Install dependencies**, it also runs `rudder providers:discover` automatically so the app boots on first `dev`. If you skipped install, run both manually before `dev`.

---

## Troubleshooting

<details>
<summary><strong>“[RudderJS] @rudderjs/X listed in the provider manifest but not installed”</strong></summary>

The auto-discovery manifest (`bootstrap/cache/providers.json`) references a package you no longer have. Regenerate:

```bash
pnpm rudder providers:discover
```
</details>

<details>
<summary><strong>Register or login returns 500 with a Prisma error</strong></summary>

Usually means the schema wasn't pushed. Run:

```bash
pnpm exec prisma generate
pnpm exec prisma db push
```
</details>

<details>
<summary><strong>Passport endpoints 500 with “no private key found”</strong></summary>

You skipped the key generation step. Run:

```bash
pnpm rudder passport:keys
```

Keys land in `storage/oauth-{private,public}.key`. They're gitignored — never commit them.
</details>

<details>
<summary><strong>Port 3000 or HMR port 24678 already in use</strong></summary>

```bash
lsof -ti :24678 -ti :3000 | xargs kill -9
```
</details>

<details>
<summary><strong>Auth views didn't get copied — “run vendor:publish manually”</strong></summary>

The installer tries to vendor `@rudderjs/auth/views/{react,vue}/` into `app/Views/Auth/`. If the copy fails (rare), run:

```bash
pnpm rudder vendor:publish --tag=auth-views-react   # or auth-views-vue
```
</details>

---

## Related

- **Main framework**: [github.com/rudderjs/rudder](https://github.com/rudderjs/rudder)
- **Docs**: [Request Lifecycle](https://github.com/rudderjs/rudder/blob/main/docs/guide/lifecycle.md) · [Service Providers](https://github.com/rudderjs/rudder/blob/main/docs/guide/service-providers.md) · [Installation](https://github.com/rudderjs/rudder/blob/main/docs/guide/installation.md)
- **Report issues**: [github.com/rudderjs/rudder/issues](https://github.com/rudderjs/rudder/issues)

---

## Contributing to the scaffolder

```bash
git clone https://github.com/rudderjs/rudder.git
cd rudder/create-rudder-app
pnpm install
pnpm build
node dist/index.js         # launches the interactive CLI from source
pnpm test                  # 111 template tests
```

Template logic lives in `src/templates.ts` (pure — returns `Record<path, content>`, no filesystem). The entrypoint `src/index.ts` handles prompts + writes + installs. Adding a new package option touches both files + `templates.test.ts`.

---

## License

MIT © [Suleiman Shahbari](https://github.com/rudderjs/rudder)
