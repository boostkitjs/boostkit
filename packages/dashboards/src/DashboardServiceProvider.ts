import { ServiceProvider, type Application } from '@boostkit/core'
import type { Widget } from './Widget.js'
import { DashboardRegistry } from './DashboardRegistry.js'

export interface DashboardConfig {
  widgets: Widget[]
}

/** Build default layout positions from registered widgets. */
function buildDefaultLayout(widgets: Widget[]): Array<{ widgetId: string; size: string; position: number }> {
  return widgets.map((w, i) => ({
    widgetId: w.getId(),
    size:     w.getDefaultSize(),
    position: i,
  }))
}

/**
 * Returns a DashboardServiceProvider class configured for the given dashboard config.
 *
 * Usage in bootstrap/providers.ts:
 *   import { dashboard } from '@boostkit/dashboards'
 *   export default [..., dashboard({ widgets: [...] }), ...]
 */
export function dashboard(config: DashboardConfig): new (app: Application) => ServiceProvider {
  class DashboardServiceProvider extends ServiceProvider {
    register(): void {
      DashboardRegistry.reset()
      for (const widget of config.widgets) {
        DashboardRegistry.register(widget)
      }
    }

    async boot(): Promise<void> {
      const widgets = DashboardRegistry.all()
      if (widgets.length === 0) return

      // Dynamic imports — @boostkit/panels is a peer dependency
      let PanelRegistry: { all(): Array<{ getApiBase(): string; getName(): string }> }
      let router: {
        get(path: string, handler: (req: any, res: any) => unknown, mw?: unknown[]): void
        put(path: string, handler: (req: any, res: any) => unknown, mw?: unknown[]): void
      }
      try {
        const panels    = await import('@boostkit/panels') as any
        PanelRegistry   = panels.PanelRegistry
        const routerMod = await import('@boostkit/router') as any
        router          = routerMod.router
      } catch {
        return // panels or router not available
      }

      for (const panel of PanelRegistry.all()) {
        const base = `${panel.getApiBase()}/_dashboard`

        // GET /_dashboard/widgets — list all widgets with resolved data
        router.get(`${base}/widgets`, async (req, res) => {
          const results = []
          for (const widget of widgets) {
            const meta  = widget.toMeta()
            let data: unknown = null
            const dataFn = widget.getDataFn()
            if (dataFn) {
              try {
                data = await dataFn({ user: req.user })
              } catch { /* data resolution failed — return null */ }
            }
            results.push({ ...meta, data })
          }
          return res.json({ widgets: results })
        })

        // GET /_dashboard/layout — get user's saved layout (or default)
        router.get(`${base}/layout`, async (req, res) => {
          const userId = req.user?.id as string | undefined
          if (!userId) {
            return res.json({ layout: buildDefaultLayout(widgets) })
          }

          try {
            const { app } = await import('@boostkit/core') as any
            const prisma = app().make('prisma')
            if (prisma?.panelDashboardLayout) {
              const record = await prisma.panelDashboardLayout.findFirst({
                where: { userId, panel: panel.getName() },
              })
              if (record) {
                return res.json({ layout: JSON.parse(String(record.layout)) })
              }
            }
          } catch { /* DB not available — fall through to default */ }

          return res.json({ layout: buildDefaultLayout(widgets) })
        })

        // PUT /_dashboard/layout — save user's layout
        router.put(`${base}/layout`, async (req, res) => {
          const userId = req.user?.id as string | undefined
          if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' })
          }

          const body = req.body as { layout?: unknown }
          if (!body?.layout || !Array.isArray(body.layout)) {
            return res.status(400).json({ error: 'Invalid layout' })
          }

          try {
            const { app } = await import('@boostkit/core') as any
            const prisma = app().make('prisma')
            if (prisma?.panelDashboardLayout) {
              const existing = await prisma.panelDashboardLayout.findFirst({
                where: { userId, panel: panel.getName() },
              })
              const layoutJson = JSON.stringify(body.layout)

              if (existing) {
                await prisma.panelDashboardLayout.update({
                  where: { id: existing.id },
                  data:  { layout: layoutJson },
                })
              } else {
                await prisma.panelDashboardLayout.create({
                  data: { userId, panel: panel.getName(), layout: layoutJson },
                })
              }
            }
          } catch {
            return res.status(500).json({ error: 'Failed to save layout' })
          }

          return res.json({ ok: true })
        })
      }
    }
  }

  return DashboardServiceProvider
}

export { buildDefaultLayout }
