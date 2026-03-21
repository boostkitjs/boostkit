import type { PanelContext, SchemaElementLike } from '../types.js'
import type { ChartElementMeta } from '../schema/index.js'
import type { PanelSchemaElementMeta } from '../resolveSchema.js'
import { debugWarn } from '../debug.js'

export async function resolveChart(
  el: SchemaElementLike,
  ctx: PanelContext,
): Promise<PanelSchemaElementMeta> {
  const chart = el as unknown as { getDataFn?(): ((ctx: PanelContext) => Promise<unknown>) | undefined; isLazy?(): boolean; getPollInterval?(): number | undefined; getId?(): string; toMeta(): ChartElementMeta }
  const dataFn = chart.getDataFn?.()
  const meta = chart.toMeta() as ChartElementMeta & { data?: unknown }

  if (dataFn && !chart.isLazy?.()) {
    try {
      const resolved = await dataFn(ctx) as { labels?: string[]; datasets?: unknown[] }
      if (resolved) {
        if (Array.isArray(resolved.labels)) meta.labels = resolved.labels
        if (Array.isArray(resolved.datasets)) meta.datasets = resolved.datasets as ChartElementMeta['datasets']
      }
    } catch (e) { debugWarn('chart.data', e) }
  } else if (chart.isLazy?.()) {
    meta.labels = []
    meta.datasets = []
  }

  return meta as unknown as PanelSchemaElementMeta
}
