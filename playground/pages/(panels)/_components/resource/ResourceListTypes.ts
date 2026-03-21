import type { FieldMeta, SectionMeta, TabsMeta, PanelI18n } from '@boostkit/panels'
import type { Data } from '../../@panel/resources/@resource/+data.js'

export type SchemaItem = FieldMeta | SectionMeta | TabsMeta

export type ResourceMeta = Data['resourceMeta']
export type PaginationData = Data['pagination']
export type ActionMeta = ResourceMeta['actions'][0]
export type FilterMeta = ResourceMeta['filters'][0]
export type TabMeta = ResourceMeta['tabs'][0]

export function flattenFields(schema: SchemaItem[]): FieldMeta[] {
  const result: FieldMeta[] = []
  for (const item of schema) {
    if (item.type === 'section') {
      result.push(...(item as SectionMeta).fields)
    } else if (item.type === 'tabs') {
      for (const tab of (item as TabsMeta).tabs) result.push(...tab.fields)
    } else {
      result.push(item as FieldMeta)
    }
  }
  return result
}

export function t(template: string, vars: Record<string, string | number>): string {
  return template.replace(/:([a-z]+)/g, (_, k: string) => String(vars[k] ?? `:${k}`))
}

export type { FieldMeta, PanelI18n }
