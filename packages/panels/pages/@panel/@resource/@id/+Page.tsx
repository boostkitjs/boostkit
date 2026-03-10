'use client'

import type React from 'react'
import { useData }     from 'vike-react/useData'
import { useConfig }   from 'vike-react/useConfig'
import { AdminLayout } from '../../../_components/AdminLayout.js'
import { Breadcrumbs } from '../../../_components/Breadcrumbs.js'
import type { FieldMeta, SectionMeta, TabsMeta } from '@boostkit/panels'
import type { Data }   from './+data.js'

type SchemaItem = FieldMeta | SectionMeta | TabsMeta

function flattenFields(schema: SchemaItem[]): FieldMeta[] {
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

export default function ShowPage() {
  const config = useConfig()
  const { panelMeta, resourceMeta, record, pathSegment, slug, id } = useData<Data>()
  const panelName = panelMeta.branding?.title ?? panelMeta.name
  const rec = record as Record<string, unknown> | null

  // Record title: use titleField if defined, else fall back to labelSingular
  const recordTitle = resourceMeta.titleField && rec
    ? String(rec[resourceMeta.titleField] ?? resourceMeta.labelSingular)
    : resourceMeta.labelSingular

  config({ title: `${recordTitle} — ${panelName}` })

  const viewFields = flattenFields(resourceMeta.fields as SchemaItem[]).filter(
    (f) => !f.hidden.includes('view') && f.type !== 'password',
  )

  function renderValue(field: FieldMeta, value: unknown): React.ReactNode {
    if (field.type === 'belongsTo') {
      const rel     = (field.extra?.['relationName'] as string) ?? (field.name.endsWith('Id') ? field.name.slice(0, -2) : field.name)
      const display = (field.extra?.['displayField'] as string) ?? 'name'
      const target  = field.extra?.['resource'] as string | undefined
      const related = rec ? rec[rel] as Record<string, unknown> | null : null
      if (!related) return <span className="text-muted-foreground">—</span>
      const label = String(related[display] ?? '—')
      return target
        ? <a href={`/${pathSegment}/${target}/${related['id']}`} className="text-primary hover:underline">{label}</a>
        : <span>{label}</span>
    }
    if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>
    if (field.type === 'boolean')  return value ? 'Yes' : 'No'
    if (field.type === 'date')     return new Date(String(value)).toLocaleDateString()
    if (field.type === 'datetime') return new Date(String(value)).toLocaleString()
    if (field.type === 'color') return (
      <span className="flex items-center gap-2">
        <span className="inline-block h-4 w-4 rounded-full border" style={{ backgroundColor: String(value) }} />
        {String(value)}
      </span>
    )
    if (field.type === 'image' && value) return <img src={String(value)} alt="" className="max-h-24 w-auto rounded border" />
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'object') return <span className="font-mono text-xs">{JSON.stringify(value, null, 2)}</span>
    return String(value)
  }

  return (
    <AdminLayout panelMeta={panelMeta} currentSlug={slug}>
      <div className="max-w-2xl">
        <Breadcrumbs crumbs={[
          { label: panelMeta.branding?.title ?? panelMeta.name, href: `/${pathSegment}/${slug}` },
          { label: resourceMeta.label, href: `/${pathSegment}/${slug}` },
          { label: recordTitle },
        ]} />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">{recordTitle}</h1>
          <a
            href={`/${pathSegment}/${slug}/${id}/edit`}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Edit
          </a>
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          <dl className="divide-y">
            {viewFields.map((field) => {
              const value = record ? (record as Record<string, unknown>)[field.name] : undefined
              return (
                <div key={field.name} className="grid grid-cols-3 gap-4 px-6 py-4">
                  <dt className="text-sm font-medium text-muted-foreground">{field.label}</dt>
                  <dd className="col-span-2 text-sm">
                    {renderValue(field, value)}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>

        <div className="mt-4">
          <a
            href={`/${pathSegment}/${slug}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to {resourceMeta.label}
          </a>
        </div>
      </div>
    </AdminLayout>
  )
}
