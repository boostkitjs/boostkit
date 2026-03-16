'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ResponsiveGridLayout,
  useContainerWidth,
} from 'react-grid-layout'
import type {
  Layout,
  LayoutItem as RGLLayoutItem,
  ResponsiveLayouts,
} from 'react-grid-layout'
import { WidgetRenderer } from './WidgetRenderer.js'
import type { PanelSchemaElementMeta, PanelI18n } from '@boostkit/panels'
import type { WidgetMeta, WidgetSize } from '@boostkit/dashboards'

import 'react-grid-layout/css/styles.css'

// Size -> grid dimensions mapping
const SIZE_MAP: Record<WidgetSize, { w: number; h: number }> = {
  small:  { w: 1, h: 2 },
  medium: { w: 2, h: 2 },
  large:  { w: 4, h: 3 },
}

const SIZE_CYCLE: WidgetSize[] = ['small', 'medium', 'large']

interface DashboardLayoutItem {
  widgetId: string
  size:     WidgetSize
  position: number
}

interface WidgetWithData extends WidgetMeta {
  data: unknown
}

export interface DashboardGridProps {
  pathSegment: string
  panelPath:   string
  i18n:        PanelI18n & Record<string, string>
}

export function DashboardGrid({ pathSegment, panelPath, i18n }: DashboardGridProps) {
  const [widgets, setWidgets] = useState<WidgetWithData[]>([])
  const [layout, setLayout] = useState<DashboardLayoutItem[]>([])
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showPalette, setShowPalette] = useState(false)
  const layoutRef = useRef(layout)
  layoutRef.current = layout

  // react-grid-layout v2: useContainerWidth hook replaces WidthProvider
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: 1200 })

  // -- Load widgets + layout ------------------------------------------------
  useEffect(() => {
    async function load() {
      try {
        const [widgetsRes, layoutRes] = await Promise.all([
          fetch(`/${pathSegment}/api/_dashboard/widgets`),
          fetch(`/${pathSegment}/api/_dashboard/layout`),
        ])
        if (widgetsRes.ok) {
          const body = await widgetsRes.json() as { widgets: WidgetWithData[] }
          setWidgets(body.widgets)
        }
        if (layoutRes.ok) {
          const body = await layoutRes.json() as { layout: DashboardLayoutItem[] }
          setLayout(body.layout)
        }
      } catch { /* network error */ }
      setLoading(false)
    }
    void load()
  }, [pathSegment])

  // -- Save layout -----------------------------------------------------------
  const saveLayout = useCallback(async (newLayout: DashboardLayoutItem[]) => {
    try {
      await fetch(`/${pathSegment}/api/_dashboard/layout`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: newLayout }),
      })
    } catch { /* save failed silently */ }
  }, [pathSegment])

  // -- react-grid-layout change handler --------------------------------------
  const handleLayoutChange = useCallback((rglLayout: Layout, _layouts: ResponsiveLayouts) => {
    if (!editing) return
    setLayout(prev => {
      const updated = prev.map(item => {
        const rglItem = rglLayout.find((l: RGLLayoutItem) => l.i === item.widgetId)
        if (!rglItem) return item
        // Derive size from grid width
        let size: WidgetSize = 'small'
        if (rglItem.w >= 4) size = 'large'
        else if (rglItem.w >= 2) size = 'medium'
        return { ...item, size, position: rglItem.y * 4 + rglItem.x }
      })
      // Re-sort by position
      return [...updated].sort((a, b) => a.position - b.position)
    })
  }, [editing])

  // -- Cycle widget size -----------------------------------------------------
  function cycleSize(widgetId: string) {
    setLayout(prev => prev.map(item => {
      if (item.widgetId !== widgetId) return item
      const idx = SIZE_CYCLE.indexOf(item.size)
      const next = SIZE_CYCLE[(idx + 1) % SIZE_CYCLE.length]!
      return { ...item, size: next }
    }))
  }

  // -- Remove widget ---------------------------------------------------------
  function removeWidget(widgetId: string) {
    setLayout(prev => prev.filter(item => item.widgetId !== widgetId))
  }

  // -- Add widget ------------------------------------------------------------
  function addWidget(widget: WidgetWithData) {
    setLayout(prev => [
      ...prev,
      { widgetId: widget.id, size: widget.defaultSize, position: prev.length },
    ])
    setShowPalette(false)
  }

  // -- Done editing ----------------------------------------------------------
  async function handleDone() {
    setEditing(false)
    setShowPalette(false)
    await saveLayout(layoutRef.current)
  }

  // -- Build active widgets (in layout order) --------------------------------
  const activeWidgets = [...layout]
    .sort((a, b) => a.position - b.position)
    .map(item => ({
      ...item,
      widget: widgets.find(w => w.id === item.widgetId),
    }))
    .filter(item => item.widget !== undefined)

  // Widgets not in the layout (for the palette)
  const availableWidgets = widgets.filter(
    w => !layout.some(item => item.widgetId === w.id)
  )

  // Don't render anything if no widgets registered at all
  if (!loading && widgets.length === 0) return null

  if (loading) {
    return (
      <div className="mt-6">
        <div className="h-8 w-48 animate-pulse bg-muted/30 rounded mb-4" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="col-span-2 h-32 animate-pulse bg-muted/20 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  // Build react-grid-layout items with greedy flow positioning
  const rglItems: RGLLayoutItem[] = activeWidgets.map(item => {
    const dims = SIZE_MAP[item.size]
    return {
      i: item.widgetId,
      x: 0,
      y: 0,
      w: dims.w,
      h: dims.h,
      minW: 1,
      maxW: 4,
      minH: 2,
      static: !editing,
    }
  })

  // Flow items: assign x/y positions based on a simple greedy algorithm
  let curX = 0
  let curY = 0
  let rowMaxH = 0
  for (const item of rglItems) {
    if (curX + item.w > 4) {
      curX = 0
      curY += rowMaxH
      rowMaxH = 0
    }
    item.x = curX
    item.y = curY
    curX += item.w
    rowMaxH = Math.max(rowMaxH, item.h)
  }

  const rglLayouts: ResponsiveLayouts = {
    lg: rglItems,
  }

  return (
    <div className="mt-6" ref={containerRef}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{i18n.dashboard ?? 'Dashboard'}</h2>
        <div className="flex items-center gap-2">
          {editing && (
            <button
              type="button"
              onClick={() => setShowPalette(!showPalette)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-accent transition-colors"
            >
              {i18n.addWidget ?? '+ Add Widget'}
            </button>
          )}
          <button
            type="button"
            onClick={editing ? handleDone : () => setEditing(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {editing ? (i18n.doneDashboard ?? 'Done') : (i18n.customizeDashboard ?? 'Customize')}
          </button>
        </div>
      </div>

      {/* Widget palette (add widgets) */}
      {editing && showPalette && availableWidgets.length > 0 && (
        <div className="mb-4 p-4 rounded-xl border bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Available Widgets</p>
          <div className="flex flex-wrap gap-2">
            {availableWidgets.map(w => (
              <button
                key={w.id}
                type="button"
                onClick={() => addWidget(w)}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                {w.icon && <span>{w.icon}</span>}
                <span>{w.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No widgets state */}
      {activeWidgets.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">{i18n.noWidgets ?? 'No widgets added yet.'}</p>
          {!editing && (
            <button
              type="button"
              onClick={() => { setEditing(true); setShowPalette(true) }}
              className="mt-3 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {i18n.addWidget ?? '+ Add Widget'}
            </button>
          )}
        </div>
      )}

      {/* Widget grid */}
      {activeWidgets.length > 0 && mounted && (
        <ResponsiveGridLayout
          className="layout"
          width={width}
          layouts={rglLayouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 4, md: 4, sm: 2, xs: 1, xxs: 1 }}
          rowHeight={80}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          resizeConfig={{ enabled: false }}
          onLayoutChange={handleLayoutChange}
        >
          {activeWidgets.map(({ widgetId, size, widget }) => (
            <div key={widgetId} className="relative group">
              {/* Edit overlay */}
              {editing && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Size toggle */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); cycleSize(widgetId) }}
                    className="px-2 py-0.5 text-[10px] font-bold rounded bg-background/80 backdrop-blur border border-border hover:bg-accent transition-colors"
                    title={`Size: ${size} (click to cycle)`}
                  >
                    {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
                  </button>
                  {/* Remove */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeWidget(widgetId) }}
                    className="w-5 h-5 flex items-center justify-center text-xs rounded bg-background/80 backdrop-blur border border-border text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                    title="Remove widget"
                  >
                    {'\u00d7'}
                  </button>
                </div>
              )}

              {/* Widget content */}
              <WidgetCard widget={widget!} panelPath={panelPath} i18n={i18n} />
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  )
}

// -- Widget card -- maps widget component type to schema element ---------------

function WidgetCard({ widget, panelPath, i18n }: { widget: WidgetWithData; panelPath: string; i18n: PanelI18n & Record<string, string> }) {
  const data = widget.data as Record<string, unknown> | null

  // Map widget component type to PanelSchemaElementMeta
  let element: PanelSchemaElementMeta | null = null

  if (widget.component === 'stat') {
    element = {
      type: 'stats',
      stats: [{
        label: widget.label,
        value: (data?.value as number | string) ?? 0,
        ...(data?.description !== undefined && { description: data.description as string }),
        ...(data?.trend !== undefined && { trend: data.trend as number }),
      }],
    }
  } else if (widget.component === 'chart') {
    element = {
      type: 'chart',
      title: widget.label,
      chartType: (data?.type as string) ?? 'line',
      labels: (data?.labels as string[]) ?? [],
      datasets: (data?.datasets as any[]) ?? [],
      height: (data?.height as number) ?? 200,
    } as PanelSchemaElementMeta
  } else if (widget.component === 'table') {
    element = {
      type: 'table',
      title: widget.label,
      resource: '',
      columns: (data?.columns as any[]) ?? [],
      records: (data?.records as any[]) ?? [],
      href: (data?.href as string) ?? '#',
    }
  } else if (widget.component === 'list') {
    element = {
      type: 'list',
      title: widget.label,
      items: (data?.items as any[]) ?? [],
      limit: (data?.limit as number) ?? 5,
    } as PanelSchemaElementMeta
  }

  if (!element) {
    return (
      <div className="rounded-xl border bg-card p-5 h-full">
        <p className="text-sm font-semibold">{widget.label}</p>
        {data && <pre className="text-xs text-muted-foreground mt-2 overflow-auto">{JSON.stringify(data, null, 2)}</pre>}
      </div>
    )
  }

  return (
    <div className="h-full">
      <WidgetRenderer element={element} panelPath={panelPath} i18n={i18n} />
    </div>
  )
}
