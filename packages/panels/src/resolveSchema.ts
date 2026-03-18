import type { Panel }         from './Panel.js'
import type { PanelContext, SchemaElementLike, QueryBuilderLike, RecordRow }  from './types.js'
import type {
  TextElementMeta,
  HeadingElementMeta,
  StatsElementMeta,
  TableElementMeta,
  ChartElementMeta,
  ListElementMeta,
} from './schema/index.js'
import type { FormElementMeta } from './schema/Form.js'
import type { DialogElementMeta } from './schema/Dialog.js'
import type { Section } from './Section.js'
import type { Tabs } from './Tabs.js'
import type { Widget } from './Widget.js'
import type { Dashboard, DashboardTab } from './Dashboard.js'
import type { FieldOrGrouping } from './Resource.js'
import type { Field } from './Field.js'
import type { Column } from './schema/Column.js'
import { FormRegistry } from './FormRegistry.js'

export type PanelSchemaElementMeta =
  | TextElementMeta
  | HeadingElementMeta
  | StatsElementMeta
  | TableElementMeta
  | ChartElementMeta
  | ListElementMeta
  | FormElementMeta
  | DialogElementMeta

// ─── Local duck-type interfaces ─────────────────────────────

/** Minimal interface for elements that expose getConfig() (e.g. Table). */
interface ConfigurableElement extends SchemaElementLike {
  getConfig(): import('./schema/Table.js').TableConfig
}

/** Minimal interface for a Form schema element. */
interface FormElement extends SchemaElementLike {
  getId(): string
  getSubmitHandler?(): ((data: Record<string, unknown>, ctx: PanelContext) => Promise<void | Record<string, unknown>>) | undefined
}

/** Minimal interface for a Dialog schema element. */
interface DialogElement extends SchemaElementLike {
  getItems(): unknown[]
  toMeta(): DialogElementMeta
}

/** Minimal interface for a Widget schema element. */
interface WidgetElement extends SchemaElementLike {
  getDataFn?(): ((ctx?: unknown, settings?: Record<string, unknown>) => Promise<unknown>) | undefined
  toMeta(): import('./Widget.js').WidgetMeta & { type: 'widget' }
}

/** Minimal interface for a Resource class (static shape). */
interface ResourceLike {
  new(): { fields(): FieldOrGrouping[] }
  model?: ModelLike
  defaultSort?: string
  defaultSortDir?: 'ASC' | 'DESC'
  getSlug?(): string
}

/** Minimal interface for a Model class (static shape). */
interface ModelLike {
  query(): QueryBuilderLike<RecordRow>
}

/** Minimal interface for @boostkit/core `app()` factory. */
interface AppLike {
  make(key: string): unknown
}

// ─── Schema resolver ───────────────────────────────────────

export async function resolveSchema(
  panel: Panel,
  ctx: PanelContext,
): Promise<PanelSchemaElementMeta[]> {
  const schemaDef = panel.getSchema()
  if (!schemaDef) return []

  const elements: SchemaElementLike[] = typeof schemaDef === 'function'
    ? await (schemaDef as (ctx: PanelContext) => Promise<SchemaElementLike[]>)(ctx)
    : schemaDef as SchemaElementLike[]

  const result: PanelSchemaElementMeta[] = []

  for (const el of elements) {
    const type = (el as SchemaElementLike).getType?.() as string | undefined
    if (!type) continue

    // Schema-level Section — resolve elements recursively
    if (type === 'section') {
      const section = el as Section
      if (typeof section.hasFields === 'function' && !section.hasFields() && section.getItems().length > 0) {
        // Schema element section — resolve items recursively
        const items = section.getItems()
        const sectionPanel = Object.create(panel, {
          getSchema: { value: () => items },
        }) as Panel
        const resolved = await resolveSchema(sectionPanel, ctx)
        const meta = section.toMeta()
        meta.elements = resolved
        result.push(meta as unknown as PanelSchemaElementMeta)
        continue
      }
      // Field section — pass through toMeta()
      result.push(section.toMeta() as unknown as PanelSchemaElementMeta)
      continue
    }

    // Schema-level Tabs — resolve each tab's elements recursively
    if (type === 'tabs') {
      const tabs = el as Tabs
      const rawTabs = tabs.getTabs()

      // Check if any tab has schema elements (not fields)
      const hasSchemaElements = rawTabs.some((t) => !t.hasFields())

      if (hasSchemaElements) {
        // Resolve schema elements in each tab
        const resolvedTabs = []
        for (const tab of rawTabs) {
          if (tab.hasFields()) {
            // Field tab — pass through
            resolvedTabs.push(tab.toMeta())
          } else {
            // Schema element tab — resolve items recursively
            const items = tab.getItems()
            // Create a proxy that delegates everything to the real panel
            // but overrides getSchema() to return this tab's items
            const tabPanel = Object.create(panel, {
              getSchema: { value: () => items },
            }) as Panel
            const resolved = await resolveSchema(tabPanel, ctx)
            resolvedTabs.push({
              label: tab.getLabel(),
              fields: [],
              elements: resolved,
            })
          }
        }
        const tabsId = tabs.getId?.()
        result.push({ type: 'tabs', ...(tabsId && { id: tabsId }), tabs: resolvedTabs } as unknown as PanelSchemaElementMeta)
      } else {
        // All field tabs — pass through toMeta()
        result.push(tabs.toMeta() as unknown as PanelSchemaElementMeta)
      }
      continue
    }

    // Table needs special resolution (query model, build columns)
    if (type === 'table') {
      const config = (el as ConfigurableElement).getConfig()

      // ── fromResource(Class) — preferred resource-linked mode ───
      if (config.resourceClass) {
        const ResourceClass = config.resourceClass as ResourceLike
        const Model = ResourceClass.model as ModelLike | undefined
        if (!Model) continue

        let q: QueryBuilderLike<RecordRow> = Model.query()
        const sortCol = config.sortBy ?? ResourceClass.defaultSort
        if (sortCol) {
          const dir = config.sortBy ? config.sortDir : (ResourceClass.defaultSortDir ?? 'DESC')
          q = q.orderBy(sortCol, dir)
        }
        q = q.limit(config.limit)

        let records: RecordRow[] = []
        try { records = await q.get() } catch { /* empty model */ }

        // Determine columns — Column[] or string[] resolved via Resource fields
        const isColumnInstances = config.columns.length > 0 && typeof (config.columns[0] as { toMeta?: unknown })?.toMeta === 'function'

        let columns: import('./schema/Table.js').PanelColumnMeta[]
        if (isColumnInstances) {
          columns = (config.columns as Column[]).map((col) => col.toMeta() as import('./schema/Table.js').PanelColumnMeta)
        } else {
          const resource   = new ResourceClass()
          const flatFields = flattenFields(resource.fields())
          const names: string[] = config.columns.length > 0
            ? config.columns as string[]
            : flatFields.filter((f): f is Field => isField(f) && !f.isHiddenFrom('table') && f.getType() !== 'hasMany').map((f) => (f as Field).getName()).slice(0, 5)
          columns = names.map((name) => {
            const field = flatFields.find((f): f is Field => isField(f) && (f as Field).getName() === name)
            return { name, label: field ? field.getLabel() : titleCase(name) }
          })
        }

        const slug = ResourceClass.getSlug?.() as string | undefined
        result.push({
          type:     'table',
          title:    config.title,
          resource: slug ?? '',
          columns,
          records,
          href:     slug ? `${panel.getPath()}/${slug}` : '',
        } satisfies TableElementMeta)
        continue
      }

      // ── fromModel(Class) — model-backed, no resource ────────────
      if (config.model) {
        const Model = config.model as ModelLike

        // Build query
        let q: QueryBuilderLike<RecordRow> = Model.query()
        if (config.sortBy) q = q.orderBy(config.sortBy, config.sortDir)
        q = q.limit(config.limit)

        let records: RecordRow[] = []
        try { records = await q.get() } catch { /* empty model */ }

        // Determine columns — accept Column[] or string[]
        const isColumnInstances = config.columns.length > 0 && typeof (config.columns[0] as { toMeta?: unknown })?.toMeta === 'function'

        const columns: import('./schema/Table.js').PanelColumnMeta[] = isColumnInstances
          ? (config.columns as Column[]).map((col) => col.toMeta() as import('./schema/Table.js').PanelColumnMeta)
          : (config.columns as string[]).map((name) => ({ name, label: titleCase(name) }))

        const meta: TableElementMeta = {
          type:     'table',
          title:    config.title,
          resource: '',
          columns,
          records,
          href:     '',
        }
        if (config.reorderable) {
          meta.reorderable      = true
          meta.reorderEndpoint  = `${panel.getApiBase()}/_tables/reorder`
        }
        result.push(meta as PanelSchemaElementMeta)
        continue
      }

      continue
    }

    // Dashboard elements — resolve widget data + user layout for SSR
    if (type === 'dashboard') {
      const dashboard = el as Dashboard
      // We extend DashboardMeta with optional SSR-only fields (savedLayout, savedTabLayouts)
      // that are added at runtime and sent to the client as part of the serialized meta.
      const meta = dashboard.toMeta() as import('./Dashboard.js').DashboardMeta & {
        savedLayout?: unknown[]
        savedTabLayouts?: Record<string, unknown[]>
        widgets: WidgetMetaWithData[]
        tabs?: (import('./Dashboard.js').DashboardTabMeta & { widgets: WidgetMetaWithData[] })[]
      }

      // Resolve top-level widget data
      if (meta.widgets) {
        meta.widgets = await resolveWidgetData(dashboard.getWidgets(), ctx)
      }

      // Resolve tab widget data
      if (meta.tabs) {
        const rawTabs = dashboard.getTabs() as DashboardTab[] | undefined
        for (let i = 0; i < meta.tabs.length; i++) {
          const tab = rawTabs?.[i]
          const metaTab = meta.tabs[i]
          if (tab && metaTab) {
            metaTab.widgets = await resolveWidgetData(tab.getWidgets(), ctx)
          }
        }
      }

      // Resolve user's saved layout from DB for SSR
      const userId = ctx.user?.id as string | undefined
      if (userId) {
        try {
          const coreModule = await import('@boostkit/core') as unknown as { app(): AppLike }
          const prisma = coreModule.app().make('prisma') as Record<string, unknown> | null
          if (prisma?.['panelDashboardLayout']) {
            const panelDashboardLayout = prisma['panelDashboardLayout'] as {
              findFirst(opts: Record<string, unknown>): Promise<{ layout: unknown } | null>
            }
            const panelName = panel.getName()

            // Top-level layout
            const topRecord = await panelDashboardLayout.findFirst({
              where: { userId, panel: panelName, dashboardId: meta.id },
            })
            if (topRecord) {
              meta.savedLayout = JSON.parse(String(topRecord.layout))
            }

            // Tab layouts
            if (meta.tabs) {
              meta.savedTabLayouts = {} as Record<string, unknown[]>
              for (const tab of meta.tabs) {
                const tabRecord = await panelDashboardLayout.findFirst({
                  where: { userId, panel: panelName, dashboardId: `${meta.id}:${tab.id}` },
                })
                if (tabRecord) {
                  meta.savedTabLayouts[tab.id] = JSON.parse(String(tabRecord.layout))
                }
              }
            }
          }
        } catch { /* DB not available */ }
      }

      result.push(meta as unknown as PanelSchemaElementMeta)
      continue
    }

    // Dialog — resolve inner elements recursively
    if (type === 'dialog') {
      const dialog = el as DialogElement
      const items  = dialog.getItems()
      const dialogPanel = Object.create(panel, {
        getSchema: { value: () => items },
      }) as Panel
      const resolved = await resolveSchema(dialogPanel, ctx)
      const meta = dialog.toMeta()
      meta.elements = resolved
      result.push(meta as unknown as PanelSchemaElementMeta)
      continue
    }

    // Standalone Form — register submit handler and pass through meta
    if (type === 'form') {
      const form = el as FormElement
      const handler = form.getSubmitHandler?.()
      if (handler) {
        FormRegistry.register(panel.getName(), form.getId(), handler)
      }
      result.push(form.toMeta() as PanelSchemaElementMeta)
      continue
    }

    // Standalone widget — resolve data for SSR (skip lazy widgets)
    if (type === 'widget') {
      const widget = el as WidgetElement
      // Extend WidgetMeta with the runtime-populated `data` field (SSR-only, not in static type)
      const meta = widget.toMeta() as import('./Widget.js').WidgetMeta & { type: 'widget'; data?: unknown }

      if (!meta.lazy) {
        const dataFn = widget.getDataFn?.()
        if (dataFn) {
          try {
            meta.data = await dataFn({ user: ctx.user })
          } catch {
            meta.data = null
          }
        }
      }

      result.push(meta as unknown as PanelSchemaElementMeta)
      continue
    }

    // All other element types (text, heading, stats, chart, list, etc.)
    // — pass through their toMeta() directly
    if (typeof (el as SchemaElementLike).toMeta === 'function') {
      result.push((el as SchemaElementLike).toMeta() as unknown as PanelSchemaElementMeta)
    }
  }

  return result
}

// ─── Dashboard widget data resolver ────────────────────────

type WidgetMetaWithData = import('./Widget.js').WidgetMeta & { type: 'widget'; data?: unknown }

async function resolveWidgetData(widgets: Widget[], ctx: PanelContext): Promise<WidgetMetaWithData[]> {
  return Promise.all(
    widgets.map(async (widget): Promise<WidgetMetaWithData> => {
      const meta: WidgetMetaWithData = widget.toMeta()
      // Skip data resolution for lazy widgets
      if (meta.lazy) return { ...meta, data: null }

      const dataFn = widget.getDataFn?.()
      if (dataFn) {
        try {
          meta.data = await dataFn({ user: ctx.user })
        } catch {
          meta.data = null
        }
      }
      return meta
    })
  )
}

// ─── Helpers ───────────────────────────────────────────────

/** Type guard: true when item is a Field (has both getType and getName). */
function isField(item: FieldOrGrouping): item is Field {
  return typeof (item as unknown as Record<string, unknown>)['getName'] === 'function'
}

function flattenFields(items: FieldOrGrouping[]): FieldOrGrouping[] {
  const result: FieldOrGrouping[] = []
  for (const item of items) {
    if (typeof (item as unknown as Record<string, unknown>)['getFields'] === 'function') {
      result.push(...flattenFields((item as unknown as { getFields(): FieldOrGrouping[] }).getFields()))
    } else {
      result.push(item)
    }
  }
  return result
}

function titleCase(str: string): string {
  return str.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim()
}
