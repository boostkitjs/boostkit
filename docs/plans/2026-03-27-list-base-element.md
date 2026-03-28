# List Base Element — Extract shared data-view infrastructure from Table

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract a `List` base element from `Table` that provides shared data-view infrastructure (data sources, search, pagination, filters, actions, lazy/poll/live, remember, views) so that `Table`, `Media`, and future views (grid, kanban) are thin wrappers over a common pipeline.

**Architecture:** `List` becomes the base data-view element owning all shared infrastructure. `Table` extends `List` and adds columns, inline editing, reorder, and tabs. The resolver pipeline splits into `resolveList()` (shared query/search/filter/pagination) called by `resolveTable()`. The React side splits into a shared `useDataView()` hook (fetch, search, filter, pagination, remember, lazy/poll/live state) and per-view renderers. Existing `List` (simple static items) is renamed to `SimpleList` to free up the name.

**Tech Stack:** TypeScript, React, Vike SSR, node:test

---

## Naming Decisions

| Current | New | Reason |
|---------|-----|--------|
| `List` (static items) | `List` (data-view base) | Overwrite in place — old API (`.items()`, `.data()`) stays as subset of new |
| `Table` | `Table extends List` | Table is a List with column layout |
| — | `View` | Builder for custom view modes |
| — | `ListRegistry` | Registry for lazy/poll List instances |

> **No rename needed.** The existing `List.make('title').items([...])` API is kept as-is. `.items()` becomes sugar for static data. The new List just adds `.fromModel()`, `.searchable()`, `.paginated()`, etc. on top.

## Phase Overview

| Phase | What | Risk | Commits |
|-------|------|------|---------|
| 1 | Verify existing `List` baseline | Low — no changes | 1 |
| 2 | Create `List` base class extracted from Table | Medium — API surface | 3 |
| 3 | Make `Table` extend `List` | High — must not break SSR or any feature | 4 |
| 4 | Extract shared resolver `resolveList()` | High — query pipeline | 3 |
| 5 | DataField base class + ViewMode field system | Medium — new class hierarchy | 4 |
| 6 | Extract shared React hook `useDataView()` | High — client state | 4 |
| 7 | Build view renderers with DataField + editable | Medium — new UI + edit integration | 4 |
| 8 | Wire SSR view persistence | Low — extend remember | 2 |
| 9 | Record click behavior (`.onRecordClick()`) | Low — additive | 1 |
| 10 | Record grouping (`.groupBy()`) | Medium — query + UI | 2 |
| 11 | Export (`.exportable()`) | Medium — new endpoint + UI | 2 |
| 12 | Responsive default view (`.defaultView()`) | Low — container query + persist | 2 |
| 13 | Folder navigation (`.folder()`) | Medium — query scope + breadcrumbs UI | 3 |
| 14 | Migrate Media to use List pipeline | Medium — cross-package | 2 |

---

## Phase 1: Extend existing `List` in place

### Task 1.1: Verify existing List API surface

The current `List` at `packages/panels/src/schema/List.ts` has: `.items()`, `.data()`, `.lazy()`, `.poll()`, `.live()`, `.limit()`, `.description()`, `.id()`. All of these stay — the new List adds data-view features on top.

No rename, no import changes, no breaking changes.

**Step 1: Run existing list tests to establish baseline**

```bash
cd packages/panels && pnpm test
```

**Step 2: Commit** (no changes — just a checkpoint)

---

## Phase 2: Create `List` base class

### Task 2.1: Extend List.ts with shared infrastructure from Table

**Files:**
- Modify: `packages/panels/src/schema/List.ts` — add all shared data-view features, keep existing `.items()` and `.data()` API

**Step 1: Extend List class**

Add all shared features from Table. Keep existing API intact. The old `.items()` becomes sugar for static data, `.data()` stays as the async data function (equivalent to `.fromArray()`).

List owns:

```ts
// packages/panels/src/schema/List.ts

import type { Filter } from './Filter.js'
import type { Action } from './Action.js'
import type { DataSource } from '../datasource.js'
import type { PersistMode } from '../persist.js'
import type { PanelContext } from '../types.js'

type ModelClass = { new(): any; query(): any }
type ResourceClass = { new(): any; getSlug(): string; model?: ModelClass }
type SchemaElement = { getType(): string }

// ─── View definitions ─────────────────────────────────
export type ViewPreset = 'list' | 'grid'

export interface ViewDefinition {
  type:    string
  name:    string
  label:   string
  icon?:   string
  render?: (record: Record<string, unknown>) => SchemaElement[]
}

// ─── List config (shared by all data-view elements) ──
export interface ListConfig {
  title:           string
  resourceClass?:  any
  model?:          any
  rows?:           DataSource | undefined
  limit:           number
  sortBy?:         string
  sortDir:         'ASC' | 'DESC'
  scope?:          ((query: any) => any) | undefined
  description?:    string
  emptyMessage?:   string
  href?:           string
  searchable?:     boolean
  searchColumns?:  string[]
  paginationType?: 'pages' | 'loadMore'
  perPage:         number
  filters:         Filter[]
  actions:         Action[]
  lazy?:           boolean
  pollInterval?:   number
  live?:           boolean
  id?:             string
  remember?:       PersistMode
  softDeletes:     boolean
  titleField?:     string
  descriptionField?: string
  imageField?:     string
  emptyState?:     { icon?: string; heading?: string; description?: string }
  creatableUrl?:   string | boolean
  views:           ViewDefinition[]
  activeView?:     string
  renderFn?:       (record: Record<string, unknown>) => SchemaElement[]
  groupBy?:        string
  onRecordClick?:  'view' | 'edit' | ((record: Record<string, unknown>) => string)
  exportable?:     ('csv' | 'json')[] | boolean
  defaultView?:    Record<string, string>  // container breakpoint → view name, e.g. { sm: 'list', lg: 'grid' }
  folderField?:    string                  // parent field for folder navigation (e.g. 'parentId')
}

export class List {
  // ── All shared private fields (moved from Table) ──
  protected _title: string
  protected _resourceClass?: any
  protected _model?: any
  protected _rows?: DataSource
  protected _limit = 5
  protected _sortBy?: string
  protected _sortDir: 'ASC' | 'DESC' = 'DESC'
  protected _scope?: (query: any) => any
  protected _description?: string
  protected _emptyMessage?: string
  protected _href?: string
  protected _searchable = false
  protected _searchColumns?: string[]
  protected _paginationType?: 'pages' | 'loadMore'
  protected _perPage = 15
  protected _lazy = false
  protected _pollInterval?: number
  protected _live = false
  protected _id?: string
  protected _remember: PersistMode = false
  protected _filters: Filter[] = []
  protected _actions: Action[] = []
  protected _softDeletes = false
  protected _titleField?: string
  protected _descriptionField?: string
  protected _imageField?: string
  protected _emptyState?: { icon?: string; heading?: string; description?: string }
  protected _creatableUrl?: string | boolean
  protected _views: ViewDefinition[] = []
  protected _renderFn?: (record: Record<string, unknown>) => SchemaElement[]
  protected _groupBy?: string
  protected _onRecordClick?: 'view' | 'edit' | ((record: Record<string, unknown>) => string)
  protected _exportable?: ('csv' | 'json')[] | boolean
  protected _defaultView?: Record<string, string>
  protected _folderField?: string

  protected constructor(title: string) {
    this._title = title
  }

  static make(title: string): List {
    return new List(title)
  }

  // ── Data sources (same as Table) ──
  fromResource(resourceClass: ResourceClass): this { ... }
  fromModel(model: ModelClass): this { ... }
  fromArray(data: DataSource): this { ... }
  scope(fn: (query: any) => any): this { ... }

  // ── Display ──
  description(text: string): this { ... }
  emptyMessage(text: string): this { ... }
  href(url: string): this { ... }
  limit(n: number): this { ... }
  sortBy(col: string, dir?: 'ASC' | 'DESC'): this { ... }
  titleField(name: string): this { ... }
  descriptionField(name: string): this { ... }
  imageField(name: string): this { ... }
  emptyState(config: { icon?: string; heading?: string; description?: string }): this { ... }
  creatable(url: string | boolean = true): this { ... }

  // ── Query/Filter ──
  searchable(columns?: string[]): this { ... }
  filters(filters: Filter[]): this { ... }
  softDeletes(value?: boolean): this { ... }

  // ── Pagination ──
  paginated(mode?: 'pages' | 'loadMore', perPage?: number): this { ... }

  // ── Interaction ──
  actions(actions: Action[]): this { ... }

  // ── Record click behavior ──
  // 'view' → navigate to /{id}, 'edit' → navigate to /{id}/edit
  // function → custom URL from record data
  onRecordClick(handler: 'view' | 'edit' | ((record: Record<string, unknown>) => string)): this {
    this._onRecordClick = handler
    return this
  }

  // ── Grouping ──
  // Group records by a field value (e.g., status, category)
  // Renders group headers in list/grid views, groups in table view
  groupBy(field: string): this {
    this._groupBy = field
    return this
  }

  // ── Folder navigation ──
  // Enable folder-style drill-down navigation via parent field.
  // Scopes query to WHERE parentField = :currentFolder (root = null).
  // Renders breadcrumb trail, folder items clickable to navigate in.
  // Current folder persisted via remember + URL (?folder=id).
  folder(parentField: string): this {
    this._folderField = parentField
    return this
  }

  // ── Export ──
  // Add export button to toolbar. Downloads filtered/searched dataset.
  // true = ['csv'], or specify formats explicitly
  exportable(formats: ('csv' | 'json')[] | boolean = true): this {
    this._exportable = formats
    return this
  }

  // ── State ──
  remember(mode?: PersistMode): this { ... }

  // ── Real-time ──
  lazy(): this { ... }
  poll(ms: number): this { ... }
  live(): this { ... }
  id(id: string): this { ... }

  // ── Views (NEW) ──
  // Single custom render
  render(fn: (record: Record<string, unknown>) => SchemaElement[]): this {
    this._renderFn = fn
    return this
  }

  // Multiple view modes with toggle
  views(defs: (ViewPreset | ViewDefinition)[]): this {
    this._views = defs.map(d => {
      if (typeof d === 'string') {
        return { type: d, name: d, label: d.charAt(0).toUpperCase() + d.slice(1) }
      }
      return d
    })
    return this
  }

  // Responsive default view per container breakpoint (uses container queries)
  // SSR renders largest breakpoint. Client detects container width, auto-switches
  // on first visit, then persists via remember — no flash on subsequent visits.
  // Breakpoints: sm (< 480px), md (480-767px), lg (>= 768px)
  defaultView(map: Record<string, string>): this {
    this._defaultView = map
    return this
  }

  // ── Getters (same as Table) ──
  getId(): string { ... }
  isLazy(): boolean { ... }
  isLive(): boolean { ... }
  getPollInterval(): number | undefined { ... }
  getRemember(): PersistMode { ... }
  getFilters(): Filter[] { ... }
  getActions(): Action[] { ... }
  getType(): string { return 'list' }

  // ── Config ──
  getConfig(): ListConfig { ... }

  // ── Clone (for tabs) ──
  _cloneBase(target: List): void {
    // Copy all shared fields from this to target
    // Used by Table._cloneWithScope()
  }
}
```

**Step 3: Run tests**

```bash
cd packages/panels && pnpm test
```

**Step 4: Commit**

```bash
git commit -m "feat(panels): create List base class with shared data-view infrastructure"
```

### Task 2.2: Write tests for List base class

**Files:**
- Create: `packages/panels/src/__tests__/list-base.test.ts`

**Tests to write:**
- `List.make('title')` returns instance with correct type
- `.fromModel()` / `.fromArray()` / `.fromResource()` set data source
- `.searchable()`, `.filters()`, `.paginated()` configure query
- `.lazy()`, `.poll()`, `.live()` configure real-time
- `.remember()` configures persistence
- `.titleField()` / `.descriptionField()` / `.imageField()` set display fields
- `.render(fn)` sets custom render function
- `.views(['list', 'grid'])` configures view modes
- `.defaultView({ sm: 'list', lg: 'grid' })` configures responsive defaults
- `.groupBy('status')` configures record grouping
- `.onRecordClick('edit')` configures click behavior
- `.onRecordClick((r) => '/custom/' + r.id)` configures custom click
- `.exportable()` defaults to `['csv']`
- `.exportable(['csv', 'json'])` configures explicit formats
- `.folder('parentId')` configures folder navigation field
- `.getConfig()` returns complete config including new fields
- `.getId()` auto-generates from title

**Commit:**

```bash
git commit -m "test(panels): add List base class tests"
```

### Task 2.3: Create View builder class

**Files:**
- Create: `packages/panels/src/schema/View.ts`
- Modify: `packages/panels/src/schema/index.ts` — export View
- Test: `packages/panels/src/__tests__/view.test.ts`

```ts
// packages/panels/src/schema/View.ts
import type { Column } from './Column.js'

type SchemaElement = { getType(): string }

export class View {
  private _type:    string
  private _name:    string
  private _label:   string
  private _icon?:   string
  private _renderFn?: (record: Record<string, unknown>) => SchemaElement[]
  private _columns?: Column[]

  private constructor(name: string) {
    this._type  = 'custom'
    this._name  = name
    this._label = name.charAt(0).toUpperCase() + name.slice(1)
  }

  static make(name: string): View { return new View(name) }

  // Preset factories
  static table(columns: Column[]): View {
    const v = new View('table')
    v._type    = 'table'
    v._label   = 'Table'
    v._icon    = 'table'
    v._columns = columns
    return v
  }

  static grid(): View {
    const v = new View('grid')
    v._type  = 'grid'
    v._label = 'Grid'
    v._icon  = 'layout-grid'
    return v
  }

  static list(): View {
    const v = new View('list')
    v._type  = 'list'
    v._label = 'List'
    v._icon  = 'list'
    return v
  }

  label(label: string): this { this._label = label; return this }
  icon(icon: string): this { this._icon = icon; return this }
  render(fn: (record: Record<string, unknown>) => SchemaElement[]): this {
    this._renderFn = fn
    return this
  }

  // Getters
  getType(): string { return this._type }
  getName(): string { return this._name }
  getLabel(): string { return this._label }
  getIcon(): string | undefined { return this._icon }
  getRenderFn(): ((record: Record<string, unknown>) => SchemaElement[]) | undefined { return this._renderFn }
  getColumns(): Column[] | undefined { return this._columns }

  toMeta(): { type: string; name: string; label: string; icon?: string; hasColumns?: boolean } {
    const meta: Record<string, unknown> = {
      type:  this._type,
      name:  this._name,
      label: this._label,
    }
    if (this._icon) meta.icon = this._icon
    if (this._columns) meta.hasColumns = true
    return meta as any
  }
}
```

**Commit:**

```bash
git commit -m "feat(panels): add View builder class for configurable view modes"
```

---

## Phase 3: Make Table extend List

### Task 3.1: Refactor Table to extend List

**Files:**
- Modify: `packages/panels/src/schema/Table.ts` — extend List, remove duplicated fields/methods

**Critical:** This is the highest-risk change. Table must behave exactly as before. The approach:

1. `Table extends List`
2. Remove all fields/methods that now live in List (data sources, search, pagination, filters, actions, lazy/poll/live, remember, softDeletes, description, emptyMessage, href, limit, sortBy, scope, titleField, emptyState, creatable)
3. Keep Table-specific: `_columns`, `_reorderable`, `_reorderField`, `_onSaveFn`, `_tabs`, `_listTabs`
4. Override `getType()` to return `'table'`
5. Override `getConfig()` to return `TableConfig` (extends ListConfig with table-specific fields)
6. Keep `_cloneWithScope()` but use `_cloneBase()` from List

```ts
// Table.ts — after refactor
import { List } from './List.js'
import type { ListConfig } from './List.js'
import type { Column } from './Column.js'
import type { Tab } from './Tabs.js'
import type { ListTab } from './Tab.js'

type TableSaveHandler = (record: Record<string, unknown>, field: string, value: unknown, ctx: PanelContext) => Promise<void> | void

export interface TableConfig extends ListConfig {
  columns:       string[] | Column[]
  reorderable:   boolean
  reorderField:  string
  onSave?:       TableSaveHandler
  tabs:          Tab[]
  listTabs:      ListTab[]
}

export class Table extends List {
  private _columns: string[] | Column[] = []
  private _reorderable = false
  private _reorderField = 'position'
  private _onSaveFn?: TableSaveHandler
  private _tabs: Tab[] = []
  private _listTabs: ListTab[] = []

  protected constructor(title: string) {
    super(title)
  }

  static make(title: string): Table {
    return new Table(title)
  }

  // ── Table-only methods ──
  columns(cols: string[] | Column[]): this { this._columns = cols; return this }
  reorderable(positionField = 'position'): this { ... }
  onSave(fn: TableSaveHandler): this { ... }
  tabs(tabs: Tab[]): this { ... }
  listTabs(tabs: ListTab[]): this { ... }

  // ── Overrides ──
  getType(): 'table' { return 'table' }

  getConfig(): TableConfig {
    return {
      ...super.getConfig(),  // all List config
      columns:      this._columns,
      reorderable:  this._reorderable,
      reorderField: this._reorderField,
      onSave:       this._onSaveFn,
      tabs:         this._tabs,
      listTabs:     this._listTabs,
    }
  }

  _cloneWithScope(id: string, scopeFn?: (query: any) => any): Table {
    const clone = Table.make(this._title)
    this._cloneBase(clone)  // copy all List fields
    // Copy Table-specific fields
    clone._columns      = this._columns
    clone._reorderable  = this._reorderable
    clone._reorderField = this._reorderField
    // ... etc
    clone._id = id
    if (scopeFn) clone._scope = scopeFn
    return clone
  }
}
```

**Step 2: Run ALL existing table tests**

```bash
cd packages/panels && pnpm test
```

Every single existing test must pass unchanged. If any fail, fix the Table extension — do NOT change the tests.

**Step 3: Build full monorepo**

```bash
pnpm build
```
Expected: 33 tasks successful.

**Step 4: Manual SSR verification**

Start playground, verify these pages render correctly:
- `/admin` (dashboard with tables)
- `/admin/resources/categories` (resource table)
- `/admin/resources/articles` (table with tabs, pagination, filters, inline edit)
- `/admin/tables-demo` (standalone tables)

**Step 5: Commit**

```bash
git commit -m "refactor(panels): make Table extend List base class — zero behavior change"
```

### Task 3.2: Verify backward compatibility of exports

**Files:**
- Modify: `packages/panels/src/schema/index.ts` — export both List and Table
- Modify: `packages/panels/src/index.ts` — export List, View

**Critical checks:**
- `Table.make()` still works exactly as before
- `resolveTable()` still works (receives Table which extends List)
- `TableConfig` includes all previous fields
- `TableElementMeta` unchanged
- All playground code compiles without changes

**Commit:**

```bash
git commit -m "feat(panels): export List and View from package index"
```

---

## Phase 4: Extract shared resolver

### Task 4.1: Create `resolveListQuery()` shared function

**Files:**
- Create: `packages/panels/src/resolvers/resolveListQuery.ts`
- Modify: `packages/panels/src/resolvers/resolveTable.ts` — call `resolveListQuery()` instead of duplicating query logic

The shared function handles: model query, scope, search, filters, sort, limit/offset, pagination count. Returns `{ records, pagination? }`.

```ts
// resolveListQuery.ts
export interface ListQueryResult {
  records:     RecordRow[]
  pagination?: { total: number; currentPage: number; perPage: number; lastPage: number; type: 'pages' | 'loadMore' }
}

export async function resolveListQuery(
  config: ListConfig,
  ctx: PanelContext,
  opts?: { persistedState?: Record<string, unknown> }
): Promise<ListQueryResult> {
  // Branch: fromArray vs fromModel/fromResource
  // Handle search, filters, sort, scope, limit, pagination
  // Return records + optional pagination
}
```

**Step 1: Extract query logic from resolveTable.ts lines 49-190 into resolveListQuery()**

**Step 2: Make resolveTable() call resolveListQuery() + add table-specific logic (columns, transforms, buildTableMeta)**

**Step 3: Run all tests**

```bash
cd packages/panels && pnpm test
```

**Step 4: Commit**

```bash
git commit -m "refactor(panels): extract resolveListQuery() from resolveTable — shared query pipeline"
```

### Task 4.2: Create `resolveListElement()` for List schema resolution

**Files:**
- Create: `packages/panels/src/resolvers/resolveListElement.ts`
- Modify: `packages/panels/src/resolveSchema.ts` — add 'dataview' / 'list' case calling resolveListElement

```ts
// resolveListElement.ts
export async function resolveListElement(
  list: List,
  panel: Panel,
  ctx: PanelContext,
): Promise<ListElementMeta | null> {
  // Register in ListRegistry (for lazy/poll)
  // Call resolveListQuery() for data
  // Apply render function to records if set
  // Build meta with views, active view, records
}
```

**Commit:**

```bash
git commit -m "feat(panels): add resolveListElement() for List schema resolution"
```

### Task 4.3: Add List API routes (lazy/poll endpoint)

**Files:**
- Create: `packages/panels/src/handlers/meta/listRoutes.ts`
- Modify: `packages/panels/src/handlers/metaRoutes.ts` — mount list routes

The list API endpoint mirrors the table endpoint but returns list-formatted data instead of table rows.

**Commit:**

```bash
git commit -m "feat(panels): add List API routes for lazy/poll/paginated data"
```

---

## Phase 5: DataField base class + ViewMode field system

### Design Decisions (implemented)

**DataField / Column hierarchy:**
```
DataField (base) — view-agnostic field display
  - .compute(), .display(), .editable()
  - .badge(), .date(), .image(), .boolean(), .numeric()
  - .label(), .href()

Column extends DataField — adds table-specific features
  - .sortable(), .searchable()
```

**All view modes accept DataField[]** — consistent API:
```ts
.views([
  ViewMode.list([
    DataField.make('name').editable(),
    DataField.make('slug'),
  ]),
  ViewMode.grid([
    DataField.make('coverImage').image(),
    DataField.make('name').editable(),
  ]),
  ViewMode.table([
    Column.make('name').sortable().editable(),
    Column.make('slug'),
  ]),
])
```

**Duplicate view types** — use `.label()` for unique names:
```ts
ViewMode.table([...]).label('Compact')    // name = 'compact'
ViewMode.table([...]).label('Detailed')   // name = 'detailed'
```

**Editable fields** — same inline/popover/modal modes across all views:
- Inline: click field text → becomes input (list title, grid card text, table cell)
- Popover: click → popover anchored to field
- Modal: click → full modal form

### Task 5.1: Create DataField base class

**Files:**
- Create: `packages/panels/src/schema/DataField.ts`
- Modify: `packages/panels/src/schema/Column.ts` — extend DataField
- Modify: `packages/panels/src/schema/index.ts` — export DataField
- Test: `packages/panels/src/__tests__/datafield.test.ts`

```ts
// DataField.ts — view-agnostic field display
export class DataField {
  protected _name:       string
  protected _label?:     string
  protected _type:       'string' | 'numeric' | 'boolean' | 'date' | 'image' | 'badge' = 'string'
  protected _format?:    string
  protected _href?:      string
  protected _editable:   boolean = false
  protected _editMode?:  'inline' | 'popover' | 'modal'
  protected _editField?: Field
  protected _computeFn?: (record: Record<string, unknown>) => unknown
  protected _displayFn?: (value: unknown, record?: Record<string, unknown>) => unknown

  static make(name: string): DataField { return new DataField(name) }

  // Display type hints
  numeric(): this { this._type = 'numeric'; return this }
  boolean(): this { this._type = 'boolean'; return this }
  date(format?: string): this { this._type = 'date'; this._format = format; return this }
  image(): this { this._type = 'image'; return this }
  badge(): this { this._type = 'badge'; return this }

  // Computed/display
  compute(fn): this { ... }
  display(fn): this { ... }

  // Editable
  editable(modeOrField?, mode?): this { ... }

  // Label / href
  label(label: string): this { ... }
  href(pattern: string): this { ... }
}
```

**Column extends DataField:**
```ts
export class Column extends DataField {
  sortable(): this { ... }
  searchable(): this { ... }
  // Column keeps its existing API — full backward compat
}
```

**Commit:**
```bash
git commit -m "feat(panels): create DataField base class, Column extends it"
```

### Task 5.2: Update ViewMode to accept DataField[]

**Files:**
- Modify: `packages/panels/src/schema/ViewMode.ts` — all factories accept `DataField[]`

```ts
ViewMode.list(fields?: DataField[])   // optional — falls back to titleField/descriptionField
ViewMode.grid(fields?: DataField[])
ViewMode.table(columns: Column[])     // Column extends DataField
```

ViewMode stores `_fields: DataField[]` and serializes them in `toMeta()`.

**Commit:**
```bash
git commit -m "feat(panels): ViewMode accepts DataField[] for all view types"
```

### Task 5.3: Wire views + fields into List meta serialization

**Files:**
- Modify: `packages/panels/src/resolvers/resolveListElement.ts` — resolve DataField per view, include in meta

**Meta output:**
```json
{
  "type": "dataview",
  "views": [
    {
      "type": "list",
      "name": "list",
      "label": "List",
      "fields": [
        { "name": "name", "type": "string", "editable": true, "editMode": "inline" },
        { "name": "slug", "type": "string" }
      ]
    },
    {
      "type": "table",
      "name": "compact",
      "label": "Compact",
      "fields": [
        { "name": "name", "type": "string", "sortable": true, "editable": true },
        { "name": "slug", "type": "string" }
      ]
    }
  ],
  "records": [...]
}
```

Each view carries its own field definitions. The renderer reads the active view's fields.

**Commit:**
```bash
git commit -m "feat(panels): resolve DataField per view in list meta"
```

### Task 5.4: Handle custom render functions (SSR)

When `.render(fn)` or `ViewMode.make().render(fn)` is used, the render function runs server-side per record.

**Commit:**
```bash
git commit -m "feat(panels): resolve custom render functions per record in SSR"
```

---

## Phase 6: Extract shared React hook

### Task 6.1: Create `useDataView()` hook

**Files:**
- Create: `packages/panels/pages/_hooks/useDataView.ts`

Extract from SchemaTable.tsx all shared state management:

```ts
export function useDataView(opts: {
  element:      DataViewElement
  panelPath:    string
  resourceSlug?: string
}) {
  // State: records, search, sort, pagination, activeFilters, selectedIds, loading
  // fetchData() — unified API fetch
  // handleSearchChange() — debounced search
  // handleFilterChange() — filter apply/clear
  // handlePageChange() — pagination
  // handleSortChange() — sort toggle
  // saveRememberState() — persist state
  // Effects: lazy load, poll, live WebSocket, restore from cache
  // Returns all state + handlers
}
```

**Step 1: Extract ~300 lines of state management from SchemaTable.tsx into the hook**

**Step 2: Refactor SchemaTable.tsx to use `useDataView()` — zero visual change**

**Step 3: Run manual SSR verification on all table pages**

**Step 4: Commit**

```bash
git commit -m "refactor(panels): extract useDataView() hook from SchemaTable"
```

### Task 6.2: Verify SchemaTable still works identically

Run through every feature manually:
- Search (type, clear, persist across navigation)
- Sort (click column, toggle direction)
- Filters (apply, clear, persist)
- Pagination (pages mode, loadMore mode)
- Inline editing (all 3 modes)
- Bulk actions (select, execute)
- Drag-to-reorder
- Lazy loading
- Remember (session, localStorage, url)
- Soft deletes (trash toggle, restore)
- Live updates (if WebSocket available)

**Commit:**

```bash
git commit -m "test(panels): verify SchemaTable works with useDataView hook"
```

### Task 6.3: Create SchemaDataView wrapper component

**Files:**
- Create: `packages/panels/pages/_components/SchemaDataView.tsx`

```tsx
// Thin wrapper that uses useDataView() + renders the active view
export function SchemaDataView({ element, panelPath, i18n, resource }: Props) {
  const dv = useDataView({ element, panelPath, resourceSlug: resource?.resourceSlug })

  // Render toolbar (search, filters, view toggle, actions)
  // Render active view (list, grid, table, custom)
  // Render pagination footer
}
```

**Commit:**

```bash
git commit -m "feat(panels): add SchemaDataView wrapper component"
```

### Task 6.4: Mirror all new hooks/components to playground

Copy all new files to `playground/pages/(panels)/`.

**Commit:**

```bash
git commit -m "chore: mirror new data-view files to playground"
```

---

## Phase 7: Build view renderers with DataField + editable support

### Task 7.1: Build list view renderer with DataField

**Files:**
- Create: `packages/panels/pages/_components/views/ListView.tsx`

Renders records using DataField definitions from the active view. Falls back to `titleField`/`descriptionField`/`imageField` when no fields defined.

**Field rendering in list view:**
- First `string` field → bold title
- Second `string` field → muted subtitle
- `image` field → left thumbnail
- `badge` field → inline badge
- `date` field → formatted date
- Additional fields → small text below

**Editable fields:** Each editable DataField renders with an edit trigger:
- `inline`: click text → becomes input (reuses `TableEditCell` / `InlineEditCell`)
- `popover`: click → popover form (reuses `TableEditPopover`)
- `modal`: click → modal form (reuses `TableEditModal`)

```tsx
export function ListView({ records, fields, getHref, onSave, i18n }: ListViewProps) {
  return (
    <div className="divide-y rounded-xl border">
      {records.map(record => (
        <div key={String(record.id)} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30">
          {fields.map(field => (
            <DataFieldValue
              key={field.name}
              field={field}
              record={record}
              editable={field.editable}
              editMode={field.editMode}
              onSave={onSave}
            />
          ))}
          {getHref(record) && <a href={getHref(record)!} className="text-xs text-muted-foreground">→</a>}
        </div>
      ))}
    </div>
  )
}
```

**Commit:**
```bash
git commit -m "feat(panels): add ListView renderer with DataField + editable support"
```

### Task 7.2: Build grid view renderer with DataField

**Files:**
- Create: `packages/panels/pages/_components/views/GridView.tsx`

Same DataField rendering as ListView but in card layout. Image fields render as card cover.

**Commit:**
```bash
git commit -m "feat(panels): add GridView renderer with DataField + editable support"
```

### Task 7.3: Create shared DataFieldValue component

**Files:**
- Create: `packages/panels/pages/_components/views/DataFieldValue.tsx`

Renders a single DataField value with type-aware formatting and optional edit trigger. Shared by ListView, GridView, and any future view.

```tsx
export function DataFieldValue({ field, record, onSave }: DataFieldValueProps) {
  const value = record[field.name]

  // Render by type
  if (field.type === 'image') return <img src={String(value)} ... />
  if (field.type === 'badge') return <Badge>{String(value)}</Badge>
  if (field.type === 'boolean') return <Badge>{value ? 'Yes' : 'No'}</Badge>
  if (field.type === 'date') return <span>{formatDate(value, field.format)}</span>

  // Editable wrapper
  if (field.editable) {
    if (field.editMode === 'inline') return <InlineEditCell ... />
    if (field.editMode === 'popover') return <TableEditPopover ... />
    if (field.editMode === 'modal') return <TableEditModal ... />
  }

  return <span>{String(value ?? '')}</span>
}
```

**Commit:**
```bash
git commit -m "feat(panels): add DataFieldValue shared component for type-aware rendering"
```

### Task 7.4: Wire view renderers into SchemaDataView

**Files:**
- Modify: `packages/panels/pages/_components/SchemaDataView.tsx` — render active view using ListView, GridView, or TableView with DataField definitions

Each view reads its own field definitions from the meta. The save endpoint is shared (`/_tables/:id/save`).

**Commit:**
```bash
git commit -m "feat(panels): wire DataField-based view renderers with edit support"
```

---

## Phase 8: SSR view persistence

### Task 8.1: Persist active view in remember state

**Files:**
- Modify: `packages/panels/pages/_hooks/useDataView.ts` — include `activeView` in remember state
- Modify: `packages/panels/src/resolvers/resolveListElement.ts` — read persisted active view for SSR

The active view is persisted alongside page/sort/search/filters using the same `remember` mechanism.

**Commit:**

```bash
git commit -m "feat(panels): persist active view mode in remember state (SSR + client)"
```

### Task 8.2: Add view toggle to resolveSchema

**Files:**
- Modify: `packages/panels/src/resolveSchema.ts` — handle new list/dataview type

**Commit:**

```bash
git commit -m "feat(panels): register list element type in resolveSchema"
```

---

## Phase 9: Record click behavior

### Task 9.1: Wire onRecordClick into meta and renderers

**Files:**
- Modify: `packages/panels/src/schema/List.ts` — serialize `onRecordClick` to meta
- Modify: `packages/panels/src/resolvers/resolveListElement.ts` — resolve click handler (for function handlers, pre-compute URLs per record server-side)
- Modify: `packages/panels/pages/_components/views/ListView.tsx` — use click config
- Modify: `packages/panels/pages/_components/views/GridView.tsx` — use click config
- Modify: `packages/panels/pages/_components/SchemaTable.tsx` — respect click config (currently hardcoded to `/{id}`)

**Meta output:**
```json
{
  "recordClick": "edit"
}
// or for function handlers, pre-resolved per record:
{
  "records": [
    { "id": "1", "title": "...", "_href": "/custom/1" }
  ]
}
```

For `'view'` → `/{href}/{id}`, for `'edit'` → `/{href}/{id}/edit`, for function → resolved URL stored as `_href` on each record.

**Commit:**
```bash
git commit -m "feat(panels): add onRecordClick with view/edit/custom URL support"
```

---

## Phase 10: Record grouping

### Task 10.1: Add groupBy to resolver

**Files:**
- Modify: `packages/panels/src/resolvers/resolveListQuery.ts` — when `groupBy` is set, sort records by group field first, then by sortBy
- Modify: `packages/panels/src/resolvers/resolveListElement.ts` — include `groupBy` field in meta

**Meta output:**
```json
{
  "groupBy": "status",
  "records": [
    { "id": "1", "status": "draft", "title": "..." },
    { "id": "2", "status": "draft", "title": "..." },
    { "id": "3", "status": "published", "title": "..." }
  ]
}
```

Records come pre-sorted by group field. The renderer groups them client-side by reading consecutive values.

**Commit:**
```bash
git commit -m "feat(panels): add groupBy to list resolver — pre-sort by group field"
```

### Task 10.2: Render group headers in list/grid views

**Files:**
- Modify: `packages/panels/pages/_components/views/ListView.tsx` — render group headers when `groupBy` is set
- Modify: `packages/panels/pages/_components/views/GridView.tsx` — render group sections

```tsx
// ListView with grouping
const groups = groupRecords(records, groupBy)
return (
  <div className="divide-y rounded-xl border">
    {groups.map(({ label, records }) => (
      <div key={label}>
        <div className="px-4 py-2 bg-muted/40 text-xs font-medium text-muted-foreground uppercase">
          {label}
        </div>
        {records.map(record => <ListItem key={record.id} ... />)}
      </div>
    ))}
  </div>
)
```

**Commit:**
```bash
git commit -m "feat(panels): render group headers in list and grid views"
```

---

## Phase 11: Export

### Task 11.1: Add export API endpoint

**Files:**
- Create: `packages/panels/src/handlers/meta/exportRoutes.ts`
- Modify: `packages/panels/src/handlers/metaRoutes.ts` — mount export routes

**Endpoint:** `GET /{apiBase}/_lists/{listId}/export?format=csv&search=&filter[status]=active`

The endpoint reuses `resolveListQuery()` with the current search/filter state (no pagination — exports all matching records). Returns:
- `format=csv` → `text/csv` with header row
- `format=json` → `application/json` array

**Commit:**
```bash
git commit -m "feat(panels): add export API endpoint (CSV + JSON)"
```

### Task 11.2: Add export button to toolbar

**Files:**
- Modify: `packages/panels/pages/_components/SchemaDataView.tsx` — add export dropdown button when `exportable` is set

The button passes current search/filter state as query params to the export endpoint. Browser downloads the file.

```tsx
{exportable && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="..."><DownloadIcon /> Export</button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      {formats.map(fmt => (
        <DropdownMenuItem key={fmt} onClick={() => handleExport(fmt)}>
          {fmt.toUpperCase()}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
)}
```

**Commit:**
```bash
git commit -m "feat(panels): add export button to data-view toolbar"
```

---

## Phase 12: Responsive default view (container queries)

### Task 12.1: Add container query detection to SchemaDataView

**Files:**
- Modify: `packages/panels/pages/_components/SchemaDataView.tsx` — wrap in container, detect width on mount

**Approach (Option 2 — one-time flash, then persist):**

1. SSR renders the largest breakpoint default (e.g., `lg → 'grid'`)
2. Client mounts, `ResizeObserver` reads container width
3. If no persisted view AND `defaultView` is set:
   - Determine breakpoint: `sm` (< 480px), `md` (480-767px), `lg` (>= 768px)
   - If current view differs from breakpoint default → switch + persist immediately
4. Subsequent visits use persisted view — no flash

```tsx
// Container setup
<div ref={containerRef} style={{ containerType: 'inline-size' }}>
  {/* toolbar + view content */}
</div>

// Effect: auto-select view based on container width (first visit only)
useEffect(() => {
  if (hasPersistedView || !defaultView || !containerRef.current) return
  const width = containerRef.current.clientWidth
  const bp = width < 480 ? 'sm' : width < 768 ? 'md' : 'lg'
  const target = defaultView[bp] ?? defaultView['lg'] ?? defaultView['md'] ?? defaultView['sm']
  if (target && target !== activeView) {
    setActiveView(target)
    saveRememberState({ ...state, view: target })
  }
}, [])
```

**Commit:**
```bash
git commit -m "feat(panels): responsive default view via container width detection"
```

### Task 12.2: Hide unavailable view toggles at small breakpoints

**Files:**
- Modify: `packages/panels/pages/_components/SchemaDataView.tsx` — CSS container queries hide view toggle buttons

```css
/* Hide table view toggle when container is too narrow */
@container (max-width: 480px) {
  [data-view-toggle="table"] { display: none; }
}
```

This is purely CSS — no JS flash, buttons are hidden by the browser before paint.

**Commit:**
```bash
git commit -m "feat(panels): hide view toggles at small container widths via container queries"
```

---

## Phase 13: Folder navigation

### Task 13.1: Add folder scoping to resolver

**Files:**
- Modify: `packages/panels/src/resolvers/resolveListQuery.ts` — when `folderField` is set, add `WHERE folderField = :currentFolder` scope
- Modify: `packages/panels/src/resolvers/resolveListElement.ts` — read `?folder=id` from URL/persist, include in meta

**Query behavior:**
- No `?folder` param → scope to `WHERE parentId IS NULL` (root level)
- `?folder=abc123` → scope to `WHERE parentId = 'abc123'`
- Search still works within the current folder scope

**Meta output:**
```json
{
  "folderField": "parentId",
  "currentFolder": "abc123",
  "breadcrumbs": [
    { "id": null, "label": "Root" },
    { "id": "xyz", "label": "Photos" },
    { "id": "abc123", "label": "Vacation" }
  ],
  "records": [...]
}
```

Breadcrumbs are resolved server-side by walking up the parent chain.

**Commit:**
```bash
git commit -m "feat(panels): add folder scoping to list resolver"
```

### Task 13.2: Render folder breadcrumbs and drill-down UI

**Files:**
- Create: `packages/panels/pages/_components/views/FolderBreadcrumbs.tsx`
- Modify: `packages/panels/pages/_components/SchemaDataView.tsx` — render breadcrumbs above toolbar when `folderField` is set

**Behavior:**
- Records with children render with a folder icon
- Clicking a folder record navigates into it (updates `?folder=id`, refetches)
- Breadcrumb trail shows path from root, each segment clickable
- Back button returns to parent folder
- Current folder persisted via `remember` system

```tsx
<FolderBreadcrumbs
  breadcrumbs={element.breadcrumbs}
  onNavigate={(folderId) => {
    setCurrentFolder(folderId)
    void fetchData({ folder: folderId, page: 1 })
    saveRememberState({ ...state, folder: folderId })
  }}
/>
```

**Commit:**
```bash
git commit -m "feat(panels): render folder breadcrumbs and drill-down navigation"
```

### Task 13.3: Add folder param to API endpoint

**Files:**
- Modify: `packages/panels/src/handlers/meta/listRoutes.ts` — accept `?folder=id` query param, apply scope

**Commit:**
```bash
git commit -m "feat(panels): support folder param in list API endpoint"
```

---

## Phase 14: Migrate Media to use List pipeline (future)

> This phase is outlined but deferred — implement after Phases 1-8 are stable.

### Task 9.1: Refactor Media browser to use List + custom view

The Media library currently has its own query/pagination/filter logic. Replace with `List.make().fromModel(MediaFile).views([View.make('media-browser').render(...)])`.

### Task 9.2: Remove duplicate query/pagination code from @boostkit/media

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Table SSR breaks | Phase 3 is pure refactor — all Table tests must pass before proceeding |
| SchemaTable.tsx breaks | Phase 6 extracts hook without changing render — manual SSR verification required |
| Resolver query changes | Phase 4 extracts function without changing query logic — same SQL/ORM calls |
| Backward compat | `Table.make()` API unchanged. `List` re-export alias during migration |
| Playground breaks | Mirror every change. Build after every commit |

## Definition of Done

- [ ] All existing table tests pass
- [ ] All existing table SSR pages render correctly
- [ ] `Table.make()` API unchanged — zero breaking changes
- [ ] `List.make()` with `.views(['list', 'grid'])` works with view toggle
- [ ] Custom `.render(fn)` works in SSR
- [ ] `View.table(columns)` renders as table within a List
- [ ] Search, filter, pagination, sort work in all view modes
- [ ] `DataField` base class works, `Column` extends it — backward compatible
- [ ] `ViewMode.list([DataField.make('name').editable()])` renders with inline edit
- [ ] Editable fields work in list, grid, and table views (inline/popover/modal)
- [ ] Duplicate view types work: `ViewMode.table([...]).label('Compact')` gets unique name
- [ ] Remember persists active view mode
- [ ] `.onRecordClick('edit')` and custom function work across all views
- [ ] `.groupBy('field')` renders group headers in list/grid views
- [ ] `.exportable(['csv', 'json'])` downloads filtered dataset
- [ ] `.defaultView({ sm: 'list', lg: 'grid' })` auto-selects on first visit, persists thereafter
- [ ] Container queries hide inappropriate view toggles at small widths
- [ ] `.sortable(['title', { field: 'date', label: 'التاريخ' }])` renders sort dropdown in toolbar
- [ ] `.folder('parentId')` renders breadcrumbs and scopes to current folder
- [ ] Folder navigation persists via remember, works with search/filters and pagination
- [ ] `pnpm build` succeeds with 33 tasks
