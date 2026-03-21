import type { Panel } from '../Panel.js'
import type { PanelContext, SchemaElementLike } from '../types.js'
import type { PanelSchemaElementMeta } from '../resolveSchema.js'
import type { DialogElement, ResolveSchemaFn } from './types.js'

export async function resolveDialog(
  el: SchemaElementLike,
  panel: Panel,
  ctx: PanelContext,
  resolveSchema: ResolveSchemaFn,
): Promise<PanelSchemaElementMeta> {
  const dialog = el as DialogElement
  const items  = dialog.getItems()
  const dialogPanel = Object.create(panel, {
    getSchema: { value: () => items },
  }) as Panel
  const resolved = await resolveSchema(dialogPanel, ctx)
  const meta = dialog.toMeta()
  meta.elements = resolved
  return meta as unknown as PanelSchemaElementMeta
}
