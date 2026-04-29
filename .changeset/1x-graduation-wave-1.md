---
"@rudderjs/ai": major
"@rudderjs/boost": major
"@rudderjs/broadcast": major
"@rudderjs/cache": major
"@rudderjs/context": major
"@rudderjs/contracts": major
"@rudderjs/core": major
"@rudderjs/crypt": major
"@rudderjs/hash": major
"@rudderjs/localization": major
"@rudderjs/log": major
"@rudderjs/mail": major
"@rudderjs/middleware": major
"@rudderjs/notification": major
"@rudderjs/orm": major
"@rudderjs/orm-prisma": major
"@rudderjs/passport": major
"@rudderjs/pennant": major
"@rudderjs/queue-bullmq": major
"@rudderjs/queue-inngest": major
"@rudderjs/router": major
"@rudderjs/schedule": major
"@rudderjs/server-hono": major
"@rudderjs/session": major
"@rudderjs/socialite": major
"@rudderjs/storage": major
"@rudderjs/support": major
"@rudderjs/testing": major
"@rudderjs/view": major
---

## RudderJS 1.0 — wave 1

Graduate 29 framework packages from `0.x` to `1.0.0`. The first batch of `@rudderjs/*` packages is now public-API stable — breaking changes will require explicit major bumps and migration notes from here on.

**No code changes** — this is a version-line reset. Existing `0.x` consumers need to update their `@rudderjs/*` ranges from `^0.x.y` to `^1.0.0`. The scaffolder (`create-rudder-app`) is updated to emit `1.x` ranges.

**Why now.** Under semver caret rules, `^0.X.Y` is exact-minor — every minor bump on a `0.x` peer goes out of range and triggers a cascading major bump on every dependent. Even with the `onlyUpdatePeerDependentsWhenOutOfRange` flag in place, the `0.x` baseline keeps producing spurious cascades. Telescope's v9 is mostly that. Once at `1.0`, `^1.0.0` absorbs all `1.x` minor/patch updates — cascades only fire for actual breaking changes.

**Cascade noise will drop significantly:**
- `^1.0.0` absorbs all 1.x minor/patch updates
- Cascade now only fires for actual breaking changes (real majors)

**Packages graduating to 1.0.0 in this wave:**

`@rudderjs/contracts`, `core`, `support`, `log`, `hash`, `crypt`, `context`, `testing`, `middleware`, `cache`, `session`, `broadcast`, `schedule`, `mail`, `notification`, `storage`, `localization`, `pennant`, `socialite`, `queue-bullmq`, `queue-inngest`, `router`, `server-hono`, `view`, `orm`, `orm-prisma`, `passport`, `boost`, `ai`.

`@rudderjs/ai` was originally on the defer list (recent runtime-agnostic split), but it peer-depends on `@rudderjs/core` — graduating core forces ai to graduate via cascade regardless. Listing it explicitly so the version line is intentional rather than a side-effect.

**Packages NOT yet graduated (still 0.x), to graduate individually as they stabilize:**

- *Too new / not yet exercised in the dogfood loop:* `@rudderjs/concurrency`, `image`, `process`, `http`, `console`
- *Recent significant changes:* `@rudderjs/orm-drizzle`, `sync`, `vite`

These will only patch-bump in this release (cascade via regular `dependencies`, not `peerDependencies`).

**Already past 1.0 (untouched by this release):** `@rudderjs/auth`, `cli`, `mcp`, `queue`, `horizon`, `pulse`, `sanctum`, `telescope`, `cashier-paddle`. These keep their existing version lines; no reset.

**Expected cascade:** dependents like `telescope`, `pulse`, `horizon`, `cli`, `auth`, `mcp`, `queue`, `sanctum` will major-bump in this release because their peer/dep ranges shifted from `^0.x` to `^1.0.0`. This is the *last* spurious cascade — future releases of those packages will patch-bump on in-range peer updates.
