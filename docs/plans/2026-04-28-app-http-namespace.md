# `app/Http/` Namespace Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move HTTP-layer scaffolded files into `app/Http/{Controllers,Middleware,Requests}/` so the Laravel-style namespace is consistent across the framework.

**Why:** Right now the framework is internally inconsistent:
- The scaffolder + playground put files at `app/Controllers/`, `app/Middleware/`, `app/Requests/`
- The `make:` CLI commands (`controller`, `middleware`, `request`) write to `app/Http/Controllers/`, `app/Http/Middleware/`, `app/Http/Requests/`

A user who scaffolds an app and then runs `pnpm rudder make:controller Foo` ends up with controllers in **two** places. We pick the Laravel-style `Http/` form because (a) it matches what the `make:` commands already write, (b) it matches Laravel's directory shape, and (c) it groups HTTP-layer concerns under one parent.

**Scope:** Audited completely. Four files to physically move (playground), seven literal-string locations (scaffolder + bootstrap + routes), and ~5 docs/README/CHANGELOG fixes. No `vendor:publish` targets or framework runtime code references these paths — routing is explicit, not path-bound.

---

## Phase 1 — Move playground files

The playground has four files in the old paths:

- `playground/app/Controllers/AuthController.ts` → `app/Http/Controllers/AuthController.ts`
- `playground/app/Controllers/TestController.ts` → `app/Http/Controllers/TestController.ts`
- `playground/app/Middleware/RequestIdMiddleware.ts` → `app/Http/Middleware/RequestIdMiddleware.ts`
- `playground/app/Requests/CreateUserRequest.ts` → `app/Http/Requests/CreateUserRequest.ts`

Do `git mv` so history follows the move.

Then update the four files that import them:

- `playground/bootstrap/app.ts:6` — `import { requestIdMiddleware } from '../app/Middleware/RequestIdMiddleware.ts'` → `'../app/Http/Middleware/RequestIdMiddleware.ts'`
- `playground/routes/api.ts:12-13` — both `Requests/CreateUserRequest.js` and `Controllers/TestController.js` get `Http/` prefix
- `playground/routes/web.ts:7` — `Controllers/AuthController.js` → `Http/Controllers/AuthController.js`

Verify via `cd playground && pnpm typecheck`.

## Phase 2 — Scaffolder template paths

In `create-rudder-app/src/templates.ts`:

- Line 134: `files['app/Controllers/AuthController.ts']` → `'app/Http/Controllers/AuthController.ts'`
- Line 136: `files['app/Middleware/RequestIdMiddleware.ts']` → `'app/Http/Middleware/RequestIdMiddleware.ts'`
- Line 1475: import template string `'../app/Middleware/RequestIdMiddleware.ts'` → `'../app/Http/Middleware/RequestIdMiddleware.ts'`
- Line 2289: import template string `'../app/Controllers/AuthController.ts'` → `'../app/Http/Controllers/AuthController.ts'`
- Lines 2307 + 2315: comments referencing `app/Controllers/AuthController.ts` → `app/Http/Controllers/AuthController.ts`

## Phase 3 — Tests

`create-rudder-app/src/templates.test.ts` has assertions that reference these template file keys. Update each:

- Search for `'app/Controllers/'`, `'app/Middleware/'`, `'app/Requests/'` in the test file and prepend `Http/`.
- Run `cd create-rudder-app && pnpm test` to confirm green.

## Phase 4 — Docs

### Framework docs

- `docs/guide/directory-structure.md` — full rewrite of the tree + table to reflect:
  - `app/Http/Controllers/` (added — was missing entirely from the doc)
  - `app/Http/Middleware/`
  - `app/Http/Requests/` (already there but matches reality now)
  - Drop `Services/`, `Jobs/`, `Notifications/` from the always-scaffolded list — they're convention-only
  - Drop the `Notifications/` row entirely (no `make:notification` command exists; no scaffolder support)
  - Fix `Modules/Blog/` example to show all 5 files (`Schema.ts`, `Service.ts`, `ServiceProvider.ts`, `.test.ts`, `.prisma`)
- `docs/guide/rudder.md:152` — fix the `make:middleware` line to target `app/Http/Middleware/AuthMiddleware.ts` (currently shows `app/Middleware/`)
- `docs/guide/validation.md:61` — already correct (`app/Http/Requests/CreateUserRequest.ts`), leave as is
- `README.md:232,257` — update `app/Controllers/UserController.ts` examples to `app/Http/Controllers/UserController.ts`

### Scaffolder CHANGELOG

- `create-rudder-app/CHANGELOG.md` — add an entry at the top noting the path migration. Existing CHANGELOG references to `app/Controllers/AuthController.ts` are historical and should NOT be edited (they describe what shipped at that version).

### Per-package guidelines

The audit didn't find direct path references in `packages/*/CLAUDE.md` or `packages/*/boost/guidelines.md`. Skip unless the typecheck reveals something.

## Phase 5 — Sister-repo sync + changeset

### rudderjs-com

After committing the framework changes:

```bash
cd /Users/sleman/Projects/rudderjs-com
npm run docs:sync -- --apply-all
npm run search:index && npm run og
```

This pulls the updated `directory-structure.md` and `rudder.md` and rebuilds the search index.

### Changeset

`.changeset/app-http-namespace.md`:

```markdown
---
"create-rudder-app": minor
"rudderjs-playground": patch
---

Move HTTP-layer scaffolded files to `app/Http/{Controllers,Middleware,Requests}/`
to match the existing `make:` CLI command target paths and Laravel's directory shape.

**Migration for existing apps:** This is a convention move, not a forced rename.
The framework has no path-bound discovery for controllers/middleware/requests —
all routing is explicit (`router.get(path, handler)`), so existing files in
`app/Controllers/`, `app/Middleware/`, `app/Requests/` keep working from wherever
they live. Going forward, `make:controller` and friends write under `app/Http/`,
matching the new scaffolder shape. If you want the structures to match, move the
files manually and update relative imports — no framework code change required.
```

## Phase 6 — Verification

End-to-end checks before opening the PR:

1. `cd /Users/sleman/Projects/rudder && pnpm build` — clean across all 48 packages
2. `pnpm typecheck` — clean
3. `cd packages/cli && pnpm test` — green
4. `cd ../../create-rudder-app && pnpm test` — green
5. `cd ../playground && pnpm dev` — boots, smoke check `/login` and `/api/users` to exercise auth + request validation
6. Spot-check `/docs/guide/directory-structure` on the rudderjs-com dev server — tree + table match the new shape

---

## Out of scope

- **Renaming `make:` commands** — they already write to `Http/`, no change.
- **Path-bound controller discovery** — RudderJS doesn't have any. Routes are always explicit.
- **Migrating user apps in the wild** — covered by the changeset migration note. Optional, not forced.
- **Updating tutorials, blog posts, or external content** — out of repo scope.
