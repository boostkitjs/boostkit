import { PanelRegistry, resolveTable, resolveActiveTabIndex } from '@boostkit/panels'
import type { PanelSchemaElementMeta, PersistMode } from '@boostkit/panels'
import { buildPanelContext } from '../../../_lib/buildPanelContext.js'
import type { PageContextServer } from 'vike/types'

export type Data = Awaited<ReturnType<typeof data>>

export async function data(pageContext: PageContextServer) {
  const { panel: pathSegment, resource: slug } = pageContext.routeParams as { panel: string; resource: string }

  const panel = PanelRegistry.all().find((p) => p.getPath() === `/${pathSegment}`)
  if (!panel) throw new Error(`Panel "/${pathSegment}" not found.`)

  const ResourceClass = panel.getResources().find((R) => R.getSlug() === slug)
  if (!ResourceClass) throw new Error(`Resource "${slug}" not found.`)

  const resource     = new ResourceClass()
  const resourceMeta = resource.toMeta()
  const panelMeta    = panel.toMeta()
  const { ctx, sessionUser } = await buildPanelContext(pageContext)

  let tableElement: PanelSchemaElementMeta | null = null
  let tabsElement: PanelSchemaElementMeta | null = null

  if (ResourceClass.model) {
    const table = resource._resolveTable()
    const tableConfig = table.getConfig()

    if (tableConfig.tabs.length > 0) {
      const tabsId = `${slug}-tabs`
      const resolvedTabs: { label: string; icon?: string; fields: never[]; elements: PanelSchemaElementMeta[] }[] = []

      for (const tab of tableConfig.tabs) {
        const tabName = tab.getLabel().toLowerCase().replace(/\s+/g, '-')
        const tabTableId = `${slug}-${tabName}`
        const tabTable = table._cloneWithScope(tabTableId, tab.getScope())
        const resolvedTable = await resolveTable(tabTable as any, panel, ctx)

        if (resolvedTable && 'href' in resolvedTable) {
          (resolvedTable as any).href = `/${pathSegment}/resources/${slug}`
        }
        if (resolvedTable && 'resource' in resolvedTable) {
          (resolvedTable as any).resource = ''
        }
        if (resolvedTable && (resolvedTable as any).live) {
          (resolvedTable as any).liveChannel = `panel:${slug}`
        }

        const tabMeta: { label: string; icon?: string; fields: never[]; elements: PanelSchemaElementMeta[] } = {
          label: tab.getLabel(),
          fields: [],
          elements: resolvedTable ? [resolvedTable] : [],
        }
        const icon = tab.getIcon()
        if (icon) tabMeta.icon = icon
        resolvedTabs.push(tabMeta)
      }

      const persistMode = (tableConfig.remember || 'session') as PersistMode
      const tabLabels = tableConfig.tabs.map(t => t.getLabel())
      const activeTabIndex = await resolveActiveTabIndex(persistMode, tabsId, tabLabels, ctx)

      tabsElement = {
        type: 'tabs',
        id: tabsId,
        tabs: resolvedTabs,
        persist: persistMode,
        ...(activeTabIndex > 0 ? { activeTab: activeTabIndex } : {}),
      } as unknown as PanelSchemaElementMeta

    } else {
      tableElement = await resolveTable(table as any, panel, ctx)

      if (tableElement && 'href' in tableElement) {
        (tableElement as any).href = `/${pathSegment}/resources/${slug}`
      }
      if (tableElement && 'resource' in tableElement) {
        (tableElement as any).resource = slug
      }
      if (tableElement && (tableElement as any).live) {
        (tableElement as any).liveChannel = `panel:${slug}`
      }
    }
  }

  return { panelMeta, resourceMeta, tableElement, tabsElement, pathSegment, slug, sessionUser }
}
