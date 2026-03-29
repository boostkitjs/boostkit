'use client'

import { useState } from 'react'
import type { SchemaElement, DashboardEl, I18nExtended } from './schema-types.js'
import { renderSchemaElement } from './renderSchemaElement.js'

export interface SchemaSectionProps {
  section: { title: string; description?: string; collapsible: boolean; collapsed: boolean; columns: number; elements?: SchemaElement[] }
  panelPath: string
  pathSegment: string
  i18n: I18nExtended
  urlSearch?: Record<string, string>
  /** Optional render function for dashboard elements inside sections */
  renderDashboard?: (el: DashboardEl, idx: number) => React.ReactNode
}

export function SchemaSection({ section, panelPath, pathSegment, i18n, urlSearch, renderDashboard }: SchemaSectionProps) {
  const [open, setOpen] = useState(!section.collapsed)

  return (
    <div className="rounded-xl border bg-card">
      {/* Header */}
      <div
        className={`flex items-center justify-between px-5 py-3 ${section.collapsible ? 'cursor-pointer' : ''} ${section.elements?.length ? 'border-b' : ''}`}
        onClick={section.collapsible ? () => setOpen(!open) : undefined}
      >
        <div>
          <p className="text-sm font-semibold">{section.title}</p>
          {section.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
          )}
        </div>
        {section.collapsible && (
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {/* Content */}
      {open && section.elements && section.elements.length > 0 && (
        <div className="p-5">
          <div className={`flex flex-col gap-4 ${section.columns > 1 ? `grid grid-cols-${section.columns}` : ''}`}>
            {section.elements.map((el: SchemaElement, i: number) =>
              renderSchemaElement(el, i, { panelPath, pathSegment, i18n, urlSearch, renderDashboard }, 's')
            )}
          </div>
        </div>
      )}
    </div>
  )
}
