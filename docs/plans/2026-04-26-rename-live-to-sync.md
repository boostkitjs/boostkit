# Rename `@rudderjs/live` → `@rudderjs/sync` + Editor-Adapter Split

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename `@rudderjs/live` to `@rudderjs/sync` (clearer "sync engine" framing), extract Lexical-specific helpers into `@rudderjs/sync/lexical`, and scaffold a `@rudderjs/sync/tiptap` subpath so a Tiptap adapter can land later without further restructuring.

**Architecture:** Single package, multiple subpath exports. Core (`@rudderjs/sync`) holds the editor-agnostic Yjs sync engine, persistence drivers, observers, and provider. Editor adapters live under `@rudderjs/sync/<editor>` and import from the core surface. Mirrors the Liveblocks integration model and avoids one-package-per-editor sprawl until peer deps justify a split.

**Tech Stack:** TypeScript (strict, NodeNext), pnpm workspaces, Turborepo, tsc, Yjs, ws, Vitest.

**Cross-repo scope:** rudder (this repo), pilotiq, pilotiq-pro. All three are linked sibling clones — every dependency reference must be updated together to avoid the dual-instance bug from `feedback_multi_repo_link_overrides`.

---

## Decisions (locked before plan execution)

1. **Hard rename, no compat shim.** Pre-1.0 (`@rudderjs/live@0.0.7`), all consumers are linked siblings we control. A re-export shim adds long-term debt for short-term ergonomics we don't need.
2. **Directory rename via `git mv`** preserves blame.
3. **Version starts fresh at `0.1.0`** to clearly signal the rename + breaking surface refactor, not a continuation of `0.0.x`.
4. **Facade rename**: `Live` → `Sync`, `LiveProvider` → `SyncProvider`, `LiveConfig` → `SyncConfig`, `LivePersistence` → `SyncPersistence`, `liveObservers` → `syncObservers`, `livePrisma` → `syncPrisma`, `liveRedis` → `syncRedis`, `live()` factory → `sync()`. `MemoryPersistence` keeps its name (already generic).
5. **WebSocket default path** `/ws-live` → `/ws-sync`. Configurable via `sync.path`.
6. **Lexical extraction scope** (move to `src/lexical/`):
   - Methods: `editBlock`, `insertBlock`, `removeBlock`, `editText`, `rewriteText`, `editTextBatch`, `setAiAwareness`, `clearAiAwareness`, `readText`
   - Helpers: `findTextInXmlTree`, `findBlockInXmlTree`, `findBlockWithParentInXmlTree`, `encodeAiAwareness`
   - Types: `InnerDeltaItem`, lexical-shaped block types
   - These become free functions taking a `Y.Doc` (or `LiveDocument`-ish handle), not facade methods.
7. **Tiptap subpath = scaffold only** — directory, type interfaces matching the Lexical adapter shape, README explaining the integration pattern. No implementation in this plan.
8. **Telescope collector path stays meaningful** — rename `packages/telescope/src/collectors/live.ts` → `sync.ts` and update the dynamic import string + the registration in the collector index.
9. **Playground demo URL `/demos/live` stays** — user-facing route name is independent of the package name; renaming would break bookmarks for nothing.
10. **Deprecate `@rudderjs/live` on npm** at the end of the rollout (`npm deprecate @rudderjs/live "renamed to @rudderjs/sync"`).
11. **Per-task commits stay with Suleiman.** Per the project's no-commits-from-Claude rule, executing agents prepare changes and pause at "Ready to commit"; the user runs `git commit`.

---

## Worktree

Create a worktree off `main` for the rename so the main checkout stays usable for parallel work. Per `using-git-worktrees`:

```bash
cd /Users/sleman/Projects/rudder
git worktree add ../rudder-rename-sync -b rename/live-to-sync
cd ../rudder-rename-sync
```

Sibling repos (pilotiq, pilotiq-pro) get matching branches but **not** worktrees — they're updated in place because their playgrounds need to boot against the rename'd package and a worktree would point pnpm at the wrong directory.

```bash
cd /Users/sleman/Projects/pilotiq && git checkout -b rename/sync-package
cd /Users/sleman/Projects/pilotiq-pro && git checkout -b rename/sync-package
```

---

## Phase 1 — Rename the package on disk

### Task 1.1: Verify clean working tree across all three repos

**Step 1: Check state**

```bash
cd /Users/sleman/Projects/rudder && git status
cd /Users/sleman/Projects/pilotiq && git status
cd /Users/sleman/Projects/pilotiq-pro && git status
```

Expected: clean, on `main`. The known dirty file in rudder (`playground/pages/_error/+Page.tsx`) should be stashed or committed first so the rename diff stays clean.

### Task 1.2: Create worktree + sibling branches

Run the commands in the **Worktree** section above. From here on, all rudder file paths are inside `../rudder-rename-sync/`. For brevity, paths in this plan continue to use `/Users/sleman/Projects/rudder/...` — substitute the worktree path when executing.

### Task 1.3: Move `packages/live/` → `packages/sync/`

**Step 1: Rename directory (preserves git history)**

```bash
cd /Users/sleman/Projects/rudder
git mv packages/live packages/sync
```

**Step 2: Verify tree**

```bash
ls packages/sync/
```

Expected: `package.json README.md CHANGELOG.md src/ boost/ tsconfig.json` (or similar).

### Task 1.4: Update `packages/sync/package.json`

**File:** `/Users/sleman/Projects/rudder/packages/sync/package.json`

**Step 1: Edit the `name`, `description`, and `version` fields**

```json
{
  "name": "@rudderjs/sync",
  "version": "0.1.0",
  "description": "Real-time collaborative document sync engine for RudderJS — Yjs CRDT over WebSocket, with editor adapters under subpath exports."
}
```

**Step 2: Add subpath exports for `lexical` and `tiptap`**

Replace the `"exports"` field with:

```json
"exports": {
  ".": {
    "import": "./dist/index.js",
    "types": "./dist/index.d.ts"
  },
  "./lexical": {
    "import": "./dist/lexical/index.js",
    "types": "./dist/lexical/index.d.ts"
  },
  "./tiptap": {
    "import": "./dist/tiptap/index.js",
    "types": "./dist/tiptap/index.d.ts"
  }
}
```

**Step 3: Update the `rudderjs` discovery field**

If `rudderjs.provider` references `LiveProvider`, change to `SyncProvider`. The class export will be renamed in Phase 2.

```json
"rudderjs": {
  "stage": "feature",
  "provider": "SyncProvider"
}
```

**Step 4: Move Lexical-only deps to `peerDependenciesMeta` (optional)**

Lexical is not installed by `@rudderjs/sync` itself — only the adapter touches it. There are no current Lexical *runtime* deps (helpers manipulate raw Yjs trees using the Lexical *shape*, not Lexical APIs), so nothing to move yet. Verify by grepping: `grep -r "from '@lexical" packages/sync/src/`. Expected: no hits. If hits appear, they get moved to `optionalDependencies` in this step.

### Task 1.5: Verify package builds with the new name

**Step 1: Refresh workspace**

```bash
cd /Users/sleman/Projects/rudder
pnpm install
```

Expected: pnpm picks up `@rudderjs/sync`, no errors. The `packages/live` removal + `packages/sync` addition is a no-op for the workspace glob.

**Step 2: Build only the renamed package**

```bash
cd packages/sync
pnpm build
```

Expected: tsc emits `dist/index.js`. The Lexical/Tiptap subpaths don't exist yet — Phase 3 and 4 add them. tsc may warn about the exports map referencing missing subpaths; ignore for now or temporarily comment out the subpath entries and restore in Phase 3.

**Step 3: Pause for commit**

```
Ready to commit: Phase 1 — directory + package.json rename
git status
```

Suggested message: `refactor(sync): rename @rudderjs/live → @rudderjs/sync`.

---

## Phase 2 — Rename facade and exported symbols

This phase is mechanical find/replace **inside `packages/sync/`** plus careful renames of identifiers exported through the public API. Consumers in other packages and sibling repos are deliberately deferred to Phases 5–7 so each phase is independently reviewable.

### Task 2.1: Rename identifiers in `packages/sync/src/index.ts`

**File:** `/Users/sleman/Projects/rudder/packages/sync/src/index.ts`

**Step 1: Apply identifier renames**

Use `sed -i ''` (BSD sed on macOS) for safe whole-word renames:

```bash
cd /Users/sleman/Projects/rudder/packages/sync/src
sed -i '' \
  -e 's/\bLiveProvider\b/SyncProvider/g' \
  -e 's/\bLiveConfig\b/SyncConfig/g' \
  -e 's/\bLivePersistence\b/SyncPersistence/g' \
  -e 's/\bliveObservers\b/syncObservers/g' \
  -e 's/\blivePrisma\b/syncPrisma/g' \
  -e 's/\bliveRedis\b/syncRedis/g' \
  -e 's/\bclass Live\b/class Sync/g' \
  -e 's/\bexport const live\b/export const sync/g' \
  -e 's|/ws-live|/ws-sync|g' \
  index.ts observers.ts
```

**Step 2: Hand-review the diff**

```bash
git diff packages/sync/src/
```

Look for false positives:
- `LiveDocument` (if it exists as a type) — keep or rename consistently
- Comments mentioning "live collaboration" — keep, this phrase is fine
- The `Live` facade class — if its old definition was `export class Live { ... }`, the sed catches it; verify

**Step 3: Verify file references match exports**

```bash
grep -E "^export" packages/sync/src/index.ts
```

Expected exports:
```
export class SyncProvider ...
export class Sync ...
export const sync = ...
export interface SyncConfig ...
export interface SyncPersistence ...
export class MemoryPersistence ...
export function syncPrisma(...)
export function syncRedis(...)
export { syncObservers } from './observers.js'
```

### Task 2.2: Update `packages/sync/src/observers.ts`

**Step 1: Rename the registry constant**

The sed in 2.1 already handles this if it lives in `observers.ts`. Verify:

```bash
grep -n "Observers" packages/sync/src/observers.ts
```

Expected: every reference is `syncObservers` and `SyncObserver` (or whatever the type alias is).

### Task 2.3: Rename test imports

**File:** `/Users/sleman/Projects/rudder/packages/sync/src/index.test.ts`

**Step 1: Apply same renames**

```bash
sed -i '' \
  -e 's/\bLiveProvider\b/SyncProvider/g' \
  -e 's/\bLiveConfig\b/SyncConfig/g' \
  -e 's/\bLivePersistence\b/SyncPersistence/g' \
  -e 's/\bliveObservers\b/syncObservers/g' \
  -e 's/\blivePrisma\b/syncPrisma/g' \
  -e 's/\bliveRedis\b/syncRedis/g' \
  -e "s/from '@rudderjs\\/live'/from '@rudderjs\\/sync'/g" \
  -e 's/\bLive\./Sync\./g' \
  index.test.ts
```

**Step 2: Run tests**

```bash
cd /Users/sleman/Projects/rudder/packages/sync
pnpm test
```

Expected: all tests pass, including the Lexical block tests (they still live in `index.test.ts` until Phase 3 moves them).

If any test fails because the WebSocket path moved from `/ws-live` to `/ws-sync`, update the test fixture URL.

### Task 2.4: Update README and boost/guidelines

**Files:**
- `/Users/sleman/Projects/rudder/packages/sync/README.md`
- `/Users/sleman/Projects/rudder/packages/sync/boost/guidelines.md`

**Step 1: Replace package name + facade across both**

```bash
cd /Users/sleman/Projects/rudder/packages/sync
sed -i '' \
  -e 's|@rudderjs/live|@rudderjs/sync|g' \
  -e 's/\bLiveProvider\b/SyncProvider/g' \
  -e 's/\bLiveConfig\b/SyncConfig/g' \
  -e 's/\blivePrisma\b/syncPrisma/g' \
  -e 's/\bliveRedis\b/syncRedis/g' \
  -e 's/\bclass Live\b/class Sync/g' \
  -e 's/\b\(import.*\)Live\b/\1Sync/g' \
  README.md boost/guidelines.md
```

**Step 2: Hand-edit prose**

Read README top-to-bottom and rewrite phrasing that doesn't fit "sync engine" framing. For example:
- "Live collaboration via Yjs" → "Real-time sync via Yjs CRDT"
- Section headings about "Live documents" → "Sync documents" or "Documents"
- The opening paragraph should now position the package as the sync engine + editor adapters, with a one-liner pointer to `@rudderjs/sync/lexical`.

**Step 3: Pause for commit**

Suggested message: `refactor(sync): rename Live facade and exports → Sync (Live → Sync, liveX → syncX)`.

---

## Phase 3 — Extract Lexical helpers into `@rudderjs/sync/lexical`

### Task 3.1: Create the Lexical subpath directory

```bash
cd /Users/sleman/Projects/rudder/packages/sync
mkdir src/lexical
```

### Task 3.2: Create `packages/sync/src/lexical/index.ts`

**File (new):** `/Users/sleman/Projects/rudder/packages/sync/src/lexical/index.ts`

**Step 1: Move Lexical-specific code out of `src/index.ts`**

The functions to move (with their original line ranges from the survey, applied to the renamed file):
- `editBlock` (was 1245–1272)
- `insertBlock` (was 1291–1349)
- `removeBlock` (was 1365–1383)
- `editText` (was 1031–1071)
- `rewriteText` (was 1080–1183)
- `editTextBatch` (was 1190–1225)
- `setAiAwareness` (was 1399–1430)
- `clearAiAwareness` (was 1435–1444)
- `readText` (was 973–1011)
- Helpers: `findTextInXmlTree`, `findBlockInXmlTree`, `findBlockWithParentInXmlTree`, `encodeAiAwareness`
- Types: `InnerDeltaItem` and any lexical-shaped block types

**Important shape change:** these were facade methods on `Sync` (formerly `Live`). They now become standalone functions that take a `Y.Doc` (or the document handle that the `Sync` facade exposes). Add a thin lookup helper inside the adapter so callers can do:

```ts
import { sync } from '@rudderjs/sync'
import { editBlock, insertBlock } from '@rudderjs/sync/lexical'

const doc = await sync.document(name)
editBlock(doc, blockId, { text: 'hello' })
```

The `sync.document(name)` accessor needs to exist on the `Sync` facade — if it doesn't already, add a public method that returns the underlying `Y.Doc`. This is the only addition to the core surface in this phase.

**Step 2: Re-export from a single barrel**

```ts
// packages/sync/src/lexical/index.ts
export { editBlock, insertBlock, removeBlock } from './blocks.js'
export { editText, rewriteText, editTextBatch, readText } from './text.js'
export { setAiAwareness, clearAiAwareness } from './awareness.js'
export type { InnerDeltaItem, LexicalBlockShape } from './types.js'
```

Split the moved code into `blocks.ts`, `text.ts`, `awareness.ts`, `types.ts`, and shared `internal.ts` (for the tree-walking helpers). Keeping these in one file would re-create the same monolith problem — per `feedback_file_organization`, split by concern.

### Task 3.3: Add `sync.document(name)` accessor on the core facade if missing

**File:** `/Users/sleman/Projects/rudder/packages/sync/src/index.ts`

**Step 1: Grep for an existing accessor**

```bash
grep -n "document\|Y\.Doc" packages/sync/src/index.ts
```

If there's already a method (e.g. `getDocument(name)` used internally), expose it publicly and document it. If not, add:

```ts
public async document(name: string): Promise<Y.Doc> {
  return this.rooms.getOrCreate(name).doc
}
```

(Adapt to the actual room manager API — check lines 263-324 of the original `index.ts`.)

**Step 2: Export `Y.Doc` type re-export**

So adapters can type their parameters without an extra `yjs` peer dep:

```ts
export type { Doc as YDoc } from 'yjs'
```

### Task 3.4: Move Lexical tests

**Step 1: Create `packages/sync/src/lexical/index.test.ts`**

Move from `src/index.test.ts`:
- The `Sync.insertBlock` / `Sync.removeBlock` describe blocks (originally lines 424–612)
- Helpers: `buildParagraph`, `seedLexicalRoot`, `listBlocks`, `paragraphCount`

Update the imports and rewrite the calls to use the standalone-function shape:

```ts
import { sync } from '@rudderjs/sync'
import { insertBlock, removeBlock, editBlock } from '@rudderjs/sync/lexical'

const doc = await sync.document('test-doc')
insertBlock(doc, { ... })
```

### Task 3.5: Verify build + tests

**Step 1: Build**

```bash
cd /Users/sleman/Projects/rudder/packages/sync
rm -rf dist && pnpm build
```

Expected: emits `dist/index.js` and `dist/lexical/index.js` (and the split files).

**Step 2: Run all tests**

```bash
pnpm test
```

Expected: core tests pass against the slimmed `index.ts`, lexical tests pass against the new subpath.

**Step 3: Verify subpath import works from outside the package**

```bash
cd /Users/sleman/Projects/rudder/playground
pnpm exec node -e "import('@rudderjs/sync/lexical').then(m => console.log(Object.keys(m)))"
```

Expected: prints the exported names. Failure here means the `exports` map or the `dist/` layout is wrong — debug before moving on.

**Step 4: Pause for commit**

Suggested message: `refactor(sync): extract Lexical helpers into @rudderjs/sync/lexical subpath`.

---

## Phase 4 — Scaffold `@rudderjs/sync/tiptap`

### Task 4.1: Create the Tiptap subpath directory

```bash
cd /Users/sleman/Projects/rudder/packages/sync
mkdir src/tiptap
```

### Task 4.2: Create `packages/sync/src/tiptap/index.ts`

**File (new):** `/Users/sleman/Projects/rudder/packages/sync/src/tiptap/index.ts`

**Step 1: Define the type-level interface, no implementations**

The shape mirrors Lexical (so a future implementer has a clear template). Tiptap's collaborative model uses a `Y.XmlFragment` rather than the Lexical-shaped tree, so signatures differ. Write:

```ts
import type { Doc as YDoc } from 'yjs'

/**
 * Adapter shape for Tiptap collaborative documents.
 *
 * Tiptap uses prosemirror-y-binding — collaborative state lives in a
 * Y.XmlFragment under a configurable field name (defaults to "default"
 * via `fragmentField`).
 *
 * This subpath is currently a contract only. See README.md in this
 * directory for the integration plan.
 */

export interface TiptapAdapterOptions {
  fragmentField?: string
}

export interface TiptapBlock {
  type: string
  attrs?: Record<string, unknown>
  content?: TiptapBlock[]
  text?: string
}

export declare function readDoc(doc: YDoc, opts?: TiptapAdapterOptions): TiptapBlock[]
export declare function insertNode(doc: YDoc, position: number, node: TiptapBlock, opts?: TiptapAdapterOptions): void
export declare function removeNode(doc: YDoc, position: number, opts?: TiptapAdapterOptions): void
export declare function editText(doc: YDoc, position: number, edit: { from: number; to: number; insert: string }, opts?: TiptapAdapterOptions): void
export declare function setAiAwareness(doc: YDoc, awareness: { cursor?: number; selection?: [number, number] }, opts?: TiptapAdapterOptions): void
export declare function clearAiAwareness(doc: YDoc, opts?: TiptapAdapterOptions): void
```

The `declare function` form lets the subpath publish a type contract that callers can reference at compile time but throws at runtime if invoked — making the "not implemented yet" state loud instead of silent.

**Step 2: Add a runtime guard at the bottom of the file**

```ts
const NOT_IMPLEMENTED = '@rudderjs/sync/tiptap: adapter is scaffolded but not yet implemented. Track progress in docs/plans/2026-04-26-rename-live-to-sync.md.'

export const tiptap = new Proxy({}, {
  get(): never { throw new Error(NOT_IMPLEMENTED) }
})
```

Anyone who imports from the subpath at runtime gets a clear error, not `undefined`.

### Task 4.3: Add `packages/sync/src/tiptap/README.md`

**File (new):** `/Users/sleman/Projects/rudder/packages/sync/src/tiptap/README.md`

Brief integration plan for the future implementer. Sections:
- "Why subpath, not separate package"
- "Tiptap collab model in 60 seconds" — `prosemirror-y-binding`, `Y.XmlFragment`, `fragmentField` config
- "Mapping to the Lexical adapter" — table of equivalent operations
- "Peer deps when implemented" — `@tiptap/extension-collaboration`, `y-prosemirror`
- "Acceptance criteria" — what tests need to exist before this subpath drops the throwing proxy

Keep under 100 lines.

### Task 4.4: Verify build

**Step 1: Rebuild**

```bash
cd /Users/sleman/Projects/rudder/packages/sync
rm -rf dist && pnpm build
```

Expected: emits `dist/index.js`, `dist/lexical/index.js`, `dist/tiptap/index.js`.

**Step 2: Pause for commit**

Suggested message: `feat(sync): scaffold @rudderjs/sync/tiptap subpath (interface + throwing proxy)`.

---

## Phase 5 — Update consumers in this monorepo

### Task 5.1: Telescope collector

**Files:**
- `/Users/sleman/Projects/rudder/packages/telescope/src/collectors/live.ts` → rename to `sync.ts`
- `/Users/sleman/Projects/rudder/packages/telescope/package.json`
- `/Users/sleman/Projects/rudder/packages/telescope/src/collectors/index.ts` (or wherever the collector is registered)

**Step 1: Rename file**

```bash
cd /Users/sleman/Projects/rudder/packages/telescope/src/collectors
git mv live.ts sync.ts
```

**Step 2: Update file contents**

```bash
sed -i '' \
  -e "s|'@rudderjs/live'|'@rudderjs/sync'|g" \
  -e 's/\bliveObservers\b/syncObservers/g' \
  -e 's/\blive collector/sync collector/g' \
  sync.ts
```

**Step 3: Update collector registration**

Grep for the import:

```bash
grep -rn "collectors/live" packages/telescope/src/
```

Update each hit to `collectors/sync` and any registration key like `'live'` to `'sync'`.

**Step 4: Update `packages/telescope/package.json` optional peer**

```bash
grep -n "@rudderjs/live" packages/telescope/package.json
```

Replace `@rudderjs/live` with `@rudderjs/sync` in `peerDependencies`, `peerDependenciesMeta`, and `devDependencies` (if present). Use `workspace:^` per `feedback_changesets_workspace_caret`.

### Task 5.2: Vite plugin guidelines

**File:** `/Users/sleman/Projects/rudder/packages/vite/src/index.ts` (and any other vite source)

**Step 1: Search**

```bash
grep -rn "@rudderjs/live\|liveProvider\|LiveProvider" packages/vite/src/
```

**Step 2: Update each hit** to the renamed names.

### Task 5.3: Playground config + bootstrap

**Files:**
- `/Users/sleman/Projects/rudder/playground/package.json`
- `/Users/sleman/Projects/rudder/playground/config/live.ts` → rename to `sync.ts`
- `/Users/sleman/Projects/rudder/playground/config/index.ts` (re-exports)
- `/Users/sleman/Projects/rudder/playground/bootstrap/cache/providers.json` (regenerated)

**Step 1: Rename config file**

```bash
cd /Users/sleman/Projects/rudder/playground/config
git mv live.ts sync.ts
```

**Step 2: Update `sync.ts` contents**

```bash
sed -i '' \
  -e "s|'@rudderjs/live'|'@rudderjs/sync'|g" \
  -e 's/\blivePrisma\b/syncPrisma/g' \
  -e 's/\bliveRedis\b/syncRedis/g' \
  -e 's/\bLiveConfig\b/SyncConfig/g' \
  sync.ts
```

**Step 3: Update `config/index.ts`**

Find the `live` re-export and rename to `sync`:

```bash
grep -n "live" /Users/sleman/Projects/rudder/playground/config/index.ts
```

Edit accordingly.

**Step 4: Update `playground/package.json`**

Replace the dep:

```json
"@rudderjs/sync": "workspace:*"
```

(Removes the `@rudderjs/live` line.)

**Step 5: Regenerate the provider manifest**

```bash
cd /Users/sleman/Projects/rudder/playground
rm -f bootstrap/cache/providers.json
pnpm rudder providers:discover
```

Expected: writes a new manifest with `SyncProvider` from `@rudderjs/sync`.

### Task 5.4: Playground views and routes

**Files:**
- `/Users/sleman/Projects/rudder/playground/routes/web.ts`
- `/Users/sleman/Projects/rudder/playground/app/Views/Demos/Live.tsx` (do not rename — see decision 9)
- `/Users/sleman/Projects/rudder/playground/e2e/demos-live.spec.ts` (test file, not the URL)

**Step 1: Update import strings only**

```bash
cd /Users/sleman/Projects/rudder/playground
grep -rn "@rudderjs/live" routes/ app/ e2e/
```

For each hit, replace the import path. Keep all view names, route names (`/demos/live`), and component names (`<Live />`) untouched — they're user-facing labels independent of the package.

### Task 5.5: Scaffolder (`create-rudder-app`)

**File:** `/Users/sleman/Projects/rudder/create-rudder-app/src/templates.ts`

**Step 1: Rename the package option in `TemplateContext`**

Find line ~25:

```ts
packages: {
  // ...
  live: boolean   // → sync: boolean
}
```

**Step 2: Update conditional generation**

Find line ~124 where `configLive(ctx)` is called. Rename the helper function and the conditional check:

```bash
grep -n "live\|Live" /Users/sleman/Projects/rudder/create-rudder-app/src/templates.ts
```

Each option key, helper name, and generated file name should switch from `live` → `sync`. The CLI prompt label can stay as "Real-time sync (Yjs CRDT)" or similar — that's a user-facing string.

**Step 3: Check for prompt UI**

```bash
grep -rn "live\|Live" /Users/sleman/Projects/rudder/create-rudder-app/src/
```

Look at the multiselect prompt that lists optional packages. Update the label and the option value.

**Step 4: Verify a smoke scaffold (offline)**

```bash
cd /tmp && rm -rf rename-smoke
node /Users/sleman/Projects/rudder/create-rudder-app/dist/index.js rename-smoke --no-install --packages=sync
```

(Adjust flags to match the scaffolder's actual interface.) Expected: project generates with `@rudderjs/sync` in deps and `config/sync.ts` present.

**Step 5: Pause for commit**

Suggested message: `refactor: update telescope, vite, playground, scaffolder for @rudderjs/sync rename`.

---

## Phase 6 — Update docs in this monorepo

### Task 6.1: README + Architecture + CLAUDE.md

**Files:**
- `/Users/sleman/Projects/rudder/README.md` (lines 47, 396, 401, 489)
- `/Users/sleman/Projects/rudder/Architecture.md` (line 311)
- `/Users/sleman/Projects/rudder/CLAUDE.md` (search for `live`)
- `/Users/sleman/Projects/rudder/docs/claude/packages.md` (lines 51, 116)

**Step 1: Replace package references**

For each file, hand-edit the package name + facade name. Don't bulk-sed at this level — prose context matters (e.g. "live updates" is a real English phrase, not a package reference).

For `Architecture.md` line 311 (the package table), update name + description to:

```
| @rudderjs/sync | Yjs sync engine + editor adapters (Lexical, Tiptap shape) |
```

For `docs/claude/packages.md` line 116, same treatment + bump version to 0.1.0.

**Step 2: Update CLAUDE.md if it has package-specific guidance**

```bash
grep -n -i "live\|@rudderjs/live" /Users/sleman/Projects/rudder/CLAUDE.md
```

Likely no hits in the main project rules, but check.

### Task 6.2: VitePress guide pages

**Files:**
- `/Users/sleman/Projects/rudder/docs/packages/live.md` → rename to `sync.md`
- `/Users/sleman/Projects/rudder/docs/guide/websockets.md` (lines 178–279)

**Step 1: Rename the package doc**

```bash
cd /Users/sleman/Projects/rudder/docs/packages
git mv live.md sync.md
```

**Step 2: Hand-edit `sync.md`**

Rewrite the opening to position the package as a sync engine with editor adapters. Add a "Editor adapters" section pointing at `@rudderjs/sync/lexical` and noting `@rudderjs/sync/tiptap` as scaffolded-not-yet-shipped.

**Step 3: Update `docs/guide/websockets.md` section 4**

The "Live Collaboration" section becomes "Real-time Document Sync." Update all code samples to import from `@rudderjs/sync`. Adjust the WebSocket path notes to `/ws-sync`.

**Step 4: Update VitePress sidebar**

```bash
grep -rn "live\.md\|/live\b" /Users/sleman/Projects/rudder/docs/.vitepress/
```

Replace each entry with the `sync` equivalent.

### Task 6.3: Plan docs and launch article

**Files:**
- `/Users/sleman/Projects/rudder/docs/plans/panels-rich-text-authoring-plan.md` (lines 3, 7, 11, 150)
- `/Users/sleman/Projects/rudder/docs/plans/pilotiq-extraction-plan.md` (line 55)
- `/Users/sleman/Projects/rudder/docs/launch/dev-to-article.md` (line 29)

**Step 1: Replace references**

For each file, replace `@rudderjs/live` with `@rudderjs/sync`. Plan docs are historical artifacts, so add a brief note where the package name comes up: `**Note (2026-04-26):** package renamed from @rudderjs/live to @rudderjs/sync.` Don't rewrite the plans.

**Step 2: Pause for commit**

Suggested message: `docs: update for @rudderjs/sync rename`.

---

## Phase 7 — Update sibling repos (pilotiq, pilotiq-pro)

These updates run in parallel to the rudder PR. Each repo gets a branch + PR. **Per `feedback_multi_repo_link_overrides`, every `@rudderjs/*` reference in the consuming repo must point to the same workspace** — partial overrides cause dual-instance bugs.

### Task 7.1: pilotiq — root link override + panels package

**Files:**
- `/Users/sleman/Projects/pilotiq/package.json` (line 45)
- `/Users/sleman/Projects/pilotiq/packages/panels/package.json` (lines 51, 72, 95)
- `/Users/sleman/Projects/pilotiq/packages/panels/src/resolvers/resolveForm.ts` (line 144)
- `/Users/sleman/Projects/pilotiq/packages/panels/src/handlers/versionRoutes.ts` (lines 87, 140)
- `/Users/sleman/Projects/pilotiq/packages/panels/pages/@panel/resources/@resource/@id/edit/+data.ts` (lines 62, 72)
- `/Users/sleman/Projects/pilotiq/packages/panels/src/agents/types.ts` (line 25)
- `/Users/sleman/Projects/pilotiq/playground/app/Panels/Admin/pages/FieldsDemo.ts` (line 554)

**Step 1: Update root `package.json` link override**

Change:
```json
"@rudderjs/live": "link:../rudder/packages/live"
```
to:
```json
"@rudderjs/sync": "link:../rudder/packages/sync"
```

**Step 2: Update `packages/panels/package.json`**

Three hits — `dependencies`, pnpm `overrides`, `devDependencies`. Replace each. Use `^0.1.0` (matches the new sync version) for the runtime/dev hits; keep `link:` for the override.

**Step 3: Update dynamic imports**

```bash
cd /Users/sleman/Projects/pilotiq/packages/panels
grep -rn "@rudderjs/live" src/ pages/
```

For each:
- `loadOptional('@rudderjs/live')` → `loadOptional('@rudderjs/sync')`
- Any `import('@rudderjs/live')` → `import('@rudderjs/sync')`
- `Live.seed(...)` etc. → `Sync.seed(...)`

The dynamic-import pattern means TypeScript won't catch some of these at build time — be thorough with grep.

**Step 4: Update prose / type comments**

Files like `src/agents/types.ts` and `playground/.../FieldsDemo.ts` reference the package name in comments or UI text. Hand-edit each.

**Step 5: pnpm install + typecheck + boot playground**

```bash
cd /Users/sleman/Projects/pilotiq
pnpm install
pnpm typecheck
cd playground && pnpm dev
```

Visit the panels demo that exercises the live/sync path. Expected: works as before. If you see "module not found", a dynamic-import string was missed.

### Task 7.2: pilotiq-pro — root link override, ai package, playground

**Files:**
- `/Users/sleman/Projects/pilotiq-pro/package.json` (line 45)
- `/Users/sleman/Projects/pilotiq-pro/playground/package.json` (line 30)
- `/Users/sleman/Projects/pilotiq-pro/playground/config/live.ts` → rename to `sync.ts`
- `/Users/sleman/Projects/pilotiq-pro/playground/config/index.ts`
- `/Users/sleman/Projects/pilotiq-pro/playground/bootstrap/cache/providers.json` (regenerated)
- `/Users/sleman/Projects/pilotiq-pro/playground/pages/live-demo/+Page.tsx` (line 109)
- `/Users/sleman/Projects/pilotiq-pro/playground/pages/(panels)/@panel/resources/@resource/@id/edit/+data.ts` (lines 62, 72)
- `/Users/sleman/Projects/pilotiq-pro/playground/app/Panels/Admin/resources/ArticleResource.ts` (line 176)
- `/Users/sleman/Projects/pilotiq-pro/playground/app/Panels/Admin/pages/FieldsDemo.ts` (line 554)
- `/Users/sleman/Projects/pilotiq-pro/packages/ai/package.json` (lines 47, 58)
- `/Users/sleman/Projects/pilotiq-pro/packages/ai/src/agents/PanelAgent.ts` (line 25)
- `/Users/sleman/Projects/pilotiq-pro/packages/ai/src/handlers/chat/lazyImports.ts` (line 20)
- `/Users/sleman/Projects/pilotiq-pro/packages/ai/src/handlers/chat/tools/updateFormStateTool.ts` (line 18)

**Step 1: Apply the same rename pattern as Task 7.1**

```bash
cd /Users/sleman/Projects/pilotiq-pro
git mv playground/config/live.ts playground/config/sync.ts
grep -rln "@rudderjs/live" . --include="*.ts" --include="*.tsx" --include="*.json" \
  | grep -v node_modules | grep -v dist | grep -v bootstrap/cache \
  | xargs sed -i '' -e "s|@rudderjs/live|@rudderjs/sync|g"
```

For dynamic imports and facade calls, hand-update — the bulk sed handled the package name but not `Live.X` → `Sync.X`:

```bash
grep -rn "Live\." packages/ai/src/ playground/app/ playground/pages/ \
  | grep -v "alive\|delivery\|relive"
```

Edit each hit.

**Step 2: Regenerate provider manifest**

```bash
cd /Users/sleman/Projects/pilotiq-pro/playground
rm -f bootstrap/cache/providers.json
pnpm rudder providers:discover
```

**Step 3: pnpm install + typecheck + boot all three playgrounds**

Per the playground table in CLAUDE.md, all three playgrounds can run simultaneously (ports 3000/3001/3002). Boot each and verify the live/sync features still work.

```bash
cd /Users/sleman/Projects/rudder/playground && pnpm dev   # :3000
# new terminal
cd /Users/sleman/Projects/pilotiq/playground && pnpm dev  # :3001
# new terminal
cd /Users/sleman/Projects/pilotiq-pro/playground && pnpm dev # :3002
```

For each, hit the demo route that exercises the sync engine. Expected: WebSocket connects to `/ws-sync`, document edits sync, no console errors.

**Step 4: Pause for commit on each repo**

Three suggested messages, one per repo:
- pilotiq: `refactor: rename @rudderjs/live → @rudderjs/sync deps + dynamic imports`
- pilotiq-pro: `refactor: rename @rudderjs/live → @rudderjs/sync deps + dynamic imports`

---

## Phase 8 — End-to-end verification

Per `feedback_verify_before_push`, run these before opening any PR.

### Task 8.1: Repo-wide checks (rudder)

```bash
cd /Users/sleman/Projects/rudder
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

Expected: all four pass. Note that `feedback_turbo_cache_dist_stale` warns about stale dist confusion — if anything looks off, `rm -rf packages/*/dist` and rebuild before debugging code.

### Task 8.2: Verify the rename is complete

**Step 1: Search for stragglers**

```bash
cd /Users/sleman/Projects/rudder
grep -rn "@rudderjs/live\|LiveProvider\|LiveConfig\|liveObservers\|livePrisma\|liveRedis" \
  --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.turbo \
  --exclude-dir=bootstrap/cache
```

Expected output: only intentional historical references (e.g. CHANGELOG entries, plan docs marked with the rename note). No live application code, no current docs.

If hits remain in package code, fix them. If hits are in plan docs (`docs/plans/*.md`), they should already be marked with the historical-note from Task 6.3.

**Step 2: Same check in sibling repos**

```bash
cd /Users/sleman/Projects/pilotiq && grep -rn "@rudderjs/live" --include="*.ts" --include="*.tsx" --include="*.json" --exclude-dir=node_modules --exclude-dir=dist
cd /Users/sleman/Projects/pilotiq-pro && grep -rn "@rudderjs/live" --include="*.ts" --include="*.tsx" --include="*.json" --exclude-dir=node_modules --exclude-dir=dist
```

Expected: zero hits.

### Task 8.3: Boot smoke

Re-run the playground boot from Task 7.2 step 3. Click through:
- `/demos/live` (rudder playground) — Lexical + sync via `@rudderjs/sync/lexical`
- The pilotiq panels demo that uses sync
- The pilotiq-pro article editor that uses sync via the AI package

Expected: WebSocket connects, edits sync between two browser windows, AI awareness markers appear, no console errors, no `Cannot find module '@rudderjs/live'` warnings in the server log.

---

## Phase 9 — Changeset, release, npm deprecation

### Task 9.1: Changesets in the rudder repo

```bash
cd /Users/sleman/Projects/rudder
pnpm changeset
```

In the prompt:
- Select packages: `@rudderjs/sync` (major bump? — pre-1.0, use minor → goes to 0.1.0, which we already set in Task 1.4. Treat as a fresh package: pick `minor` and let the changeset bump from 0.0.0 → 0.1.0. If changesets refuses because there's no prior version on npm yet, set the version manually.)
- Also select `@rudderjs/telescope`, `@rudderjs/vite`, `@rudderjs/create-rudder-app` if their published deps changed — patch each.
- Description: `Renamed @rudderjs/live to @rudderjs/sync. Lexical helpers moved to @rudderjs/sync/lexical subpath. Tiptap subpath scaffolded.`

### Task 9.2: PR + merge + auto-publish

Per `project_cicd_pipeline`, merging the changeset triggers Changesets to open a version-packages PR; per `feedback_changesets_bot_ci`, that PR may need close+reopen to trigger CI. Watch for it after merge.

### Task 9.3: Deprecate `@rudderjs/live` on npm

After `@rudderjs/sync@0.1.0` is published:

```bash
npm deprecate @rudderjs/live "Renamed to @rudderjs/sync. See https://github.com/rudderjs/rudder/blob/main/docs/plans/2026-04-26-rename-live-to-sync.md"
```

Per CLAUDE.md publishing notes: npm requires browser passkey auth — press Enter when prompted.

### Task 9.4: Sibling repo PRs

After `@rudderjs/sync@0.1.0` is on npm:
- pilotiq PR: bump deps from `link:../rudder/packages/live` (already removed) → `^0.1.0` for the published version (or keep link: for dogfooding — match existing convention)
- pilotiq-pro PR: same

Open and merge after rudder is published.

---

## Out of scope (explicitly deferred)

These were considered for this plan and **deliberately not included**. Capture them in follow-up issues:

1. **Backwards-compat shim package** (`@rudderjs/live` re-exporting from `@rudderjs/sync`). Decided against in Decision 1; revisit only if the npm deprecation notice isn't sufficient.
2. **Tiptap adapter implementation.** Phase 4 is scaffold only. Implementation gets its own plan.
3. **Unifying presence between sync (AI awareness) and broadcast (presence channels).** Mentioned as a structural gap in the original review; warrants its own design pass.
4. **Adding `LiveObject` / `LiveMap` / `LiveList` native structured types** (Liveblocks-style alternative to Yjs). Big design discussion, separate plan.
5. **Renaming `@rudderjs/broadcast`.** Decided to keep — Laravel naming is on-brand.
6. **`Room` facade that ties channel + document + presence together.** Separate plan; this plan only renames + reshapes the existing surface.
7. **WebSocket path migration aid** (e.g. accepting both `/ws-live` and `/ws-sync` for one minor version). Decided unnecessary — pre-1.0, no external production users.

---

## Risk notes

- **Provider auto-discovery cache** (`bootstrap/cache/providers.json`) is gitignored per CLAUDE.md but exists in three repos. Each playground needs the regen step (Tasks 5.3 step 5, 7.1 boot, 7.2 step 2). Skipping it produces a misleading "package not loading" error that points at the wrong cause (`feedback_changesets_bot_ci` is the wrong fix; the real fix is `pnpm rudder providers:discover`).
- **Dynamic imports in pilotiq panels and pilotiq-pro ai** (`loadOptional('@rudderjs/live')`, `import('@rudderjs/live')`) are not type-checked, so missing one won't fail `pnpm typecheck`. The smoke boot in Task 8.3 is the only catcher — don't skip it.
- **Tsbuildinfo cache** (`feedback_turbo_cache_dist_stale`): if anything in the new `dist/lexical/` or `dist/tiptap/` looks stale, blow away `dist/` + any `*.tsbuildinfo` and rebuild before assuming a code bug.
- **Multi-renderer view scanner** (`Multi-renderer installed error`): unrelated to this plan, but the playground `app/Views/Demos/Live.tsx` rename was deliberately skipped for this reason — the scanner reacts badly to view file renames mid-session.

---

Plan complete and saved to `docs/plans/2026-04-26-rename-live-to-sync.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Good if you want to watch each phase land and gate on review.

**2. Parallel Session (separate)** — Open a new session in the worktree and use `executing-plans`, batch execution with checkpoints. Good if you want to do other work in this session while it runs.

Which approach?
