# create-boostkit-app

Interactive CLI scaffolder for [BoostKit](https://github.com/boostkitjs/boostkit) — a Laravel-inspired, framework-agnostic Node.js meta-framework built on Vike + Vite.

## Usage

```bash
pnpm create boostkit-app
# or
npm create boostkit-app@latest
```

## Prompts

The installer walks you through 6 questions:

| Prompt | Options | Default |
|--------|---------|---------|
| Project name | any string | — |
| Database driver | SQLite · PostgreSQL · MySQL | SQLite |
| Include Todo module? | yes / no | yes |
| Frontend frameworks | React · Vue · Solid (multiselect) | React |
| Primary framework | shown only when >1 framework selected | — |
| Add Tailwind CSS? | yes / no | yes |
| Add shadcn/ui? | yes / no (only if React + Tailwind) | yes |
| Install dependencies? | yes / no | yes |

## What gets generated

```
my-app/
├── bootstrap/
│   ├── app.ts          # Application.configure()...create()
│   └── providers.ts    # Ordered provider array
├── config/             # app, server, database, auth, session, queue, mail, cache, storage
├── app/
│   ├── Models/User.ts
│   ├── Providers/AppServiceProvider.ts
│   └── Middleware/RequestIdMiddleware.ts
├── routes/
│   ├── api.ts          # JSON API routes
│   ├── web.ts          # Web/redirect routes
│   └── console.ts      # Artisan commands
├── pages/
│   ├── +config.ts              # Root vike-photon config
│   ├── index/+config.ts        # Primary framework config
│   ├── index/+data.ts          # SSR data loader
│   ├── index/+Page.tsx|.vue    # Home page (primary framework)
│   ├── _error/+Page.tsx|.vue   # Error page (primary framework)
│   └── {fw}-demo/+Page.*       # Demo pages for secondary frameworks
├── app/Modules/Todo/           # (if Todo selected)
├── prisma/schema.prisma
├── src/index.css               # (if Tailwind selected)
├── vite.config.ts
├── tsconfig.json
├── .env + .env.example
└── package.json
```

### Framework combinations

| Selection | Page extension | tsconfig jsx |
|-----------|---------------|--------------|
| React only | `.tsx` | `react-jsx` |
| Vue only | `.vue` | *(omitted)* |
| Solid only | `.tsx` | `preserve` + `jsxImportSource: solid-js` |
| React + Vue | `.tsx` (React primary) | `react-jsx` |
| React + Solid | `.tsx` — Vite plugins use include/exclude to disambiguate | `react-jsx` |
| All three | `.tsx` or `.vue` depending on primary | `react-jsx` |

When multiple frameworks are selected, secondary frameworks get a minimal demo page at `pages/{fw}-demo/`.

### CSS variants

| Selection | `src/index.css` content |
|-----------|------------------------|
| Tailwind + shadcn | Full shadcn CSS variables + `@import "shadcn/tailwind.css"` |
| Tailwind only | `@import "tailwindcss"; @import "tw-animate-css";` |
| No Tailwind | File not generated |

## Local development / testing

```bash
cd create-boostkit-app
pnpm build
node dist/index.js          # launches the interactive CLI
```

## After scaffolding

```bash
cd my-app
pnpm install                 # if you skipped during scaffolding
pnpm exec prisma generate
pnpm exec prisma db push
pnpm dev
```
