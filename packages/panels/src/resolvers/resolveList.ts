import type { PanelContext, SchemaElementLike } from '../types.js'
import type { ListElementMeta } from '../schema/index.js'
import type { PanelSchemaElementMeta } from '../resolveSchema.js'
import { debugWarn } from '../debug.js'

export async function resolveList(
  el: SchemaElementLike,
  ctx: PanelContext,
): Promise<PanelSchemaElementMeta> {
  const list = el as unknown as { getDataFn?(): ((ctx: PanelContext) => Promise<unknown>) | undefined; isLazy?(): boolean; getPollInterval?(): number | undefined; getId?(): string; toMeta(): ListElementMeta }
  const dataFn = list.getDataFn?.()
  const meta = list.toMeta() as ListElementMeta & { data?: unknown }

  if (dataFn && !list.isLazy?.()) {
    try {
      const resolved = await dataFn(ctx)
      if (Array.isArray(resolved)) meta.items = resolved
      else if (resolved && typeof resolved === 'object' && 'items' in resolved) meta.items = (resolved as { items: unknown[] }).items as ListElementMeta['items']
    } catch (e) { debugWarn('list.data', e) }
  } else if (list.isLazy?.()) {
    meta.items = []
  }

  return meta as unknown as PanelSchemaElementMeta
}
