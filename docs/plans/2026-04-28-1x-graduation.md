# Plan: Graduate framework packages from 0.x to 1.0

## Context

The cascade-flag fix (`onlyUpdatePeerDependentsWhenOutOfRange: true`, landed 2026-04-28) stops *in-range* peer minor/patch updates from triggering spurious major bumps on dependents. But for **0.x packages it doesn't help** — under semver caret rules, `^0.X.Y` is exact-minor (and `^0.0.X` is exact-patch), so every minor bump on a 0.x peer goes out of range and still cascades.

Telescope is the worst case (currently at v9.0.0 — most of which is cascade noise from 0.x peers, not real breaking changes). Pulse and horizon are coasting on patches today but will cascade the moment a 0.x peer minors out of range.

The only real fix is **graduating 0.x packages to 1.x**. Once at `^1.0.0`, caret ranges absorb all minor/patch bumps, and cascades only fire for *actual* breaking changes (major bumps) — which is correct semver.

---

## Current version landscape

**Already past 1.0 (8 packages)** — leave alone:

| Package | Version | Notes |
|---|---|---|
| `@rudderjs/cli` | 3.0.1 | Mature runner |
| `@rudderjs/queue` | 3.0.2 | Queue facade, mature |
| `@rudderjs/horizon` | 3.0.3 | Queue dashboard |
| `@rudderjs/mcp` | 3.1.0 | MCP server runtime |
| `@rudderjs/auth` | 3.2.1 | Auth (post-better-auth) |
| `@rudderjs/pulse` | 4.0.3 | Performance dashboard |
| `@rudderjs/sanctum` | 5.0.1 | API tokens |
| `@rudderjs/telescope` | 9.0.0 | Debug dashboard (version inflated by cascade noise) |

**0.x candidates for 1.0 (28 packages):**

| Tier | Packages | Current versions |
|---|---|---|
| Tier 1 — foundation | `contracts`, `support`, `core`, `log`, `hash`, `crypt`, `context`, `testing` | 0.0.4 – 0.2.0 |
| Tier 2 — infrastructure | `middleware`, `cache`, `session`, `broadcast`, `schedule`, `mail`, `notification`, `storage`, `localization`, `pennant`, `socialite`, `queue-bullmq`, `queue-inngest` | 0.0.7 – 0.1.2 |
| Tier 3 — http + data | `router`, `server-hono`, `vite`, `view`, `orm`, `orm-prisma`, `orm-drizzle` | 0.0.3 – 0.3.1 |
| Tier 4 — features | `ai`, `passport`, `sync`, `boost` | 0.0.7 – 0.2.0 |
| **Defer** (too new / about to rename) | `concurrency`, `image`, `process`, `http`, `rudder` (renaming → `console`) | 0.0.1 – 0.0.3 |

Defer rationale:
- `concurrency`, `image`, `process` — all at 0.0.1, not yet exercised in the playground/dogfood loop.
- `http` — at 0.0.2, small surface but recent.
- `rudder` — about to be renamed to `@rudderjs/console` per separate plan; do the graduation as part of the rename PR (start the new package at 1.0.0 directly).

## Recommended approach: single coordinated 1.0 release

Graduate **all 28 candidate packages to 1.0.0 in one release**. Reasons:

1. **The framework launched publicly 2026-04-17** — 11 days ago. External consumer count is low. Coordination cost is at its minimum *now*; every week we wait makes the eventual cut harder.
2. **Tiered graduations don't help.** Bumping core to 1.0.0 cascades a major bump to every dependent anyway (because 1.0.0 is out of `^0.1.3` range). So a phased rollout would still produce one big cascading release per phase. One-shot release is simpler and cheaper.
3. **Changesets handles the bulk well.** Single `pnpm changeset` with each package marked `major`, single `pnpm changeset:version`, single `pnpm release`.
4. **Public framework stability signal.** "RudderJS 1.0" is a real milestone — articulates that the API surface is stable and breaking changes will be rare and well-flagged from here on.

Defer the 5 packages listed above. Graduate them later as they stabilize, *one at a time* (single-package 1.0 bumps don't cascade noise the way 0.x→0.x+1 minor bumps do).

---

## What graduating to 1.0 commits to

This is the load-bearing decision. Bumping a package to 1.0 is a **public commitment to API stability** — every breaking change post-1.0 becomes a real major bump that consumers must opt into. Specifically:

- **No more silent API churn under `0.x` cover.** Every public type, function signature, exported class is now a versioned contract.
- **Internal refactors are still free** — only *exposed* surface counts.
- **Breaking changes still allowed** — but at the cost of a major bump per package, with a CHANGELOG entry explaining the change and migration.

Per-package readiness check (informal — not blocking):

| Package | Ready? | Why |
|---|---|---|
| `contracts` | ✅ | Interfaces, intentionally frozen |
| `support` | ✅ | Utilities, small surface |
| `core` | ✅ | Application, container, providers — well-trodden |
| `log`, `hash`, `crypt`, `context` | ✅ | Tiny stable surfaces |
| `testing` | ✅ | Test helpers |
| `middleware` | ✅ | Stable, minor recent additions |
| `cache`, `session`, `broadcast` | ✅ | Stable shapes |
| `schedule`, `mail`, `notification`, `storage` | ✅ | Stable |
| `localization`, `pennant`, `socialite` | ✅ | Smaller, stable |
| `queue-bullmq`, `queue-inngest` | ✅ | Driver adapters, mirror queue facade |
| `router` | ✅ | At 0.3.1 — most mature 0.x package |
| `server-hono` | ✅ | Stable adapter |
| `vite` | ⚠️ | Scanner still gets tweaks (Vue dogfood, multi-framework) — but core API is stable |
| `view` | ✅ | Shipped 2026-04-11, stable since |
| `orm` | ✅ | Eloquent-style core, recently stabilized |
| `orm-prisma` | ✅ | Most-used adapter, mature |
| `orm-drizzle` | ⚠️ | Less exercised — may want to defer |
| `ai` | ⚠️ | At 0.1.0, recent runtime-agnostic split. Could defer to 1.0 next cycle. |
| `passport` | ✅ | OAuth2 phases all done 2026-04-18 |
| `sync` | ⚠️ | Fresh rename from `live` (2026-04-27), small breaking surface possible |
| `boost` | ✅ | Mature dev tooling |

**Suggested adjustments to defer list:** `orm-drizzle`, `ai`, `sync`, `vite` — these had recent significant changes. Could defer to a second 1.0 wave in 2-4 weeks once stability is observed.

That leaves **24 packages** in the first 1.0 wave, **9 deferred** (4 too-new + 1 renaming + the 4 with recent churn).

---

## Mechanics

### Step 1: Create the 1.0 changeset

```bash
pnpm changeset
# Mark these as MAJOR:
#   @rudderjs/contracts, support, core, log, hash, crypt, context, testing,
#   middleware, cache, session, broadcast, schedule, mail, notification,
#   storage, localization, pennant, socialite, queue-bullmq, queue-inngest,
#   router, server-hono, view, orm, orm-prisma, passport, boost
# Description: see template below
```

Changeset description template:

```markdown
---
"@rudderjs/contracts": major
"@rudderjs/core": major
"@rudderjs/support": major
... (24 entries)
---

Graduate to 1.0. The first batch of framework packages is now public-API
stable — breaking changes will require explicit major bumps and migration
notes from here on.

No code changes — this is a version-line reset. Existing 0.x consumers
need to update their `@rudderjs/*` ranges from `^0.x.y` to `^1.0.0`.
The scaffolder (`create-rudder-app`) is updated to emit 1.x ranges.

Cascade noise between 1.x packages will drop significantly:
- `^1.0.0` absorbs all 1.x minor/patch updates
- Cascade now only fires for actual breaking changes (real majors)

Packages NOT yet graduated (still 0.x): http, rudder (renaming to
console), concurrency, image, process, orm-drizzle, ai, sync, vite.
These will graduate individually in subsequent releases.
```

### Step 2: Verify projected bumps locally

```bash
pnpm changeset status
# Should show: 24 packages at major, no unexpected cascades.
# (Cascading dependents like telescope/pulse/horizon WILL still bump
# major because their 0.x peers are going out of range — this is correct.)
```

### Step 3: Apply versions + verify

```bash
pnpm changeset:version
# Inspect:
#   - All listed packages at 1.0.0
#   - Dependents (cli, mcp, auth, telescope, pulse, horizon, sanctum, queue) bumped major
#     because their peer/dep ranges shifted from ^0.x to ^1.0.0
#   - create-rudder-app and playground updated automatically
```

Sanity check the cascade: telescope, pulse, horizon, etc. WILL major-bump in this release (their peers went out of range — correct). After this release, future telescope releases should patch-bump for in-range peer updates.

### Step 4: Update sibling repos

Pilotiq + pilotiq-pro use `@rudderjs/*` workspace overrides. After 1.0 lands on npm:
- Update `pnpm.overrides` in their root `package.json` to reference `^1.0.0`
- Update direct deps in `packages/*/package.json` and `playground/package.json` to `^1.0.0`
- Run `pnpm install`
- Bump pilotiq's own packages as needed (their version lines are independent)

### Step 5: Update scaffolder

`create-rudder-app/src/templates.ts` emits `package.json` with `@rudderjs/*` ranges. Update them all to `^1.0.0`. Run scaffolder smoke test (`pnpm smoke` from `create-rudder-app`).

### Step 6: Release + announce

```bash
pnpm release   # builds + publishes
```

Announcement candidates:
- Dev.to follow-up post ("RudderJS 1.0")
- README + Architecture.md callout
- Mention in next docs sync

---

## What this DOESN'T fix

- **Already-major packages stay where they are.** Telescope at 9.0.0, sanctum at 5.0.1, pulse at 4.0.3 — these don't reset. Only forward.
- **Defer-list packages remain in cascade-prone 0.x.** Until http/concurrency/image/process/console/orm-drizzle/ai/sync/vite individually graduate, any release containing them at minor will cascade dependents (now reduced because the deps tree is mostly 1.x).
- **Genuine breaking changes still cascade.** This is correct semver — a peer going from 1.x to 2.0 still major-bumps every dependent. The cascade-flag fix + graduation reduces *spurious* cascade only.

---

## Verification (post-release)

1. **Dummy in-range cascade test** — create a `@rudderjs/middleware: minor` changeset (1.0.0 → 1.1.0). Run `pnpm changeset status`. Expected: only middleware bumps; no telescope/pulse/horizon cascade. *This is the success criterion.*
2. **Dummy out-of-range cascade test** — create a `@rudderjs/middleware: major` changeset (1.x → 2.0.0). Run `pnpm changeset status`. Expected: middleware + every dependent bumps major. *Confirms cascade still works for real breaking changes.*
3. **Scaffold a fresh project** via `pnpm dlx create-rudder-app smoke-1x` — verify `package.json` has `^1.0.0` ranges, `pnpm install` succeeds, `pnpm dev` boots.
4. **Pilotiq smoke** — pull pilotiq's update, run its playground, verify rudder facade calls (Auth, Cache, Queue) all work against the 1.x packages.
5. **Run the integration tests** (`tests/integration`) against the published 1.x.

---

## Risks

1. **Premature 1.0 commitment** — If a graduated package needs a breaking change in the next 2–4 weeks, it'll major-bump to 2.0 and cascade. Mitigation: the defer list catches the highest-churn packages.
2. **Sibling repo lag** — Pilotiq + pilotiq-pro apps will break until their `pnpm.overrides` are updated. Mitigation: do all three repo updates in the same window.
3. **Unforeseen consumer breakage** — Anyone outside the team who picked up `^0.x.y` from npm will see no auto-upgrade to 1.0 (correct). They have to manually bump. Mitigation: low blast radius (framework is 11 days public).
4. **Telescope's already-inflated version** — Telescope is at 9.0.0 *because* of cascade noise. Bumping it to 10.0.0 in the 1.0 release looks weird to outside observers. Could add a CHANGELOG note acknowledging this. Cosmetic only — no fix needed.

---

## Out of scope

- **Telescope/sanctum/pulse version reset to 1.0.** NPM doesn't allow version backtracking; "fixing" the inflated numbers means publishing a new package name (`@rudderjs/telescope-v2`?) which is worse than living with the high number. Don't.
- **Tightening or expanding the changeset cascade flag.** Already done in the previous PR. Keep as-is.
- **Public RudderJS 1.0 launch announcement** — adjacent work (blog post, hackernews, etc.) is its own thing. The graduation enables that, doesn't require it.

---

## Recommended sequencing relative to other in-flight work

Current pending changes:
1. `chore/clean-done-plans` (PR ready, plan-doc cleanup)
2. `chore/changesets-peer-cascade-flag` (PR ready, the flag fix)
3. The console rename + rich command I/O plan (`curried-popping-book.md`, approved, not yet implemented)

Recommended order:
1. Merge cleanup PR
2. Merge cascade-flag PR
3. **Do the console rename + 1.0 graduation in the SAME PR** — saves one round of cascade-major-bumps. The rename creates `@rudderjs/console` at 1.0.0 directly; the 23 other graduating packages all hit 1.0.0 in the same release.
4. Implement rich command I/O on top of console@1.0.x (minor releases, no cascade noise)

Doing 1.0 + console rename in the same release means consumers update their imports (`@rudderjs/rudder` → `@rudderjs/console`) AND their version ranges (`^0.x` → `^1.0.0`) once. Minimum disruption.
