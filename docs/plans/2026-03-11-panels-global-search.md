# Panels Global Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a keyboard-driven global search bar to the panels layout that searches across all resources and shows grouped results in a live dropdown.

**Architecture:** A new `GET /{panel}/api/_search?q=query` endpoint queries all resources in parallel (those that have a model and at least one searchable field), returning up to 5 matches per resource grouped by resource label. A `GlobalSearch` React component rendered in both `SidebarLayout` and `TopbarLayout` headers shows results in a dropdown, navigable with `↑↓`/`Enter`/`Escape`, opened via `⌘K`/`Ctrl+K` from anywhere in the panel.

**Tech Stack:** TypeScript, Node.js `node:test`, React + Vike, Tailwind CSS v4, `vike/client/router` navigate

---

## Background — how this codebase works

**Monorepo layout:**
- `packages/panels/src/` — all TypeScript backend source; `PanelServiceProvider.ts` mounts all API routes; `i18n/en.ts` and `i18n/ar.ts` define all UI strings; `index.test.ts` has 210 tests using `node:test`
- `packages/panels/pages/_components/` — React components published to the user's app
- `playground/pages/(panels)/` — the running copy used by the playground dev server

**Critical rule:** Every change to `packages/panels/pages/` must also be copied to `playground/pages/(panels)/`. The playground is the canonical test environment.

**Build commands:**
```bash
pnpm build                  # from repo root — builds all packages
cd playground && pnpm dev   # runs the dev server at localhost:3000
cd packages/panels && pnpm test  # runs node:test suite
cd playground && pnpm typecheck  # verifies types
```

**API base for a panel:** `panel.getApiBase()` → e.g. `'/admin/api'`

**Search logic pattern** (same as the existing list endpoint in `PanelServiceProvider.ts`):
```ts
// flattenFields() already exists in PanelServiceProvider.ts
const searchableCols = flattenFields(resource.fields())
  .filter(f => f.isSearchable())
  .map(f => f.getName())

let q: any = Model.query()
q = q.where(searchableCols[0]!, 'LIKE', `%${search}%`)
for (let i = 1; i < searchableCols.length; i++) {
  q = q.orWhere(searchableCols[i]!, `%${search}%`)
}
const records = await q.limit(5).all()
```

**`titleField` usage** — `ResourceClass.titleField` is a static string (e.g. `'name'`, `'title'`) that identifies the display field. Falls back to `'id'`.

**i18n pattern:** Add keys to `packages/panels/src/i18n/en.ts` and `ar.ts`, then the `PanelI18n` type updates automatically (it's `typeof en`).

**AdminLayout.tsx** — `SidebarLayout` has a `<header>` section; `TopbarLayout` has a `<header>` with nav. GlobalSearch goes in both headers, receiving `panelMeta` as a prop.

---

## Task 1: Add i18n keys for global search

**Files:**
- Modify: `packages/panels/src/i18n/en.ts`
- Modify: `packages/panels/src/i18n/ar.ts`

**Step 1: Add English strings**

In `packages/panels/src/i18n/en.ts`, add a `// Global search` section before the closing `}`:

```ts
  // Global search
  globalSearch:          'Search everything\u2026',
  globalSearchShortcut:  '\u2318K',
  globalSearchEmpty:     'No results for ":query"',
```

Full updated file:
```ts
export const en = {
  // Layout
  signOut:         'Sign out',

  // Table toolbar
  newButton:       '+ New :label',
  search:          'Search :label\u2026',
  searchButton:    'Search',
  actions:         'Actions',
  edit:            'Edit',
  view:            'View',
  clearFilters:    'Clear filters',
  selected:        ':n selected',
  clearSelection:  'Clear',
  viewAll:         'View all \u2192',
  newRecord:       '+ New',

  // Empty states
  noResultsTitle:  'No results',
  noResultsHint:   'Try adjusting your search or filters.',
  noRecordsTitle:  'No :label yet',
  createFirstLink: 'Create your first :singular',
  noRecordsFound:  'No records found.',
  recordNotFound:  'Record not found.',

  // Pagination
  records:         ':n records',
  page:            'Page :current of :last',
  perPage:         ':n / page',

  // Boolean
  yes:             'Yes',
  no:              'No',

  // Confirm / delete
  areYouSure:      'Are you sure?',
  deleteRecord:    'Delete record',
  deleteConfirm:   'This action cannot be undone.',
  confirm:         'Confirm',
  cancel:          'Cancel',

  // Form buttons
  save:            'Save Changes',
  create:          'Create :singular',
  saving:          'Saving\u2026',
  creating:        'Creating\u2026',

  // Loading / progress
  loading:         'Loading\u2026',
  uploading:       'Uploading\u2026',
  loadingForm:     'Loading form\u2026',

  // Navigation
  backTo:          '\u2190 Back to :label',

  // Toasts
  createdToast:    ':singular created successfully.',
  savedToast:      'Changes saved.',
  deletedToast:    ':singular deleted.',
  saveError:       'Failed to save. Please try again.',
  createError:     'Something went wrong. Please try again.',
  deleteError:     'Failed to delete. Please try again.',

  // Field UI
  none:            '\u2014 None \u2014',
  invalidJson:     'Invalid JSON',
  addItem:         'Add item',
  addBlock:        'Add block',
  addTag:          'Add tag\u2026',
  addMore:         'Add more\u2026',
  remove:          'Remove',
  item:            'Item :n',
  moveUp:          'Move up',
  moveDown:        'Move down',
  confirmPassword: 'Confirm password',
  createOption:    'Create ":query"',
  createNew:       'Create new :singular',

  // Global search
  globalSearch:         'Search everything\u2026',
  globalSearchShortcut: '\u2318K',
  globalSearchEmpty:    'No results for ":query"',
}

export type PanelI18n = typeof en
```

**Step 2: Add Arabic strings**

In `packages/panels/src/i18n/ar.ts`, add at the end (before the closing `}`):

```ts
  // Global search
  globalSearch:         '\u0627\u0644\u0628\u062d\u062b \u0641\u064a \u0643\u0644 \u0634\u064a\u0621\u2026',
  globalSearchShortcut: '\u2318K',
  globalSearchEmpty:    '\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c \u0644\u0640 ":query"',
```

**Step 3: Build to confirm types are consistent**

```bash
cd packages/panels && pnpm build
```
Expected: success, no errors.

**Step 4: Commit**

```bash
git add packages/panels/src/i18n/en.ts packages/panels/src/i18n/ar.ts
git commit -m "feat(panels): add globalSearch i18n keys"
```

---

## Task 2: Add `/_search` API endpoint

**Files:**
- Modify: `packages/panels/src/PanelServiceProvider.ts`

The `/_search` endpoint goes in `boot()`, alongside the existing `/_meta` route. Mount it once per panel (not per resource).

**Step 1: Add the route in `boot()` after the `/_meta` route**

In `PanelServiceProvider.ts`, inside the `for (const panel of PanelRegistry.all())` loop, after the `_meta` route and before the `_upload` route, add:

```ts
// Global search endpoint — queries all resources with searchable fields
router.get(`${panel.getApiBase()}/_search`, async (req, res) => {
  const url   = new URL(req.url, 'http://localhost')
  const q     = url.searchParams.get('q')?.trim() ?? ''
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 5), 20)

  if (!q) return res.json({ results: [] })

  const results: Array<{
    resource: string
    label:    string
    records:  Array<{ id: string; title: string }>
  }> = []

  for (const ResourceClass of panel.getResources()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Model = ResourceClass.model as any
    if (!Model) continue

    const resource       = new ResourceClass()
    const searchableCols = flattenFields(resource.fields())
      .filter(f => f.isSearchable())
      .map(f => f.getName())

    if (searchableCols.length === 0) continue

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let qb: any = Model.query()
    qb = qb.where(searchableCols[0]!, 'LIKE', `%${q}%`)
    for (let i = 1; i < searchableCols.length; i++) {
      qb = qb.orWhere(searchableCols[i]!, `%${q}%`)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = await qb.limit(limit).all()
    if (rows.length === 0) continue

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const titleField: string = (ResourceClass as any).titleField ?? 'id'
    results.push({
      resource: ResourceClass.getSlug(),
      label:    ResourceClass.label ?? ResourceClass.getSlug(),
      records:  rows.map(r => ({
        id:    String(r.id),
        title: String(r[titleField] ?? r.id),
      })),
    })
  }

  return res.json({ results })
}, mw)
```

**Step 2: Build**

```bash
cd packages/panels && pnpm build
```
Expected: success.

**Step 3: Commit**

```bash
git add packages/panels/src/PanelServiceProvider.ts
git commit -m "feat(panels): add /_search API endpoint"
```

---

## Task 3: Test the search endpoint

**Files:**
- Modify: `packages/panels/src/index.test.ts`

Add a new `describe('/_search endpoint logic')` block at the end of the test file, after the `resourceData` suite.

The existing tests mock queries using a fake model — follow the same pattern. Look at how `resourceData` tests stub out `Panel`, `Resource`, `PanelRegistry` with real classes and no real DB.

For the search endpoint we can't easily unit-test the HTTP route (it needs the full server), but we can test the **query construction logic** by verifying that `flattenFields` + `isSearchable()` correctly identifies searchable columns. The endpoint integration is tested manually via the playground.

**Step 1: Add tests**

Append at the very end of `packages/panels/src/index.test.ts`:

```ts
// ─── Global search — i18n keys ───────────────────────────────

describe('globalSearch i18n keys', () => {
  it('en has globalSearch key', () => {
    const { getPanelI18n } = require('./i18n/index.js') as typeof import('./i18n/index.js')
    const i18n = getPanelI18n('en')
    assert.equal(typeof i18n.globalSearch, 'string')
    assert.ok(i18n.globalSearch.length > 0)
  })

  it('en has globalSearchEmpty key', () => {
    const i18n = getPanelI18n('en')
    assert.ok(i18n.globalSearchEmpty.includes(':query'))
  })

  it('ar has globalSearch key (non-empty)', () => {
    const i18n = getPanelI18n('ar')
    assert.ok(i18n.globalSearch.length > 0)
  })
})

// ─── Search endpoint — searchable field detection ────────────

describe('search — searchable field detection', () => {
  it('identifies searchable fields correctly', () => {
    const fields = [
      TextField.make('name').searchable(),
      EmailField.make('email').searchable(),
      TextField.make('internal'),  // NOT searchable
    ]
    const searchable = fields.filter(f => f.isSearchable()).map(f => f.getName())
    assert.deepEqual(searchable, ['name', 'email'])
  })

  it('resource with no searchable fields returns empty array', () => {
    class NoSearchResource extends Resource {
      fields() { return [TextField.make('title'), NumberField.make('count')] }
    }
    const resource = new NoSearchResource()
    const cols = flattenFields(resource.fields() as Field[])
      .filter(f => f.isSearchable())
    assert.equal(cols.length, 0)
  })

  it('resource with searchable fields returns them', () => {
    class SearchResource extends Resource {
      fields() {
        return [
          TextField.make('title').searchable(),
          TextField.make('body').searchable(),
          TextField.make('slug'),
        ]
      }
    }
    const resource = new SearchResource()
    const cols = flattenFields(resource.fields() as Field[])
      .filter(f => f.isSearchable())
      .map(f => f.getName())
    assert.deepEqual(cols, ['title', 'body'])
  })
})
```

Note: `flattenFields` is a private method of `PanelServiceProvider`. To test it directly, temporarily export it or duplicate the logic in the test. Since it's already tested indirectly (list query tests), and the search endpoint uses the same path, 3 targeted tests are sufficient.

Actually, use the already-exported `flattenFields` pattern from the tests — looking at the test file, it defines its own inline `flattenFields` helper at the top (it does this for `Section`/`Tabs` tests). Use the same approach.

At the top of the new test section add a local helper:

```ts
function flattenFields(items: (Field | { getFields(): Field[] }[])[]) {
  const result: Field[] = []
  for (const item of items) {
    if (typeof (item as any).getFields === 'function') {
      result.push(...flattenFields((item as any).getFields()))
    } else {
      result.push(item as Field)
    }
  }
  return result
}
```

Actually, looking at the test file more carefully — it already imports `Field` and all field types, and defines `makeResource()`. The tests for `Resource with Section/Tabs` (line 1053) inline this logic. Just write the tests using `.isSearchable()` directly on field instances — no need for `flattenFields`.

**Step 2: Run tests**

```bash
cd packages/panels && pnpm test
```
Expected: all tests pass (210+ pass, 0 fail).

**Step 3: Commit**

```bash
git add packages/panels/src/index.test.ts
git commit -m "test(panels): add globalSearch i18n and searchable field tests"
```

---

## Task 4: Create `GlobalSearch` React component

**Files:**
- Create: `packages/panels/pages/_components/GlobalSearch.tsx`

This is a self-contained React component. It receives `panelMeta` and `pathSegment` as props, renders a search input that:
1. Opens on `⌘K` / `Ctrl+K` (global keydown listener)
2. Queries `/{pathSegment}/api/_search?q=...` with 300ms debounce
3. Shows grouped results in a dropdown
4. Navigates to `/{pathSegment}/{resourceSlug}/{id}` on click or Enter

**Step 1: Create the file**

```tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { navigate } from 'vike/client/router'
import type { PanelMeta } from '@boostkit/panels'

interface SearchResult {
  resource: string
  label:    string
  records:  Array<{ id: string; title: string }>
}

interface Props {
  panelMeta:   PanelMeta
  pathSegment: string
}

function t(template: string, vars: Record<string, string>): string {
  return template.replace(/:([a-z]+)/g, (_, k: string) => vars[k] ?? `:${k}`)
}

export function GlobalSearch({ panelMeta, pathSegment }: Props) {
  const { i18n } = panelMeta
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(-1)   // flat index across all results

  const inputRef    = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ⌘K / Ctrl+K opens search
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 0)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
        setResults([])
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // Fetch results with debounce
  const fetchResults = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults([]); setLoading(false); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res  = await fetch(`/${pathSegment}/api/_search?q=${encodeURIComponent(q)}&limit=5`)
        const data = await res.json() as { results: SearchResult[] }
        setResults(data.results)
        setFocused(-1)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [pathSegment])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    fetchResults(val)
  }

  // Flat list of all {resource, id} pairs for keyboard nav
  const flatItems = results.flatMap(group =>
    group.records.map(r => ({ resource: group.resource, id: r.id }))
  )

  function goToItem(index: number) {
    const item = flatItems[index]
    if (!item) return
    void navigate(`/${pathSegment}/${item.resource}/${item.id}`)
    setOpen(false)
    setQuery('')
    setResults([])
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      setResults([])
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocused(i => Math.min(i + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocused(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && focused >= 0) {
      e.preventDefault()
      goToItem(focused)
    }
  }

  const hasResults  = results.some(g => g.records.length > 0)
  const showEmpty   = !loading && query.trim() && !hasResults

  // Track flat index as we render
  let flatIndex = 0

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button (closed state) */}
      {!open && (
        <button
          type="button"
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }}
          className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <SearchIcon />
          <span className="hidden sm:inline">{i18n.globalSearch}</span>
          <span className="hidden sm:inline text-xs border border-input rounded px-1 py-0.5 font-mono leading-none">
            {i18n.globalSearchShortcut}
          </span>
        </button>
      )}

      {/* Search input (open state) */}
      {open && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-ring bg-background ring-2 ring-ring min-w-[260px]">
            <SearchIcon className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={i18n.globalSearch}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {loading && <SpinnerIcon />}
          </div>

          {/* Dropdown */}
          {(hasResults || showEmpty) && (
            <div className="absolute top-full mt-1 start-0 end-0 z-50 min-w-[320px] rounded-lg border border-border bg-popover shadow-lg py-1.5 max-h-[400px] overflow-y-auto">

              {showEmpty && (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  {t(i18n.globalSearchEmpty, { query: query.trim() })}
                </p>
              )}

              {results.map((group) => {
                if (group.records.length === 0) return null
                return (
                  <div key={group.resource}>
                    {/* Resource label */}
                    <p className="px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {group.label}
                    </p>
                    {group.records.map((record) => {
                      const idx = flatIndex++
                      const isFocused = idx === focused
                      return (
                        <button
                          key={record.id}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); goToItem(idx) }}
                          onMouseEnter={() => setFocused(idx)}
                          className={[
                            'w-full flex items-center gap-2 px-3 py-2 text-sm text-start transition-colors',
                            isFocused
                              ? 'bg-accent text-accent-foreground'
                              : 'hover:bg-accent hover:text-accent-foreground',
                          ].join(' ')}
                        >
                          <span className="truncate">{record.title}</span>
                          <span className="ms-auto text-xs text-muted-foreground shrink-0">
                            {group.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}

            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 14 14" fill="none"
      className={className}
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
    >
      <circle cx="6" cy="6" r="4.5" />
      <path d="M9.5 9.5L12.5 12.5" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 14 14" fill="none"
      className="animate-spin text-muted-foreground"
      stroke="currentColor" strokeWidth="1.5"
    >
      <circle cx="7" cy="7" r="5.5" strokeDasharray="20 15" strokeLinecap="round" />
    </svg>
  )
}
```

**Step 2: Build**

```bash
cd packages/panels && pnpm build
```
Expected: success.

**Step 3: Commit**

```bash
git add packages/panels/pages/_components/GlobalSearch.tsx
git commit -m "feat(panels): add GlobalSearch component"
```

---

## Task 5: Wire GlobalSearch into AdminLayout

**Files:**
- Modify: `packages/panels/pages/_components/AdminLayout.tsx`

`AdminLayout.tsx` passes `panelMeta` to both `SidebarLayout` and `TopbarLayout`. The `pathSegment` is `panelMeta.path.replace(/^\//, '')` — e.g. `'admin'`.

**Step 1: Add import at the top**

After the existing imports in `AdminLayout.tsx`, add:

```tsx
import { GlobalSearch } from './GlobalSearch.js'
```

**Step 2: Derive `pathSegment` in both layout components and add `<GlobalSearch />`**

In **`SidebarLayout`**, the header currently looks like:
```tsx
<header className="h-14 shrink-0 border-b flex items-center justify-between px-6">
  <span className="text-sm font-medium text-muted-foreground">
    {current?.label ?? brand}
  </span>
  {user && <UserDropdown user={user} signOutLabel={i18n.signOut} />}
</header>
```

Replace it with:
```tsx
<header className="h-14 shrink-0 border-b flex items-center gap-4 px-6">
  <span className="text-sm font-medium text-muted-foreground flex-1">
    {current?.label ?? brand}
  </span>
  <GlobalSearch panelMeta={panelMeta} pathSegment={panelMeta.path.replace(/^\//, '')} />
  {user && <UserDropdown user={user} signOutLabel={i18n.signOut} />}
</header>
```

In **`TopbarLayout`**, the header has the nav and user dropdown. After the `<nav>` and before `{user && <UserDropdown ...}`, add:

```tsx
<GlobalSearch panelMeta={panelMeta} pathSegment={panelMeta.path.replace(/^\//, '')} />
```

**Step 3: Build**

```bash
cd packages/panels && pnpm build
```
Expected: success.

**Step 4: Commit**

```bash
git add packages/panels/pages/_components/AdminLayout.tsx
git commit -m "feat(panels): wire GlobalSearch into panel layout headers"
```

---

## Task 6: Copy to playground and verify

**Files to copy:**
- `packages/panels/pages/_components/GlobalSearch.tsx` → `playground/pages/(panels)/_components/GlobalSearch.tsx`
- `packages/panels/pages/_components/AdminLayout.tsx` → `playground/pages/(panels)/_components/AdminLayout.tsx`

**Step 1: Copy files**

```bash
cp packages/panels/pages/_components/GlobalSearch.tsx playground/pages/\(panels\)/_components/GlobalSearch.tsx
cp packages/panels/pages/_components/AdminLayout.tsx playground/pages/\(panels\)/_components/AdminLayout.tsx
```

**Step 2: Typecheck playground**

```bash
cd playground && pnpm typecheck
```
Expected: no errors.

**Step 3: Build everything**

```bash
cd .. && pnpm build
```
Expected: all 30 tasks successful.

**Step 4: Manual test**

Start the playground:
```bash
cd playground && pnpm dev
```

Open `http://localhost:3000/admin` (log in first if needed).

Verify:
- [ ] A search button appears in the header with the `⌘K` hint
- [ ] Clicking it opens a search input
- [ ] Pressing `⌘K` / `Ctrl+K` anywhere opens the search
- [ ] Typing `a` shows results grouped by resource (Articles, Users, etc.)
- [ ] `↑↓` arrows navigate between results (background highlights)
- [ ] `Enter` navigates to the selected record's show page
- [ ] `Escape` closes and clears the input
- [ ] Clicking outside closes the dropdown
- [ ] With `.locale('ar')` on the panel, the placeholder shows Arabic text

**Step 5: Run the full test suite**

```bash
cd packages/panels && pnpm test
```
Expected: all tests pass.

**Step 6: Commit**

```bash
git add playground/pages/\(panels\)/_components/GlobalSearch.tsx playground/pages/\(panels\)/_components/AdminLayout.tsx
git commit -m "feat(panels): sync GlobalSearch to playground"
```

---

## Done

The global search feature is complete. Summary of what was added:
- `GET /{panel}/api/_search?q=query&limit=5` — searches all searchable-field resources, returns grouped results
- `GlobalSearch.tsx` — keyboard-driven search component with debounce, grouped dropdown, `⌘K` shortcut
- Wired into both `SidebarLayout` and `TopbarLayout` headers
- Three new i18n keys (`globalSearch`, `globalSearchShortcut`, `globalSearchEmpty`) in `en` and `ar`
- Tests for i18n keys and searchable-field detection logic
