# @pilotiq/pilotiq — Panels Migration to Views

**Goal:** Migrate `@pilotiq/panels` into `@pilotiq/pilotiq`, replacing vendored Vike filesystem pages with `@rudderjs/view` controller routes. Same features, same API surface, different page delivery.

**What changes:** Vendored `pages/(panels)/@panel/` → `registerPanelRoutes(router, panel)` + `app/Views/Panels/`
**What stays:** Panel/Resource/Global/Page builders, all 20 field types, schema elements, handlers, registries, theme system, i18n, resolvers.

**Approach:** Copy src/ from panels → pilotiq in phases. Port React components from `pages/_components/` → `packages/pilotiq/src/react/`. Replace `+data.ts` page hooks with controller routes that call `view()`.

**Repo:** `pilotiq/packages/pilotiq`

---

## Phase 1: Core Infrastructure (DONE)

Package skeleton, basic builders, field types, Column, AdminShell, `registerPilotiqRoutes()`, playground wiring with view API. Also fixed `@panel` route conflict by moving `+Page.tsx` → `dashboard/+route.ts` with PanelRegistry check, and `@page/+route.ts` client-side returning `false`.

---

## Phase 2: Port Panel Builder + Registries

### Task 1: Port Panel builder class

Copy `Panel.ts` from panels → pilotiq, replacing the current simple `Pilotiq` class. Keep the full API:

- `.path()`, `.guard()`, `.middleware()`, `.branding()`, `.layout()`
- `.locale()`, `.resources()`, `.globals()`, `.pages()`, `.schema()`
- `.use()`, `.theme()`, `.themeEditor()`, `.notifications()`
- `.toNavigationMeta()`, `.toMeta()`
- `getConfig()` / all getters

Rename class from `Pilotiq` → `Panel` (same name as panels). Update `registerPilotiqRoutes` → `registerPanelRoutes`.

### Task 2: Port all registries

Copy from panels:
- `PanelRegistry` (singleton)
- `ComponentRegistry` (field/element renderers)
- `ResolverRegistry` (SSR resolvers)
- `FormRegistry`, `TableRegistry`, `StatsRegistry`, `TabsRegistry`, `DashboardRegistry`
- `ClientToolRegistry`, `CollabSupportRegistry`, `ComputeRegistry`
- `BaseRegistry` (factory functions)

### Task 3: Port core types

Copy `types.ts` — `PolicyAction`, `PanelContext`, `PanelUser`, `PanelGuard`, `BrandingOptions`, `PanelLayout`, `PaginatedResult`, `ModelClass`, etc.

### Task 4: Update barrel exports

`src/index.ts` exports Panel, all registries, all types.

### Task 5: Build + verify

---

## Phase 3: Port Schema Elements

### Task 6: Port Field base class + all 20 field types

Copy from panels `src/schema/`:
- `Field.ts` (full — label, required, default, from, derive, readonly, sortable, searchable, hideFrom, component, showWhen/hideWhen/disabledWhen, readableBy/editableBy, validate, display, collaborative, persist, badge, inlineEditable, ai)
- All field types: `TextField`, `EmailField`, `NumberField`, `SelectField`, `BooleanField`, `DateField`, `TextareaField`, `PasswordField`, `SlugField`, `TagsField`, `HiddenField`, `ToggleField`, `ColorField`, `JsonField`, `FileField`, `BuilderField`, `ComputedField`, `RelationField`, `HasMany`, `RepeaterField`
- `FieldType.ts`

Replace the simple fields currently in `packages/pilotiq/src/fields/`.

### Task 7: Port Resource, Global, Page classes

- `Resource.ts` — full API (table, form, detail, relations, agents, policy, static props)
- `Global.ts` — single-record settings
- `Page.ts` — custom pages with slug matching

### Task 8: Port schema elements

- `Column.ts`, `Table.ts`, `List.ts` (DataView), `Form.ts`
- `Section.ts`, `Tabs.ts`, `Tab.ts`, `ListTab.ts`
- `Stats.ts`, `Chart.ts`, `Dashboard.ts`, `Widget.ts`
- `Action.ts`, `ActionGroup.ts`
- `Filter.ts` + filter types (Boolean, Date, Number, Query, Select, Search)
- `Dialog.ts`, `View.ts`, `ViewMode.ts`
- `Import.ts`, `Wizard.ts`, `RelationManager.ts`
- `Text.ts`, `Heading.ts`, `Code.ts`, `Snippet.ts`, `Example.ts`
- `Card.ts`, `Alert.ts`, `Divider.ts`, `Each.ts`, `Block.ts`
- `DataField.ts`, `Playground.ts`
- `utils.ts`

### Task 9: Port NodeMap + supporting infra

- `NodeMap.ts` (block builder infrastructure)
- `resolveSchema.ts`
- `resourceData.ts`
- `persist.ts`, `datasource.ts`

### Task 10: Build + verify

---

## Phase 4: Port Handlers

### Task 11: Port resource handlers

Copy from panels `src/handlers/resource/`:
- `listHandler.ts`, `showHandler.ts`, `storeHandler.ts`, `updateHandler.ts`
- `deleteHandler.ts`, `softDeleteHandler.ts`, `actionHandler.ts`
- `index.ts` (mountResourceRoutes)

### Task 12: Port meta handlers

Copy from panels `src/handlers/meta/`:
- `formRoutes.ts`, `tableRoutes.ts`, `statsRoutes.ts`, `tabsRoutes.ts`
- `exportRoutes.ts`, `importRoutes.ts`, `uploadRoutes.ts`

### Task 13: Port remaining handlers

- `metaRoutes.ts` (navigation, full meta)
- `globalRoutes.ts`
- `dashboardRoutes.ts`
- `themeRoutes.ts`, `versionRoutes.ts`, `notificationRoutes.ts`
- `panelMiddleware.ts`
- `shared/` (context, fields, validation, coercion, transforms)

### Task 14: Build + verify

---

## Phase 5: Port React Components

### Task 15: Port AdminLayout

Copy `pages/_components/AdminLayout.tsx` → `src/react/AdminLayout.tsx`. This replaces the current simple `AdminShell`.

### Task 16: Port schema renderers

- `SchemaElementRenderer.tsx` — element type dispatcher
- `SchemaForm.tsx` — form with field inputs, validation, submission
- `SchemaDataView.tsx` — table with pagination, filters, columns, inline edit
- `SchemaTabs.tsx`, `SchemaDialog.tsx`, `SchemaSection.tsx`
- `SchemaPageContent.tsx`
- `DashboardGrid.tsx`
- `renderSchemaElement.tsx`

### Task 17: Port field input components (19)

- `TextInput`, `TextareaInput`, `SelectInput`, `BooleanInput`, `ToggleInput`
- `NumberInput`, `ColorInput`, `DateInput`, `PasswordInput`, `SlugInput`, `TagsInput`
- `FileInput`, `JsonInput`, `RepeaterInput`, `BuilderInput`
- `BelongsToInput`, `BelongsToManyInput`
- `RichContentInput`, `RatingInput`

### Task 18: Port supporting components

- `CellValue.tsx`, `InlineEditCell.tsx`, `Breadcrumbs.tsx`
- `GlobalSearch.tsx`, `ResourceIcon.tsx`
- `ConfirmDialog.tsx`, `SortableList.tsx`, `SortableBlockList.tsx`

### Task 19: Port hooks + utilities

- `useI18n.ts` hook
- `_lib/buildPanelContext.ts`, `conditions.ts`, `persist.ts`, `formHelpers.ts`, `getSessionUser.ts`

### Task 20: Build + verify

---

## Phase 6: Port Theme + i18n

### Task 21: Port theme system

- `theme/types.ts`, `theme/resolve.ts`, `theme/generate-css.ts`
- `theme/presets.ts`, `theme/base-colors.ts`, `theme/accent-colors.ts`
- `theme/radius.ts`, `theme/chart-palettes.ts`, `theme/icon-map.ts`
- `ThemeSettingsPage.ts`

### Task 22: Port i18n

- `i18n/index.ts`, `i18n/en.ts`, `i18n/ar.ts`
- `lang/` JSON overrides directory

### Task 23: Build + verify

---

## Phase 7: Controller Routes (View API)

### Task 24: Create registerPanelRoutes()

Replace vendored Vike pages with controller routes returning `view()`. Each route runs the same logic that was in `+data.ts`:

```typescript
export function registerPanelRoutes(router: Router, panel: Panel): void {
  const base = panel.getPath()

  // Dashboard — was @panel/+Page.tsx + +data.ts
  router.get(base, async (req) => {
    const panelMeta = panel.toNavigationMeta()
    const schemaData = panel.hasSchema() ? await resolveSchema(panel, ctx) : []
    return view('panels.dashboard', { panelMeta, schemaData })
  })

  // Resource list — was @panel/resources/@resource/+Page.tsx
  router.get(`${base}/resources/:resource`, async (req) => { ... })

  // Resource create — was @panel/resources/@resource/create/+Page.tsx
  router.get(`${base}/resources/:resource/create`, async (req) => { ... })

  // Resource show — was @panel/resources/@resource/:id/+Page.tsx
  router.get(`${base}/resources/:resource/:id`, async (req) => { ... })

  // Resource edit — was @panel/resources/@resource/:id/edit/+Page.tsx
  router.get(`${base}/resources/:resource/:id/edit`, async (req) => { ... })

  // Global edit — was @panel/globals/@global/+Page.tsx
  router.get(`${base}/globals/:global`, async (req) => { ... })

  // Custom pages — was @panel/@page/+Page.tsx
  router.get(`${base}/:page*`, async (req) => { ... })

  // Mount API handlers (unchanged — same JSON endpoints)
  mountResourceRoutes(router, panel)
  mountGlobalRoutes(router, panel)
  mountMetaRoutes(router, panel)
  mountDashboardRoutes(router, panel)
  mountThemeRoutes(router, panel)
  mountVersionRoutes(router, panel)
}
```

### Task 25: Create view templates

`app/Views/Panels/` — vendored view files consumed by apps:
- `Dashboard.tsx` — panel landing page (`export const route` from panel path)
- `Resources/Index.tsx` — resource list
- `Resources/Create.tsx` — create form
- `Resources/Show.tsx` — detail view
- `Resources/Edit.tsx` — edit form
- `Globals/Edit.tsx` — global edit form
- `Pages/Show.tsx` — custom page

Each view imports from `@pilotiq/pilotiq/react` and receives serialized props from the controller.

### Task 26: PanelServiceProvider

Port `PanelServiceProvider.ts` — registers panels, boots routes via `registerPanelRoutes()` instead of publishing vendored pages.

### Task 27: Build + verify

---

## Phase 8: Playground Migration

### Task 28: Switch playground from panels → pilotiq

- Update `playground/package.json` — replace `@pilotiq/panels` with `@pilotiq/pilotiq`
- Update all imports: `@pilotiq/panels` → `@pilotiq/pilotiq`
- Update `playground/app/Panels/Admin/AdminPanel.ts` — same Panel.make() API
- Delete `playground/pages/(panels)/` — no more vendored pages
- Create `playground/app/Views/Panels/` — view files from package
- Update `playground/routes/web.ts` — `registerPanelRoutes(Route, adminPanel)`
- Update register files (`_register-*.ts`) — import from `@pilotiq/pilotiq`
- Update provider imports

### Task 29: Test all features

Full smoke test:
- Dashboard with schema
- Resource CRUD (list, create, show, edit, delete)
- Globals
- Custom pages
- Theme editor
- Filters, search, pagination, sorting
- Field types (all 20)
- Inline edit, bulk actions
- File uploads
- Relations (belongsTo, hasMany)
- Import/export

### Task 30: Delete @pilotiq/panels

Only after full feature parity is confirmed:
- Remove `packages/panels/`
- Remove from `pnpm-workspace.yaml` if listed
- Update root `package.json`
- Update `CLAUDE.md`

---

## Summary

| Phase | Tasks | What ships |
|-------|-------|-----------|
| 1. Core Infrastructure | DONE | Package skeleton, basic views, route fix |
| 2. Panel Builder + Registries | 1–5 | Full Panel.make() API, all registries |
| 3. Schema Elements | 6–10 | 20 field types, 30+ schema elements, NodeMap |
| 4. Handlers | 11–14 | Resource CRUD, meta, global, theme, version handlers |
| 5. React Components | 15–20 | AdminLayout, 19 field inputs, schema renderers |
| 6. Theme + i18n | 21–23 | Theme presets/editor, localization |
| 7. Controller Routes | 24–27 | registerPanelRoutes(), view templates, ServiceProvider |
| 8. Playground Migration | 28–30 | Switch playground, delete panels |

**Pro package compatibility:** `@pilotiq-pro/ai` and `@pilotiq-pro/collab` import from `@pilotiq/panels`. After migration, update their imports to `@pilotiq/pilotiq`. The open-core seams (AiUiContext, agent types, CollabSupportRegistry) are ported in Phase 2–3.
